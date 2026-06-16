import {useState} from 'react';
import {Demo, Controls, Buttons, Button, Readout, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

/* Joystick shaping: dead zone + response curve, drawn as a transfer function
   (output vs. raw stick). The flat band in the middle is the dead zone; the
   bend is the response curve. Drag the input to see how a raw stick value maps
   to the command the drivetrain actually receives. Pure React + SVG, SSR-safe. */

const W = 560;
const H = 340;
const PX0 = 56;
const PX1 = W - 24;
const PY0 = H - 44;
const PYTOP = 28;
const MIDX = (PX0 + PX1) / 2;
const MIDY = (PY0 + PYTOP) / 2;
const HALFW = (PX1 - PX0) / 2;
const HALFH = (PY0 - PYTOP) / 2;

const px = (inp: number) => MIDX + inp * HALFW;
const py = (out: number) => MIDY - out * HALFH;
const sign = (v: number) => (v < 0 ? -1 : 1);

function shape(s: number, dz: number, k: number): number {
  const a = Math.abs(s);
  if (a < dz) return 0;
  const scaled = (a - dz) / (1 - dz);
  return sign(s) * Math.pow(scaled, k);
}

export function JoystickShaping() {
  const [input, setInput] = useState(0.3);
  const [dz, setDz] = useState(0.1);
  const [k, setK] = useState(2);

  const out = shape(input, dz, k);

  // transfer curve
  const samples = Array.from({length: 161}, (_, i) => {
    const s = -1 + (i / 160) * 2;
    return `${i === 0 ? 'M' : 'L'} ${px(s).toFixed(1)} ${py(shape(s, dz, k)).toFixed(1)}`;
  }).join(' ');

  return (
    <Demo title="Dead zone + response curve: from raw stick to drive command">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Joystick transfer function with dead zone and response curve">
        {/* dead-zone band */}
        <rect x={px(-dz)} y={PYTOP} width={px(dz) - px(-dz)} height={PY0 - PYTOP} fill="#ff6f9c" opacity="0.12" />
        {/* axes */}
        <line x1={PX0} y1={MIDY} x2={PX1} y2={MIDY} stroke="#31405f" strokeWidth="1.5" />
        <line x1={MIDX} y1={PYTOP} x2={MIDX} y2={PY0} stroke="#31405f" strokeWidth="1.5" />
        {/* y = x reference (what a raw stick would give) */}
        <line x1={px(-1)} y1={py(-1)} x2={px(1)} y2={py(1)} stroke="#8294b8" strokeWidth="1.5" strokeDasharray="3 7" opacity="0.6" />
        {/* the shaped transfer curve */}
        <path d={samples} fill="none" stroke="#6f8bff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* current input -> output */}
        <line x1={px(input)} y1={MIDY} x2={px(input)} y2={py(out)} stroke="#ffc24d" strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1={MIDX} y1={py(out)} x2={px(input)} y2={py(out)} stroke="#ffc24d" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx={px(input)} cy={py(out)} r="6.5" fill="#ffc24d" />
        {/* labels */}
        <text x={PX1} y={MIDY - 8} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#8294b8">raw stick →</text>
        <text x={MIDX + 8} y={PYTOP + 12} fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#8294b8">↑ command out</text>
        <text x={px(dz)} y={PY0 + 14} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#ff9bbb">dead zone</text>
      </svg>

      <Controls>
        <Slider label="Raw stick input" min={-1} max={1} step={0.01} value={input} onChange={setInput} format={(v) => v.toFixed(2)} />
        <Slider label="Dead zone d" min={0} max={0.3} step={0.01} value={dz} onChange={setDz} format={(v) => v.toFixed(2)} />
        <Slider label="Curve exponent k" min={1} max={3} step={0.1} value={k} onChange={setK} format={(v) => v.toFixed(1)} />
      </Controls>
      <Buttons>
        <Button
          onClick={() => {
            setInput(0.3);
            setDz(0.1);
            setK(2);
          }}>
          Reset
        </Button>
      </Buttons>
      <Readout
        items={[
          ['raw', input.toFixed(2)],
          ['command out', out.toFixed(2)],
          ['inside dead zone?', Math.abs(input) < dz ? 'yes → 0' : 'no'],
        ]}
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'shaped command'},
          {color: '#8294b8', label: 'raw (linear) for comparison'},
          {color: '#ff6f9c', label: 'dead zone — ignored'},
        ]}
      />
    </Demo>
  );
}

export default JoystickShaping;
