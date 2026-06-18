/* MODULE 3 — "Shoot-On-The-Move" (SOTM)
   ------------------------------------------------------------------
   A moving robot can't aim at the real target: the projectile inherits the
   robot's velocity, so it lands offset by v_R · (flight time). The turret
   must aim at a VIRTUAL target shifted to cancel that lead. But the shift
   depends on flight time, flight time depends on distance, and distance
   depends on the shifted target — a loop with no closed form. A fixed-point
   iteration solves it in 2–3 rounds (Stoicescu §7.4–7.6):

       p_v⁽⁰⁾ = p_goal
       p_v⁽ᵏ⁾ = p_goal + G · v_R · (t_d + t_f⁽ᵏ⁻¹⁾)      (G = 0.9, t_d = 0.05 s)
       stop when |t_f⁽ᵏ⁾ − t_f⁽ᵏ⁻¹⁾| < 0.05 s

   Drag the robot (or click it and use WASD / arrows) and drag the cyan
   velocity arrow. Watch the green virtual target lead the orange real one,
   and watch the solver converge in the debug panel. Distances are in inches
   to match the paper's deployed constants. Pure React + SVG (SSR-safe). */

import {useRef, useState} from 'react';
import {Controls, Demo, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

type V = {x: number; y: number};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const sub = (a: V, b: V): V => ({x: a.x - b.x, y: a.y - b.y});
const dist = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y);

// ---- deployed constants (paper §7.5, Table 2) ----
const G = 0.9; // SOTM_GAIN — accounts for the non-ballistic spin-up phase
const TD = 0.05; // feeder delay t_d (s)
const FIELD = 144; // 12-ft field, inches
const V_MAX = 137.8; // 3.5 m/s base-velocity envelope, in in/s
const ARROW_K = 0.34; // arrow length: field-inches drawn per (in/s) of speed

/* Time-of-flight LUT, linearised from the deployed TOF table
   (d = 95 in → 0.80 s, 113 in → 0.96 s; paper Table 2). Monotone in d. */
function tof(dIn: number) {
  return clamp(-0.044 + 0.00889 * dIn, 0.3, 2.2);
}

type Iter = {k: number; pv: V; d: number; tf: number; T: number | null; delta: number | null; done: boolean};

/* The fixed-point solver, exactly as Sensors.update() runs it (≤ 5 rounds). */
function solveSOTM(pshooter: V, pgoal: V, vR: V) {
  const iters: Iter[] = [];
  // Iteration 0: aim straight at the real target, read its flight time
  let pv: V = {...pgoal};
  let d = dist(pv, pshooter);
  let tf = tof(d);
  iters.push({k: 0, pv, d, tf, T: null, delta: null, done: false});

  for (let k = 1; k <= 5; k++) {
    const T = TD + tf; // total lead time
    const pvNew: V = {x: pgoal.x + G * vR.x * T, y: pgoal.y + G * vR.y * T}; // shift by robot motion
    const dNew = dist(pvNew, pshooter);
    const tfNew = tof(dNew);
    const delta = Math.abs(tfNew - tf); // convergence test on flight time
    const done = delta < 0.05;
    iters.push({k, pv: pvNew, d: dNew, tf: tfNew, T, delta, done});
    pv = pvNew;
    d = dNew;
    tf = tfNew;
    if (done) break;
  }
  return {pv, d, tf, iters};
}

