import {useRef, useState} from 'react';

import {Trace} from '@site/src/lib/plot';
import {usePlot, useRaf} from '@site/src/lib/canvas';
import {Button, Buttons, Controls, Demo, Legend, Readout} from '../kit/Demo';
import {Slider} from '../kit/Slider';

type ControllerState = {
  x: number;
  v: number;
  integral: number;
  raw: number;
  out: number;
  trace: Trace;
  integralTrace: Trace;
};

const DT = 1 / 180;
const KP = 3.8;
const KI = 1.25;
const KD = 1.35;
const PLANT_GAIN = 4.8;
const DAMPING = 2.2;
const INTEGRAL_LIMIT_VOLTS = 2.2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sign(value: number): number {
  if (Math.abs(value) < 1e-9) {
    return 0;
  }
  return Math.sign(value);
}

function stepController(
  state: ControllerState,
  target: number,
  voltageLimit: number,
  antiWindup: boolean,
) {
  const error = target - state.x;
  let nextIntegral = state.integral + error * DT;
  const integralContribution = KI * nextIntegral;

  if (antiWindup) {
    const limitedContribution = clamp(
      integralContribution,
      -INTEGRAL_LIMIT_VOLTS,
      INTEGRAL_LIMIT_VOLTS,
    );
    nextIntegral = limitedContribution / KI;
  }

  const rawCandidate = KP * error + KI * nextIntegral - KD * state.v;
  const saturated = clamp(rawCandidate, -voltageLimit, voltageLimit);

  if (antiWindup) {
    const tryingToPushFurtherPositive = rawCandidate > voltageLimit && error > 0;
    const tryingToPushFurtherNegative = rawCandidate < -voltageLimit && error < 0;
    if (tryingToPushFurtherPositive || tryingToPushFurtherNegative) {
      nextIntegral = state.integral;
    }
  }

  const raw = KP * error + KI * nextIntegral - KD * state.v;
  const out = clamp(raw, -voltageLimit, voltageLimit);
  const accel = PLANT_GAIN * out - DAMPING * state.v;
  state.v += accel * DT;
  state.x += state.v * DT;
  state.integral = nextIntegral;
  state.raw = raw;
  state.out = out;
}

