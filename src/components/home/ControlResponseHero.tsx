import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import Link from '@docusaurus/Link';
import {useDprCanvas, useRaf} from '@site/src/lib/visualization/canvas';
import {FlylineSweep} from '@site/src/components/home/Flyline';

interface Sample {
  time: number;
  output: number;
  target: number;
}

interface Readout {
  target: number;
  output: number;
  error: number;
}

interface ResponseModel {
  time: number;
  output: number;
  velocity: number;
  target: number;
  nextStep: number;
  lastPublish: number;
  samples: Sample[];
}

const WINDOW_SECONDS = 8;
const KP = 24;
const KD = 5.4;
const MIN_TARGET = 0.08;
const MAX_TARGET = 0.92;

function createInitialModel(): ResponseModel {
  const model: ResponseModel = {
    time: 0,
    output: 0.28,
    velocity: 0,
    target: 0.28,
    nextStep: 10.5,
    lastPublish: 0,
    samples: [],
  };
  const dt = 1 / 60;

  while (model.time < WINDOW_SECONDS) {
    model.time += dt;
    if (model.time >= 1.35) model.target = 0.72;
    const acceleration = KP * (model.target - model.output) - KD * model.velocity;
    model.velocity += acceleration * dt;
    model.output += model.velocity * dt;
    model.samples.push({
      time: model.time,
      output: model.output,
      target: model.target,
    });
  }

  model.lastPublish = model.time;
  return model;
}

function responsePalette() {
  const dark = document.documentElement.dataset.theme === 'dark';
  return dark
    ? {
        grid: '#343238',
        text: '#b5b0a7',
        output: '#aebaff',
        target: '#f5b942',
      }
    : {
        grid: '#dedbd3',
        text: '#66666f',
        output: '#2543c2',
        target: '#9a6200',
      };
}

