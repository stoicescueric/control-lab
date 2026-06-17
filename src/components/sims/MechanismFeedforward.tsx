import {useMemo, useState} from 'react';

import {Button, Buttons, Controls, Demo, Legend, Readout} from '../kit/Demo';
import {Slider} from '../kit/Slider';

const W = 660;
const H = 350;
const X0 = 54;
const X1 = W - 24;
const Y0 = H - 48;
const YTOP = 28;
const VOLT_MAX = 2.2;

const SLIDE_TABLE = [
  {height: 0.0, volts: 0.78},
  {height: 0.35, volts: 0.92},
  {height: 0.7, volts: 1.2},
  {height: 1.0, volts: 1.42},
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateKg(height: number): number {
  const h = clamp(height, SLIDE_TABLE[0].height, SLIDE_TABLE[SLIDE_TABLE.length - 1].height);
  for (let i = 0; i < SLIDE_TABLE.length - 1; i++) {
    const left = SLIDE_TABLE[i];
    const right = SLIDE_TABLE[i + 1];
    if (h >= left.height && h <= right.height) {
      const t = (h - left.height) / (right.height - left.height);
      return lerp(left.volts, right.volts, t);
    }
  }
  return SLIDE_TABLE[SLIDE_TABLE.length - 1].volts;
}

function pxHeight(height: number): number {
  return X0 + height * (X1 - X0);
}

function pyVolts(volts: number): number {
  return Y0 - (volts / VOLT_MAX) * (Y0 - YTOP);
}

function armPoint(thetaDeg: number, length: number): {x: number; y: number} {
  const theta = (thetaDeg * Math.PI) / 180;
  const baseX = 160;
  const baseY = 240;
  return {
    x: baseX + length * Math.cos(theta),
    y: baseY - length * Math.sin(theta),
  };
}

export default function MechanismFeedforward() {
  const [angleDeg, setAngleDeg] = useState(0);
  const [height, setHeight] = useState(0.55);
  const [velocity, setVelocity] = useState(0.4);

  const armKg = 1.3;
  const kS = 0.22;
  const kV = 0.85;
  const armGravity = armKg * Math.cos((angleDeg * Math.PI) / 180);
  const slideGravity = interpolateKg(height);
  const velocityTerm = kV * Math.abs(velocity);
  const staticTerm = velocity === 0 ? 0 : kS;

  const slidePath = useMemo(() => {
    const points: string[] = [];
    for (let i = 0; i <= 80; i++) {
      const h = i / 80;
      points.push(`${i === 0 ? 'M' : 'L'} ${pxHeight(h).toFixed(1)} ${pyVolts(interpolateKg(h)).toFixed(1)}`);
    }
    return points.join(' ');
  }, []);

  const armEnd = armPoint(angleDeg, 120);
  const slideY = pyVolts(slideGravity);

  return (
    <Demo title="Mechanism feedforward: arm gravity vs. slide gravity">
      <div className="grid gap-3.5 md:grid-cols-[0.95fr_1.05fr]">
        <svg
          viewBox="0 0 330 300"
          className="block h-auto w-full rounded-[8px] bg-[#0b1120]"
          role="img"
          aria-label="Arm gravity feedforward changes with angle">
          <line x1="38" y1="240" x2="292" y2="240" stroke="#31405f" strokeWidth="1.5" />
          <line x1="160" y1="266" x2="160" y2="38" stroke="#31405f" strokeWidth="1.5" />
          <path d="M160 240 L282 240" stroke="#8294b8" strokeWidth="1.5" strokeDasharray="5 6" />
          <path d="M160 240 L160 72" stroke="#8294b8" strokeWidth="1.5" strokeDasharray="5 6" />
          <line x1="160" y1="240" x2={armEnd.x} y2={armEnd.y} stroke="#60a5fa" strokeWidth="17" strokeLinecap="round" />
          <circle cx="160" cy="240" r="14" fill="#eaf0ff" />
          <circle cx={armEnd.x} cy={armEnd.y} r="11" fill="#f97316" stroke="#fff7ed" strokeWidth="3" />
          <path
            d="M 206 240 A 46 46 0 0 0 198 210"
            stroke="#ffc24d"
            strokeWidth="2"
            fill="none"
          />
          <text x="44" y="35" fill="#c7d2e8" fontSize="13" fontWeight="700">
            Arm: kG * cos(theta)
          </text>
          <text x="42" y="55" fill="#8294b8" fontSize="12">
            max hold near horizontal, near zero vertical
          </text>
          <text x="174" y="220" fill="#ffc24d" fontSize="12" fontFamily="JetBrains Mono, monospace">
            theta = {angleDeg.toFixed(0)} deg
          </text>
          <text x="176" y="92" fill="#8294b8" fontSize="11">
            vertical
          </text>
          <text x="226" y="232" fill="#8294b8" fontSize="11">
            horizontal
          </text>
        </svg>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full rounded-[8px] bg-[#0b1120]"
          role="img"
          aria-label="Interpolated slide gravity feedforward table">
          <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke="#31405f" strokeWidth="1.5" />
          <line x1={X0} y1={Y0} x2={X0} y2={YTOP} stroke="#31405f" strokeWidth="1.5" />
          <path d={slidePath} fill="none" stroke="#2dd4bf" strokeWidth="3.5" />
          {SLIDE_TABLE.map((p) => (
            <circle key={p.height} cx={pxHeight(p.height)} cy={pyVolts(p.volts)} r="5.5" fill="#f97316" />
          ))}
          <line x1={pxHeight(height)} y1={YTOP} x2={pxHeight(height)} y2={Y0} stroke="#ffc24d" strokeDasharray="4 5" />
          <circle cx={pxHeight(height)} cy={slideY} r="7" fill="#ffc24d" stroke="#fff7ed" strokeWidth="2" />
          <text x={X0 + 4} y={YTOP + 14} fill="#8294b8" fontSize="12" fontFamily="JetBrains Mono, monospace">
            hold volts
          </text>
          <text x={(X0 + X1) / 2} y={H - 16} textAnchor="middle" fill="#8294b8" fontSize="12" fontFamily="JetBrains Mono, monospace">
            slide height
          </text>
          <text x={X0 + 10} y={44} fill="#c7d2e8" fontSize="13" fontWeight="700">
            Slide: interpolate measured kG(height)
          </text>
        </svg>
      </div>

      <Controls>
        <Slider label="Arm angle from horizontal" min={-70} max={100} step={1} value={angleDeg} onChange={setAngleDeg} format={(v) => `${v.toFixed(0)} deg`} />
        <Slider label="Slide height" min={0} max={1} step={0.01} value={height} onChange={setHeight} format={(v) => `${(v * 100).toFixed(0)}%`} />
        <Slider label="Target velocity magnitude" min={0} max={1.2} step={0.05} value={velocity} onChange={setVelocity} format={(v) => `${v.toFixed(2)} units/s`} />
      </Controls>

      <Buttons>
        <Button
          onClick={() => {
            setAngleDeg(0);
            setHeight(0.55);
            setVelocity(0.4);
          }}>
          Reset
        </Button>
        <Button onClick={() => setAngleDeg(90)}>Arm vertical</Button>
        <Button onClick={() => setAngleDeg(0)}>Arm horizontal</Button>
      </Buttons>

      <Readout
        items={[
          ['arm gravity', `${armGravity.toFixed(2)} V`],
          ['slide kG(height)', `${slideGravity.toFixed(2)} V`],
          ['static + velocity', `${(staticTerm + velocityTerm).toFixed(2)} V`],
        ]}
      />

      <Legend
        items={[
          {color: '#60a5fa', label: 'arm link'},
          {color: '#2dd4bf', label: 'interpolated slide hold voltage'},
          {color: '#f97316', label: 'measured calibration points', dot: true},
          {color: '#ffc24d', label: 'current setpoint', dot: true},
        ]}
      />
    </Demo>
  );
}
