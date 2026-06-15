import {useMemo, useState} from 'react';
import {Demo, Controls, Legend, Readout} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const W = 760;
const H = 330;
const P = {l: 70, r: 36, t: 36, b: 52};
const PW = W - P.l - P.r;
const PH = H - P.t - P.b;

function sx(t: number, max = 10) {
  return P.l + (t / max) * PW;
}

function sy(y: number, min = -1.4, max = 1.4) {
  return P.t + (1 - (y - min) / (max - min)) * PH;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function path(points: [number, number][]) {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}

function Grid({xLabel, yLabel}: {xLabel: string; yLabel: string}) {
  return (
    <g>
      <rect width={W} height={H} rx="18" fill="#0b1120" />
      {Array.from({length: 6}, (_, i) => {
        const x = P.l + (i / 5) * PW;
        return <line key={`x-${i}`} x1={x} x2={x} y1={P.t} y2={H - P.b} stroke="rgba(255,255,255,0.07)" />;
      })}
      {Array.from({length: 5}, (_, i) => {
        const y = P.t + (i / 4) * PH;
        return <line key={`y-${i}`} x1={P.l} x2={W - P.r} y1={y} y2={y} stroke="rgba(255,255,255,0.07)" />;
      })}
      <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} stroke="rgba(255,255,255,0.35)" />
      <line x1={P.l} x2={P.l} y1={P.t} y2={H - P.b} stroke="rgba(255,255,255,0.35)" />
      <text x={W / 2} y={H - 16} fill="#8294b8" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="13">
        {xLabel}
      </text>
      <text x="22" y={H / 2} fill="#8294b8" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="13" transform={`rotate(-90 22 ${H / 2})`}>
        {yLabel}
      </text>
    </g>
  );
}

export function CalculusLiveDemo() {
  const [time, setTime] = useState(4.2);
  const [amplitude, setAmplitude] = useState(0.9);
  const omega = 0.85;
  const f = (t: number) => amplitude * Math.sin(omega * t) + 0.08 * t - 0.35;
  const df = (t: number) => amplitude * omega * Math.cos(omega * t) + 0.08;
  const pts = useMemo<[number, number][]>(() => {
    return Array.from({length: 180}, (_, i) => {
      const t = (i / 179) * 10;
      return [sx(t), sy(f(t))];
    });
  }, [amplitude]);
  const t0 = time;
  const y0 = f(t0);
  const m = df(t0);
  const dx = 1.4;
  const areaPts = Array.from({length: 80}, (_, i) => {
    const t = (i / 79) * t0;
    return [sx(t), sy(f(t))] as [number, number];
  });

  return (
    <Demo title="Calculus: move the instant and watch slope become velocity">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Interactive calculus slope and area demo">
        <Grid xLabel="time" yLabel="position" />
        <path d={`${path(areaPts)} L ${sx(t0).toFixed(1)} ${sy(-1.4).toFixed(1)} L ${sx(0).toFixed(1)} ${sy(-1.4).toFixed(1)} Z`} fill="#6f8bff" opacity="0.16" />
        <path d={path(pts)} fill="none" stroke="#5ce08a" strokeWidth="4" strokeLinecap="round" />
        <line x1={sx(t0 - dx)} y1={sy(y0 - m * dx)} x2={sx(t0 + dx)} y2={sy(y0 + m * dx)} stroke="#ffc24d" strokeWidth="4" strokeLinecap="round" />
        <line x1={sx(t0)} x2={sx(t0)} y1={P.t} y2={H - P.b} stroke="#ff6f9c" strokeWidth="2" strokeDasharray="7 7" />
        <circle cx={sx(t0)} cy={sy(y0)} r="7" fill="#ffffff" />
        <text x={sx(t0) + 14} y={sy(y0) - 16} fill="#ffffff" fontFamily="JetBrains Mono, monospace" fontSize="13">
          instant
        </text>
      </svg>
      <Controls>
        <Slider label="Time" min={0.2} max={9.8} step={0.1} value={time} onChange={setTime} format={(v) => `${v.toFixed(1)} s`} />
        <Slider label="Motion amplitude" min={0.25} max={1.25} step={0.05} value={amplitude} onChange={setAmplitude} format={(v) => v.toFixed(2)} />
      </Controls>
      <Readout
        items={[
          ['position x(t)', y0.toFixed(2)],
          ['velocity dx/dt', m.toFixed(2)],
          ['area idea', 'accumulated motion'],
        ]}
      />
      <Legend items={[{color: '#5ce08a', label: 'position curve'}, {color: '#ffc24d', label: 'tangent slope'}, {color: '#6f8bff', label: 'accumulated area'}]} />
    </Demo>
  );
}

