import {useState} from 'react';
import {Demo, Controls, Buttons, Button, Readout, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

/* Trapezoidal motion profile. Given distance d, cruise speed vMax, and accel
   aMax, build the time-parametrized velocity (and position) the controller should
   follow. Short moves never reach vMax → the trapezoid collapses to a triangle.
   Deterministic, SSR-safe. */

const W = 640;
const H = 360;
const X0 = 52;
const X1 = W - 18;
const Y0 = H - 38;
const YTOP = 26;

type Profile = {T: number; v: (t: number) => number; x: (t: number) => number; triangle: boolean; vPeak: number};

function build(d: number, vMax: number, aMax: number): Profile {
  const tRamp = vMax / aMax;
  const dRamp = 0.5 * aMax * tRamp * tRamp;
  let triangle = false;
  let vPeak = vMax;
  let tAcc: number, tFlat: number;
  if (2 * dRamp >= d) {
    // never reaches vMax: triangle
    triangle = true;
    tAcc = Math.sqrt(d / aMax);
    vPeak = aMax * tAcc;
    tFlat = 0;
  } else {
    tAcc = tRamp;
    tFlat = (d - 2 * dRamp) / vMax;
  }
  const T = 2 * tAcc + tFlat;
  const v = (t: number) => {
    if (t < tAcc) return aMax * t;
    if (t < tAcc + tFlat) return vPeak;
    if (t <= T) return vPeak - aMax * (t - tAcc - tFlat);
    return 0;
  };
  const x = (t: number) => {
    if (t < tAcc) return 0.5 * aMax * t * t;
    const xAcc = 0.5 * aMax * tAcc * tAcc;
    if (t < tAcc + tFlat) return xAcc + vPeak * (t - tAcc);
    const xFlat = xAcc + vPeak * tFlat;
    const td = t - tAcc - tFlat;
    return xFlat + vPeak * td - 0.5 * aMax * td * td;
  };
  return {T, v, x, triangle, vPeak};
}

export function MotionProfile() {
  const [d, setD] = useState(60);
  const [vMax, setVMax] = useState(40);
  const [aMax, setAMax] = useState(40);

  const p = build(d, vMax, aMax);
  const N = 160;
  const vAxis = vMax * 1.15;
  const px = (t: number) => X0 + (t / p.T) * (X1 - X0);
  const pyV = (v: number) => Y0 - (v / vAxis) * (Y0 - YTOP);
  const pyX = (x: number) => Y0 - (x / d) * (Y0 - YTOP);

  const vPath = Array.from({length: N + 1}, (_, i) => {
    const t = (i / N) * p.T;
    return `${i === 0 ? 'M' : 'L'} ${px(t).toFixed(1)} ${pyV(p.v(t)).toFixed(1)}`;
  }).join(' ');
  const xPath = Array.from({length: N + 1}, (_, i) => {
    const t = (i / N) * p.T;
    return `${i === 0 ? 'M' : 'L'} ${px(t).toFixed(1)} ${pyX(p.x(t)).toFixed(1)}`;
  }).join(' ');

  return (
    <Demo title="Trapezoidal motion profile: the trajectory you feed the controller">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Velocity and position of a trapezoidal motion profile over time">
        <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke="#31405f" strokeWidth="1.5" />
        <line x1={X0} y1={Y0} x2={X0} y2={YTOP} stroke="#31405f" strokeWidth="1.5" />
        {/* vMax guide */}
        {!p.triangle && <line x1={X0} y1={pyV(vMax)} x2={X1} y2={pyV(vMax)} stroke="#8294b8" strokeWidth="1.2" strokeDasharray="2 8" />}
        {/* position (normalized to its own axis) */}
        <path d={xPath} fill="none" stroke="#6f8bff" strokeWidth="2.5" opacity="0.85" />
        {/* velocity */}
        <path d={vPath} fill="none" stroke="#ffc24d" strokeWidth="3.5" strokeLinejoin="round" />
        <text x={X0 + 4} y={YTOP + 12} fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#8294b8">
          velocity / position
        </text>
        <text x={(X0 + X1) / 2} y={H - 12} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#8294b8">
          time →
        </text>
      </svg>

      <Controls>
        <Slider label="Distance" min={5} max={120} step={5} value={d} onChange={setD} format={(v) => `${v.toFixed(0)} in`} />
        <Slider label="Cruise speed vMax" min={10} max={80} step={5} value={vMax} onChange={setVMax} format={(v) => `${v.toFixed(0)} in/s`} />
        <Slider label="Max accel aMax" min={10} max={120} step={5} value={aMax} onChange={setAMax} format={(v) => `${v.toFixed(0)} in/s²`} />
      </Controls>
      <Buttons>
        <Button
          onClick={() => {
            setD(60);
            setVMax(40);
            setAMax(40);
          }}>
          Reset
        </Button>
      </Buttons>
      <Readout
        items={[
          ['total time', `${p.T.toFixed(2)} s`],
          ['peak speed', `${p.vPeak.toFixed(0)} in/s`],
          ['shape', p.triangle ? 'triangle (too short for vMax)' : 'trapezoid'],
        ]}
      />
      <Legend
        items={[
          {color: '#ffc24d', label: 'velocity setpoint'},
          {color: '#6f8bff', label: 'position setpoint'},
          {color: '#8294b8', label: 'cruise-speed cap'},
        ]}
      />
    </Demo>
  );
}

export default MotionProfile;
