/* Loop-rate / sampling demo. A smooth "true" signal vs. what a robot loop
   actually sees: samples taken every dt seconds and held until the next loop.
   Crank dt up (slower loop) and watch the staircase get blocky — and, past the
   Nyquist limit, alias completely. */

import {useRef, useState} from 'react';
import {usePlot, useRaf} from '@site/src/lib/canvas';
import {Demo, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const W = 4; // seconds shown

export default function LoopRate() {
  const [dtMs, setDtMs] = useState(50);
  const [freq, setFreq] = useState(0.7);
  const ctrl = useRef({dtMs, freq});
  ctrl.current = {dtMs, freq};

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const plotRef = usePlot(canvas, {
    height: 300,
    xmin: 0,
    xmax: W,
    ymin: -1.25,
    ymax: 1.25,
    yLabel: 'signal',
    xLabel: 'seconds',
  });

  const roRate = useRef<HTMLElement | null>(null);
  const roSpw = useRef<HTMLElement | null>(null);
  const roStatus = useRef<HTMLElement | null>(null);

  function draw(now: number) {
    const p = plotRef.current;
    if (!p) return;
    const {dtMs, freq} = ctrl.current;
    const dts = dtMs / 1000;
    const f = (t: number) => Math.sin(2 * Math.PI * freq * t);

    p.setX(0, W);
    p.clear();
    p.grid();
    p.clip(() => {
      // true continuous signal
      const pts: [number, number][] = [];
      for (let t = 0; t <= W + 1e-9; t += 0.01) pts.push([t, f(t)]);
      p.line(pts, {color: '#5ce08a', width: 2, alpha: 0.55});

      // sample-and-hold staircase (what the robot loop actually uses)
      const stair: [number, number][] = [];
      const dots: [number, number][] = [];
      for (let k = 0; k * dts <= W + 1e-9; k++) {
        const tk = k * dts;
        const v = f(tk);
        stair.push([tk, v]);
        stair.push([Math.min((k + 1) * dts, W), v]);
        dots.push([tk, v]);
      }
      p.line(stair, {color: '#ffc24d', width: 2.5});
      p.dots(dots, {color: '#ffc24d', r: 3});

      // moving "now" cursor + the value the loop is currently holding
      const tc = (now / 1000) % W;
      const held = f(Math.floor(tc / dts) * dts);
      p.vline(tc, {color: '#6f8bff', dash: [4, 4], width: 1});
      p.dot(tc, held, {color: '#6f8bff', r: 4, ring: '#fff'});
    });

    const rate = 1000 / dtMs;
    const spw = rate / freq; // samples per oscillation
    if (roRate.current) roRate.current.textContent = rate.toFixed(0) + ' Hz';
    if (roSpw.current) roSpw.current.textContent = spw.toFixed(1);
    if (roStatus.current) {
      if (spw < 2) {
        roStatus.current.textContent = 'aliasing! (< 2 / wave)';
        roStatus.current.style.color = '#ff6f9c';
      } else if (spw < 6) {
        roStatus.current.textContent = 'coarse';
        roStatus.current.style.color = '#ffc24d';
      } else {
        roStatus.current.textContent = 'good';
        roStatus.current.style.color = '#5ce08a';
      }
    }
  }

  useRaf((_: number, now: number) => draw(now));

  return (
    <Demo title="What your robot loop actually sees">
      <canvas ref={canvas} className="block w-full rounded-xl bg-[#0b1120]" />
      <Legend
        items={[
          {color: '#5ce08a', label: 'true (continuous) signal'},
          {color: '#ffc24d', label: 'sampled & held every dt'},
          {color: '#6f8bff', label: 'now', dot: true},
        ]}
      />
      <div className="mt-4 grid gap-x-[22px] gap-y-3.5 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <div>
          <Slider label="Loop period dt" value={dtMs} min={5} max={300} step={5} onChange={setDtMs} format={(v) => v + ' ms'} />
          <div className="mt-1 text-[0.74rem] text-[#8294b8]">A typical FTC loop is ~20–50 ms.</div>
        </div>
        <Slider label="Signal frequency" value={freq} min={0.3} max={2} step={0.1} onChange={setFreq} format={(v) => v.toFixed(1) + ' Hz'} />
      </div>
      <div className="mt-3 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>Loop rate: <b ref={roRate} className="text-white">—</b></span>
        <span>Samples / wave: <b ref={roSpw} className="text-white">—</b></span>
        <span>Quality: <b ref={roStatus} className="text-white">—</b></span>
      </div>
    </Demo>
  );
}
