/* PID altitude-hold demo — a drone fighting gravity to a draggable target.
   The physics + drawing are ported from the legacy lessons/pid.html; the React
   wrapper supplies the canvas/animation hooks and slider state. Per-frame UI
   (meters, readout) is updated imperatively via refs to avoid re-rendering. */

import { useRef, useState } from "react";
import { Trace } from "../../lib/plot.js";
import { useDprCanvas, useRaf, usePlot } from "../../lib/canvas.js";
import { Demo, Stage, Controls, Buttons, Button, Legend } from "../../components/kit/Demo.jsx";
import { Slider } from "../../components/kit/Slider.jsx";

const g = 10,
  drag = 0.6,
  umax = 30,
  dt = 0.02,
  AMAX = 10;

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export default function Drone() {
  const [Kp, setKp] = useState(6);
  const [Ki, setKi] = useState(2);
  const [Kd, setKd] = useState(4);
  const gains = useRef({ Kp, Ki, Kd });
  gains.current = { Kp, Ki, Kd };

  const droneRef = useRef(null);
  const plotCanvas = useRef(null);
  const dsize = useDprCanvas(droneRef, 300);
  const plotRef = usePlot(plotCanvas, {
    height: 300,
    xmin: 0,
    xmax: 10,
    ymin: 0,
    ymax: 10,
    yLabel: "altitude (m)",
    xLabel: "seconds",
  });

  // imperatively-updated UI
  const barP = useRef(null),
    barI = useRef(null),
    barD = useRef(null);
  const numP = useRef(null),
    numI = useRef(null),
    numD = useRef(null);
  const roAlt = useRef(null),
    roTgt = useRef(null),
    roErr = useRef(null);

  const st = useRef({
    target: 6,
    y: 0.5,
    vy: 0,
    I: 0,
    gust: 0,
    t: 0,
    termP: 0,
    termI: 0,
    termD: 0,
    u: 0,
    altT: new Trace(700),
    tgtT: new Trace(700),
  });

  const acc = useRef(0);

  function reset() {
    const s = st.current;
    s.y = 0.5;
    s.vy = 0;
    s.I = 0;
    s.t = 0;
    s.altT.clear();
    s.tgtT.clear();
  }

  function setGains(p, i, d) {
    setKp(p);
    setKi(i);
    setKd(d);
    st.current.I = 0;
  }

  function step() {
    const s = st.current;
    const { Kp, Ki, Kd } = gains.current;
    s.t += dt;
    const e = s.target - s.y;
    s.termP = Kp * e;
    s.termI = Ki * s.I;
    s.termD = Kd * -s.vy;
    s.u = s.termP + s.termI + s.termD;
    const usat = Math.max(0, Math.min(umax, s.u));
    // anti-windup: don't integrate when pushing further into saturation
    if (!((usat < s.u && e > 0) || (usat > s.u && e < 0))) s.I += e * dt;
    s.I = Math.max(-15, Math.min(15, s.I));
    const a = usat - g - drag * s.vy + s.gust;
    s.gust *= 0.95;
    s.vy += a * dt;
    s.y += s.vy * dt;
    if (s.y < 0) {
      s.y = 0;
      s.vy = Math.max(0, s.vy);
    }
    if (s.y > AMAX) {
      s.y = AMAX;
      s.vy = Math.min(0, s.vy);
    }
    s.altT.push(s.t, s.y);
    s.tgtT.push(s.t, s.target);
  }

  const aToPy = (alt, h) => {
    const ground = h - 24,
      top = 20;
    return ground - (alt / AMAX) * (ground - top);
  };

  function drawDrone() {
    const canvas = droneRef.current;
    if (!canvas) return;
    const dx = canvas.getContext("2d");
    const { w, h } = dsize.current;
    const s = st.current;

    const grd = dx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#0d1530");
    grd.addColorStop(1, "#0b1120");
    dx.fillStyle = grd;
    dx.fillRect(0, 0, w, h);
    // ground
    dx.fillStyle = "#16203a";
    dx.fillRect(0, h - 24, w, 24);
    dx.strokeStyle = "#2a3656";
    dx.beginPath();
    dx.moveTo(0, h - 24);
    dx.lineTo(w, h - 24);
    dx.stroke();
    // target line
    const ty = aToPy(s.target, h);
    dx.strokeStyle = "#6f8bff";
    dx.lineWidth = 2;
    dx.setLineDash([8, 6]);
    dx.beginPath();
    dx.moveTo(0, ty);
    dx.lineTo(w, ty);
    dx.stroke();
    dx.setLineDash([]);
    dx.fillStyle = "#6f8bff";
    dx.font = "11px Inter, sans-serif";
    dx.textAlign = "left";
    dx.fillText("target " + s.target.toFixed(1) + " m", 8, ty - 6);
    // drone
    const cx = w / 2,
      cy = aToPy(s.y, h);
    const plume = Math.max(0, Math.min(1, s.u / umax));
    if (plume > 0.02) {
      const pg = dx.createLinearGradient(0, cy + 6, 0, cy + 6 + plume * 60);
      pg.addColorStop(0, "rgba(255,180,80,.9)");
      pg.addColorStop(1, "rgba(255,80,80,0)");
      dx.fillStyle = pg;
      dx.beginPath();
      dx.moveTo(cx - 14, cy + 8);
      dx.lineTo(cx + 14, cy + 8);
      dx.lineTo(cx + 6, cy + 8 + plume * 60);
      dx.lineTo(cx - 6, cy + 8 + plume * 60);
      dx.closePath();
      dx.fill();
    }
    dx.fillStyle = "#cfe0ff";
    dx.strokeStyle = "#6f8bff";
    dx.lineWidth = 2;
    roundRect(dx, cx - 16, cy - 7, 32, 15, 5);
    dx.fill();
    dx.strokeStyle = "#9fb4e6";
    dx.lineWidth = 3;
    dx.beginPath();
    dx.moveTo(cx - 16, cy - 2);
    dx.lineTo(cx - 30, cy - 8);
    dx.moveTo(cx + 16, cy - 2);
    dx.lineTo(cx + 30, cy - 8);
    dx.stroke();
    dx.strokeStyle = "#eaf0ff";
    dx.lineWidth = 2.5;
    dx.beginPath();
    dx.moveTo(cx - 30 - 8, cy - 9);
    dx.lineTo(cx - 30 + 8, cy - 7);
    dx.moveTo(cx + 30 - 8, cy - 7);
    dx.lineTo(cx + 30 + 8, cy - 9);
    dx.stroke();
    dx.fillStyle = "#6f8bff";
    dx.beginPath();
    dx.arc(cx - 30, cy - 8, 2.5, 0, 7);
    dx.arc(cx + 30, cy - 8, 2.5, 0, 7);
    dx.fill();
  }

  function setBar(el, val) {
    if (!el) return;
    const pct = Math.max(-1, Math.min(1, val / umax));
    const w = Math.abs(pct) * 50;
    el.style.width = w + "%";
    el.style.left = (pct >= 0 ? 50 : 50 - w) + "%";
  }

  function draw() {
    const s = st.current;
    const p = plotRef.current;
    if (p) {
      p.setX(Math.max(0, s.t - 10), Math.max(10, s.t));
      p.clear();
      p.grid();
      p.clip(() => {
        p.line(s.tgtT.points(), { color: "#6f8bff", width: 1.5, dash: [6, 5] });
        p.line(s.altT.points(), { color: "#5ce08a", width: 3 });
      });
    }
    drawDrone();
    setBar(barP.current, s.termP);
    setBar(barI.current, s.termI);
    setBar(barD.current, s.termD);
    if (numP.current) numP.current.textContent = s.termP.toFixed(1);
    if (numI.current) numI.current.textContent = s.termI.toFixed(1);
    if (numD.current) numD.current.textContent = s.termD.toFixed(1);
    if (roAlt.current) roAlt.current.textContent = s.y.toFixed(2) + " m";
    if (roTgt.current) roTgt.current.textContent = s.target.toFixed(2) + " m";
    if (roErr.current) roErr.current.textContent = (s.target - s.y).toFixed(2) + " m";
  }

  useRaf((frameDt) => {
    acc.current += Math.min(frameDt, 0.1);
    let k = 0;
    while (acc.current >= dt && k < 12) {
      step();
      acc.current -= dt;
      k++;
    }
    draw();
  });

  // dragging the target altitude
  function pointToTarget(ev) {
    const canvas = droneRef.current;
    const rect = canvas.getBoundingClientRect();
    const py = (ev.touches ? ev.touches[0].clientY : ev.clientY) - rect.top;
    const h = dsize.current.h,
      ground = h - 24,
      top = 20;
    let alt = ((ground - py) / (ground - top)) * AMAX;
    st.current.target = Math.max(0.5, Math.min(9.5, alt));
  }
  const dragging = useRef(false);

  return (
    <Demo title="PID altitude hold — drag the target!">
      <Stage split>
        <div>
          <canvas
            ref={droneRef}
            className="block w-full touch-none rounded-xl bg-[#0b1120]"
            onMouseDown={(e) => {
              dragging.current = true;
              pointToTarget(e);
            }}
            onMouseMove={(e) => dragging.current && pointToTarget(e)}
            onMouseUp={() => (dragging.current = false)}
            onMouseLeave={() => (dragging.current = false)}
            onTouchStart={(e) => {
              dragging.current = true;
              pointToTarget(e);
            }}
            onTouchMove={(e) => {
              if (dragging.current) {
                pointToTarget(e);
                e.preventDefault();
              }
            }}
            onTouchEnd={() => (dragging.current = false)}
          />
          <div className="mt-1.5 text-[0.82rem] text-[#8294b8]">
            ↕ Drag inside this box to move the target altitude.
          </div>
        </div>
        <div>
          <canvas ref={plotCanvas} className="block w-full rounded-xl bg-[#0b1120]" />
          <Legend
            items={[
              { color: "#6f8bff", label: "Target", dot: true },
              { color: "#5ce08a", label: "Altitude" },
            ]}
          />
        </div>
      </Stage>

      <Controls>
        <Slider label="Kp — Proportional" value={Kp} min={0} max={16} step={0.1} onChange={setKp} format={(v) => v.toFixed(1)} />
        <Slider label="Ki — Integral" value={Ki} min={0} max={8} step={0.1} onChange={setKi} format={(v) => v.toFixed(1)} />
        <Slider label="Kd — Derivative" value={Kd} min={0} max={10} step={0.1} onChange={setKd} format={(v) => v.toFixed(1)} />
      </Controls>

      {/* live term meters */}
      <div className="mt-4 grid gap-2.5">
        {[
          ["P term", "#5ce08a", barP, numP],
          ["I term", "#ffc24d", barI, numI],
          ["D term", "#6f8bff", barD, numD],
        ].map(([name, color, fill, num]) => (
          <div key={name} className="grid grid-cols-[84px_1fr_64px] items-center gap-2.5">
            <span className="text-[0.85rem] font-bold" style={{ color }}>
              {name}
            </span>
            <div className="relative h-3 overflow-hidden rounded-md bg-[#1a2440] after:absolute after:bottom-0 after:left-1/2 after:top-0 after:w-px after:bg-white/25 after:content-['']">
              <div ref={fill} className="absolute bottom-0 top-0 rounded-md" style={{ background: color }} />
            </div>
            <span ref={num} className="text-right font-mono text-[0.82rem] text-white">
              0
            </span>
          </div>
        ))}
      </div>

      <Buttons>
        <Button onClick={() => setGains(6, 0, 0)}>P only</Button>
        <Button onClick={() => setGains(6, 0, 4)}>PD</Button>
        <Button primary onClick={() => setGains(6, 2, 4)}>
          PID (tuned)
        </Button>
        <Button onClick={() => setGains(14, 3, 2)}>Too much Kp 🔥</Button>
        <Button onClick={() => (st.current.gust -= 22)}>🌬️ Wind gust</Button>
        <Button onClick={reset}>↺ Reset</Button>
      </Buttons>

      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>
          Altitude: <b ref={roAlt} className="text-white">—</b>
        </span>
        <span>
          Target: <b ref={roTgt} className="text-white">—</b>
        </span>
        <span>
          Error: <b ref={roErr} className="text-white">—</b>
        </span>
      </div>
    </Demo>
  );
}
