/* Exponential low-pass filter: estimate += α·(measurement − estimate).
   Ported from legacy lessons/low-pass.html. */

import { useRef, useState } from "react";
import { Trace } from "../../lib/plot.js";
import { usePlot, useRaf } from "../../lib/canvas.js";
import { Demo, Buttons, Button, Legend } from "../../components/kit/Demo.jsx";
import { Slider } from "../../components/kit/Slider.jsx";

function randn() {
  let u = 0,
    v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export default function LowPass() {
  const [alpha, setAlpha] = useState(0.15);
  const [noise, setNoise] = useState(1.1);
  const ctrl = useRef({ alpha, noise });
  ctrl.current = { alpha, noise };

  const canvas = useRef(null);
  const plotRef = usePlot(canvas, { height: 290, xmin: 0, xmax: 12, ymin: -5, ymax: 7, yLabel: "value" });
  const lagEl = useRef(null);
  const residEl = useRef(null);

  const st = useRef({
    t: 0,
    est: 0,
    stepOffset: 0,
    lag: 0.5,
    trueT: new Trace(800),
    measT: new Trace(800),
    filtT: new Trace(800),
  });
  const acc = useRef(0);

  function step(dt) {
    const s = st.current;
    const { alpha, noise } = ctrl.current;
    s.t += dt;
    const truth = 2.2 * Math.sin(s.t * 0.7) + s.stepOffset;
    const m = truth + noise * randn();
    s.est = s.est + alpha * (m - s.est);
    s.trueT.push(s.t, truth);
    s.measT.push(s.t, m);
    s.filtT.push(s.t, s.est);
    s.lag = dt / Math.max(alpha, 1e-3);
  }

  function draw() {
    const s = st.current;
    const p = plotRef.current;
    if (p) {
      p.setX(Math.max(0, s.t - 12), Math.max(12, s.t));
      p.clear();
      p.grid();
      p.clip(() => {
        p.line(s.trueT.points(), { color: "#2fd3c0", width: 2, alpha: 0.65 });
        p.dots(s.measT.points(), { color: "#ffc24d", r: 2.1, alpha: 0.8 });
        p.line(s.filtT.points(), { color: "#6f8bff", width: 3 });
      });
    }
    if (lagEl.current) lagEl.current.textContent = "≈ " + s.lag.toFixed(2) + " s";
    const pts = s.filtT.points(),
      tp = s.trueT.points();
    let sum = 0,
      n = 0;
    for (let i = Math.max(0, pts.length - 120); i < pts.length; i++) {
      sum += Math.abs(pts[i][1] - tp[i][1]);
      n++;
    }
    if (residEl.current) residEl.current.textContent = n ? (sum / n).toFixed(2) : "—";
  }

  useRaf((frameDt) => {
    acc.current += Math.min(frameDt, 0.05);
    const dt = 1 / 60;
    let k = 0;
    while (acc.current >= dt && k < 6) {
      step(dt * 1.5);
      acc.current -= dt;
      k++;
    }
    draw();
  });

  return (
    <Demo title="Exponential low-pass filter">
      <canvas ref={canvas} className="block w-full rounded-xl bg-[#0b1120]" />
      <Legend
        items={[
          { color: "#2fd3c0", label: "True signal" },
          { color: "#ffc24d", label: "Noisy sensor", dot: true },
          { color: "#6f8bff", label: "Filtered output" },
        ]}
      />
      <div className="mt-4 grid gap-x-[22px] gap-y-3.5 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <div>
          <Slider label="Smoothing α" value={alpha} min={0.02} max={1} step={0.01} onChange={setAlpha} format={(v) => v.toFixed(2)} />
          <div className="mt-1 text-[0.74rem] text-[#8294b8]">Left = smoother & slower · Right = snappier & noisier</div>
        </div>
        <Slider label="Sensor noise" value={noise} min={0} max={3} step={0.05} onChange={setNoise} format={(v) => v.toFixed(2)} />
      </div>
      <Buttons>
        <Button onClick={() => (st.current.stepOffset = st.current.stepOffset > 1 ? 0 : 3.5)}>⬆️ Sudden jump (step test)</Button>
      </Buttons>
      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>Lag: <b ref={lagEl} className="text-white">—</b></span>
        <span>Noise left in output: <b ref={residEl} className="text-white">—</b></span>
      </div>
    </Demo>
  );
}
