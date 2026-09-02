/* Savitzky-Golay against a plain moving average on a signal with real
   curvature. The bump is what separates them: a flat-line fit cannot follow a
   peak, so the moving average clips it while the polynomial fit rides over it. */

import {useMemo, useRef, useState} from 'react';
import {Trace} from '@site/src/lib/visualization/plot';
import {usePlot, useRaf} from '@site/src/lib/visualization/canvas';
import {Demo, Buttons, Button, Legend, Readout} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';
import {applyWeights, savitzkyGolayWeights} from '@site/src/lib/domain/savitzkyGolay';

const DT = 0.025; // seconds per sample, about one FTC control loop
const BUMP_PERIOD = 5.5;

function randn(): number {
  let u = 0;
  let v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* A flat approach with a sharp peak, so the curvature is unmistakable. */
function truthAt(t: number): number {
  const u = (((t % BUMP_PERIOD) + BUMP_PERIOD) % BUMP_PERIOD) - BUMP_PERIOD / 2;
  return 1.1 + 4.2 * Math.exp(-(u * u) / 0.32);
}

export default function SavitzkyGolay() {
  const [halfWidth, setHalfWidth] = useState(6);
  const [degree, setDegree] = useState(2);
  const [noise, setNoise] = useState(0.55);
  const [atCentre, setAtCentre] = useState(true);

  // A window of 2m+1 samples can only pin down a polynomial up to degree 2m.
  const usableDegree = Math.min(degree, 2 * halfWidth);
  const width = 2 * halfWidth + 1;

  const weights = useMemo(
    () =>
      savitzkyGolayWeights({
        halfWidth,
        degree: usableDegree,
        at: atCentre ? 0 : halfWidth,
      }),
    [halfWidth, usableDegree, atCentre],
  );

  const ctrl = useRef({halfWidth, noise, weights, atCentre, width});
  ctrl.current = {halfWidth, noise, weights, atCentre, width};

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const plotRef = usePlot(canvas, {
    height: 300,
    xmin: 0,
    xmax: 11,
    ymin: -1.5,
    ymax: 7,
    yLabel: 'AprilTag range (arb.)',
  });

  const st = useRef({
    t: 0,
    buf: [] as number[],
    times: [] as number[],
    trueT: new Trace(900),
    measT: new Trace(900),
    maT: new Trace(900),
    sgT: new Trace(900),
  });
  const acc = useRef(0);

  function step(dt: number) {
    const s = st.current;
    const c = ctrl.current;
    s.t += dt;

    const truth = truthAt(s.t);
    const measured = truth + c.noise * randn();

    s.buf.push(measured);
    s.times.push(s.t);
    while (s.buf.length > c.width) {
      s.buf.shift();
      s.times.shift();
    }

    s.trueT.push(s.t, truth);
    s.measT.push(s.t, measured);

    // Equal-weight average over the same window, plotted as it would run live.
    let sum = 0;
    for (const v of s.buf) sum += v;
    s.maT.push(s.t, sum / s.buf.length);

    if (s.buf.length === c.width) {
      const value = applyWeights(s.buf, c.weights);
      // A centred fit describes the middle of the window, so it belongs at that
      // sample's timestamp; the edge fit describes the newest sample.
      s.sgT.push(c.atCentre ? s.times[c.halfWidth] : s.t, value);
    }
  }

  function draw() {
    const s = st.current;
    const p = plotRef.current;
    if (!p) return;
    p.setX(Math.max(0, s.t - 11), Math.max(11, s.t));
    p.clear();
    p.grid();
    p.clip(() => {
      p.line(s.trueT.points(), {color: '#2fd3c0', width: 2, alpha: 0.55});
      p.dots(s.measT.points(), {color: '#ffc24d', r: 2, alpha: 0.75});
      p.line(s.maT.points(), {color: '#5ce08a', width: 2.4});
      p.line(s.sgT.points(), {color: '#c48bff', width: 3});
    });
  }

  useRaf((frameDt: number) => {
    acc.current += Math.min(frameDt, 0.05);
    const dt = 1 / 60;
    let k = 0;
    while (acc.current >= dt && k < 6) {
      step(DT);
      acc.current -= dt;
      k++;
    }
    draw();
  }, canvas);

  const peakWeight = Math.max(...weights.map((w) => Math.abs(w)));

  return (
    <Demo title="Polynomial fit versus flat average">
      <canvas
        ref={canvas}
        role="img"
        aria-label="Animated plot comparing a moving average and a Savitzky-Golay filter tracking a peaked noisy signal."
        className="block w-full rounded-xl bg-[#0b1120]"
      />
      <Legend
        items={[
          {color: '#2fd3c0', label: 'True range'},
          {color: '#ffc24d', label: 'Noisy vision reading', dot: true},
          {color: '#5ce08a', label: 'Moving average'},
          {color: '#c48bff', label: 'Savitzky-Golay'},
        ]}
      />

      <div className="mt-4 grid gap-x-[22px] gap-y-3.5 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <div>
          <Slider
            label="Window half-width m"
            value={halfWidth}
            min={1}
            max={15}
            step={1}
            onChange={setHalfWidth}
            format={(v) => `${2 * v + 1} samples`}
          />
          <div className="mt-1 text-[0.74rem] text-[#8294b8]">
            Both filters see the same window.
          </div>
        </div>
        <div>
          <Slider
            label="Polynomial degree d"
            value={degree}
            min={0}
            max={4}
            step={1}
            onChange={setDegree}
            format={(v) => (v === 0 ? '0 (flat)' : String(v))}
          />
          <div className="mt-1 text-[0.74rem] text-[#8294b8]">
            {usableDegree === 0
              ? 'Degree 0 is the moving average: the two lines coincide.'
              : `Fitting a degree-${usableDegree} curve to each window.`}
          </div>
        </div>
        <Slider
          label="Vision noise"
          value={noise}
          min={0}
          max={1.5}
          step={0.05}
          onChange={setNoise}
          format={(v) => v.toFixed(2)}
        />
      </div>

      <Buttons>
        <Button active={atCentre} onClick={() => setAtCentre(true)}>
          Evaluate at window centre
        </Button>
        <Button active={!atCentre} onClick={() => setAtCentre(false)}>
          Evaluate at newest sample
        </Button>
      </Buttons>

      <Readout
        items={[
          ['Window', `${width} samples (${(width * DT).toFixed(2)} s)`],
          ['Output delay', atCentre ? `${(halfWidth * DT).toFixed(3)} s` : 'none (causal)'],
          ['Largest weight', peakWeight.toFixed(3)],
        ]}
      />

      <div className="mt-4">
        <div className="mb-2 text-[0.78rem] text-[#8294b8]">
          The weight applied to each sample in the window, oldest on the left. Bars below the line
          are negative, which is how the fit is able to lift a peak instead of flattening it.
        </div>
        <div className="flex h-16 items-center gap-[2px]" aria-hidden="true">
          {weights.map((w, i) => (
            <div key={i} className="flex h-full flex-1 flex-col justify-center">
              <div className="flex h-1/2 flex-col justify-end">
                {w > 0 && (
                  <div
                    className="rounded-t-[2px] bg-[#c48bff]"
                    style={{height: `${(Math.abs(w) / peakWeight) * 100}%`}}
                  />
                )}
              </div>
              <div className="h-px w-full" style={{background: '#3a4560'}} />
              <div className="flex h-1/2 flex-col justify-start">
                {w < 0 && (
                  <div
                    className="rounded-b-[2px] bg-[#ff7a7a]"
                    style={{height: `${(Math.abs(w) / peakWeight) * 100}%`}}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        {width <= 9 && (
          <div className="mt-2 px-1 font-mono text-[0.78rem] text-[#aab8d6]">
            [{weights.map((w) => w.toFixed(3)).join(', ')}]
          </div>
        )}
      </div>
    </Demo>
  );
}
