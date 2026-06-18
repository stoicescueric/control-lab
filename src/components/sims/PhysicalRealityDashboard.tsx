import {useMemo, useState} from 'react';
import DragAwakening from '@site/src/components/sims/DragAwakening';
import {Button, Buttons, Controls, Demo, Legend, Readout} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

type Point = {x: number; y: number};
type Trajectory = {points: Point[]; range: number; peak: number};
type TabId = 'integrator' | 'drag' | 'transfer';

const G = 9.81;
const LAUNCH_HEIGHT = 0.4;
const DRAG_K = 0.38;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function derivative(state: number[]) {
  const [, , vx, vy] = state;
  const speed = Math.hypot(vx, vy);
  return [vx, vy, -DRAG_K * speed * vx, -G - DRAG_K * speed * vy];
}

function addScaled(a: number[], b: number[], scale: number) {
  return a.map((v, i) => v + b[i] * scale);
}

function eulerStep(state: number[], dt: number) {
  return addScaled(state, derivative(state), dt);
}

function rk4Step(state: number[], dt: number) {
  const k1 = derivative(state);
  const k2 = derivative(addScaled(state, k1, dt / 2));
  const k3 = derivative(addScaled(state, k2, dt / 2));
  const k4 = derivative(addScaled(state, k3, dt));
  return state.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

function simulate(method: 'euler' | 'rk4', dt: number): Trajectory {
  let state = [0, LAUNCH_HEIGHT, 8 * Math.cos((54 * Math.PI) / 180), 8 * Math.sin((54 * Math.PI) / 180)];
  const step = method === 'euler' ? eulerStep : rk4Step;
  const points: Point[] = [{x: state[0], y: state[1]}];
  let peak = state[1];
  let range = 0;

  for (let i = 0; i < 1000 && state[0] < 12; i++) {
    const previous = state;
    state = step(state, dt);
    peak = Math.max(peak, state[1]);

    if (state[1] <= 0) {
      const f = previous[1] / (previous[1] - state[1]);
      range = previous[0] + f * (state[0] - previous[0]);
      points.push({x: range, y: 0});
      break;
    }

    points.push({x: state[0], y: state[1]});
  }

  if (range === 0) range = state[0];
  return {points, range, peak};
}

function pathFrom(points: Point[], sx: (x: number) => number, sy: (y: number) => number) {
  return 'M ' + points.map((p) => `${sx(p.x).toFixed(1)} ${sy(Math.max(0, p.y)).toFixed(1)}`).join(' L ');
}

function IntegratorBattle() {
  const [dt, setDt] = useState(0.08);
  const euler = useMemo(() => simulate('euler', dt), [dt]);
  const rk4 = useMemo(() => simulate('rk4', dt), [dt]);
  const truth = useMemo(() => simulate('rk4', 0.002), []);

  const W = 720;
  const H = 390;
  const padL = 46;
  const padR = 22;
  const padT = 20;
  const padB = 34;
  const xMax = Math.max(7, Math.max(euler.range, rk4.range, truth.range) * 1.08);
  const yMax = Math.max(2.2, Math.max(euler.peak, rk4.peak, truth.peak) * 1.18);
  const sx = (x: number) => padL + (x / xMax) * (W - padL - padR);
  const sy = (y: number) => padT + (1 - y / yMax) * (H - padT - padB);
  const ticks = Array.from({length: Math.floor(xMax) + 1}, (_, i) => i);

  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full rounded-xl bg-[#0b1120]"
        role="img"
        aria-label="Euler and RK4 trajectory comparison as integration step size changes.">
        <line x1={sx(0)} y1={sy(0)} x2={sx(xMax)} y2={sy(0)} stroke="#3b4a6b" strokeWidth="2" />
        <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(yMax)} stroke="#3b4a6b" strokeWidth="2" />
        {ticks.map((m) => (
          <g key={m}>
            <line x1={sx(m)} y1={sy(0)} x2={sx(m)} y2={sy(yMax)} stroke="rgba(255,255,255,0.05)" />
            <text x={sx(m)} y={sy(0) + 20} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#8294b8">
              {m}m
            </text>
          </g>
        ))}
        <path d={pathFrom(truth.points, sx, sy)} fill="none" stroke="#8294b8" strokeWidth="2" strokeDasharray="4 6" />
        <path d={pathFrom(euler.points, sx, sy)} fill="none" stroke="#ff6f9c" strokeWidth="3" strokeLinecap="round" />
        <path d={pathFrom(rk4.points, sx, sy)} fill="none" stroke="#5ce08a" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={sx(truth.range)} cy={sy(0)} r="6" fill="#ffc24d" />
        <text x={sx(truth.range) + 10} y={sy(0) - 10} fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#ffc24d">
          high-resolution target
        </text>
        <text x={sx(0) + 8} y={sy(yMax) + 18} fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#aab8d6">
          dt controls how often the simulator samples acceleration.
        </text>
      </svg>

      <Controls>
        <Slider
          label="Integration step size (dt)"
          min={0.005}
          max={0.24}
          step={0.005}
          value={dt}
          onChange={setDt}
          format={(v) => `${v.toFixed(3)} s`}
        />
      </Controls>
      <Readout
        items={[
          ['Euler miss', `${Math.abs(euler.range - truth.range).toFixed(2)} m`],
          ['RK4 miss', `${Math.abs(rk4.range - truth.range).toFixed(2)} m`],
          ['Euler range', `${euler.range.toFixed(2)} m`],
          ['RK4 range', `${rk4.range.toFixed(2)} m`],
        ]}
      />
      <Legend
        items={[
          {color: '#8294b8', label: 'reference RK4, dt = 0.002 s'},
          {color: '#ff6f9c', label: 'Euler at selected dt'},
          {color: '#5ce08a', label: 'RK4 at selected dt'},
          {color: '#ffc24d', label: 'target landing point', dot: true},
        ]}
      />
    </>
  );
}