export default function ShootOnTheMove() {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<'robot' | 'vel' | null>(null);
  const [pshooter, setPshooter] = useState<V>({x: 50, y: 28});
  const [vR, setVR] = useState<V>({x: 26, y: 10});
  const pgoal: V = {x: 100, y: 120}; // fixed real target

  const sol = solveSOTM(pshooter, pgoal, vR);
  const speed = Math.hypot(vR.x, vR.y);
  const headingDeg = ((Math.atan2(vR.y, vR.x) * 180) / Math.PI + 360) % 360;
  const heading = Math.atan2(sol.pv.y - pshooter.y, sol.pv.x - pshooter.x); // turret aim

  function setSpeedMps(speedMps: number) {
    const angle = Math.atan2(vR.y, vR.x);
    const next = speedMps * 39.37;
    setVR({x: Math.cos(angle) * next, y: Math.sin(angle) * next});
  }

  function setVelocityHeading(deg: number) {
    const speedNow = Math.hypot(vR.x, vR.y);
    const rad = (deg * Math.PI) / 180;
    setVR({x: Math.cos(rad) * speedNow, y: Math.sin(rad) * speedNow});
  }

  // ---- field(inches) → SVG mapping (uniform scale, y-up flipped) ----
  const W = 600;
  const H = 460;
  const m = 24;
  const scale = Math.min((W - 2 * m) / FIELD, (H - 2 * m) / FIELD);
  const ox = (W - FIELD * scale) / 2;
  const oy = (H - FIELD * scale) / 2;
  const SX = (x: number) => ox + x * scale;
  const SY = (y: number) => oy + (FIELD - y) * scale; // flip so y points up
  // inverse: SVG → field
  const toField = (e: React.PointerEvent): V => {
    const r = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) * W) / r.width;
    const py = ((e.clientY - r.top) * H) / r.height;
    return {x: (px - ox) / scale, y: FIELD - (py - oy) / scale};
  };

  // velocity arrow tip in field space
  const tip: V = {x: pshooter.x + vR.x * ARROW_K, y: pshooter.y + vR.y * ARROW_K};

  const onDown = (e: React.PointerEvent) => {
    const p = toField(e);
    // grab the arrow tip if close, else the robot body
    if (dist(p, tip) < 12) drag.current = 'vel';
    else if (dist(p, pshooter) < 18) drag.current = 'robot';
    else return;
    (e.target as Element).setPointerCapture(e.pointerId);
    svgRef.current?.focus();
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = toField(e);
    if (drag.current === 'robot') {
      setPshooter({x: clamp(p.x, 6, FIELD - 6), y: clamp(p.y, 6, FIELD - 6)});
    } else {
      let nx = (p.x - pshooter.x) / ARROW_K;
      let ny = (p.y - pshooter.y) / ARROW_K;
      const sp = Math.hypot(nx, ny);
      if (sp > V_MAX) {
        nx *= V_MAX / sp;
        ny *= V_MAX / sp;
      }
      setVR({x: nx, y: ny});
    }
  };
  // WASD / arrow keys nudge the robot (after clicking the field to focus it)
  const onKey = (e: React.KeyboardEvent) => {
    const step = 4;
    const k = e.key.toLowerCase();
    const d: Record<string, V> = {
      w: {x: 0, y: step}, arrowup: {x: 0, y: step},
      s: {x: 0, y: -step}, arrowdown: {x: 0, y: -step},
      a: {x: -step, y: 0}, arrowleft: {x: -step, y: 0},
      d: {x: step, y: 0}, arrowright: {x: step, y: 0},
    };
    if (d[k]) {
      e.preventDefault();
      setPshooter((q) => ({x: clamp(q.x + d[k].x, 6, FIELD - 6), y: clamp(q.y + d[k].y, 6, FIELD - 6)}));
    }
  };

  const arrowHead = (from: V, to: V, color: string, key: string) => {
    const a = Math.atan2(SY(to.y) - SY(from.y), SX(to.x) - SX(from.x));
    const L = 9;
    return (
      <polygon
        key={key}
        points={`${SX(to.x)},${SY(to.y)} ${SX(to.x) - L * Math.cos(a - 0.4)},${SY(to.y) - L * Math.sin(a - 0.4)} ${SX(to.x) - L * Math.cos(a + 0.4)},${SY(to.y) - L * Math.sin(a + 0.4)}`}
        fill={color}
      />
    );
  };

  return (
    <Demo title="Shoot-On-The-Move — the virtual-target fixed point">
      <div className="grid gap-3.5 md:grid-cols-[1fr_minmax(220px,260px)]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          tabIndex={0}
          className="block h-auto w-full touch-none rounded-xl bg-[#0b1120] outline-none focus:ring-2 focus:ring-[#6f8bff]"
          role="img"
          aria-label="Top-down field: a moving robot, the real target, and the offset virtual target the turret aims at."
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={() => (drag.current = null)}
          onPointerLeave={() => (drag.current = null)}
          onKeyDown={onKey}>
          {/* field border + grid (1-ft squares) */}
          <rect x={SX(0)} y={SY(FIELD)} width={FIELD * scale} height={FIELD * scale} fill="none" stroke="#3b4a6b" strokeWidth="2" rx="6" />
          {Array.from({length: 11}, (_, i) => (i + 1) * 12).map((g) => (
            <g key={g} stroke="rgba(255,255,255,0.04)" strokeWidth="1">
              <line x1={SX(g)} y1={SY(0)} x2={SX(g)} y2={SY(FIELD)} />
              <line x1={SX(0)} y1={SY(g)} x2={SX(FIELD)} y2={SY(g)} />
            </g>
          ))}

          {/* line of sight to the REAL target (where a naive turret points) */}
          <line x1={SX(pshooter.x)} y1={SY(pshooter.y)} x2={SX(pgoal.x)} y2={SY(pgoal.y)} stroke="#8294b8" strokeWidth="1.5" strokeDasharray="6 6" />
          {/* the lead: real → virtual */}
          <line x1={SX(pgoal.x)} y1={SY(pgoal.y)} x2={SX(sol.pv.x)} y2={SY(sol.pv.y)} stroke="#5ce08a" strokeWidth="1.5" strokeDasharray="3 4" />
          {/* line of sight the turret ACTUALLY uses (robot → virtual) */}
          <line x1={SX(pshooter.x)} y1={SY(pshooter.y)} x2={SX(sol.pv.x)} y2={SY(sol.pv.y)} stroke="#ffc24d" strokeWidth="2" />

          {/* real target */}
          <circle cx={SX(pgoal.x)} cy={SY(pgoal.y)} r="10" fill="none" stroke="#ff9a3d" strokeWidth="3" />
          <circle cx={SX(pgoal.x)} cy={SY(pgoal.y)} r="3" fill="#ff9a3d" />
          <text x={SX(pgoal.x) + 14} y={SY(pgoal.y) + 4} fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#ffb066">real target</text>

          {/* virtual target (where the turret aims) */}
          <circle cx={SX(sol.pv.x)} cy={SY(sol.pv.y)} r="9" fill="#5ce08a" opacity="0.9" />
          <text x={SX(sol.pv.x) + 13} y={SY(sol.pv.y) + 4} fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#5ce08a">virtual target</text>

          {/* robot body, oriented to its turret heading */}
          <g transform={`translate(${SX(pshooter.x)},${SY(pshooter.y)}) rotate(${(-heading * 180) / Math.PI})`}>
            <rect x="-13" y="-13" width="26" height="26" rx="4" fill="#6f8bff" stroke="#0b1120" strokeWidth="2" />
            <line x1="0" y1="0" x2="20" y2="0" stroke="#0b1120" strokeWidth="3" /> {/* turret */}
          </g>

          {/* velocity vector (cyan, draggable tip) */}
          <line x1={SX(pshooter.x)} y1={SY(pshooter.y)} x2={SX(tip.x)} y2={SY(tip.y)} stroke="#37d6e0" strokeWidth="3" />
          {arrowHead(pshooter, tip, '#37d6e0', 'vtip')}
          <circle cx={SX(tip.x)} cy={SY(tip.y)} r="7" fill="#37d6e0" style={{cursor: 'grab'}} />

          <text x={SX(0) + 4} y={SY(FIELD) - 6} fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#6b7a9c">
            drag robot / arrow · click field then WASD
          </text>
        </svg>

        {/* live solver trace */}
        <div className="rounded-xl bg-[#0e1626] p-3 font-mono text-[0.72rem] leading-relaxed text-[#aab8d6]">
          <div className="mb-2 font-semibold text-white">fixed-point solver</div>
          <div className="mb-2 text-[#8294b8]">
            speed |v_R| = {speed.toFixed(0)} in/s ({(speed / 39.37).toFixed(2)} m/s)
          </div>
          {sol.iters.map((it) => (
            <div key={it.k} className="mb-1.5">
              <span className="text-[#6f8bff]">iter {it.k}</span>
              {it.k === 0 ? (
                <>: p_v = p_goal</>
              ) : (
                <>: shift G·v_R·{it.T!.toFixed(2)}s</>
              )}
              <br />
              <span className="text-[#cfe0ff]">
                d = {it.d.toFixed(1)} in · t_f = {it.tf.toFixed(2)} s
              </span>
              {it.delta != null && (
                <span className={it.done ? 'text-[#5ce08a]' : 'text-[#ffc24d]'}>
                  {' '}
                  · Δt_f = {it.delta.toFixed(2)}
                  {it.done ? ' ✓ converged' : ''}
                </span>
              )}
            </div>
          ))}
          <div className="mt-2 border-t border-white/10 pt-2 text-white">
            lead = {dist(sol.pv, pgoal).toFixed(1)} in ahead
          </div>
        </div>
      </div>

      <Controls>
        <Slider
          label="Robot speed"
          min={0}
          max={3.5}
          step={0.05}
          value={speed / 39.37}
          onChange={setSpeedMps}
          format={(v) => `${v.toFixed(2)} m/s`}
        />
        <Slider
          label="Velocity direction"
          min={0}
          max={359}
          step={1}
          value={headingDeg}
          onChange={setVelocityHeading}
          format={(v) => `${v.toFixed(0)} deg`}
        />
      </Controls>

      <Legend
        items={[
          {color: '#6f8bff', label: 'robot (turret heading)'},
          {color: '#37d6e0', label: 'velocity v_R (drag tip)'},
          {color: '#ff9a3d', label: 'real target'},
          {color: '#5ce08a', label: 'virtual target (turret aims here)'},
          {color: '#ffc24d', label: 'actual line of sight'},
        ]}
      />
    </Demo>
  );
}
