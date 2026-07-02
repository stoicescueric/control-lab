import {useMemo, useState} from 'react';
import {Controls, Demo, Legend, Readout} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const W = 760;
const H = 340;
const P = {l: 62, r: 32, t: 36, b: 58};
const PW = W - P.l - P.r;
const PH = H - P.t - P.b;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sx(x: number, min: number, max: number) {
  return P.l + ((x - min) / (max - min)) * PW;
}

function sy(y: number, min: number, max: number) {
  return P.t + (1 - (y - min) / (max - min)) * PH;
}

function path(points: [number, number][]) {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}

function gaussian(x: number, mean: number, variance: number) {
  const sigma = Math.sqrt(Math.max(variance, 0.01));
  return Math.exp(-0.5 * ((x - mean) / sigma) ** 2) / sigma;
}

function Grid({xLabel, yLabel}: {xLabel: string; yLabel: string}) {
  return (
    <g>
      <rect width={W} height={H} rx="18" fill="#0b1120" />
      {Array.from({length: 7}, (_, i) => {
        const x = P.l + (i / 6) * PW;
        return <line key={`x-${i}`} x1={x} x2={x} y1={P.t} y2={H - P.b} stroke="rgba(255,255,255,0.07)" />;
      })}
      {Array.from({length: 5}, (_, i) => {
        const y = P.t + (i / 4) * PH;
        return <line key={`y-${i}`} x1={P.l} x2={W - P.r} y1={y} y2={y} stroke="rgba(255,255,255,0.07)" />;
      })}
      <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} stroke="rgba(255,255,255,0.34)" />
      <line x1={P.l} x2={P.l} y1={P.t} y2={H - P.b} stroke="rgba(255,255,255,0.34)" />
      <text x={W / 2} y={H - 18} fill="#8294b8" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="13">
        {xLabel}
      </text>
      <text x="22" y={H / 2} fill="#8294b8" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="13" transform={`rotate(-90 22 ${H / 2})`}>
        {yLabel}
      </text>
    </g>
  );
}