export function LinearAlgebraLiveDemo() {
  const [heading, setHeading] = useState(45);
  const [x, setX] = useState(0.55);
  const [y, setY] = useState(0.8);
  const theta = (heading * Math.PI) / 180;
  const robotX = x * Math.cos(theta) + y * Math.sin(theta);
  const robotY = -x * Math.sin(theta) + y * Math.cos(theta);
  const cx = W / 2;
  const cy = H / 2 + 8;
  const scale = 105;
  const endField = {x: cx + x * scale, y: cy - y * scale};
  const endRobot = {x: cx + robotX * scale, y: cy - robotY * scale};
  const bot = `translate(${cx} ${cy}) rotate(${-heading})`;

  return (
    <Demo title="Linear algebra: rotate a field command into the robot frame">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Interactive vector rotation demo">
        <defs>
          <marker id="fieldArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" viewBox="0 0 8 8">
            <path d="M0 0 L8 4 L0 8 Z" fill="#6f8bff" />
          </marker>
          <marker id="robotArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" viewBox="0 0 8 8">
            <path d="M0 0 L8 4 L0 8 Z" fill="#ffc24d" />
          </marker>
        </defs>
        <rect width={W} height={H} rx="18" fill="#0b1120" />
        <circle cx={cx} cy={cy} r="124" fill="#101a2e" stroke="#2a3656" strokeWidth="2" />
        <line x1={cx - 150} x2={cx + 150} y1={cy} y2={cy} stroke="#31405f" />
        <line x1={cx} x2={cx} y1={cy - 150} y2={cy + 150} stroke="#31405f" />
        <g transform={bot}>
          <rect x="-56" y="-38" width="112" height="76" rx="12" fill="#16203a" stroke="#6f8bff" strokeWidth="2" />
          <path d="M-24 -22 L38 0 L-24 22 Z" fill="#6f8bff" opacity="0.8" />
        </g>
        <line x1={cx} y1={cy} x2={endField.x} y2={endField.y} stroke="#6f8bff" strokeWidth="5" markerEnd="url(#fieldArrow)" />
        <line x1={cx} y1={cy} x2={endRobot.x} y2={endRobot.y} stroke="#ffc24d" strokeWidth="5" markerEnd="url(#robotArrow)" />
        <text x="380" y="48" fill="#e8eefc" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="16">
          R(-theta) maps field velocity into robot velocity
        </text>
      </svg>
      <Controls>
        <Slider label="Robot heading" min={-180} max={180} step={5} value={heading} onChange={setHeading} format={(v) => `${v.toFixed(0)} deg`} />
        <Slider label="Field X command" min={-1} max={1} step={0.05} value={x} onChange={setX} format={(v) => v.toFixed(2)} />
        <Slider label="Field Y command" min={-1} max={1} step={0.05} value={y} onChange={setY} format={(v) => v.toFixed(2)} />
      </Controls>
      <Readout items={[['robot vx', robotX.toFixed(2)], ['robot vy', robotY.toFixed(2)], ['heading', `${heading.toFixed(0)} deg`]]} />
      <Legend items={[{color: '#6f8bff', label: 'field command'}, {color: '#ffc24d', label: 'robot-frame command'}]} />
    </Demo>
  );
}

export function DifferentialEquationsLiveDemo() {
  const [target, setTarget] = useState(1.0);
  const [k, setK] = useState(0.55);
  const [initial, setInitial] = useState(-0.85);
  const curve = useMemo<[number, number][]>(() => {
    return Array.from({length: 180}, (_, i) => {
      const t = (i / 179) * 8;
      const x = target + (initial - target) * Math.exp(-k * t);
      return [sx(t, 8), sy(x, -1.3, 1.3)];
    });
  }, [target, k, initial]);

  return (
    <Demo title="Differential equations: the state moves toward an equilibrium">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Interactive first order differential equation demo">
        <Grid xLabel="time" yLabel="state x" />
        <line x1={P.l} x2={W - P.r} y1={sy(target, -1.3, 1.3)} y2={sy(target, -1.3, 1.3)} stroke="#ffc24d" strokeWidth="3" strokeDasharray="8 8" />
        {[-1, -0.5, 0, 0.5, 1].map((xv) => {
          const dy = k * (target - xv);
          const len = clamp(Math.abs(dy) * 34, 8, 38);
          const dir = dy >= 0 ? -1 : 1;
          return <line key={xv} x1={145 + (xv + 1) * 120} x2={145 + (xv + 1) * 120} y1={sy(xv, -1.3, 1.3)} y2={sy(xv, -1.3, 1.3) + dir * len} stroke="#8294b8" strokeWidth="3" strokeLinecap="round" />;
        })}
        <path d={path(curve)} fill="none" stroke="#5ce08a" strokeWidth="4" strokeLinecap="round" />
        <circle cx={sx(0, 8)} cy={sy(initial, -1.3, 1.3)} r="7" fill="#ff6f9c" />
        <text x="492" y={sy(target, -1.3, 1.3) - 12} fill="#ffc24d" fontFamily="JetBrains Mono, monospace" fontSize="13">
          equilibrium target
        </text>
      </svg>
      <Controls>
        <Slider label="Equilibrium target" min={-1.1} max={1.1} step={0.05} value={target} onChange={setTarget} format={(v) => v.toFixed(2)} />
        <Slider label="Response rate k" min={0.1} max={1.4} step={0.05} value={k} onChange={setK} format={(v) => v.toFixed(2)} />
        <Slider label="Initial state" min={-1.1} max={1.1} step={0.05} value={initial} onChange={setInitial} format={(v) => v.toFixed(2)} />
      </Controls>
      <Readout items={[['model', 'dx/dt = k(x_target - x)'], ['time constant', `${(1 / k).toFixed(2)} s`]]} />
    </Demo>
  );
}

