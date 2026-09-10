import {useId, useMemo, useState} from 'react';
import {Controls, Demo, Legend, Readout} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';
import {motionStep, planConstrainedMotion} from '@site/src/lib/domain/mpc';
import {elevatorPlantStep, stateSpaceOperationEstimate} from '@site/src/lib/domain/stateSpace';

const W = 760;
const H = 360;
const P = {l: 64, r: 28, t: 30, b: 58};
const PW = W - P.l - P.r;
const PH = H - P.t - P.b;
const MONO = 'JetBrains Mono, monospace';

function sx(value: number, min: number, max: number) {
  return P.l + ((value - min) / (max - min)) * PW;
}

function sy(value: number, min: number, max: number) {
  return P.t + (1 - (value - min) / (max - min)) * PH;
}

function linePath(points: Array<[number, number]>) {
  return points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
}

function PlotGrid({
  xLabel,
  yLabel,
  xMin,
  xMax,
  yMin,
  yMax,
}: {
  xLabel: string;
  yLabel: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}) {
  return (
    <g>
      <rect width={W} height={H} rx="16" fill="#0b1120" />
      {Array.from({length: 7}, (_, index) => {
        const x = P.l + (index / 6) * PW;
        const value = xMin + (index / 6) * (xMax - xMin);
        return (
          <g key={`x-${index}`}>
            <line x1={x} x2={x} y1={P.t} y2={H - P.b} stroke="rgba(255,255,255,0.08)" />
            <text
              x={x}
              y={H - P.b + 21}
              fill="#7183a8"
              textAnchor="middle"
              fontFamily={MONO}
              fontSize="11">
              {value.toFixed(1)}
            </text>
          </g>
        );
      })}
      {Array.from({length: 5}, (_, index) => {
        const y = P.t + (index / 4) * PH;
        const value = yMax - (index / 4) * (yMax - yMin);
        return (
          <g key={`y-${index}`}>
            <line x1={P.l} x2={W - P.r} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" />
            <text
              x={P.l - 9}
              y={y + 4}
              fill="#7183a8"
              textAnchor="end"
              fontFamily={MONO}
              fontSize="11">
              {value.toFixed(1)}
            </text>
          </g>
        );
      })}
      <text x={W / 2} y={H - 17} fill="#9aabd0" textAnchor="middle" fontFamily={MONO} fontSize="13">
        {xLabel}
      </text>
      <text
        x="20"
        y={H / 2}
        fill="#9aabd0"
        textAnchor="middle"
        fontFamily={MONO}
        fontSize="13"
        transform={`rotate(-90 20 ${H / 2})`}>
        {yLabel}
      </text>
    </g>
  );
}