/* Deterministic hash noise in [-1, 1] — SSR-safe (no Math.random in render). */
function hashNoise(i: number, seed: number) {
  const s = Math.sin((i + 1) * 12.9898 + seed * 7.137) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

/* ---------------------------------------------------------------------------
   Signals & Noise: the anatomy of a corrupted measurement. One knob per
   corruption — jitter, drift, spikes — so each one's shape is isolated.
   --------------------------------------------------------------------------- */
export function NoiseAnatomyExplorer() {
  const [jitter, setJitter] = useState(0.14);
  const [drift, setDrift] = useState(0.16);
  const [spike, setSpike] = useState(0.9);
  const T = 4; // seconds shown
  const N = 120;
  const yMin = -2;
  const yMax = 2;

  const data = useMemo(() => {
    const truth: [number, number][] = [];
    const drifted: [number, number][] = [];
    const meas: {x: number; y: number; isSpike: boolean}[] = [];
    for (let i = 0; i < N; i++) {
      const t = (i / (N - 1)) * T;
      const truthY = 0.8 * Math.sin(2 * Math.PI * 0.5 * t);
      const bias = drift * t;
      const isSpike = spike > 0.01 && i % 29 === 11;
      const y =
        truthY + bias + jitter * hashNoise(i, 3) + (isSpike ? spike * (hashNoise(i, 7) > 0 ? 1 : -1) : 0);
      truth.push([sx(t, 0, T), sy(truthY, yMin, yMax)]);
      drifted.push([sx(t, 0, T), sy(truthY + bias, yMin, yMax)]);
      meas.push({x: sx(t, 0, T), y: sy(clamp(y, yMin, yMax), yMin, yMax), isSpike});
    }
    return {truth, drifted, meas};
  }, [jitter, drift, spike]);

  return (
    <Demo title="The anatomy of a noisy measurement" pill="Math explorer">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="A true signal corrupted by jitter, drift, and spikes, with one slider per corruption">
        <Grid xLabel="seconds" yLabel="reading" />
        <path d={path(data.truth)} fill="none" stroke="#5ce08a" strokeWidth="4" strokeLinecap="round" />
        <path d={path(data.drifted)} fill="none" stroke="#6f8bff" strokeWidth="2.5" strokeDasharray="8 7" />
        {data.meas.map((m, i) => (
          <circle key={i} cx={m.x} cy={m.y} r={m.isSpike ? 5 : 2.6} fill={m.isSpike ? '#ff6f9c' : '#ffc24d'} opacity={m.isSpike ? 1 : 0.85} />
        ))}
        <text x={W - P.r - 8} y={P.t + 20} fill="#6f8bff" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="12">
          drift: the center itself leans away
        </text>
      </svg>
      <Controls>
        <Slider label="Jitter (fast random wobble)" min={0} max={0.5} step={0.02} value={jitter} onChange={setJitter} format={(v) => v.toFixed(2)} />
        <Slider label="Drift (slow lean, per second)" min={-0.4} max={0.4} step={0.02} value={drift} onChange={setDrift} format={(v) => v.toFixed(2)} />
        <Slider label="Spikes (occasional wild reading)" min={0} max={1.6} step={0.1} value={spike} onChange={setSpike} format={(v) => v.toFixed(1)} />
      </Controls>
      <Readout
        items={[
          ['accumulated bias at t = 4 s', (drift * T).toFixed(2)],
          ['jitter σ (approx)', (jitter * 0.58).toFixed(2)],
          ['each corruption needs', 'a different defence'],
        ]}
      />
      <Legend
        items={[
          {color: '#5ce08a', label: 'true signal'},
          {color: '#6f8bff', label: 'truth + drift (the lean)'},
          {color: '#ffc24d', label: 'what the sensor reports', dot: true},
          {color: '#ff6f9c', label: 'spike / outlier', dot: true},
        ]}
      />
    </Demo>
  );
}

/* ---------------------------------------------------------------------------
   Low-pass (EMA): what α really is. Left: the geometric weights the filter
   quietly assigns to past readings. Right: the step response, with the time
   constant τ — the exact discrete relation is α = Δt / (τ + Δt).
   --------------------------------------------------------------------------- */
export function EmaWeightsExplorer() {
  const [alpha, setAlpha] = useState(0.25);
  const [dtMs, setDtMs] = useState(20);
  const K = 16; // weight bars shown
  const STEPS = 26; // step-response samples shown

  const tau = (dtMs * (1 - alpha)) / alpha; // ms — from α = dt/(τ+dt)
  const n63 = -1 / Math.log(1 - alpha); // samples to reach 63.2 %

  const boxL = {x: 36, y: 40, w: 330, h: 236};
  const boxR = {x: 396, y: 40, w: 330, h: 236};

  const bars = Array.from({length: K}, (_, k) => alpha * Math.pow(1 - alpha, k));
  const step = Array.from({length: STEPS}, (_, k) => 1 - Math.pow(1 - alpha, k + 1));

  return (
    <Demo title="What α really is: fading weights and a time constant" pill="Math explorer">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Exponential moving average weights on past readings and the resulting step response">
        <rect width={W} height={H} rx="18" fill="#0b1120" />

        {/* left: the weights */}
        <g>
          <rect x={boxL.x} y={boxL.y} width={boxL.w} height={boxL.h} rx="12" fill="#101a2e" stroke="#2a3656" />
          {bars.map((wgt, k) => {
            const bw = (boxL.w - 40) / K;
            const bh = (wgt / alpha) * (boxL.h - 70);
            return (
              <rect
                key={k}
                x={boxL.x + 20 + k * bw + 2}
                y={boxL.y + boxL.h - 30 - bh}
                width={bw - 4}
                height={Math.max(1.5, bh)}
                rx="3"
                fill="#ffc24d"
                opacity={0.35 + 0.65 * (wgt / alpha)}
              />
            );
          })}
          <text x={boxL.x + 20} y={boxL.y + 24} fill="#e8eefc" fontFamily="JetBrains Mono, monospace" fontSize="13">
            weight of each past reading
          </text>
          <text x={boxL.x + 20} y={boxL.y + 44} fill="#8294b8" fontFamily="JetBrains Mono, monospace" fontSize="12">
            α·(1−α)^k — never zero, always fading
          </text>
          <text x={boxL.x + 24} y={boxL.y + boxL.h - 10} fill="#8294b8" fontFamily="JetBrains Mono, monospace" fontSize="12">newest</text>
          <text x={boxL.x + boxL.w - 24} y={boxL.y + boxL.h - 10} fill="#8294b8" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="12">oldest</text>
        </g>

        {/* right: the step response */}
        <g>
          <rect x={boxR.x} y={boxR.y} width={boxR.w} height={boxR.h} rx="12" fill="#101a2e" stroke="#2a3656" />
          {(() => {
            const px = (k: number) => boxR.x + 24 + (k / (STEPS - 1)) * (boxR.w - 48);
            const py = (v: number) => boxR.y + boxR.h - 34 - v * (boxR.h - 92);
            const y63 = py(0.632);
            const x63 = px(Math.min(STEPS - 1, n63 - 1));
            return (
              <g>
                <line x1={boxR.x + 16} x2={boxR.x + boxR.w - 16} y1={py(1)} y2={py(1)} stroke="#5ce08a" strokeWidth="1.5" strokeDasharray="3 6" />
                <line x1={boxR.x + 16} x2={boxR.x + boxR.w - 16} y1={y63} y2={y63} stroke="#8294b8" strokeWidth="1.2" strokeDasharray="2 6" />
                <text x={boxR.x + boxR.w - 20} y={y63 - 6} fill="#8294b8" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="11">63.2 %</text>
                <line x1={x63} x2={x63} y1={y63} y2={boxR.y + boxR.h - 34} stroke="#ff6f9c" strokeWidth="1.5" strokeDasharray="4 4" />
                <text x={x63} y={boxR.y + boxR.h - 16} fill="#ff6f9c" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11">τ</text>
                <path d={path(step.map((v, k) => [px(k), py(v)] as [number, number]))} fill="none" stroke="#ffc24d" strokeWidth="4" strokeLinecap="round" />
                {step.map((v, k) => (
                  <circle key={k} cx={px(k)} cy={py(v)} r="2.6" fill="#ffc24d" />
                ))}
              </g>
            );
          })()}
          <text x={boxR.x + 20} y={boxR.y + 24} fill="#e8eefc" fontFamily="JetBrains Mono, monospace" fontSize="13">
            response to a sudden step
          </text>
          <text x={boxR.x + 20} y={boxR.y + 44} fill="#8294b8" fontFamily="JetBrains Mono, monospace" fontSize="12">
            reaches 63 % after τ — the lag you buy
          </text>
        </g>

        <text x={W / 2} y={H - 16} fill="#8294b8" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="13">
          samples, newest → oldest · exact relation: α = Δt / (τ + Δt)
        </text>
      </svg>
      <Controls>
        <Slider label="Smoothing α" min={0.04} max={0.85} step={0.01} value={alpha} onChange={setAlpha} format={(v) => v.toFixed(2)} />
        <Slider label="Loop time Δt" min={5} max={50} step={5} value={dtMs} onChange={setDtMs} format={(v) => `${v} ms`} />
      </Controls>
      <Readout
        items={[
          ['time constant τ', `${tau.toFixed(0)} ms`],
          ['samples to 63 %', n63.toFixed(1)],
          ['samples to ~95 % (3τ)', (3 * n63).toFixed(1)],
        ]}
      />
      <Legend
        items={[
          {color: '#ffc24d', label: 'EMA weights / step response'},
          {color: '#ff6f9c', label: 'time constant τ'},
          {color: '#5ce08a', label: 'final value'},
        ]}
      />
    </Demo>
  );
}

/* ---------------------------------------------------------------------------
   Moving average vs EMA: hit both filters with one outlier and watch how long
   the poison lasts. The impulse response IS the weight function.
   --------------------------------------------------------------------------- */
export function WindowVsFadeExplorer() {
  const [N, setN] = useState(12);
  const [alpha, setAlpha] = useState(0.2);
  const K = 30; // samples shown after the spike
  const yMax = Math.max(1 / N, alpha) * 1.25;

  const ma = Array.from({length: K + 1}, (_, k) => (k < N ? 1 / N : 0));
  const ema = Array.from({length: K + 1}, (_, k) => alpha * Math.pow(1 - alpha, k));
  const halfLife = Math.log(0.5) / Math.log(1 - alpha);

  const px = (k: number) => sx(k, 0, K);
  const py = (v: number) => sy(v, 0, yMax);

  // moving-average rectangle drawn as a step outline
  const maPath: [number, number][] = [];
  for (let k = 0; k <= K; k++) {
    maPath.push([px(k), py(ma[k])]);
    if (k + 1 <= K && ma[k + 1] !== ma[k]) maPath.push([px(k + 1), py(ma[k])]);
  }

  return (
    <Demo title="One outlier, two memories" pill="Math explorer">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Impulse response of a moving average versus an exponential moving average after a single outlier">
        <Grid xLabel="samples since the spike" yLabel="share of the spike in the output" />
        {/* the spike itself */}
        <line x1={px(0)} x2={px(0)} y1={P.t + 6} y2={H - P.b} stroke="#ff6f9c" strokeWidth="2.5" strokeDasharray="6 5" />
        <text x={px(0) + 8} y={P.t + 20} fill="#ff6f9c" fontFamily="JetBrains Mono, monospace" fontSize="12">
          a single wild spike lands here
        </text>
        {/* MA: full effect for exactly N samples, then amnesia */}
        <path d={path(maPath)} fill="none" stroke="#6f8bff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1={px(N)} x2={px(N)} y1={py(0)} y2={py(1 / N)} stroke="#6f8bff" strokeWidth="2" strokeDasharray="3 5" />
        <text x={px(Math.min(N, K - 4))} y={py(0) + 18} fill="#6f8bff" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="12">
          forgotten at k = N
        </text>
        {/* EMA: geometric fade */}
        <path d={path(ema.map((v, k) => [px(k), py(v)] as [number, number]))} fill="none" stroke="#ffc24d" strokeWidth="4" strokeLinecap="round" />
        {ema.map((v, k) => (
          <circle key={k} cx={px(k)} cy={py(v)} r="2.4" fill="#ffc24d" />
        ))}
      </svg>
      <Controls>
        <Slider label="Window size N" min={2} max={24} step={1} value={N} onChange={setN} format={(v) => v.toFixed(0)} />
        <Slider label="EMA smoothing α" min={0.05} max={0.7} step={0.01} value={alpha} onChange={setAlpha} format={(v) => v.toFixed(2)} />
      </Controls>
      <Readout
        items={[
          ['MA: spike weight', `1/N = ${(1 / N).toFixed(3)} for exactly ${N} samples`],
          ['EMA: first hit', `α = ${alpha.toFixed(2)}, then fades`],
          ['EMA half-life', `${halfLife.toFixed(1)} samples`],
        ]}
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'moving average — equal weights, hard cutoff'},
          {color: '#ffc24d', label: 'EMA — fading weights, long soft tail'},
          {color: '#ff6f9c', label: 'the outlier'},
        ]}
      />
    </Demo>
  );
}

