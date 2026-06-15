/* Sliding-window average of the last N readings.
   Ported from legacy lessons/moving-average.html. */

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

export default function MovingAverage() {
  const [N, setN] = useState(12);
  const [noise, setNoise] = useState(1.1);
  const ctrl = useRef({ N, noise });
  ctrl.current = { N, noise };

  const canvas = useRef(null);
  const plotRef = usePlot(canvas, { height: 290, xmin: 0, xmax: 12, ymin: -5, ymax: 7, yLabel: "value" });
  const lagEl = useRef(null);

  const st = useRef({
    t: 0,
    stepOffset: 0,
    buf: [],
    trueT: new Trace(800),
    measT: new Trace(800),
    maT: new Trace(800),
  });
  const acc = useRef(0);

  function step(dt) {
    const s = st.current;
    const { N, noise } = ctrl.current;
    s.t += dt;
    const truth = 2.2 * Math.sin(s.t * 0.7) + s.stepOffset;
    const m = truth + noise * randn();
    s.buf.push(m);
    while (s.buf.length > N) s.buf.shift();
    let sum = 0;
    for (const v of s.buf) sum += v;
    s.trueT.push(s.t, truth);
    s.measT.push(s.t, m);
    s.maT.push(s.t, sum / s.buf.length);
  }

  function draw() {
    const s = st.current;
    const p = plotRef.current;
    if (p) {
      p.setX(Math.max(0, s.t - 12), Math.max(12, s.t));
      p.clear();
      p.grid();
      p.clip(() => {
        p.line(s.trueT.points(), { color: "#2fd3c0", width: 2, alpha: 0.6 });
        p.dots(s.measT.points(), { color: "#ffc24d", r: 2.1, alpha: 0.8 });
        p.line(s.maT.points(), { color: "#5ce08a", width: 3 });
      });
    }
    if (lagEl.current) lagEl.current.textContent = (ctrl.current.N * 0.025).toFixed(2) + " s";
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
    <Demo title="Sliding-window average">
      <canvas ref={canvas} className="block w-full rounded-xl bg-[#0b1120]" />
      <Legend
        items={[
          { color: "#2fd3c0", label: "True signal" },
          { color: "#ffc24d", label: "Noisy sensor", dot: true },
          { color: "#5ce08a", label: "Moving average" },
        ]}
      />
      <div className="mt-4 grid gap-x-[22px] gap-y-3.5 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <div>
          <Slider label="Window size N" value={N} min={1} max={80} step={1} onChange={setN} format={(v) => v + " readings"} />
          <div className="mt-1 text-[0.74rem] text-[#8294b8]">More readings = smoother but laggier.</div>
        </div>
        <Slider label="Sensor noise" value={noise} min={0} max={3} step={0.05} onChange={setNoise} format={(v) => v.toFixed(2)} />
      </div>
      <Buttons>
        <Button onClick={() => (st.current.stepOffset = st.current.stepOffset > 1 ? 0 : 3.5)}>⬆️ Sudden jump (step test)</Button>
      </Buttons>
      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>Window covers ≈ <b ref={lagEl} className="text-white">—</b> of data</span>
      </div>
    </Demo>
  );
}