export function StateVectorExplorer() {
  const [position, setPosition] = useState(-0.55);
  const [velocity, setVelocity] = useState(0.8);
  const [volts, setVolts] = useState(2);
  const [dt, setDt] = useState(0.05);
  const markerId = `state-arrow-${useId().replaceAll(':', '')}`;
  const next = elevatorPlantStep({position, velocity}, volts, -3, 1.5, dt);
  const xRange: [number, number] = [-1.2, 1.2];
  const vRange: [number, number] = [-2, 2];
  const currentPoint = [sx(position, ...xRange), sy(velocity, ...vRange)] as const;
  const nextPoint = [sx(next.position, ...xRange), sy(next.velocity, ...vRange)] as const;

  return (
    <Demo title="The state is one point; the model moves it" pill="State viewer">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full rounded-xl"
        role="img"
        aria-label={`Elevator phase plane. Current state is position ${position.toFixed(2)} meters and velocity ${velocity.toFixed(2)} meters per second. The predicted next state is position ${next.position.toFixed(2)} and velocity ${next.velocity.toFixed(2)}.`}>
        <defs>
          <marker id={markerId} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
            <path d="M0 0L5 2.5L0 5Z" fill="#ffc24d" />
          </marker>
        </defs>
        <PlotGrid
          xLabel="position p (m)"
          yLabel="velocity v (m/s)"
          xMin={xRange[0]}
          xMax={xRange[1]}
          yMin={vRange[0]}
          yMax={vRange[1]}
        />
        <line
          x1={sx(0, ...xRange)}
          x2={sx(0, ...xRange)}
          y1={P.t}
          y2={H - P.b}
          stroke="rgba(255,255,255,0.28)"
        />
        <line
          x1={P.l}
          x2={W - P.r}
          y1={sy(0, ...vRange)}
          y2={sy(0, ...vRange)}
          stroke="rgba(255,255,255,0.28)"
        />
        <line
          x1={currentPoint[0]}
          y1={currentPoint[1]}
          x2={nextPoint[0]}
          y2={nextPoint[1]}
          stroke="#ffc24d"
          strokeWidth="4"
          markerEnd={`url(#${markerId})`}
        />
        <circle cx={currentPoint[0]} cy={currentPoint[1]} r="5" fill="#6f8bff" />
        <circle cx={nextPoint[0]} cy={nextPoint[1]} r="4" fill="#5ce08a" />
        <text
          x={currentPoint[0] + 12}
          y={currentPoint[1] - 12}
          fill="#aebcff"
          fontFamily={MONO}
          fontSize="12">
          x[k]
        </text>
        <text
          x={nextPoint[0] + 10}
          y={nextPoint[1] + 20}
          fill="#83eea6"
          fontFamily={MONO}
          fontSize="12">
          x[k+1]
        </text>
      </svg>
      <Controls>
        <Slider
          label="Position state p"
          min={-1}
          max={1}
          step={0.05}
          value={position}
          onChange={setPosition}
          format={(v) => `${v.toFixed(2)} m`}
        />
        <Slider
          label="Velocity state v"
          min={-1.8}
          max={1.8}
          step={0.1}
          value={velocity}
          onChange={setVelocity}
          format={(v) => `${v.toFixed(1)} m/s`}
        />
        <Slider
          label="Input u"
          min={-12}
          max={12}
          step={0.5}
          value={volts}
          onChange={setVolts}
          format={(v) => `${v.toFixed(1)} V`}
        />
        <Slider
          label="Loop step Δt"
          min={0.01}
          max={0.1}
          step={0.01}
          value={dt}
          onChange={setDt}
          format={(v) => `${(v * 1000).toFixed(0)} ms`}
        />
      </Controls>
      <Readout
        items={[
          ['state now', `x=[${position.toFixed(2)} m, ${velocity.toFixed(2)} m/s]ᵀ`],
          ['measured output', `y=p=${position.toFixed(2)} m`],
          ['next state', `xNext=[${next.position.toFixed(2)}, ${next.velocity.toFixed(2)}]ᵀ`],
          ['what the sensor hides', 'velocity — the second coordinate'],
        ]}
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'current state'},
          {color: '#5ce08a', label: 'predicted state'},
          {color: '#ffc24d', label: 'one model update'},
        ]}
      />
    </Demo>
  );
}

