import {useMemo, useState} from 'react';
import {Controls, Demo, Legend, Readout} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';
import {scalarLqrGain} from '@site/src/lib/domain/lqr';

/* Desmos-style math explorer for the state-space module. Pure function of the
   sliders (no animation loop, SSR-safe), same frame as the other explorers. */

const W = 760;
const H = 340;
const P = {l: 62, r: 32, t: 36, b: 58};
const PW = W - P.l - P.r;
const PH = H - P.t - P.b;

const MONO = 'JetBrains Mono, monospace';

function sx(x: number, min: number, max: number) {
  return P.l + ((x - min) / (max - min)) * PW;
}
function sy(y: number, min: number, max: number) {
  return P.t + (1 - (y - min) / (max - min)) * PH;
}
function path(points: [number, number][]) {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}

function Grid({xLabel, yLabel}: {xLabel: string; yLabel: string}) {
  return (
    <g>
      <rect width={W} height={H} rx="18" fill="#0b1120" />
      {Array.from({length: 7}, (_, i) => {
        const x = P.l + (i / 6) * PW;
        return <line key={`x-${i}`} x1={x} x2={x} y1={P.t} y2={H - P.b} stroke="rgba(255,255,255,0.07)" />;
      })}
      {Array.from({length: 5}, (_, i) => {
        const y = P.t + (i / 4) * PH;
        return <line key={`y-${i}`} x1={P.l} x2={W - P.r} y1={y} y2={y} stroke="rgba(255,255,255,0.07)" />;
      })}
      <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} stroke="rgba(255,255,255,0.34)" />
      <line x1={P.l} x2={P.l} y1={P.t} y2={H - P.b} stroke="rgba(255,255,255,0.34)" />
      <text x={W / 2} y={H - 18} fill="#8294b8" textAnchor="middle" fontFamily={MONO} fontSize="13">
        {xLabel}
      </text>
      <text x="22" y={H / 2} fill="#8294b8" textAnchor="middle" fontFamily={MONO} fontSize="13" transform={`rotate(-90 22 ${H / 2})`}>
        {yLabel}
      </text>
    </g>
  );
}

/* ---------------------------------------------------------------------------
   LQR on a one-state flywheel: dv/dt = a·v + b·u with a = −kV/kA, b = 1/kA.
   For one state the Riccati equation collapses to the quadratic
   2aP − b²P²/R + Q = 0, so the gain has a closed form:
   K = (a + sqrt(a² + b²·Q/R)) / b. Bryson's rule sets Q and R from "how much
   error can I stand" and "how many volts do I have."
   --------------------------------------------------------------------------- */