function TransferRealityCheck() {
  const [angle, setAngle] = useState(45);
  const W = 720;
  const H = 390;
  const padL = 54;
  const padR = 22;
  const padT = 24;
  const padB = 42;
  const xMax = 35;
  const yMax = 25;
  const sx = (x: number) => padL + (x / xMax) * (W - padL - padR);
  const sy = (y: number) => padT + (1 - y / yMax) * (H - padT - padB);

  const assumedEta = 0.7;
  const droop = clamp(1 - Math.max(0, angle - 30) * 0.006, 0.72, 1);
  const measuredEta = 0.26 * droop;
  const xs = [6, 10, 14, 18, 22, 26, 30, 34];
  const experimental = xs.map((x, i) => {
    const ripple = [0.15, -0.05, 0.08, -0.12, 0.06, -0.08, 0.04, -0.1][i];
    return {x, y: x * measuredEta + ripple};
  });
  const targetWheel = 28;
  const assumedExit = targetWheel * assumedEta;
  const realExit = targetWheel * measuredEta;

  const line = (eta: number) => `M ${sx(0)} ${sy(0)} L ${sx(xMax)} ${sy(xMax * eta)}`;

  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full rounded-xl bg-[#0b1120]"
        role="img"
        aria-label="Wheel surface speed to exit velocity transfer graph with theoretical and measured efficiency lines.">
        <rect x={padL} y={padT} width={W - padL - padR} height={H - padT - padB} fill="rgba(255,255,255,0.015)" />
        {Array.from({length: 8}, (_, i) => i * 5).map((x) => (
          <g key={`x${x}`}>
            <line x1={sx(x)} y1={sy(0)} x2={sx(x)} y2={sy(yMax)} stroke="rgba(255,255,255,0.05)" />
            <text x={sx(x)} y={H - 18} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#8294b8">
              {x}
            </text>
          </g>
        ))}
        {Array.from({length: 6}, (_, i) => i * 5).map((y) => (
          <g key={`y${y}`}>
            <line x1={sx(0)} y1={sy(y)} x2={sx(xMax)} y2={sy(y)} stroke="rgba(255,255,255,0.05)" />
            <text x={padL - 10} y={sy(y) + 4} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#8294b8">
              {y}
            </text>
          </g>
        ))}
        <path d={line(assumedEta)} fill="none" stroke="#8294b8" strokeWidth="2.5" strokeDasharray="8 6" />
        <path d={line(measuredEta)} fill="none" stroke="#6f8bff" strokeWidth="3.5" />
        {experimental.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="5.5" fill="#e8eefc" stroke="#0b1120" strokeWidth="2" />
        ))}
        <line x1={sx(targetWheel)} y1={sy(0)} x2={sx(targetWheel)} y2={sy(assumedExit)} stroke="#ffc24d" strokeWidth="1.5" strokeDasharray="3 4" />
        <line x1={sx(targetWheel)} y1={sy(realExit)} x2={sx(targetWheel)} y2={sy(assumedExit)} stroke="#ff6f9c" strokeWidth="3" />
        <text x={sx(xMax) - 4} y={H - 6} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#aab8d6">
          wheel surface speed (m/s)
        </text>
        <text x={12} y={padT + 12} transform={`rotate(-90 12 ${padT + 12})`} fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#aab8d6">
          exit velocity (m/s)
        </text>
      </svg>

      <Controls>
        <Slider label="Launch angle" min={20} max={70} step={1} value={angle} onChange={setAngle} format={(v) => `${v.toFixed(0)} deg`} />
      </Controls>
      <Readout
        items={[
          ['Firmware assumption eta', assumedEta.toFixed(2)],
          ['Measured eta at this angle', measuredEta.toFixed(2)],
          ['Predicted exit at 28 m/s wheel', `${assumedExit.toFixed(1)} m/s`],
          ['Reality estimate', `${realExit.toFixed(1)} m/s`],
        ]}
      />
      <Legend
        items={[
          {color: '#8294b8', label: 'assumed transfer line, eta = 0.70'},
          {color: '#6f8bff', label: 'experimental transfer line, eta about 0.26 and angle-dependent'},
          {color: '#ff6f9c', label: 'lost velocity from contact losses'},
          {color: '#e8eefc', label: 'calibration shots', dot: true},
        ]}
      />
    </>
  );
}

const tabs: {id: TabId; label: string; title: string}[] = [
  {id: 'integrator', label: 'Step 1', title: 'Integrator Battle'},
  {id: 'drag', label: 'Step 2', title: 'The Drag Awakening'},
  {id: 'transfer', label: 'Step 3', title: 'Transfer Reality Check'},
];

export default function PhysicalRealityDashboard() {
  const [active, setActive] = useState<TabId>('integrator');
  const current = tabs.find((tab) => tab.id === active)!;

  return (
    <Demo title={`Simulating Physical Reality - ${current.title}`} pill="Research dashboard">
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button key={tab.id} active={active === tab.id} primary={active === tab.id} onClick={() => setActive(tab.id)}>
            {tab.label}: {tab.title}
          </Button>
        ))}
      </div>

      {active === 'integrator' && <IntegratorBattle />}
      {active === 'drag' && <DragAwakening />}
      {active === 'transfer' && <TransferRealityCheck />}

      <Buttons className="border-t border-white/10 pt-4">
        <Button onClick={() => setActive('integrator')}>Integrator</Button>
        <Button onClick={() => setActive('drag')}>Drag model</Button>
        <Button onClick={() => setActive('transfer')}>Energy transfer</Button>
      </Buttons>
    </Demo>
  );
}
