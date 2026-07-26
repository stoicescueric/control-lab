import {useRef, useState, type PointerEvent as ReactPointerEvent} from 'react';
import Link from '@docusaurus/Link';
import {useDprCanvas, useRaf} from '@site/src/lib/visualization/canvas';

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
        background: '#111a2c',
        grid: '#243049',
        text: '#aab6d0',
        output: '#93a7ff',
        target: '#f5b942',
      }
    : {
        background: '#ffffff',
        grid: '#e3e8f2',
        text: '#56617a',
        output: '#3456d1',
        target: '#b87200',
      };
}

function ClosedLoopResponse() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const size = useDprCanvas(canvasRef, 136);
  const state = useRef<ResponseModel | null>(null);
  if (state.current === null) state.current = createInitialModel();
  const [readout, setReadout] = useState<Readout>(() => ({
    target: state.current!.target,
    output: state.current!.output,
    error: Math.abs(state.current!.target - state.current!.output),
  }));

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
      setReadout({
        target: model.target,
        output: model.output,
        error: Math.abs(model.target - model.output),
      });
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

    context.fillStyle = colors.background;
    context.fillRect(0, 0, w, h);

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
      if (previous.target !== sample.target) {
        context.lineTo(px, y(previous.target));
      }
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
    const dt = Math.min(frameDt, 0.05);
    const substeps = 4;
    for (let index = 0; index < substeps; index += 1) {
      advance(dt / substeps);
    }
    draw();
  });

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const target = 1 - (event.clientY - rect.top) / rect.height;
    state.current!.target = Math.max(0.08, Math.min(0.92, target));
    state.current!.nextStep = state.current!.time + 4.5;
  }

  return (
    <figure className="cl-home-plot m-0 mt-8 overflow-hidden rounded-[8px] border border-line bg-surface">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="cl-live-marker" aria-hidden="true" />
          <div>
            <p className="m-0 font-mono text-[0.7rem] font-semibold uppercase text-teal">
              Live model
            </p>
            <p className="m-0 mt-0.5 text-sm font-bold text-ink">Closed-loop step response</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[0.7rem] text-ink-soft sm:gap-x-5 sm:text-xs">
          <span>target {readout.target.toFixed(2)}</span>
          <span>output {readout.output.toFixed(2)}</span>
          <span>error {readout.error.toFixed(3)}</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        role="img"
        aria-label="Interactive closed-loop step-response plot. A solid output trace follows a dashed target line. Click or tap vertically to change the target."
        className="block w-full cursor-crosshair touch-none"
      />
      <figcaption className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line px-4 py-3 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 bg-brand" aria-hidden="true" />
          simulated mechanism output
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-5 border-t-2 border-dashed border-amber" aria-hidden="true" />
          requested setpoint
        </span>
        <span className="ml-auto hidden sm:inline">PD model: kP = {KP}, kD = {KD}</span>
      </figcaption>
    </figure>
  );
}

export default function ControlResponseHero() {
  return (
    <header className="cl-home-hero relative overflow-hidden border-b border-line bg-bg">
      <div className="cl-hero-gradient" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-6 pb-6 pt-10 sm:pb-8 sm:pt-14 lg:pb-10 lg:pt-16">
        <div className="cl-home-enter cl-home-enter--copy">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 flex items-center gap-3 text-sm font-bold uppercase text-brand dark:text-[#aebaff]">
              <span className="h-px w-8 bg-current" aria-hidden="true" />
              FTC control theory / open source
            </p>
            <a
              href="https://github.com/stoicescueric/control-lab"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-soft no-underline transition-colors hover:border-brand hover:text-brand">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              View on GitHub
            </a>
          </div>
          <h1 className="m-0 mt-4 max-w-5xl text-[3.35rem] font-black leading-[0.9] text-ink sm:mt-5 sm:text-[5.7rem] lg:text-[7.35rem]">
            Control <span className="text-brand dark:text-[#aebaff]">Lab</span>
          </h1>

          <div className="mt-5 grid gap-4 sm:mt-7 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <p className="m-0 max-w-2xl text-xl font-bold leading-snug text-ink sm:text-2xl lg:text-[1.8rem]">
              Understand what makes the robot move, estimate, and correct itself.
            </p>
            <div>
              <p className="m-0 max-w-2xl text-[1.05rem] leading-relaxed text-ink-soft sm:text-lg">
                Study the mathematics, models, and software patterns behind competitive-robotics
                autonomy. Connect observable behavior to its derivation, Java implementation, and
                hardware limits.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/docs/preface/why-math-matters"
                  className="cl-home-action inline-flex min-h-11 items-center rounded-[6px] bg-brand px-5 py-2.5 font-bold text-white no-underline hover:bg-brand-dk">
                  Start the preface
                </Link>
                <Link
                  to="/docs/control-theory"
                  className="cl-home-action inline-flex min-h-11 items-center rounded-[6px] border border-line bg-surface px-5 py-2.5 font-bold text-ink no-underline hover:border-brand hover:text-brand">
                  Browse modules
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="cl-home-enter cl-home-enter--model">
          <ClosedLoopResponse />
        </div>
      </div>
      <div className="cl-spectrum-line relative" aria-hidden="true" />
    </header>
  );
}