export function ObserverExplorer() {
  const [noise, setNoise] = useState(0.08);
  const [modelError, setModelError] = useState(15);
  const [correction, setCorrection] = useState(0.35);
  const [target, setTarget] = useState(1);
  const dt = 0.02;
  const duration = 3;

  const result = useMemo(() => {
    const truth: Array<[number, number]> = [];
    const measured: Array<[number, number]> = [];
    const estimate: Array<[number, number]> = [];
    let actual = {position: 0, velocity: 0};
    let estimated = {position: 0, velocity: 0};
    let squaredError = 0;
    let peakVolts = 0;
    const alpha = correction;
    const beta = 0.08 * correction ** 2;

    for (let step = 0; step <= duration / dt; step++) {
      const t = step * dt;
      const measurement =
        actual.position + (noise * (Math.sin(17 * t) + 0.45 * Math.sin(53 * t + 0.7))) / 1.45;
      const innovation = measurement - estimated.position;
      estimated.position += alpha * innovation;
      estimated.velocity += (beta / dt) * innovation;

      truth.push([t, actual.position]);
      measured.push([t, measurement]);
      estimate.push([t, estimated.position]);
      squaredError += (estimated.position - actual.position) ** 2;

      const volts = Math.max(
        -12,
        Math.min(12, 10 * (target - estimated.position) + 3.5 * (0 - estimated.velocity)),
      );
      peakVolts = Math.max(peakVolts, Math.abs(volts));
      if (step < duration / dt) {
        actual = elevatorPlantStep(actual, volts, -3 * (1 + modelError / 100), 1.5, dt);
        estimated = elevatorPlantStep(estimated, volts, -3, 1.5, dt);
      }
    }

    return {
      truth,
      measured,
      estimate,
      rms: Math.sqrt(squaredError / truth.length),
      finalError: target - actual.position,
      peakVolts,
    };
  }, [correction, modelError, noise, target]);

  const yMin = -0.25;
  const yMax = 1.6;
  const plot = (points: Array<[number, number]>) =>
    linePath(points.map(([x, y]) => [sx(x, 0, duration), sy(y, yMin, yMax)]));

  return (
    <Demo title="Predict with the model, correct with the encoder" pill="Observer viewer">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full rounded-xl"
        role="img"
        aria-label={`Elevator position trace comparing true, measured, and observer-estimated position. RMS estimation error is ${result.rms.toFixed(3)} meters.`}>
        <PlotGrid
          xLabel="time (s)"
          yLabel="elevator position (m)"
          xMin={0}
          xMax={duration}
          yMin={yMin}
          yMax={yMax}
        />
        <line
          x1={P.l}
          x2={W - P.r}
          y1={sy(target, yMin, yMax)}
          y2={sy(target, yMin, yMax)}
          stroke="#9aabd0"
          strokeDasharray="4 6"
        />
        <path
          d={plot(result.measured)}
          fill="none"
          stroke="#ff6f9c"
          strokeWidth="1.5"
          opacity="0.55"
        />
        <path d={plot(result.truth)} fill="none" stroke="#5ce08a" strokeWidth="4" />
        <path d={plot(result.estimate)} fill="none" stroke="#6f8bff" strokeWidth="3" />
      </svg>
      <Controls>
        <Slider
          label="Target position"
          min={0.4}
          max={1.4}
          step={0.1}
          value={target}
          onChange={setTarget}
          format={(v) => `${v.toFixed(1)} m`}
        />
        <Slider
          label="Actual encoder noise"
          min={0}
          max={0.2}
          step={0.01}
          value={noise}
          onChange={setNoise}
          format={(v) => `±${v.toFixed(2)} m`}
        />
        <Slider
          label="Plant differs from model"
          min={-30}
          max={40}
          step={5}
          value={modelError}
          onChange={setModelError}
          format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}% damping`}
        />
        <Slider
          label="Measurement correction"
          min={0.05}
          max={0.9}
          step={0.05}
          value={correction}
          onChange={setCorrection}
          format={(v) => v.toFixed(2)}
        />
      </Controls>
      <Readout
        items={[
          ['RMS estimate error', `${result.rms.toFixed(3)} m`],
          ['final tracking error', `${result.finalError.toFixed(3)} m`],
          ['peak command', `${result.peakVolts.toFixed(2)} V`],
          ['runtime order', 'correct → control → predict, every 20 ms'],
        ]}
      />
      <Legend
        items={[
          {color: '#5ce08a', label: 'true position'},
          {color: '#6f8bff', label: 'observer estimate'},
          {color: '#ff6f9c', label: 'noisy encoder'},
        ]}
      />
    </Demo>
  );
}

export function MpcHorizonExplorer() {
  const [position, setPosition] = useState(0.35);
  const [velocity, setVelocity] = useState(0.8);
  const [target, setTarget] = useState(1.65);
  const [horizon, setHorizon] = useState(4);
  const [maxAcceleration, setMaxAcceleration] = useState(2);
  const dt = 0.2;
  const minPosition = 0;
  const maxPosition = 2;

  const plan = useMemo(
    () =>
      planConstrainedMotion({
        state: {position, velocity},
        targetPosition: target,
        horizon,
        dtSeconds: dt,
        maxAcceleration,
        minPosition,
        maxPosition,
      }),
    [horizon, maxAcceleration, position, target, velocity],
  );
  const points = plan.states.map((state, step) => [
    sx(step, 0, horizon),
    sy(state.position, minPosition, maxPosition),
  ]) as Array<[number, number]>;
  const firstInput = plan.inputs[0];
  // Draw the constant-acceleration arcs, retaining dots at control samples.
  const trajectoryPoints = plan.inputs.flatMap((input, step) =>
    Array.from({length: 21}, (_, sample) => {
      const fraction = sample / 20;
      const state =
        fraction === 0 ? plan.states[step] : motionStep(plan.states[step], input, fraction * dt);
      return [sx(step + fraction, 0, horizon), sy(state.position, minPosition, maxPosition)] as [
        number,
        number,
      ];
    }),
  );

  return (
    <Demo title="Plan a few moves, use one, then plan again" pill="MPC viewer">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full rounded-xl"
        role="img"
        aria-label={`Predicted elevator position over ${horizon} steps. The optimizer tests ${plan.candidateCount} input sequences and chooses ${firstInput.toFixed(1)} meters per second squared as its first acceleration. ${plan.feasible ? 'The selected plan respects the position limits.' : 'No tested plan can respect the position limits.'}`}>
        <PlotGrid
          xLabel="future step k"
          yLabel="predicted position (m)"
          xMin={0}
          xMax={horizon}
          yMin={minPosition}
          yMax={maxPosition}
        />
        <line
          x1={P.l}
          x2={W - P.r}
          y1={sy(target, minPosition, maxPosition)}
          y2={sy(target, minPosition, maxPosition)}
          stroke="#ffc24d"
          strokeWidth="2"
          strokeDasharray="7 6"
        />
        <path
          d={linePath(trajectoryPoints)}
          fill="none"
          stroke={plan.feasible ? '#6f8bff' : '#ff6f9c'}
          strokeWidth="4"
        />
        {points.map(([x, y], step) => (
          <circle
            key={step}
            cx={x}
            cy={y}
            r={step === 0 ? 6 : 4}
            fill={step === 0 ? '#5ce08a' : plan.feasible ? '#aebcff' : '#ff9cbb'}
          />
        ))}
      </svg>
      <Controls>
        <Slider
          label="Current position"
          min={0.05}
          max={1.95}
          step={0.05}
          value={position}
          onChange={setPosition}
          format={(v) => `${v.toFixed(2)} m`}
        />
        <Slider
          label="Current velocity"
          min={-1.5}
          max={1.5}
          step={0.1}
          value={velocity}
          onChange={setVelocity}
          format={(v) => `${v.toFixed(1)} m/s`}
        />
        <Slider
          label="Target position"
          min={0.1}
          max={1.9}
          step={0.05}
          value={target}
          onChange={setTarget}
          format={(v) => `${v.toFixed(2)} m`}
        />
        <Slider
          label="Prediction horizon N"
          min={1}
          max={6}
          step={1}
          value={horizon}
          onChange={setHorizon}
          format={(v) => `${v.toFixed(0)} steps`}
        />
        <Slider
          label="Acceleration limit"
          min={0.5}
          max={3}
          step={0.5}
          value={maxAcceleration}
          onChange={setMaxAcceleration}
          format={(v) => `±${v.toFixed(1)} m/s²`}
        />
      </Controls>
      <Readout
        items={[
          ['candidate input sequences', `${plan.candidateCount.toLocaleString()} = 3^${horizon}`],
          ['plans inside 0–2 m', `${plan.feasibleCount.toLocaleString()}`],
          ['first action to apply', `${firstInput > 0 ? '+' : ''}${firstInput.toFixed(1)} m/s²`],
          ['next loop', 'measure the new state and solve again'],
          [
            'constraint result',
            plan.feasible
              ? 'a legal plan exists'
              : 'infeasible: change the request or safety response',
          ],
        ]}
      />
      <Legend
        items={[
          {color: '#5ce08a', label: 'measured state now'},
          {color: plan.feasible ? '#6f8bff' : '#ff6f9c', label: 'selected prediction'},
          {color: '#ffc24d', label: 'target'},
        ]}
      />
    </Demo>
  );
}

export function ComputeGrowthExplorer() {
  const [states, setStates] = useState(2);
  const [outputs, setOutputs] = useState(1);
  const estimate = stateSpaceOperationEstimate(states, Math.min(states, outputs));
  const rows = [
    ['State feedback Kx', estimate.controller, '#5ce08a'],
    ['Observer with fixed gain', estimate.steadyObserver, '#6f8bff'],
    ['Online covariance update', estimate.covarianceUpdate, '#ffc24d'],
  ] as const;
  const max = Math.max(...rows.map(([, value]) => value));

  return (
    <Demo title="What grows when the state vector grows?" pill="Compute viewer">
      <div
        className="space-y-4 rounded-xl bg-[#0b1120] p-5"
        role="img"
        aria-label={`Approximate dense multiplication counts for ${states} states and ${Math.min(states, outputs)} sensor outputs`}>
        {rows.map(([label, value, color]) => (
          <div key={label}>
            <div className="mb-1.5 flex justify-between gap-4 font-mono text-xs text-[#c7d2e8]">
              <span>{label}</span>
              <span>{value.toLocaleString()} multiplies</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(2, (Math.log10(value + 1) / Math.log10(max + 1)) * 100)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <Controls>
        <Slider
          label="State count n"
          min={1}
          max={10}
          step={1}
          value={states}
          onChange={setStates}
          format={(v) => `${v.toFixed(0)} states`}
        />
        <Slider
          label="Sensor outputs p"
          min={1}
          max={states}
          step={1}
          value={Math.min(states, outputs)}
          onChange={setOutputs}
          format={(v) => `${v.toFixed(0)} outputs`}
        />
      </Controls>
      <Readout
        items={[
          ['controller scaling', 'O(n) for one motor input'],
          ['fixed-gain observer', 'O(n²)'],
          ['covariance solve', 'O(n³), normally designed or simplified offline'],
          ['timing conclusion', 'measure the whole loop; operation counts are not CPU benchmarks'],
        ]}
      />
    </Demo>
  );
}
