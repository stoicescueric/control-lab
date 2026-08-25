import {useMemo, useState} from 'react';
import {Controls, Demo, Legend, Readout} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';
import {scalarDiscreteLqr} from '@site/src/lib/domain/lqr';
import {discretizeScalarPlant, scalarPlantStep} from '@site/src/lib/domain/stateSpace';

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

/** One exact sampled step before the module introduces multi-state matrices. */
export function ScalarStateStepExplorer() {
  const [velocity, setVelocity] = useState(100);
  const [volts, setVolts] = useState(4);
  const [dt, setDt] = useState(0.02);
  const a = -4; // 1/s, from kV=0.02 and kA=0.005
  const b = 200; // (rad/s^2)/V
  const target = 120; // rad/s
  const feedbackGain = 0.08; // V/(rad/s), illustrative state-feedback gain
  const holdVolts = 0.02 * target;
  const requested = feedbackGain * (target - velocity) + holdVolts;
  const clipped = Math.max(-12, Math.min(12, requested));
  const {ad, bd} = discretizeScalarPlant(a, b, dt);
  const openNext = scalarPlantStep(velocity, volts, a, b, dt);
  const feedbackNext = scalarPlantStep(velocity, clipped, a, b, dt);

  return (
    <Demo title="One sampled state step" pill="Core checkpoint">
      <Controls>
        <Slider label="Current velocity v" min={0} max={250} step={5} value={velocity} onChange={setVelocity} format={(v) => `${v.toFixed(0)} rad/s`} />
        <Slider label="Applied voltage V" min={-12} max={12} step={0.5} value={volts} onChange={setVolts} format={(v) => `${v.toFixed(1)} V`} />
        <Slider label="Measured loop time dt" min={0.005} max={0.08} step={0.005} value={dt} onChange={setDt} format={(v) => `${(v * 1000).toFixed(0)} ms`} />
      </Controls>
      <Readout
        items={[
          ['exact sampled model', `Ad=${ad.toFixed(4)}, Bd=${bd.toFixed(4)}`],
          ['one open-loop step', `vNext=${openNext.toFixed(2)} rad/s`],
          ['feedback request', `${requested.toFixed(2)} V → clipped ${clipped.toFixed(2)} V`],
          ['one feedback step', `vNext=${feedbackNext.toFixed(2)} rad/s toward 120 rad/s`],
        ]}
      />
    </Demo>
  );
}

/* ---------------------------------------------------------------------------
   Discrete LQR on an exact-ZOH 20 ms model of the one-state flywheel. The
   scalar discrete Riccati equation has a closed-form positive root. Bryson's
   rule sets Q and R from error tolerance and available voltage.
   --------------------------------------------------------------------------- */
export function LqrExplorer() {
  const [qTol, setQTol] = useState(8); // tolerable velocity error, rad/s
  const [rMax, setRMax] = useState(12); // available control effort, volts
  const kV = 0.02; // V per rad/s
  const kA = 0.005; // V per rad/s²
  const a = -kV / kA; // -4 s⁻¹
  const b = 1 / kA; // 200 (rad/s²) per volt
  const sampleDt = 0.020;
  const target = 300; // rad/s
  const T = 1.4; // seconds shown
  const V_LIM = rMax;

  const Q = 1 / (qTol * qTol);
  const R = 1 / (rMax * rMax);
  const {ad, bd} = discretizeScalarPlant(a, b, sampleDt);
  const design = scalarDiscreteLqr(ad, bd, Q, R);
  const K = design.gain; // volts per rad/s of error

  const SHOT_AT = 0.1; // a shot steals 60 rad/s here
  const SHOT_DIP = 60;

  const sim = useMemo(() => {
    const vel: [number, number][] = [];
    const volts: [number, number][] = [];
    let v = target;
    let shotFired = false;
    let settle: number | null = null;
    let saturated = false;
    const steps = Math.round(T / sampleDt);
    for (let step = 0; step <= steps; step++) {
      const t = step * sampleDt;
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
      v = ad * v + bd * u;
      if (shotFired) {
        // v now represents the next sampled instant, t + sampleDt.
        if (settle == null && Math.abs(target - v) < 6) settle = (t + sampleDt) - SHOT_AT;
        if (settle != null && Math.abs(target - v) >= 6) settle = null;
      }
    }
    return {vel, volts, settle, saturated};
  }, [K, V_LIM, ad, bd]);

  const vMaxAxis = 360;

  return (
    <Demo title="Discrete LQR: state a preference, get a 20 ms gain" pill="Math explorer">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Flywheel step response and voltage under a 20 millisecond discrete LQR gain computed from the Q and R weights">
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
        <Slider label="Velocity-error tolerance" min={1} max={40} step={1} value={qTol} onChange={setQTol} format={(v) => `±${v.toFixed(0)} rad/s`} />
        <Slider label="Voltage budget" min={2} max={12} step={0.5} value={rMax} onChange={setRMax} format={(v) => `±${v.toFixed(1)} V`} />
      </Controls>
      <Readout
        items={[
          ['derived Q = 1/tolerance²', Q.toExponential(3)],
          ['derived R = 1/budget² (feedback scale)', R.toExponential(3)],
          ['exact sampled model', `Ad=${ad.toFixed(4)}, Bd=${bd.toFixed(4)} at 20 ms`],
          ['gain K', `${K.toFixed(4)} V per rad/s of error`],
          ['closed-loop sampled pole', design.closedLoopPole.toFixed(4)],
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