export default function AntiWindup() {
  const [target, setTarget] = useState(6);
  const [voltageLimit, setVoltageLimit] = useState(4);
  const targetRef = useRef(target);
  const limitRef = useRef(voltageLimit);
  targetRef.current = target;
  limitRef.current = voltageLimit;

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const plotRef = usePlot(canvas, {
    height: 310,
    xmin: 0,
    xmax: 9,
    ymin: -1,
    ymax: 8,
    padL: 44,
    xLabel: 'seconds',
    yLabel: 'position',
  });

  const noAnti = useRef<ControllerState>({
    x: 0,
    v: 0,
    integral: 0,
    raw: 0,
    out: 0,
    trace: new Trace(1600),
    integralTrace: new Trace(1600),
  });
  const anti = useRef<ControllerState>({
    x: 0,
    v: 0,
    integral: 0,
    raw: 0,
    out: 0,
    trace: new Trace(1600),
    integralTrace: new Trace(1600),
  });
  const sim = useRef({t: 0});
  const acc = useRef(0);
  const readouts = {
    noAntiIntegral: useRef<HTMLElement | null>(null),
    antiIntegral: useRef<HTMLElement | null>(null),
    noAntiRaw: useRef<HTMLElement | null>(null),
    antiRaw: useRef<HTMLElement | null>(null),
    saturated: useRef<HTMLElement | null>(null),
  };

  function reset() {
    for (const s of [noAnti.current, anti.current]) {
      s.x = 0;
      s.v = 0;
      s.integral = 0;
      s.raw = 0;
      s.out = 0;
      s.trace.clear();
      s.integralTrace.clear();
    }
    sim.current.t = 0;
  }

  function runStep() {
    const t = sim.current.t;
    const targetNow = targetRef.current;
    const limitNow = limitRef.current;
    stepController(noAnti.current, targetNow, limitNow, false);
    stepController(anti.current, targetNow, limitNow, true);
    sim.current.t += DT;
    noAnti.current.trace.push(t, noAnti.current.x);
    anti.current.trace.push(t, anti.current.x);
    noAnti.current.integralTrace.push(t, KI * noAnti.current.integral);
    anti.current.integralTrace.push(t, KI * anti.current.integral);
  }

  function draw() {
    const p = plotRef.current;
    const t = sim.current.t;
    if (p) {
      p.setX(Math.max(0, t - 9), Math.max(9, t));
      p.setY(-1, Math.max(8, targetRef.current + 2));
      p.clear();
      p.grid();
      p.hline(targetRef.current, {color: '#6f8bff', dash: [6, 5], width: 1.5});
      p.clip(() => {
        p.line(noAnti.current.trace.points(), {color: '#ff6f9c', width: 2.5});
        p.line(anti.current.trace.points(), {color: '#5ce08a', width: 3});
        p.line(noAnti.current.integralTrace.points(), {color: '#ffc24d', width: 1.7, dash: [4, 5]});
        p.line(anti.current.integralTrace.points(), {color: '#2dd4bf', width: 1.7, dash: [4, 5]});
      });
    }

    if (readouts.noAntiIntegral.current) {
      readouts.noAntiIntegral.current.textContent = `${(KI * noAnti.current.integral).toFixed(2)} V`;
    }
    if (readouts.antiIntegral.current) {
      readouts.antiIntegral.current.textContent = `${(KI * anti.current.integral).toFixed(2)} V`;
    }
    if (readouts.noAntiRaw.current) {
      readouts.noAntiRaw.current.textContent = `${noAnti.current.raw.toFixed(2)} V`;
    }
    if (readouts.antiRaw.current) {
      readouts.antiRaw.current.textContent = `${anti.current.raw.toFixed(2)} V`;
    }
    if (readouts.saturated.current) {
      readouts.saturated.current.textContent =
        Math.abs(noAnti.current.raw) > limitRef.current ? 'yes' : 'no';
    }
  }

  useRaf((frameDt: number) => {
    acc.current += Math.min(frameDt, 0.08);
    let n = 0;
    while (acc.current >= DT && n < 80) {
      runStep();
      acc.current -= DT;
      n++;
    }
    draw();
  }, canvas);

  return (
    <Demo title="Actuator saturation: the integral keeps charging unless you stop it">
      <canvas
        ref={canvas}
        role="img"
        aria-label="Position response comparing a PID controller with integral windup against an anti-windup controller."
        className="block w-full rounded-xl bg-[#0b1120]"
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'target', dot: true},
          {color: '#ff6f9c', label: 'PID with windup'},
          {color: '#5ce08a', label: 'PID with anti-windup'},
          {color: '#ffc24d', label: 'windup integral contribution'},
          {color: '#2dd4bf', label: 'anti-windup integral contribution'},
        ]}
      />
      <Controls>
        <Slider
          label="Target position"
          min={2}
          max={8}
          step={0.25}
          value={target}
          onChange={(v) => {
            setTarget(v);
            reset();
          }}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Actuator voltage limit"
          min={2.5}
          max={9}
          step={0.25}
          value={voltageLimit}
          onChange={(v) => {
            setVoltageLimit(v);
            reset();
          }}
          format={(v) => `${v.toFixed(2)} V`}
        />
      </Controls>
      <Buttons>
        <Button onClick={reset}>Reset</Button>
        <Button
          onClick={() => {
            setTarget((v) => (v < 5 ? 7 : 3));
            reset();
          }}>
          Step target
        </Button>
        <Button
          onClick={() => {
            setVoltageLimit(3);
            reset();
          }}>
          Force saturation
        </Button>
      </Buttons>
      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>
          windup I: <b ref={readouts.noAntiIntegral} className="text-white">0.00 V</b>
        </span>
        <span>
          anti I: <b ref={readouts.antiIntegral} className="text-white">0.00 V</b>
        </span>
        <span>
          raw PID: <b ref={readouts.noAntiRaw} className="text-white">0.00 V</b>
        </span>
        <span>
          anti raw: <b ref={readouts.antiRaw} className="text-white">0.00 V</b>
        </span>
        <span>
          saturated: <b ref={readouts.saturated} className="text-white">no</b>
        </span>
      </div>
      <p className="mt-3 px-1 text-[0.82rem] leading-relaxed text-[#b9c5de]">
        The solid lines are mechanism position. The dashed lines are the integral term measured in output
        volts. When the raw PID command exceeds the actuator limit, the pink controller keeps integrating;
        the green controller clamps and conditionally pauses integration.
      </p>
    </Demo>
  );
}
