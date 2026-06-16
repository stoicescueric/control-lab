import {useState} from 'react';
import {Demo, Controls, Buttons, Button, Readout, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

/* Voltage (battery) compensation. A raw power command delivers power × Vbattery
   volts, so the same command does less as the pack sags. Compensation divides the
   command by the measured voltage, delivering a constant target voltage until the
   battery can no longer supply it. Plotted as delivered volts vs. battery voltage.
   Deterministic, SSR-safe. */

const W = 640;
const H = 360;
const X0 = 56;
const X1 = W - 20;
const Y0 = H - 42;
const YTOP = 26;
const VB_MIN = 10.5;
const VB_MAX = 13.5;
const V_AXIS = 13.5;

const px = (vb: number) => X0 + ((vb - VB_MIN) / (VB_MAX - VB_MIN)) * (X1 - X0);
const py = (v: number) => Y0 - (v / V_AXIS) * (Y0 - YTOP);

export function VoltageComp() {
  const [targetV, setTargetV] = useState(8); // volts we actually want at the motor
  const [battery, setBattery] = useState(12.0);

  // command chosen so that AT 12 V nominal the raw command delivers targetV
  const command = targetV / 12.0; // a fixed power setting the code picks

  const deliveredRaw = (vb: number) => command * vb; // no comp: power × battery
  const deliveredComp = (vb: number) => Math.min(targetV, vb); // comp: hold target until battery can't

  const N = 60;
  const rawPath = Array.from({length: N + 1}, (_, i) => {
    const vb = VB_MIN + (i / N) * (VB_MAX - VB_MIN);
    return `${i === 0 ? 'M' : 'L'} ${px(vb).toFixed(1)} ${py(deliveredRaw(vb)).toFixed(1)}`;
  }).join(' ');
  const compPath = Array.from({length: N + 1}, (_, i) => {
    const vb = VB_MIN + (i / N) * (VB_MAX - VB_MIN);
    return `${i === 0 ? 'M' : 'L'} ${px(vb).toFixed(1)} ${py(deliveredComp(vb)).toFixed(1)}`;
  }).join(' ');

  const rawNow = deliveredRaw(battery);
  const compNow = deliveredComp(battery);

  return (
    <Demo title="Voltage compensation: holding output constant as the battery sags">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Delivered motor voltage versus battery voltage, compensated versus raw">
        <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke="#31405f" strokeWidth="1.5" />
        <line x1={X0} y1={Y0} x2={X0} y2={YTOP} stroke="#31405f" strokeWidth="1.5" />
        {/* target line */}
        <line x1={X0} y1={py(targetV)} x2={X1} y2={py(targetV)} stroke="#8294b8" strokeWidth="1.2" strokeDasharray="2 8" />
        <text x={X1} y={py(targetV) - 6} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#8294b8">
          target {targetV.toFixed(1)} V
        </text>
        {/* curves */}
        <path d={rawPath} fill="none" stroke="#ff6f9c" strokeWidth="3" />
        <path d={compPath} fill="none" stroke="#5ce08a" strokeWidth="3.5" />
        {/* current battery marker */}
        <line x1={px(battery)} y1={YTOP} x2={px(battery)} y2={Y0} stroke="#ffc24d" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx={px(battery)} cy={py(rawNow)} r="5" fill="#ff6f9c" />
        <circle cx={px(battery)} cy={py(compNow)} r="5" fill="#5ce08a" />
        <text x={px(battery)} y={Y0 + 16} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#ffc24d">
          battery
        </text>
        <text x={X0 + 4} y={YTOP + 12} fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#8294b8">
          delivered V
        </text>
        <text x={(X0 + X1) / 2} y={H - 12} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#8294b8">
          battery voltage (full ⟶ sagging is leftward) →
        </text>
      </svg>

      <Controls>
        <Slider label="Target motor voltage" min={3} max={12} step={0.5} value={targetV} onChange={setTargetV} format={(v) => `${v.toFixed(1)} V`} />
        <Slider label="Battery voltage now" min={VB_MIN} max={VB_MAX} step={0.1} value={battery} onChange={setBattery} format={(v) => `${v.toFixed(1)} V`} />
      </Controls>
      <Buttons>
        <Button
          onClick={() => {
            setTargetV(8);
            setBattery(12.0);
          }}>
          Reset
        </Button>
      </Buttons>
      <Readout
        items={[
          ['raw (no comp)', `${rawNow.toFixed(2)} V delivered`],
          ['compensated', `${compNow.toFixed(2)} V delivered`],
          ['drift vs target', `${(rawNow - targetV >= 0 ? '+' : '') + (rawNow - targetV).toFixed(2)} V`],
        ]}
      />
      <Legend
        items={[
          {color: '#5ce08a', label: 'compensated — flat at target'},
          {color: '#ff6f9c', label: 'raw command — drifts with battery'},
          {color: '#ffc24d', label: 'current battery voltage'},
        ]}
      />
    </Demo>
  );
}

export default VoltageComp;
