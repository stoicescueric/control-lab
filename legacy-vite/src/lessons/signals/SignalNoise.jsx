/* A noisy sensor: the true signal (green) plus jitter, drift, and spikes shows
   up as scattered sensor dots (amber). Ported from legacy lessons/signals.html. */

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

export default function SignalNoise() {
  const [noise, setNoise] = useState(1.2);
  const [drift, setDrift] = useState(0);
  const [freq, setFreq] = useState(0.8);
  const ctrl = useRef({ noise, drift, freq });
  ctrl.current = { noise, drift, freq };

  const canvas = useRef(null);
  const plotRef = usePlot(canvas, { height: 290, xmin: 0, xmax: 10, ymin: -6, ymax: 6, yLabel: "value" });
  const snr = useRef(null);

  const st = useRef({ t: 0, spike: 0, bias: 0, trueT: new Trace(700), measT: new Trace(700) });
  const acc = useRef(0);

  function step(dt) {
    const s = st.current;
    const { noise, drift, freq } = ctrl.current;
    s.t += dt;
    const truth = 3 * Math.sin(s.t * freq) + 1.2 * Math.sin(s.t * freq * 2.3 + 1);
    s.bias += drift * dt;
    const m = truth + s.bias + noise * randn() + s.spike;
    s.spike *= 0.55;
    s.trueT.push(s.t, truth);
    s.measT.push(s.t, m);
  }

  function draw() {
    const s = st.current;
    const p = plotRef.current;
    if (p) {
      p.setX(Math.max(0, s.t - 10), Math.max(10, s.t));
      p.clear();
      p.grid();
      p.clip(() => {
        p.line(s.trueT.points(), { color: "#2fd3c0", width: 3 });
        p.dots(s.measT.points(), { color: "#ffc24d", r: 2.3, alpha: 0.9 });
      });
    }
    const v = ctrl.current.noise < 0.05 ? 99 : 2.4 / ctrl.current.noise;
    if (snr.current) snr.current.textContent = v >= 99 ? "∞" : v.toFixed(1);
  }

  useRaf((frameDt) => {
    acc.current += Math.min(frameDt, 0.05);
    const dt = 1 / 60;
    let n = 0;
    while (acc.current >= dt && n < 6) {
      step(dt * 1.6);
      acc.current -= dt;
      n++;
    }
    draw();
  });

  return (
    <Demo title="Build a noisy sensor">
      <canvas ref={canvas} className="block w-full rounded-xl bg-[#0b1120]" />
      <Legend
        items={[
          { color: "#2fd3c0", label: "True signal (hidden in real life)" },
          { color: "#ffc24d", label: "Sensor reading", dot: true },
        ]}
      />
      <div className="mt-4 grid gap-x-[22px] gap-y-3.5 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <div>
          <Slider label="Random noise" value={noise} min={0} max={4} step={0.05} onChange={setNoise} format={(v) => v.toFixed(2)} />
          <div className="mt-1 text-[0.74rem] text-[#8294b8]">How shaky the sensor is.</div>
        </div>
        <div>
          <Slider label="Drift / bias" value={drift} min={0} max={1} step={0.02} onChange={setDrift} format={(v) => v.toFixed(2)} />
          <div className="mt-1 text-[0.74rem] text-[#8294b8]">A slow lean away from the truth.</div>
        </div>
        <Slider label="Signal speed" value={freq} min={0.2} max={2.5} step={0.05} onChange={setFreq} format={(v) => v.toFixed(2) + "×"} />
      </div>
      <Buttons>
        <Button onClick={() => (st.current.spike += (Math.random() > 0.5 ? 1 : -1) * 6)}>⚡ Inject a spike</Button>
      </Buttons>
      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>Signal-to-noise: <b ref={snr} className="text-white">—</b> (higher = cleaner)</span>
      </div>
    </Demo>
  );
}