/* ---------------------------------------------------------------------------
   Complementary filter: the frequency split. The motor encoder's high-pass
   and the absolute encoder's low-pass are exact complements — their transfer
   functions sum to one — so each sensor keeps only the band it is good at.
   --------------------------------------------------------------------------- */
export function ComplementarySplitExplorer() {
  const [alpha, setAlpha] = useState(0.98);
  const [dtMs, setDtMs] = useState(10);
  const dt = dtMs / 1000;
  const tau = (dt * alpha) / (1 - alpha); // seconds
  const fc = 1 / (2 * Math.PI * tau); // crossover Hz
  const fMin = 0.02;
  const fMax = 50;

  const curves = useMemo(() => {
    const lp: [number, number][] = [];
    const hp: [number, number][] = [];
    const M = 160;
    for (let i = 0; i <= M; i++) {
      const f = fMin * Math.pow(fMax / fMin, i / M); // log sweep
      const w = 2 * Math.PI * f * tau;
      const lpMag = 1 / Math.sqrt(1 + w * w);
      const hpMag = w / Math.sqrt(1 + w * w);
      const lx = sx(Math.log10(f), Math.log10(fMin), Math.log10(fMax));
      lp.push([lx, sy(lpMag, 0, 1.12)]);
      hp.push([lx, sy(hpMag, 0, 1.12)]);
    }
    return {lp, hp};
  }, [tau]);

  const xc = sx(Math.log10(clamp(fc, fMin, fMax)), Math.log10(fMin), Math.log10(fMax));

  return (
    <Demo title="The frequency split: each sensor keeps its own band" pill="Math explorer">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Low-pass and high-pass frequency responses of a complementary filter, crossing at the cutoff frequency">
        <Grid xLabel="frequency (Hz, log scale)" yLabel="how much gets through" />
        {/* the two bands */}
        <text x={P.l + 12} y={P.t + 22} fill="#ff9cbb" fontFamily="JetBrains Mono, monospace" fontSize="12">
          absolute owns the slow truth
        </text>
        <text x={W - P.r - 12} y={P.t + 22} fill="#5fe3d2" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="12">
          motor encoder owns the fast motion
        </text>
        {/* sum = 1: nothing is lost */}
        <line x1={sx(Math.log10(fMin), Math.log10(fMin), Math.log10(fMax))} x2={sx(Math.log10(fMax), Math.log10(fMin), Math.log10(fMax))} y1={sy(1, 0, 1.12)} y2={sy(1, 0, 1.12)} stroke="#5ce08a" strokeWidth="2" strokeDasharray="3 7" />
        <text x={W - P.r - 12} y={sy(1, 0, 1.12) - 8} fill="#5ce08a" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="12">
          low-pass + high-pass = 1 (the whole signal survives)
        </text>
        {/* crossover */}
        <line x1={xc} x2={xc} y1={P.t + 6} y2={H - P.b} stroke="#ffc24d" strokeWidth="2" strokeDasharray="6 5" />
        <text x={xc} y={H - P.b + 30} fill="#ffc24d" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="12">
          crossover {fc < 0.1 ? fc.toFixed(3) : fc.toFixed(2)} Hz
        </text>
        {/* the complements */}
        <path d={path(curves.lp)} fill="none" stroke="#ff6f9c" strokeWidth="4" strokeLinecap="round" />
        <path d={path(curves.hp)} fill="none" stroke="#2fd3c0" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <Controls>
        <Slider label="Blend α (motor-encoder trust)" min={0.9} max={0.998} step={0.001} value={alpha} onChange={setAlpha} format={(v) => v.toFixed(3)} />
        <Slider label="Loop time Δt" min={5} max={50} step={5} value={dtMs} onChange={setDtMs} format={(v) => `${v} ms`} />
      </Controls>
      <Readout
        items={[
          ['time constant τ = Δt·α/(1−α)', `${tau.toFixed(2)} s`],
          ['crossover f_c = 1/2πτ', `${fc.toFixed(2)} Hz`],
          ['below f_c', 'absolute anchors · above f_c: motor encoder steers'],
        ]}
      />
      <Legend
        items={[
          {color: '#ff6f9c', label: 'absolute-encoder path — low-pass'},
          {color: '#2fd3c0', label: 'motor-encoder path — high-pass'},
          {color: '#5ce08a', label: 'their sum: exactly 1'},
          {color: '#ffc24d', label: 'crossover frequency'},
        ]}
      />
    </Demo>
  );
}

