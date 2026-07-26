/* Canvas + animation hooks shared by every interactive demo.
   These wrap the imperative patterns from the legacy lessons (HiDPI sizing,
   a requestAnimationFrame loop, and a self-resizing Plot) so a demo's
   physics/draw code can stay plain and imperative inside one callback. */

import { useEffect, useRef } from "react";
import { Plot } from "./plot.js";

/**
 * Size a <canvas> for crisp HiDPI rendering and keep it sized to its container.
 * Returns a ref whose `.current` is `{ w, h }` in CSS pixels (logical units you
 * draw in — the device-pixel-ratio transform is already applied to the context).
 *
 *   const canvasRef = useRef(null);
 *   const size = useDprCanvas(canvasRef, 300);
 *   // later, in your draw loop: const { w, h } = size.current;
 */
export function useDprCanvas(ref, height) {
  const size = useRef({ w: 0, h: height });
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 600;
      canvas.style.height = height + "px";
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      size.current = { w, h: height };
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [ref, height]);
  return size;
}

/**
 * Run `callback(dt, now)` once per animation frame, where `dt` is seconds since
 * the previous frame. The callback is always the latest one passed in, so it can
 * close over fresh state without restarting the loop.
 *
 * Pass `targetRef` (a ref to any element inside the demo, usually the canvas) to
 * gate the loop on visibility: the physics/draw loop only runs while that element
 * is on (or near) screen, so off-screen sims cost zero CPU. Omit it to always run.
 */
export function useRaf(callback, targetRef) {
  const cb = useRef(callback);
  cb.current = callback;
  useEffect(() => {
    let raf = null;
    let last = performance.now();
    const loop = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      cb.current(dt, now);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (raf == null) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    const stop = () => {
      if (raf != null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };
    const el = targetRef?.current;
    let io;
    if (el && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        ([entry]) => (entry.isIntersecting ? start() : stop()),
        { rootMargin: "200px" },
      );
      io.observe(el);
    } else {
      start();
    }
    return () => {
      stop();
      if (io) io.disconnect();
    };
  }, [targetRef]);
}

/**
 * Create a Plot bound to a <canvas> and keep it sized to its container.
 * Returns a ref whose `.current` is the Plot instance (or null until mounted).
 *
 *   const plotRef = usePlot(canvasRef, { height: 300, ymin: 0, ymax: 10 });
 *   // in your draw loop: const p = plotRef.current; p?.clear(); p?.grid(); ...
 */
export function usePlot(canvasRef, options) {
  const plotRef = useRef(null);
  // Keep the latest options without re-creating the plot every render.
  const optsRef = useRef(options);
  optsRef.current = options;
  useEffect(() => {
    if (!canvasRef.current) return;
    const p = new Plot(canvasRef.current, optsRef.current);
    plotRef.current = p;
    const ro = new ResizeObserver(() => p.resize());
    ro.observe(canvasRef.current);
    return () => {
      ro.disconnect();
      plotRef.current = null;
    };
  }, [canvasRef]);
  return plotRef;
}
