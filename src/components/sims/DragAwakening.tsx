/* MODULE 1 — "The Drag Awakening"
   ------------------------------------------------------------------
   Vacuum kinematics overpredict the range of a light 127 mm projectile
   because aerodynamic drag is 0.3–0.7x gravity over the 3–12 m/s band
   (Stoicescu, "Real-Time Trajectory Compensation…", §3). This demo draws
   the two trajectories side by side so the gap is impossible to miss.

   The physics (quadratic drag, RK4 integration, the SI constants from the
   paper) lives in lib/projectile so every Module 6 sim shares one model; this
   file is just the SVG view. Pure React + SVG, so it is SSR-safe. */

import {useState} from 'react';
import {Demo, Controls, Readout, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';
import {DRAG_K, G, H0, H_RIM, type Pt, simulateDrag, simulateVacuum} from '@site/src/lib/projectile';

export default function DragAwakening() {
  const [v0, setV0] = useState(8);
  const [angDeg, setAngDeg] = useState(55);
  const ang = (angDeg * Math.PI) / 180;

  const vac = simulateVacuum(v0, ang);
  const drag = simulateDrag({v0, angle: ang});
  const errAbs = vac.range - drag.range; // metres shorter than vacuum predicts
  const errPct = (errAbs / vac.range) * 100; // %, the headline number

  // ---- world → SVG mapping (axes auto-fit, lightly padded) ----
  const W = 640;
  const Hsvg = 380;
  const padL = 46;
  const padR = 18;
  const padT = 16;
  const padB = 30;
  const xMax = Math.max(6, Math.min(15, vac.range * 1.08));
  const yMax = Math.max(2, Math.min(4.5, vac.apex * 1.18));
  const sx = (xm: number) => padL + (xm / xMax) * (W - padL - padR);
  const sy = (ym: number) => padT + (1 - ym / yMax) * (Hsvg - padT - padB);
  const toPath = (pts: Pt[]) => 'M ' + pts.map((p) => `${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' L ');

  // aperture marker: the spot the vacuum model expects the ball to clear
  const apX = vac.rimCross ?? vac.range;

  // axis ticks (whole metres)
  const xTicks = Array.from({length: Math.floor(xMax) + 1}, (_, i) => i);

  return (
    <Demo title="The Drag Awakening — vacuum math vs. the real ball">
      <svg
        viewBox={`0 0 ${W} ${Hsvg}`}
        className="block h-auto w-full rounded-xl bg-[#0b1120]"
        role="img"
        aria-label="Side view of two projectile trajectories: a vacuum prediction and the shorter drag-corrected flight.">
        {/* ground */}
        <line x1={sx(0)} y1={sy(0)} x2={sx(xMax)} y2={sy(0)} stroke="#3b4a6b" strokeWidth="2" />
        {/* x grid + labels */}
        {xTicks.map((m) => (
          <g key={m}>
            <line x1={sx(m)} y1={sy(0)} x2={sx(m)} y2={sy(yMax)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={sx(m)} y={sy(0) + 18} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#6b7a9c">
              {m}m
            </text>
          </g>
        ))}

        {/* aperture rim reference height */}
        <line x1={sx(0)} y1={sy(H_RIM)} x2={sx(xMax)} y2={sy(H_RIM)} stroke="#2a3656" strokeWidth="1.5" strokeDasharray="3 5" />
        <text x={sx(0) + 6} y={sy(H_RIM) - 5} fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#6b7a9c">
          aperture rim 0.984 m
        </text>

        {/* the target aperture the naive model aims for (a small hoop at rim height) */}
        <g>
          <ellipse cx={sx(apX)} cy={sy(H_RIM)} rx="5" ry="11" fill="none" stroke="#ffc24d" strokeWidth="3" />
          <line x1={sx(apX)} y1={sy(H_RIM) + 11} x2={sx(apX)} y2={sy(0)} stroke="#ffc24d" strokeWidth="1" strokeDasharray="2 4" opacity="0.5" />
        </g>

        {/* trajectories */}
        <path d={toPath(vac.pts)} fill="none" stroke="#8294b8" strokeWidth="2.5" strokeDasharray="7 6" />
        <path d={toPath(drag.pts)} fill="none" stroke="#6f8bff" strokeWidth="3.5" strokeLinecap="round" />

        {/* landing markers */}
        <circle cx={sx(vac.range)} cy={sy(0)} r="4" fill="#8294b8" />
        <circle cx={sx(drag.range)} cy={sy(0)} r="5.5" fill="#6f8bff" />

        {/* shortfall bracket along the ground */}
        {errAbs > 0.05 && (
          <g>
            <line x1={sx(drag.range)} y1={sy(0) + 9} x2={sx(vac.range)} y2={sy(0) + 9} stroke="#ff6f9c" strokeWidth="2" />
            <text
              x={sx((drag.range + vac.range) / 2)}
              y={sy(0) + 24}
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize="12"
              fill="#ff6f9c">
              −{errAbs.toFixed(2)} m
            </text>
          </g>
        )}

        {/* launcher */}
        <rect x={sx(0) - 12} y={sy(H0) - 6} width="14" height={sy(0) - sy(H0) + 6} rx="2" fill="#2a3656" />
      </svg>

      <Controls>
        <Slider label="Exit velocity" min={3} max={12} step={0.1} value={v0} onChange={setV0} format={(v) => `${(+v).toFixed(1)} m/s`} />
        <Slider label="Launch angle" min={30} max={75} step={1} value={angDeg} onChange={setAngDeg} format={(v) => `${v}°`} />
      </Controls>

      <Readout
        items={[
          ['Vacuum range', `${vac.range.toFixed(2)} m`],
          ['Drag range', `${drag.range.toFixed(2)} m`],
          ['Range error', `−${errAbs.toFixed(2)} m  (${errPct.toFixed(1)}% short)`],
          ['Drag / weight', `${((DRAG_K * v0 * v0) / G).toFixed(2)}·mg @ exit`],
        ]}
      />
      <Legend
        items={[
          {color: '#8294b8', label: 'vacuum model (no drag)'},
          {color: '#6f8bff', label: 'drag model — RK4, Cd = 0.47'},
          {color: '#ffc24d', label: 'aperture the naive model aims for', dot: true},
          {color: '#ff6f9c', label: 'how far the real ball falls short'},
        ]}
      />
    </Demo>
  );
}
