/* Velocity control: feedforward + PID vs PID-only, on a spin-up flywheel.
   Ported from the legacy lessons/feedforward.html. Toggle FF to see the lag
   (and steady-state error) appear. */

import { useRef, useState } from "react";
import { Trace } from "../../lib/plot.js";
import { usePlot, useRaf } from "../../lib/canvas.js";
import { Demo, Buttons, Button, Legend } from "../../components/kit/Demo.jsx";
import { Slider } from "../../components/kit/Slider.jsx";

// true plant constants (what the motor really obeys)
const kS_true = 0.7,
  kV_true = 2.4,
  kA_true = 0.5,
  kS_c = 0.7;
const dt = 1 / 200;

export default function Flywheel() {
  const [goal, setGoal] = useState(3);
  const [kVc, setKVc] = useState(2.4);
  const [kP, setKP] = useState(2);
  const [ffOn, setFfOn] = useState(true);

  const ctrl = useRef({ goal, kVc, kP, ffOn });
  ctrl.current = { goal, kVc, kP, ffOn };

  const canvas = useRef(null);
  const plotRef = usePlot(canvas, {
    height: 300,
    xmin: 0,
    xmax: 6,
    ymin: 0,
    ymax: 4.5,
    yLabel: "speed (m/s)",
    xLabel: "seconds",
  });

  const barFF = useRef(null),
    barFB = useRef(null),
    numFF = useRef(null),
    numFB = useRef(null);
  const roV = useRef(null),
    roT = useRef(null),
    roE = useRef(null),
    roVolt = useRef(null);

  const st = useRef({
    vFF: 0,
    vPB: 0,
    t: 0,
    loadFF: 0,
    loadPB: 0,
    lastFF: 0,
    lastFB: 0,
    lastV: 0,
    tFF: new Trace(1500),
    tPB: new Trace(1500),
    tGoal: new Trace(1500),
  });
  const acc = useRef(0);

  function reset() {
    const s = st.current;
    s.vFF = 0;
    s.vPB = 0;
    s.t = 0;
    s.loadFF = 0;
    s.loadPB = 0;
    s.tFF.clear();
    s.tPB.clear();
    s.tGoal.clear();
  }

  function plant(v, V, load) {
    // first-order motor: a = (V - kV*v - kS*sign(v) - load) / kA
    const drag = kV_true * v + kS_true * Math.sign(v || 1) + load;
    const a = (V - drag) / kA_true;
    return v + a * dt;
  }

  function step() {
    const s = st.current;
    const { goal, kVc, kP, ffOn } = ctrl.current;
    s.t += dt;
    // --- FF + PID controller ---
    const eF = goal - s.vFF;
    const ff = ffOn ? kS_c * Math.sign(goal || 1) + kVc * goal : 0;
    const fb = kP * eF;
    let V = Math.max(-12, Math.min(12, ff + fb));
    s.lastFF = ff;
    s.lastFB = V - ff;
    s.lastV = V;
    s.vFF = plant(s.vFF, V, s.loadFF);
    // --- PID-only controller (same kP), for comparison ---
    let V2 = Math.max(-12, Math.min(12, kP * (goal - s.vPB)));
    s.vPB = plant(s.vPB, V2, s.loadPB);
    s.loadFF *= 0.99;
    s.loadPB *= 0.99;
    s.tGoal.push(s.t, goal);
    s.tFF.push(s.t, s.vFF);
    s.tPB.push(s.t, s.vPB);
  }

  function setBar(el, val) {
    if (el) el.style.width = Math.max(0, Math.min(1, Math.abs(val) / 12)) * 100 + "%";
  }

  function draw() {
    const s = st.current;
    const p = plotRef.current;
    if (p) {
      p.setX(Math.max(0, s.t - 6), Math.max(6, s.t));
      p.clear();
      p.grid();
      p.clip(() => {
        p.line(s.tGoal.points(), { color: "#6f8bff", width: 1.5, dash: [6, 5] });
        p.line(s.tPB.points(), { color: "#ff6f9c", width: 2 });
        p.line(s.tFF.points(), { color: "#5ce08a", width: 3 });
      });
    }
    setBar(barFF.current, s.lastFF);
    setBar(barFB.current, s.lastFB);
    if (numFF.current) numFF.current.textContent = s.lastFF.toFixed(1) + " V";
    if (numFB.current) numFB.current.textContent = s.lastFB.toFixed(1) + " V";
    if (roV.current) roV.current.textContent = s.vFF.toFixed(2) + " m/s";
    if (roT.current) roT.current.textContent = ctrl.current.goal.toFixed(2) + " m/s";
    if (roE.current) roE.current.textContent = (ctrl.current.goal - s.vFF).toFixed(2) + " m/s";
    if (roVolt.current) roVolt.current.textContent = s.lastV.toFixed(2) + " V";
  }

  useRaf((frameDt) => {
    acc.current += Math.min(frameDt, 0.1);
    let k = 0;
    while (acc.current >= dt && k < 60) {
      step();
      acc.current -= dt;
      k++;
    }
    draw();
  });

  return (
    <Demo title="Velocity control — feedforward vs. PID-only">
      <canvas ref={canvas} className="block w-full rounded-xl bg-[#0b1120]" />
      <Legend
        items={[
          { color: "#6f8bff", label: "Target", dot: true },
          { color: "#5ce08a", label: "Speed (FF + PID)" },
          { color: "#ff6f9c", label: "Speed (PID only)" },
        ]}
      />

      <div className="mt-4 grid gap-x-[22px] gap-y-3.5 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <Slider label="Target speed" value={goal} min={0} max={4} step={0.1} onChange={setGoal} format={(v) => v.toFixed(1) + " m/s"} />
        <div>
          <Slider label="kV (your estimate)" value={kVc} min={0} max={4} step={0.05} onChange={setKVc} format={(v) => v.toFixed(2)} />
          <div className="mt-1 text-[0.74rem] text-[#8294b8]">True value ≈ 2.40. Try mistuning it.</div>
        </div>
        <Slider label="kP (feedback)" value={kP} min={0} max={12} step={0.1} onChange={setKP} format={(v) => v.toFixed(1)} />
      </div>

      <div className="mt-4 grid gap-2.5">
        {[
          ["Feedforward", "#5ce08a", barFF, numFF],
          ["PID", "#ffc24d", barFB, numFB],
        ].map(([name, color, fill, num]) => (
          <div key={name} className="grid grid-cols-[96px_1fr_70px] items-center gap-2.5">
            <span className="text-[0.85rem] font-bold" style={{ color }}>
              {name}
            </span>
            <div className="relative h-3.5 overflow-hidden rounded-[7px] bg-[#1a2440]">
              <div ref={fill} className="absolute bottom-0 left-0 top-0 rounded-[7px]" style={{ background: color }} />
            </div>
            <span ref={num} className="text-right font-mono text-[0.82rem] text-white">
              0 V
            </span>
          </div>
        ))}
      </div>

      <Buttons>
        <Button primary={ffOn} active={ffOn} onClick={() => setFfOn((v) => !v)}>
          Feedforward: {ffOn ? "ON" : "OFF"}
        </Button>
        <Button
          onClick={() => {
            const s = st.current;
            s.vFF = 0;
            s.vPB = 0;
            s.t = 0;
            s.tFF.clear();
            s.tPB.clear();
            s.tGoal.clear();
          }}
        >
          ⤓ Step the target
        </Button>
        <Button
          onClick={() => {
            st.current.loadFF += 5;
            st.current.loadPB += 5;
          }}
        >
          🏋️ Sudden load
        </Button>
        <Button onClick={reset}>↺ Reset</Button>
      </Buttons>

      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>Speed: <b ref={roV} className="text-white">—</b></span>
        <span>Target: <b ref={roT} className="text-white">—</b></span>
        <span>Error: <b ref={roE} className="text-white">—</b></span>
        <span>Voltage: <b ref={roVolt} className="text-white">—</b></span>
      </div>
    </Demo>
  );
}
