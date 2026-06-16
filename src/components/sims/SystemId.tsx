import {useState} from 'react';
import {Demo, Controls, Buttons, Button, Readout, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

/* System identification by ordinary least squares. A quasistatic ramp test gives
   (velocity, voltage) pairs that lie on the line V = kS + kV·v; OLS recovers the
   intercept (kS) and slope (kV) from the noisy cloud. Deterministic pseudo-noise
   keeps it SSR-safe (no Math.random in render). */

const W = 640;
const H = 360;
const X0 = 60;
const X1 = W - 24;
const Y0 = H - 44;
const YTOP = 26;
const V_MAX_RPM = 300;
const V_AXIS = 13; // volts
const TRUE_KS = 0.9;
const TRUE_KV = 0.035;
const N = 26;

// deterministic hash noise in [-1, 1]
const noise = (i: number, seed: number) => {
  const s = Math.sin((i + 1) * 12.9898 + seed * 7.137) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};

const px = (v: number) => X0 + (v / V_MAX_RPM) * (X1 - X0);
const py = (V: number) => Y0 - (V / V_AXIS) * (Y0 - YTOP);

export function SystemId() {
  const [noiseAmp, setNoiseAmp] = useState(0.6);
  const [seed, setSeed] = useState(0);

  // synthetic ramp data
  const data = Array.from({length: N}, (_, i) => {
    const v = (i / (N - 1)) * V_MAX_RPM;
    const V = TRUE_KS + TRUE_KV * v + noise(i, seed) * noiseAmp;
    return {v, V};
  });

  // ordinary least squares: V = a + b v
  const n = data.length;
  const mv = data.reduce((s, d) => s + d.v, 0) / n;
  const mV = data.reduce((s, d) => s + d.V, 0) / n;
  let sxy = 0,
    sxx = 0;
  for (const d of data) {
    sxy += (d.v - mv) * (d.V - mV);
    sxx += (d.v - mv) * (d.v - mv);
  }
  const kV = sxy / sxx;
  const kS = mV - kV * mv;

  return (
    <Demo title="System identification: fit kS and kV from ramp data">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Voltage versus velocity scatter with a least-squares fit line">
        {/* axes */}
        <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke="#31405f" strokeWidth="1.5" />
        <line x1={X0} y1={Y0} x2={X0} y2={YTOP} stroke="#31405f" strokeWidth="1.5" />
        {/* true line */}
        <line x1={px(0)} y1={py(TRUE_KS)} x2={px(V_MAX_RPM)} y2={py(TRUE_KS + TRUE_KV * V_MAX_RPM)} stroke="#8294b8" strokeWidth="1.5" strokeDasharray="3 7" />
        {/* fitted line */}
        <line x1={px(0)} y1={py(kS)} x2={px(V_MAX_RPM)} y2={py(kS + kV * V_MAX_RPM)} stroke="#ffc24d" strokeWidth="3" />
        {/* data points */}
        {data.map((d, i) => (
          <circle key={i} cx={px(d.v)} cy={py(d.V)} r="4" fill="#6f8bff" />
        ))}
        {/* intercept marker = kS */}
        <circle cx={px(0)} cy={py(kS)} r="5" fill="#5ce08a" />
        <text x={px(0) + 8} y={py(kS) - 6} fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#5ce08a">
          kS = {kS.toFixed(2)} V
        </text>
        {/* labels */}
        <text x={X1} y={Y0 + 16} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#8294b8">
          velocity (rpm) →
        </text>
        <text x={X0 - 6} y={YTOP + 2} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#8294b8">
          V
        </text>
      </svg>

      <Controls>
        <Slider label="Measurement noise" min={0} max={2} step={0.1} value={noiseAmp} onChange={setNoiseAmp} format={(v) => `${v.toFixed(1)} V`} />
      </Controls>
      <Buttons>
        <Button onClick={() => setSeed((s) => s + 1)}>Run a new test</Button>
        <Button
          onClick={() => {
            setNoiseAmp(0.6);
            setSeed(0);
          }}>
          Reset
        </Button>
      </Buttons>
      <Readout
        items={[
          ['kS (fit / true)', `${kS.toFixed(2)} / ${TRUE_KS.toFixed(2)} V`],
          ['kV (fit / true)', `${kV.toFixed(4)} / ${TRUE_KV.toFixed(4)}`],
          ['more noise ⇒', 'noisier estimate'],
        ]}
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'ramp samples (v, V)'},
          {color: '#ffc24d', label: 'least-squares fit'},
          {color: '#8294b8', label: 'true line'},
          {color: '#5ce08a', label: 'intercept = kS'},
        ]}
      />
    </Demo>
  );
}

export default SystemId;