export function StateSpaceLiveDemo() {
  const [position, setPosition] = useState(0.4);
  const [velocity, setVelocity] = useState(0.6);
  const [input, setInput] = useState(0.25);
  const [trust, setTrust] = useState(0.45);
  const dt = 0.5;
  const predictedX = position + velocity * dt + 0.5 * input * dt * dt;
  const predictedV = velocity + input * dt;
  const measurement = position - 0.35;
  const correctedX = predictedX + trust * (measurement - predictedX);
  const px = (v: number) => P.l + ((clamp(v, -1.5, 1.8) + 1.5) / 3.3) * PW;
  const y = H / 2;

  return (
    <Demo title="State space: predict with the model, correct with a sensor">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Interactive state prediction and correction demo">
        <defs>
          <marker id="stateArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" viewBox="0 0 8 8">
            <path d="M0 0 L8 4 L0 8 Z" fill="#93a7ff" />
          </marker>
        </defs>
        <rect width={W} height={H} rx="18" fill="#0b1120" />
        <line x1={P.l} x2={W - P.r} y1={y} y2={y} stroke="#31405f" strokeWidth="3" />
        {[-1, 0, 1].map((v) => (
          <g key={v}>
            <line x1={px(v)} x2={px(v)} y1={y - 10} y2={y + 10} stroke="#8294b8" />
            <text x={px(v)} y={y + 34} fill="#8294b8" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="12">{v}</text>
          </g>
        ))}
        <line x1={px(position)} y1={y - 48} x2={px(predictedX)} y2={y - 48} stroke="#93a7ff" strokeWidth="4" markerEnd="url(#stateArrow)" />
        <line x1={px(predictedX)} y1={y - 48} x2={px(correctedX)} y2={y - 4} stroke="#ffc24d" strokeWidth="4" markerEnd="url(#stateArrow)" />
        <circle cx={px(position)} cy={y - 48} r="9" fill="#6f8bff" />
        <circle cx={px(predictedX)} cy={y - 48} r="9" fill="#5ce08a" />
        <circle cx={px(measurement)} cy={y + 48} r="9" fill="#ff6f9c" />
        <circle cx={px(correctedX)} cy={y} r="10" fill="#ffc24d" />
        <text x={px(position)} y={y - 72} fill="#e8eefc" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="12">state</text>
        <text x={px(predictedX)} y={y - 72} fill="#e8eefc" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="12">prediction</text>
        <text x={px(measurement)} y={y + 76} fill="#e8eefc" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="12">sensor</text>
        <text x={px(correctedX)} y={y - 18} fill="#ffc24d" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="12">corrected</text>
      </svg>
      <Controls>
        <Slider label="Position state" min={-1.2} max={1.2} step={0.05} value={position} onChange={setPosition} format={(v) => v.toFixed(2)} />
        <Slider label="Velocity state" min={-1.2} max={1.2} step={0.05} value={velocity} onChange={setVelocity} format={(v) => v.toFixed(2)} />
        <Slider label="Input acceleration" min={-1.0} max={1.0} step={0.05} value={input} onChange={setInput} format={(v) => v.toFixed(2)} />
        <Slider label="Sensor trust" min={0} max={1} step={0.05} value={trust} onChange={setTrust} format={(v) => `${Math.round(v * 100)}%`} />
      </Controls>
      <Readout items={[['predicted x', predictedX.toFixed(2)], ['predicted v', predictedV.toFixed(2)], ['corrected x', correctedX.toFixed(2)]]} />
      <Legend items={[{color: '#6f8bff', label: 'current'}, {color: '#5ce08a', label: 'model prediction'}, {color: '#ff6f9c', label: 'sensor'}, {color: '#ffc24d', label: 'corrected'}]} />
    </Demo>
  );
}