function ClosedLoopResponse() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const size = useDprCanvas(canvasRef, 220);
  const state = useRef<ResponseModel | null>(null);
  if (state.current === null) state.current = createInitialModel();

  const [playing, setPlaying] = useState(true);
  const [readout, setReadout] = useState<Readout>(() => ({
    target: state.current!.target,
    output: state.current!.output,
    error: Math.abs(state.current!.target - state.current!.output),
  }));

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;

    const sync = () => {
      if (media.matches) setPlaying(false);
    };
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  function publishReadout() {
    const model = state.current!;
    setReadout({
      target: model.target,
      output: model.output,
      error: Math.abs(model.target - model.output),
    });
  }

  function setTarget(value: number) {
    const model = state.current!;
    model.target = Math.max(MIN_TARGET, Math.min(MAX_TARGET, value));
    model.nextStep = model.time + 4.5;
    publishReadout();
  }

  function advance(dt: number) {
    const model = state.current!;
    model.time += dt;

    if (model.time >= model.nextStep) {
      model.target = model.target > 0.5 ? 0.32 : 0.76;
      model.nextStep = model.time + 4.5;
    }

    const acceleration = KP * (model.target - model.output) - KD * model.velocity;
    model.velocity += acceleration * dt;
    model.output += model.velocity * dt;
    model.samples.push({
      time: model.time,
      output: model.output,
      target: model.target,
    });

    const oldestVisibleTime = model.time - WINDOW_SECONDS - 0.5;
    while (model.samples[0]?.time < oldestVisibleTime) {
      model.samples.shift();
    }

    if (model.time - model.lastPublish >= 0.12) {
      model.lastPublish = model.time;
      publishReadout();
    }
  }

  function draw() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const {w, h} = size.current;
    const model = state.current!;
    const colors = responsePalette();
    const left = 42;
    const right = 18;
    const top = 16;
    const bottom = 28;
    const plotWidth = Math.max(1, w - left - right);
    const plotHeight = h - top - bottom;
    const newestTime = Math.max(model.time, WINDOW_SECONDS);
    const oldestTime = newestTime - WINDOW_SECONDS;
    const x = (time: number) => left + ((time - oldestTime) / WINDOW_SECONDS) * plotWidth;
    const y = (value: number) => top + (1 - Math.max(0, Math.min(1, value))) * plotHeight;

    context.clearRect(0, 0, w, h);
    context.lineWidth = 1;
    context.strokeStyle = colors.grid;
    context.fillStyle = colors.text;
    context.font = '11px "IBM Plex Mono", ui-monospace, monospace';
    context.textAlign = 'right';
    context.textBaseline = 'middle';

    for (const value of [0, 0.25, 0.5, 0.75, 1]) {
      const py = y(value);
      context.beginPath();
      context.moveTo(left, py);
      context.lineTo(w - right, py);
      context.stroke();
      if (value === 0 || value === 0.5 || value === 1) {
        context.fillText(value.toFixed(1), left - 8, py);
      }
    }

    context.textAlign = 'center';
    context.textBaseline = 'top';
    for (let secondsAgo = 0; secondsAgo <= WINDOW_SECONDS; secondsAgo += 2) {
      const px = x(newestTime - secondsAgo);
      context.beginPath();
      context.moveTo(px, top);
      context.lineTo(px, h - bottom);
      context.stroke();
      context.fillText(secondsAgo === 0 ? 'now' : `-${secondsAgo}s`, px, h - bottom + 8);
    }

    const visible = model.samples.filter((sample) => sample.time >= oldestTime);

    context.strokeStyle = colors.target;
    context.lineWidth = 1.8;
    context.setLineDash([7, 5]);
    context.beginPath();
    visible.forEach((sample, index) => {
      const px = x(sample.time);
      const py = y(sample.target);
      if (index === 0) {
        context.moveTo(px, py);
        return;
      }
      const previous = visible[index - 1];
      if (previous.target !== sample.target) context.lineTo(px, y(previous.target));
      context.lineTo(px, py);
    });
    context.stroke();
    context.setLineDash([]);

    context.strokeStyle = colors.output;
    context.lineWidth = 2.6;
    context.lineJoin = 'round';
    context.beginPath();
    visible.forEach((sample, index) => {
      const px = x(sample.time);
      const py = y(sample.output);
      if (index === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    });
    context.stroke();
  }

  useRaf((frameDt: number) => {
    if (playing && frameDt > 0) {
      const dt = Math.min(frameDt, 0.05);
      const substeps = 4;
      for (let index = 0; index < substeps; index += 1) advance(dt / substeps);
    }
    draw();
  }, canvasRef);

  const dragging = useRef(false);

  function pointToTarget(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setTarget(1 - (event.clientY - rect.top) / rect.height);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointToTarget(event);
  }

  const rangeFill = ((readout.target - MIN_TARGET) / (MAX_TARGET - MIN_TARGET)) * 100;

  return (
    <figure className="cl-home-plot m-0 overflow-hidden rounded-[12px] border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="cl-status-marker" aria-hidden="true" />
          <div>
            <p className="m-0 font-mono text-[0.7rem] font-semibold text-teal-text">
              {playing ? 'Running model' : 'Model paused'}
            </p>
            <p className="m-0 mt-0.5 text-sm font-bold text-ink">Closed-loop step response</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          aria-pressed={!playing}
          className="cl-model-toggle min-h-11 rounded-[8px] border border-line bg-bg px-4 text-sm font-semibold text-ink">
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-line px-4 py-2.5 font-mono text-[0.7rem] text-ink-soft">
        <span>target {readout.target.toFixed(2)}</span>
        <span>output {readout.output.toFixed(2)}</span>
        <span>error {readout.error.toFixed(3)}</span>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={(event) => dragging.current && pointToTarget(event)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        role="img"
        aria-label="Interactive closed-loop step-response plot. A solid output trace follows a dashed target line. Drag vertically on the plot or use the setpoint slider below."
        className="block w-full cursor-crosshair touch-none"
      />

      <figcaption className="border-t border-line px-4 py-3">
        <label className="flex items-center gap-3 text-sm font-semibold text-ink">
          <span>Setpoint</span>
          <input
            className="cl-home-setpoint min-w-0 flex-1"
            style={{'--cl-range-fill': `${rangeFill}%`} as CSSProperties}
            type="range"
            min={MIN_TARGET}
            max={MAX_TARGET}
            step={0.01}
            value={readout.target}
            aria-valuetext={readout.target.toFixed(2)}
            onChange={(event) => setTarget(Number(event.target.value))}
          />
          <output className="w-10 text-right font-mono text-xs text-ink-soft">
            {readout.target.toFixed(2)}
          </output>
        </label>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft">
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-5 bg-accent-text" aria-hidden="true" />
            mechanism output
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-5 border-t-2 border-dashed border-amber-text" aria-hidden="true" />
            requested setpoint
          </span>
          <span className="ml-auto hidden font-mono sm:inline">
            kP = {KP} · kD = {KD}
          </span>
        </div>
      </figcaption>
    </figure>
  );
}

export default function ControlResponseHero() {
  return (
    <header className="cl-home-hero relative overflow-hidden bg-bg">
      <div className="cl-hero-gradient" aria-hidden="true" />
      <FlylineSweep />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[1fr_1.08fr] lg:items-center lg:gap-14 lg:py-20">
        <div className="cl-home-enter">
          <h1 className="m-0 max-w-3xl text-[clamp(2.4rem,3.5vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.032em] text-ink">
            Understand why your robot moves, estimates, and corrects itself.
          </h1>
          <p className="m-0 mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Connect observable behavior to the mathematics, models, FTC Java, and hardware limits
            behind reliable autonomous systems.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/docs/preface/why-math-matters"
              className="cl-home-action inline-flex min-h-11 items-center rounded-[10px] bg-accent-fill px-5 py-2.5 font-semibold text-on-accent no-underline hover:bg-brand-dk">
              Start the course
            </Link>
            <a
              href="#curriculum"
              className="cl-home-action inline-flex min-h-11 items-center rounded-[10px] border border-line bg-surface px-5 py-2.5 font-semibold text-ink no-underline hover:border-accent-text hover:text-accent-text">
              Browse curriculum
            </a>
          </div>
        </div>

        <div className="cl-home-enter cl-home-enter--model">
          <ClosedLoopResponse />
        </div>
      </div>
    </header>
  );
}