export function LqrExplorer() {
  const [qTol, setQTol] = useState(8); // tolerable velocity error, rad/s
  const [rMax, setRMax] = useState(12); // available control effort, volts
  const kV = 0.02; // V per rad/s
  const kA = 0.005; // V per rad/s²
  const a = -kV / kA; // -4 s⁻¹
  const b = 1 / kA; // 200 (rad/s²) per volt
  const target = 300; // rad/s
  const T = 1.4; // seconds shown
  const V_LIM = 12;

  const Q = 1 / (qTol * qTol);
  const R = 1 / (rMax * rMax);
  const K = scalarLqrGain(a, b, Q, R); // volts per rad/s of error

  const SHOT_AT = 0.1; // a shot steals 60 rad/s here
  const SHOT_DIP = 60;

  const sim = useMemo(() => {
    const dt = 0.002;
    const vel: [number, number][] = [];
    const volts: [number, number][] = [];
    let v = target;
    let shotFired = false;
    let settle: number | null = null;
    let saturated = false;
    for (let t = 0; t <= T; t += dt) {
      if (!shotFired && t >= SHOT_AT) {
        v -= SHOT_DIP;
        shotFired = true;
      }
      const uff = kV * target; // plant-inversion feedforward: the hold voltage
      let u = K * (target - v) + uff;
      if (Math.abs(u) > V_LIM) saturated = true;
      u = Math.max(-V_LIM, Math.min(V_LIM, u));
      vel.push([t, v]);
      volts.push([t, u]);
      v += (a * v + b * u) * dt;
      if (shotFired) {
        if (settle == null && Math.abs(target - v) < 6) settle = t - SHOT_AT;
        if (settle != null && Math.abs(target - v) >= 6) settle = null;
      }
    }
    return {vel, volts, settle, saturated};
  }, [K]);

  const vMaxAxis = 360;

  return (
    <Demo title="LQR: state a preference, get a gain" pill="Math explorer">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Flywheel step response and voltage under an LQR gain computed from the Q and R weights">
        <Grid xLabel="seconds" yLabel="flywheel speed (rad/s)" />
        {/* target */}
        <line x1={sx(0, 0, T)} x2={sx(T, 0, T)} y1={sy(target, 0, vMaxAxis)} y2={sy(target, 0, vMaxAxis)} stroke="#8294b8" strokeWidth="1.5" strokeDasharray="2 8" />
        <text x={W - P.r - 8} y={sy(target, 0, vMaxAxis) - 8} fill="#8294b8" textAnchor="end" fontFamily={MONO} fontSize="12">
          target {target} rad/s
        </text>
        {/* voltage ceiling, drawn on the voltage scale (right side, 0..12 V mapped to plot height) */}
        <path
          d={path(sim.volts.map(([t, u]) => [sx(t, 0, T), sy((u / V_LIM) * vMaxAxis, 0, vMaxAxis)] as [number, number]))}
          fill="none"
          stroke="#ffc24d"
          strokeWidth="2.5"
          opacity="0.9"
        />
        <text x={P.l + 10} y={P.t + 18} fill="#ffc24d" fontFamily={MONO} fontSize="12">
          voltage (full height = {V_LIM} V){sim.saturated ? ' — hitting the ceiling!' : ''}
        </text>
        {/* the shot */}
        <line x1={sx(SHOT_AT, 0, T)} x2={sx(SHOT_AT, 0, T)} y1={P.t + 6} y2={H - P.b} stroke="#ff6f9c" strokeWidth="1.5" strokeDasharray="5 5" />
        <text x={sx(SHOT_AT, 0, T) + 6} y={P.t + 34} fill="#ff6f9c" fontFamily={MONO} fontSize="12">
          shot: −{SHOT_DIP} rad/s
        </text>
        {/* velocity response */}
        <path d={path(sim.vel.map(([t, v]) => [sx(t, 0, T), sy(v, 0, vMaxAxis)] as [number, number]))} fill="none" stroke="#5ce08a" strokeWidth="4" strokeLinecap="round" />
        {sim.settle != null && (
          <g>
            <line x1={sx(SHOT_AT + sim.settle, 0, T)} x2={sx(SHOT_AT + sim.settle, 0, T)} y1={P.t + 6} y2={H - P.b} stroke="#6f8bff" strokeWidth="1.5" strokeDasharray="5 5" />
            <text x={sx(SHOT_AT + sim.settle, 0, T) + 6} y={H - P.b - 10} fill="#6f8bff" fontFamily={MONO} fontSize="12">
              recovered in {sim.settle.toFixed(2)} s
            </text>
          </g>
        )}
      </svg>
      <Controls>
        <Slider label="Q: tolerable velocity error" min={1} max={40} step={1} value={qTol} onChange={setQTol} format={(v) => `±${v.toFixed(0)} rad/s`} />
        <Slider label="R: available control effort" min={2} max={12} step={0.5} value={rMax} onChange={setRMax} format={(v) => `±${v.toFixed(1)} V`} />
      </Controls>
      <Readout
        items={[
          ['gain K', `${K.toFixed(4)} V per rad/s of error`],
          ['Bryson: Q = 1/tol², R = 1/volts²', `${Q.toExponential(1)} · ${R.toExponential(1)}`],
          ['recovers after the shot (±6 rad/s)', sim.settle != null ? `${sim.settle.toFixed(2)} s` : 'not in view'],
          ['saturating?', sim.saturated ? 'yes — the model is lying to itself' : 'no'],
        ]}
      />
      <Legend
        items={[
          {color: '#5ce08a', label: 'flywheel speed'},
          {color: '#ffc24d', label: 'commanded voltage'},
          {color: '#8294b8', label: 'target'},
        ]}
      />
    </Demo>
  );
}
