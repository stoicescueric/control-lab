import {useState} from 'react';
import {Demo, Controls, Buttons, Button, Readout, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

/* Flywheel velocity control: bang-bang (full on / full off) chatters around the
   setpoint forever; takeback-half (TBH) converges to a smooth hold. Both are
   simulated deterministically (SSR-safe) and plotted as RPM vs. time. */

const W = 640;
const H = 360;
const X0 = 52;
const X1 = W - 18;
const Y0 = H - 40;
const YTOP = 24;
const STEPS = 240;
const DT = 0.02; // s
const RPM_AXIS = 360;

// flywheel: dω/dt = K*u - B*ω  (u in [0,1]); discrete Euler
const K = 900; // rpm/s at full power
const B = 2.2; // damping (1/s)

const px = (i: number) => X0 + (i / STEPS) * (X1 - X0);
const py = (rpm: number) => Y0 - (Math.max(0, Math.min(RPM_AXIS, rpm)) / RPM_AXIS) * (Y0 - YTOP);

function simulate(target: number, mode: 'bang' | 'tbh', tbhGain: number): number[] {
  let w = 0;
  let drive = 0;
  let prevErr = target;
  let driveAtZero = 0;
  const out: number[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const err = target - w;
    let u: number;
    if (mode === 'bang') {
      u = err > 0 ? 1 : 0;
    } else {
      drive += tbhGain * err * DT;
      if (Math.sign(err) !== Math.sign(prevErr)) {
        drive = 0.5 * (drive + driveAtZero); // take back half
        driveAtZero = drive;
      }
      prevErr = err;
      u = Math.max(0, Math.min(1, drive));
    }
    out.push(w);
    w += (K * u - B * w) * DT;
  }
  return out;
}

const path = (arr: number[]) => `M ${arr.map((r, i) => `${px(i).toFixed(1)} ${py(r).toFixed(1)}`).join(' L ')}`;

export function BangBang() {
  const [target, setTarget] = useState(250);
  const [gain, setGain] = useState(0.9);

  const bang = simulate(target, 'bang', gain);
  const tbh = simulate(target, 'tbh', gain);

  // steady-state ripple of bang-bang over the last quarter
  const tail = bang.slice(Math.floor(STEPS * 0.75));
  const ripple = Math.max(...tail) - Math.min(...tail);

  return (
    <Demo title="Bang-bang vs. takeback-half: holding a flywheel speed">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Flywheel RPM over time for bang-bang versus takeback-half control">
        <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke="#31405f" strokeWidth="1.5" />
        <line x1={X0} y1={Y0} x2={X0} y2={YTOP} stroke="#31405f" strokeWidth="1.5" />
        {/* setpoint */}
        <line x1={X0} y1={py(target)} x2={X1} y2={py(target)} stroke="#8294b8" strokeWidth="1.5" strokeDasharray="2 8" />
        <text x={X1} y={py(target) - 8} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#8294b8">
          target
        </text>
        <path d={path(bang)} fill="none" stroke="#ff6f9c" strokeWidth="2.5" />
        <path d={path(tbh)} fill="none" stroke="#5ce08a" strokeWidth="3" strokeLinejoin="round" />
        <text x={X0 + 4} y={YTOP + 12} fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#8294b8">
          RPM
        </text>
        <text x={(X0 + X1) / 2} y={H - 14} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#8294b8">
          time →
        </text>
      </svg>

      <Controls>
        <Slider label="Target speed" min={120} max={330} step={10} value={target} onChange={setTarget} format={(v) => `${v.toFixed(0)} rpm`} />
        <Slider label="TBH gain" min={0.2} max={2} step={0.1} value={gain} onChange={setGain} format={(v) => v.toFixed(1)} />
      </Controls>
      <Buttons>
        <Button
          onClick={() => {
            setTarget(250);
            setGain(0.9);
          }}>
          Reset
        </Button>
      </Buttons>
      <Readout
        items={[
          ['bang-bang ripple', `±${(ripple / 2).toFixed(0)} rpm (never settles)`],
          ['takeback-half', 'converges & holds'],
        ]}
      />
      <Legend
        items={[
          {color: '#ff6f9c', label: 'bang-bang — chatters around target'},
          {color: '#5ce08a', label: 'takeback-half — settles smoothly'},
        ]}
      />
    </Demo>
  );
}

export default BangBang;
