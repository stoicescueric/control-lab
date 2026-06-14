/* Reusable canvas plotting for the demos.
   A small 2-D line/scatter plotter with axes, gridlines and crisp HiDPI
   rendering. Also exposes a Trace ring-buffer for scrolling time series. */
(function (global) {
  "use strict";

  const COLORS = {
    grid:  "rgba(255,255,255,0.07)",
    grid2: "rgba(255,255,255,0.14)",
    axis:  "rgba(255,255,255,0.35)",
    label: "#8294b8",
    brand: "#6f8bff",
    teal:  "#2fd3c0",
    amber: "#ffc24d",
    rose:  "#ff6f9c",
    green: "#5ce08a",
    violet:"#b08bff",
    white: "#e8eefc",
    faint: "rgba(255,255,255,0.5)",
  };

  function niceStep(range, target) {
    const raw = range / target;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    let step;
    if (norm < 1.5) step = 1;
    else if (norm < 3) step = 2;
    else if (norm < 7) step = 5;
    else step = 10;
    return step * mag;
  }

  class Plot {
    constructor(canvas, opts = {}) {
      this.canvas = typeof canvas === "string" ? document.getElementById(canvas) : canvas;
      this.ctx = this.canvas.getContext("2d");
      this.o = Object.assign({
        xmin: 0, xmax: 1, ymin: 0, ymax: 1,
        padL: 44, padR: 14, padT: 12, padB: 28,
        bg: "#0b1120",
        xLabel: "", yLabel: "",
        xTicks: true, yTicks: true,
        height: 280,
      }, opts);
      this.resize();
      window.addEventListener("resize", () => this.resize());
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const cssW = this.canvas.clientWidth || this.canvas.parentElement.clientWidth || 600;
      const cssH = this.o.height;
      this.canvas.style.height = cssH + "px";
      this.canvas.width = Math.round(cssW * dpr);
      this.canvas.height = Math.round(cssH * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.w = cssW; this.h = cssH;
    }

    setX(min, max) { this.o.xmin = min; this.o.xmax = max; }
    setY(min, max) { this.o.ymin = min; this.o.ymax = max; }

    // data -> pixel
    sx(x) {
      const { xmin, xmax, padL } = this.o;
      const w = this.w - padL - this.o.padR;
      return padL + ((x - xmin) / (xmax - xmin)) * w;
    }
    sy(y) {
      const { ymin, ymax, padT } = this.o;
      const h = this.h - padT - this.o.padB;
      return padT + (1 - (y - ymin) / (ymax - ymin)) * h;
    }
    // pixel -> data (for mouse interaction)
    ix(px) {
      const { xmin, xmax, padL } = this.o;
      const w = this.w - padL - this.o.padR;
      return xmin + ((px - padL) / w) * (xmax - xmin);
    }
    iy(py) {
      const { ymin, ymax, padT } = this.o;
      const h = this.h - padT - this.o.padB;
      return ymin + (1 - (py - padT) / h) * (ymax - ymin);
    }

    clear() {
      const c = this.ctx;
      c.fillStyle = this.o.bg;
      c.fillRect(0, 0, this.w, this.h);
    }

    grid() {
      const c = this.ctx, o = this.o;
      const x0 = this.sx(o.xmin), x1 = this.sx(o.xmax);
      const y0 = this.sy(o.ymin), y1 = this.sy(o.ymax);
      c.lineWidth = 1;
      c.font = "11px ui-monospace, monospace";
      c.fillStyle = COLORS.label;

      if (o.yTicks) {
        const step = niceStep(o.ymax - o.ymin, 4);
        const start = Math.ceil(o.ymin / step) * step;
        c.textAlign = "right"; c.textBaseline = "middle";
        for (let v = start; v <= o.ymax + 1e-9; v += step) {
          const py = this.sy(v);
          c.strokeStyle = Math.abs(v) < 1e-9 ? COLORS.grid2 : COLORS.grid;
          c.beginPath(); c.moveTo(x0, py); c.lineTo(x1, py); c.stroke();
          c.fillText(fmtNum(v), o.padL - 6, py);
        }
      }
      if (o.xTicks) {
        const step = niceStep(o.xmax - o.xmin, 6);
        const start = Math.ceil(o.xmin / step) * step;
        c.textAlign = "center"; c.textBaseline = "top";
        for (let v = start; v <= o.xmax + 1e-9; v += step) {
          const px = this.sx(v);
          c.strokeStyle = Math.abs(v) < 1e-9 ? COLORS.grid2 : COLORS.grid;
          c.beginPath(); c.moveTo(px, y1); c.lineTo(px, y0); c.stroke();
          c.fillText(fmtNum(v), px, this.h - o.padB + 6);
        }
      }
      // frame
      c.strokeStyle = COLORS.axis;
      c.strokeRect(x0, y1, x1 - x0, y0 - y1);

      if (o.yLabel) {
        c.save(); c.translate(12, (y0 + y1) / 2); c.rotate(-Math.PI / 2);
        c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = COLORS.label;
        c.fillText(o.yLabel, 0, 0); c.restore();
      }
      if (o.xLabel) {
        c.textAlign = "center"; c.textBaseline = "bottom"; c.fillStyle = COLORS.label;
        c.fillText(o.xLabel, (x0 + x1) / 2, this.h - 2);
      }
    }

    clip(fn) {
      const c = this.ctx, o = this.o;
      c.save();
      c.beginPath();
      c.rect(o.padL, o.padT, this.w - o.padL - o.padR, this.h - o.padT - o.padB);
      c.clip();
      fn();
      c.restore();
    }

    /* pts: array of [x,y]. opts: {color,width,dash,alpha} */
    line(pts, opts = {}) {
      if (!pts || pts.length < 2) return;
      const c = this.ctx;
      c.save();
      c.globalAlpha = opts.alpha ?? 1;
      c.strokeStyle = opts.color || COLORS.brand;
      c.lineWidth = opts.width || 2;
      c.lineJoin = "round"; c.lineCap = "round";
      if (opts.dash) c.setLineDash(opts.dash); else c.setLineDash([]);
      c.beginPath();
      c.moveTo(this.sx(pts[0][0]), this.sy(pts[0][1]));
      for (let i = 1; i < pts.length; i++) c.lineTo(this.sx(pts[i][0]), this.sy(pts[i][1]));
      c.stroke();
      c.restore();
    }

    /* shaded band: pts = [[x, yLow, yHigh], ...] */
    band(pts, color) {
      if (!pts || pts.length < 2) return;
      const c = this.ctx;
      c.save();
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(this.sx(pts[0][0]), this.sy(pts[0][1]));
      for (let i = 1; i < pts.length; i++) c.lineTo(this.sx(pts[i][0]), this.sy(pts[i][1]));
      for (let i = pts.length - 1; i >= 0; i--) c.lineTo(this.sx(pts[i][0]), this.sy(pts[i][2]));
      c.closePath(); c.fill();
      c.restore();
    }

    dots(pts, opts = {}) {
      const c = this.ctx, r = opts.r || 2.5;
      c.save();
      c.fillStyle = opts.color || COLORS.amber;
      c.globalAlpha = opts.alpha ?? 1;
      for (const p of pts) {
        c.beginPath(); c.arc(this.sx(p[0]), this.sy(p[1]), r, 0, 7); c.fill();
      }
      c.restore();
    }

    dot(x, y, opts = {}) {
      const c = this.ctx;
      c.save();
      c.fillStyle = opts.color || COLORS.white;
      c.beginPath(); c.arc(this.sx(x), this.sy(y), opts.r || 4, 0, 7); c.fill();
      if (opts.ring) { c.strokeStyle = opts.ring; c.lineWidth = opts.ringW || 2; c.stroke(); }
      c.restore();
    }

    hline(y, opts = {}) {
      const c = this.ctx;
      c.save();
      c.strokeStyle = opts.color || COLORS.faint;
      c.lineWidth = opts.width || 1.5;
      if (opts.dash) c.setLineDash(opts.dash);
      c.beginPath(); c.moveTo(this.sx(this.o.xmin), this.sy(y)); c.lineTo(this.sx(this.o.xmax), this.sy(y)); c.stroke();
      c.restore();
    }

    vline(x, opts = {}) {
      const c = this.ctx;
      c.save();
      c.strokeStyle = opts.color || COLORS.faint;
      c.lineWidth = opts.width || 1.5;
      if (opts.dash) c.setLineDash(opts.dash);
      c.beginPath(); c.moveTo(this.sx(x), this.sy(this.o.ymin)); c.lineTo(this.sx(x), this.sy(this.o.ymax)); c.stroke();
      c.restore();
    }

    text(x, y, str, opts = {}) {
      const c = this.ctx;
      c.save();
      c.fillStyle = opts.color || COLORS.white;
      c.font = opts.font || "12px ui-monospace, monospace";
      c.textAlign = opts.align || "left";
      c.textBaseline = opts.baseline || "alphabetic";
      c.fillText(str, this.sx(x), this.sy(y));
      c.restore();
    }
  }

  function fmtNum(v) {
    if (Math.abs(v) >= 1000) return (v / 1000) + "k";
    if (Math.abs(v) < 1e-9) return "0";
    const r = Math.round(v * 100) / 100;
    return String(r);
  }

  /* Ring buffer for scrolling time-series. push(value); returns [[t,v],...]. */
  class Trace {
    constructor(maxLen = 600) { this.maxLen = maxLen; this.data = []; }
    push(t, v) {
      this.data.push([t, v]);
      if (this.data.length > this.maxLen) this.data.shift();
    }
    clear() { this.data = []; }
    points() { return this.data; }
    last() { return this.data[this.data.length - 1]; }
  }

  global.Plot = Plot;
  global.Trace = Trace;
  global.PCOL = COLORS;
})(typeof window !== "undefined" ? window : globalThis);