export function KalmanGainExplorer() {
  const [prediction, setPrediction] = useState(1.1);
  const [measurement, setMeasurement] = useState(-0.7);
  const [pVar, setPVar] = useState(0.75);
  const [rVar, setRVar] = useState(0.35);
  const min = -3;
  const max = 3;
  const gain = pVar / (pVar + rVar);
  const innovation = measurement - prediction;
  const estimate = prediction + gain * innovation;
  const posteriorVar = (1 - gain) * pVar;

  const curves = useMemo(() => {
    const xs = Array.from({length: 180}, (_, i) => min + (i / 179) * (max - min));
    const predPeak = gaussian(prediction, prediction, pVar);
    const measPeak = gaussian(measurement, measurement, rVar);
    const estPeak = gaussian(estimate, estimate, posteriorVar);
    const peak = Math.max(predPeak, measPeak, estPeak);
    const toCurve = (mean: number, variance: number) =>
      xs.map((x) => [sx(x, min, max), sy(gaussian(x, mean, variance) / peak, 0, 1.08)] as [number, number]);
    return {
      prediction: toCurve(prediction, pVar),
      measurement: toCurve(measurement, rVar),
      estimate: toCurve(estimate, posteriorVar),
    };
  }, [prediction, measurement, pVar, rVar, estimate, posteriorVar]);

  return (
    <Demo title="Kalman gain: covariance decides who gets believed" pill="Math explorer">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Interactive Kalman gain Gaussian blend">
        <Grid xLabel="state value" yLabel="relative probability" />
        <path d={path(curves.prediction)} fill="none" stroke="#6f8bff" strokeWidth="4" strokeLinecap="round" />
        <path d={path(curves.measurement)} fill="none" stroke="#ff6f9c" strokeWidth="4" strokeLinecap="round" />
        <path d={path(curves.estimate)} fill="none" stroke="#5ce08a" strokeWidth="5" strokeLinecap="round" />
        {/* each marker label gets its own row so they can't collide when the
            means are close; the dashed line starts below its label */}
        {(
          [
            ['prediction', prediction, '#6f8bff', 0],
            ['measurement', measurement, '#ff6f9c', 1],
            ['estimate', estimate, '#5ce08a', 2],
          ] as [string, number, string, number][]
        ).map(([label, value, color, row]) => {
          const x = clamp(sx(value, min, max), P.l + 40, W - P.r - 44);
          const labelY = P.t + 16 + row * 17;
          return (
            <g key={label}>
              <line x1={sx(value, min, max)} x2={sx(value, min, max)} y1={labelY + 6} y2={H - P.b} stroke={color} strokeWidth="2" strokeDasharray="7 7" />
              <text x={x} y={labelY} fill={color} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="12">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      <Controls>
        <Slider label="Prediction mean" min={-2.5} max={2.5} step={0.1} value={prediction} onChange={setPrediction} format={(v) => v.toFixed(1)} />
        <Slider label="Measurement mean" min={-2.5} max={2.5} step={0.1} value={measurement} onChange={setMeasurement} format={(v) => v.toFixed(1)} />
        <Slider label="Prediction variance P" min={0.08} max={2.5} step={0.02} value={pVar} onChange={setPVar} format={(v) => v.toFixed(2)} />
        <Slider label="Measurement variance R" min={0.08} max={2.5} step={0.02} value={rVar} onChange={setRVar} format={(v) => v.toFixed(2)} />
      </Controls>
      <Readout
        items={[
          ['Kalman gain K = P/(P+R)', gain.toFixed(2)],
          ['innovation z − Hx', innovation.toFixed(2)],
          [
            'estimate = prediction + K·innovation',
            `${estimate.toFixed(2)} = ${prediction.toFixed(2)} + ${gain.toFixed(2)} × ${innovation.toFixed(2)}`,
          ],
          ['posterior variance (1−K)·P', posteriorVar.toFixed(2)],
        ]}
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'model prediction'},
          {color: '#ff6f9c', label: 'sensor measurement'},
          {color: '#5ce08a', label: 'corrected estimate'},
        ]}
      />
    </Demo>
  );
}

export function AprilTagProjectionExplorer() {
  const [x, setX] = useState(-1.8);
  const [y, setY] = useState(-0.8);
  const [headingDeg, setHeadingDeg] = useState(20);
  const min = -3;
  const max = 3;
  const theta = (headingDeg * Math.PI) / 180;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const tag = {x: 0, y: 0};
  const dx = tag.x - x;
  const dy = tag.y - y;
  const forward = Math.max(0.18, c * dx + s * dy);
  const right = -s * dx + c * dy;
  const focal = 1.0;
  const tagWidth = 0.35;
  const imageU = clamp(focal * right / forward, -1.25, 1.25);
  const imageSize = clamp((focal * tagWidth) / forward, 0.08, 0.9);
  const imgCx = 565;
  const imgCy = 165;
  const imgW = 250;
  const imgH = 172;
  const tagPx = imgCx + imageU * 82;
  const tagSizePx = imageSize * 116;
  const dudForward = -focal * right / (forward * forward);
  const dudRight = focal / forward;
  const dsdForward = -focal * tagWidth / (forward * forward);
  const dForwardDx = -c;
  const dForwardDy = -s;
  const dForwardDtheta = right;
  const dRightDx = s;
  const dRightDy = -c;
  const dRightDtheta = -forward;
  const dudx = dudForward * dForwardDx + dudRight * dRightDx;
  const dudy = dudForward * dForwardDy + dudRight * dRightDy;
  const dudtheta = dudForward * dForwardDtheta + dudRight * dRightDtheta;
  const dsdx = dsdForward * dForwardDx;
  const dsdy = dsdForward * dForwardDy;
  const dsdtheta = dsdForward * dForwardDtheta;
  const fieldX = (value: number) => 24 + ((value - min) / (max - min)) * 306;
  const fieldY = (value: number) => 24 + (1 - (value - min) / (max - min)) * 218;
  const robotFieldX = fieldX(x);
  const robotFieldY = fieldY(y);
  const tagFieldX = fieldX(tag.x);
  const tagFieldY = fieldY(tag.y);
  const noseFieldX = robotFieldX + Math.cos(theta) * 52;
  const noseFieldY = robotFieldY - Math.sin(theta) * 52;

  return (
    <Demo title="AprilTag Jacobian: pose changes become image changes" pill="Math explorer">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Interactive AprilTag projection Jacobian">
        <defs>
          <marker id="tagNoseArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" viewBox="0 0 8 8">
            <path d="M0 0 L8 4 L0 8 Z" fill="#ffc24d" />
          </marker>
        </defs>
        <rect width={W} height={H} rx="18" fill="#0b1120" />
        <g transform="translate(30 18)">
          <rect x="0" y="0" width="355" height="264" rx="14" fill="#101a2e" stroke="#2a3656" />
          {Array.from({length: 5}, (_, i) => {
            const gx = 34 + i * 72;
            const gy = 30 + i * 48;
            return (
              <g key={i}>
                <line x1={gx} x2={gx} y1="24" y2="242" stroke="rgba(255,255,255,0.07)" />
                <line x1="24" x2="330" y1={gy} y2={gy} stroke="rgba(255,255,255,0.07)" />
              </g>
            );
          })}
          <line x1={tagFieldX} y1={tagFieldY} x2={robotFieldX} y2={robotFieldY} stroke="#6f8bff" strokeWidth="3" strokeLinecap="round" />
          <rect x={tagFieldX - 14} y={tagFieldY - 14} width="28" height="28" rx="4" fill="#ff6f9c" />
          <text x={tagFieldX + 22} y={tagFieldY + 4} fill="#ffb7cc" fontFamily="JetBrains Mono, monospace" fontSize="12">AprilTag</text>
          <g transform={`translate(${robotFieldX} ${robotFieldY}) rotate(${-headingDeg})`}>
            <rect x="-24" y="-16" width="48" height="32" rx="7" fill="#16203a" stroke="#ffffff" />
            <path d="M-8 -9 L20 0 L-8 9 Z" fill="#ffc24d" />
          </g>
          <line x1={robotFieldX} y1={robotFieldY} x2={noseFieldX} y2={noseFieldY} stroke="#ffc24d" strokeWidth="4" markerEnd="url(#tagNoseArrow)" />
          <text x="178" y="246" fill="#8294b8" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="13">field pose</text>
        </g>

        <g transform="translate(438 54)">
          <rect x="0" y="0" width={imgW} height={imgH} rx="14" fill="#101a2e" stroke="#2a3656" />
          <line x1={imgW / 2} x2={imgW / 2} y1="18" y2={imgH - 18} stroke="rgba(255,255,255,0.12)" strokeDasharray="7 7" />
          <rect
            x={tagPx - 438 - tagSizePx / 2}
            y={imgCy - tagSizePx / 2 - 54}
            width={tagSizePx}
            height={tagSizePx}
            rx="6"
            fill="#ff6f9c"
            stroke="#ffc24d"
            strokeWidth="3"
          />
          <circle cx={tagPx - 438} cy={imgCy - 54} r="5" fill="#ffffff" />
          <text x={imgW / 2} y="196" fill="#8294b8" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="13">camera image</text>
          <text x="16" y="24" fill="#e8eefc" fontFamily="JetBrains Mono, monospace" fontSize="12">u = horizontal pixel offset</text>
          <text x="16" y="46" fill="#e8eefc" fontFamily="JetBrains Mono, monospace" fontSize="12">s = apparent tag size</text>
        </g>

        <g fontFamily="JetBrains Mono, monospace" fontSize="12">
          <rect x="438" y="252" width="250" height="54" rx="10" fill="rgba(11,17,32,0.72)" stroke="rgba(255,255,255,0.10)" />
          <text x="454" y="274" fill="#5ce08a">image center moves with pose</text>
          <text x="454" y="296" fill="#ffc24d">tag size grows as depth shrinks</text>
        </g>
      </svg>
      <Controls>
        <Slider label="Robot x" min={-2.8} max={-0.3} step={0.1} value={x} onChange={setX} format={(v) => v.toFixed(1)} />
        <Slider label="Robot y" min={-2.3} max={2.3} step={0.1} value={y} onChange={setY} format={(v) => v.toFixed(1)} />
        <Slider label="Robot heading" min={-55} max={55} step={1} value={headingDeg} onChange={setHeadingDeg} format={(v) => `${v.toFixed(0)} deg`} />
      </Controls>
      <Readout
        items={[
          ['forward depth Xc', forward.toFixed(2)],
          ['side offset Yc', right.toFixed(2)],
          ['image row du/dx,du/dy,du/dtheta', `[${dudx.toFixed(2)}, ${dudy.toFixed(2)}, ${dudtheta.toFixed(2)}]`],
          ['size row ds/dx,ds/dy,ds/dtheta', `[${dsdx.toFixed(2)}, ${dsdy.toFixed(2)}, ${dsdtheta.toFixed(2)}]`],
        ]}
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'field ray from camera to tag'},
          {color: '#ff6f9c', label: 'detected AprilTag square'},
          {color: '#ffc24d', label: 'camera forward direction'},
        ]}
      />
    </Demo>
  );
}
