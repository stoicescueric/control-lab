/* EKF linearisation, tested with a particle rain: sample "where might the
   robot actually be?" from the filter's uncertainty, push every sample
   through the real nonlinear camera measurement, and pile up what lands.
   The EKF instead pushes the Gaussian through the tangent at the estimate;
   its predicted distribution is drawn over the pile, so the moment the curve
   bends inside the uncertainty window you can watch the bet fail. */

import {useRef, useState} from 'react';
import {useDprCanvas, useRaf} from '@site/src/lib/canvas';
import {Demo, Controls, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const FL = 1.2; // focal length × tag width
const X_MIN = 0.35;
const X_MAX = 4.6;
const S_MAX = 2.9;
const NB = 64; // histogram bins on the output axis
const SPAWN_RATE = 150; // particles per second
const STAT_DECAY = 0.996; // per deposited sample

function randn(): number {
  let u = 0;
  let v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* standard normal CDF (Abramowitz–Stegun), for binning the EKF's Gaussian */
function phi(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

const h = (x: number) => FL / x;

type Particle = {x: number; s: number; phase: 0 | 1; t: number};

export default function EkfLinearization() {
  const [xHat, setXHat] = useState(3.2);
  const [sigma, setSigma] = useState(0.3);
  const ctrl = useRef({xHat, sigma});
  ctrl.current = {xHat, sigma};

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const size = useDprCanvas(canvasRef, 340);

  const pileStdEl = useRef<HTMLElement | null>(null);
  const shiftEl = useRef<HTMLElement | null>(null);

  const st = useRef({
    parts: [] as Particle[],
    bins: new Float64Array(NB),
    s0: 0,
    s1: 0,
    s2: 0,
    spawnAcc: 0,
    lastXHat: xHat,
    lastSigma: sigma,
  });

  function step(dt: number) {
    const s = st.current;
    const {xHat, sigma} = ctrl.current;

    // sliders moved: the old pile answers an old question — start over
    if (s.lastXHat !== xHat || s.lastSigma !== sigma) {
      s.lastXHat = xHat;
      s.lastSigma = sigma;
      s.parts.length = 0;
      s.bins.fill(0);
      s.s0 = s.s1 = s.s2 = 0;
    }

    s.spawnAcc += dt * SPAWN_RATE;
    while (s.spawnAcc >= 1 && s.parts.length < 260) {
      s.spawnAcc -= 1;
      const x = Math.min(Math.max(xHat + sigma * randn(), 0.18), X_MAX - 0.02);
      s.parts.push({x, s: h(x), phase: 0, t: 0});
    }

    for (let i = s.parts.length - 1; i >= 0; i--) {
      const p = s.parts[i];
      p.t += dt / (p.phase === 0 ? 0.45 : 0.4);
      if (p.t >= 1) {
        if (p.phase === 0) {
          p.phase = 1;
          p.t = 0;
        } else {
          // deposit into the pile + decayed running stats
          const bi = Math.min(NB - 1, Math.max(0, Math.floor((p.s / S_MAX) * NB)));
          s.bins[bi] += 1;
          s.s0 = s.s0 * STAT_DECAY + 1;
          s.s1 = s.s1 * STAT_DECAY + p.s;
          s.s2 = s.s2 * STAT_DECAY + p.s * p.s;
          s.parts.splice(i, 1);
        }
      }
    }

    const fade = Math.exp(-dt * 0.35);
    for (let i = 0; i < NB; i++) s.bins[i] *= fade;
  }

  function draw() {
    const c = canvasRef.current;
    const cx = c?.getContext('2d');
    if (!c || !cx) return;
    const {w, h: hh} = size.current;
    const s = st.current;
    const {xHat, sigma} = ctrl.current;

    const ML = 96;
    const MR = 16;
    const MT = 30;
    const MB = 40;
    const px = (x: number) => ML + ((x - X_MIN) / (X_MAX - X_MIN)) * (w - ML - MR);
    const py = (v: number) => MT + (1 - v / S_MAX) * (hh - MT - MB);
    const ease = (t: number) => 1 - (1 - t) * (1 - t);

    const m = h(xHat); // where the tangent says the output is centered
    const slope = -FL / (xHat * xHat); // the 1-D Jacobian
    const sp = Math.abs(slope) * sigma; // ...and the spread it predicts

    cx.fillStyle = '#0b1120';
    cx.fillRect(0, 0, w, hh);

    // grid
    cx.strokeStyle = 'rgba(255,255,255,0.05)';
    cx.lineWidth = 1;
    for (let gx = 1; gx <= 4; gx++) {
      cx.beginPath();
      cx.moveTo(px(gx), MT);
      cx.lineTo(px(gx), hh - MB);
      cx.stroke();
    }
    for (let gs = 0.5; gs < S_MAX; gs += 0.5) {
      cx.beginPath();
      cx.moveTo(ML, py(gs));
      cx.lineTo(w - MR, py(gs));
      cx.stroke();
    }

    // input uncertainty: Gaussian bump + ±2σ bar on the depth axis
    cx.strokeStyle = '#8294b8';
    cx.lineWidth = 2;
    cx.globalAlpha = 0.8;
    cx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const x = X_MIN + (i / 120) * (X_MAX - X_MIN);
      const g = Math.exp(-0.5 * ((x - xHat) / sigma) ** 2);
      const y = hh - MB - g * 40;
      if (i === 0) cx.moveTo(px(x), y);
      else cx.lineTo(px(x), y);
    }
    cx.stroke();
    cx.globalAlpha = 0.5;
    cx.lineWidth = 5;
    cx.beginPath();
    cx.moveTo(px(Math.max(X_MIN, xHat - 2 * sigma)), hh - MB - 2);
    cx.lineTo(px(Math.min(X_MAX, xHat + 2 * sigma)), hh - MB - 2);
    cx.stroke();
    cx.globalAlpha = 1;

    // plot area clip for the curve + tangent
    cx.save();
    cx.beginPath();
    cx.rect(ML, MT, w - ML - MR, hh - MT - MB);
    cx.clip();

    // the real measurement curve
    cx.strokeStyle = '#6f8bff';
    cx.lineWidth = 3;
    cx.beginPath();
    for (let i = 0; i <= 140; i++) {
      const x = X_MIN + (i / 140) * (X_MAX - X_MIN);
      if (i === 0) cx.moveTo(px(x), py(h(x)));
      else cx.lineTo(px(x), py(h(x)));
    }
    cx.stroke();

    // the EKF's tangent at the estimate
    cx.strokeStyle = '#ffc24d';
    cx.lineWidth = 2.5;
    cx.setLineDash([9, 7]);
    cx.beginPath();
    cx.moveTo(px(X_MIN), py(m + slope * (X_MIN - xHat)));
    cx.lineTo(px(X_MAX), py(m + slope * (X_MAX - xHat)));
    cx.stroke();
    cx.setLineDash([]);

    // particles: rise to the curve, then fly left to the pile
    cx.fillStyle = '#5ce08a';
    for (const p of s.parts) {
      const yCurve = py(Math.min(p.s, S_MAX));
      let dx: number;
      let dy: number;
      if (p.phase === 0) {
        dx = px(p.x);
        dy = hh - MB - 42 + ease(p.t) * (yCurve - (hh - MB - 42));
        cx.globalAlpha = 0.85;
      } else {
        dx = px(p.x) + ease(p.t) * (ML + 3 - px(p.x));
        dy = yCurve;
        cx.globalAlpha = 0.6;
      }
      cx.beginPath();
      cx.arc(dx, dy, 2.4, 0, 7);
      cx.fill();
    }
    cx.globalAlpha = 1;
    cx.restore();

    // estimate marker on the curve
    cx.beginPath();
    cx.arc(px(xHat), py(m), 6, 0, 7);
    cx.fillStyle = '#e8eefc';
    cx.fill();
    cx.strokeStyle = '#6f8bff';
    cx.lineWidth = 2.5;
    cx.stroke();
    cx.fillStyle = '#e8eefc';
    cx.font = '12px ui-monospace,monospace';
    cx.textAlign = 'left';
    cx.fillText('x̂ — linearise here', Math.min(px(xHat) + 12, w - 150), py(m) - 10);

    // --- output distributions in the left margin -------------------------
    const base = ML - 12; // bars grow leftward from here
    const barMax = 70;
    cx.strokeStyle = 'rgba(255,255,255,0.25)';
    cx.lineWidth = 1;
    cx.beginPath();
    cx.moveTo(base, MT);
    cx.lineTo(base, hh - MB);
    cx.stroke();

    // the pile: what actually comes out of the curve
    let maxBin = 0;
    for (let i = 0; i < NB; i++) maxBin = Math.max(maxBin, s.bins[i]);
    if (maxBin > 0) {
      cx.fillStyle = 'rgba(92,224,138,0.6)';
      const bh = (hh - MT - MB) / NB;
      for (let i = 0; i < NB; i++) {
        const bw = (s.bins[i] / maxBin) * barMax;
        if (bw < 0.5) continue;
        const yTop = py(((i + 1) / NB) * S_MAX);
        cx.fillRect(base - bw, yTop, bw, bh - 0.6);
      }
    }

    // what the EKF claims comes out: N(h(x̂), (H·σ)²), binned the same way
    let maxPred = 0;
    const pred = new Array<number>(NB);
    for (let i = 0; i < NB; i++) {
      const lo = (i / NB) * S_MAX;
      const hi = ((i + 1) / NB) * S_MAX;
      pred[i] = phi((hi - m) / sp) - phi((lo - m) / sp);
      maxPred = Math.max(maxPred, pred[i]);
    }
    cx.strokeStyle = '#ffc24d';
    cx.lineWidth = 2.5;
    cx.beginPath();
    for (let i = 0; i < NB; i++) {
      const bw = (pred[i] / maxPred) * barMax;
      const yTop = py(((i + 1) / NB) * S_MAX);
      const yBot = py((i / NB) * S_MAX);
      if (i === 0) cx.moveTo(base - bw, yBot);
      cx.lineTo(base - bw, yBot);
      cx.lineTo(base - bw, yTop);
    }
    cx.stroke();

    cx.fillStyle = '#8294b8';
    cx.font = '11px ui-monospace,monospace';
    cx.textAlign = 'left';
    cx.fillText('what comes out', 8, MT - 12);

    cx.textAlign = 'center';
    cx.font = '12px ui-monospace,monospace';
    cx.fillText('depth to the tag X (m)', ML + (w - ML - MR) / 2, hh - 10);
    cx.fillStyle = '#6f8bff';
    cx.textAlign = 'right';
    cx.fillText('apparent size s = f·L/X', w - MR - 6, MT + 16);

    // verdict, once the pile has enough mass to be trusted
    const mean = s.s0 > 0 ? s.s1 / s.s0 : m;
    const variance = s.s0 > 0 ? Math.max(0, s.s2 / s.s0 - mean * mean) : 0;
    const pileStd = Math.sqrt(variance);
    const shift = sp > 1e-9 ? (mean - m) / sp : 0;
    if (s.s0 > 80) {
      const ok = Math.abs(shift) < 0.18 && pileStd / sp < 1.25 && pileStd / sp > 0.8;
      cx.textAlign = 'center';
      cx.font = 'bold 12px ui-monospace,monospace';
      cx.fillStyle = ok ? '#5ce08a' : '#ff6f9c';
      cx.fillText(
        ok ? 'the pile matches the EKF’s Gaussian — the tangent is honest here' : 'the pile is skewed off the Gaussian — the EKF is fooling itself',
        ML + (w - ML - MR) / 2,
        16,
      );
    }
    if (pileStdEl.current) pileStdEl.current.textContent = s.s0 > 80 ? pileStd.toFixed(3) : '—';
    if (shiftEl.current) shiftEl.current.textContent = s.s0 > 80 ? `${shift >= 0 ? '+' : ''}${(shift * 100).toFixed(0)} % of σ` : '—';
  }

  useRaf((frameDt: number) => {
    step(Math.min(frameDt, 0.05));
    draw();
  }, canvasRef);

  const slope = -FL / (xHat * xHat);
  const predStd = Math.abs(slope) * sigma;

  return (
    <Demo title="The EKF's bet: replace the curve with its tangent">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Animated particle rain: samples from the filter's uncertainty pass through the nonlinear camera measurement and pile into a histogram, compared against the Gaussian the EKF's tangent predicts."
        className="block w-full rounded-xl bg-[#0b1120]"
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'true measurement h(X) = f·L/X'},
          {color: '#ffc24d', label: 'tangent at x̂ + the Gaussian it predicts'},
          {color: '#5ce08a', label: 'samples & the pile they build'},
          {color: '#8294b8', label: 'input uncertainty (±2σ)'},
        ]}
      />
      <Controls>
        <Slider label="Estimate x̂ (depth to tag)" min={0.8} max={4} step={0.05} value={xHat} onChange={setXHat} format={(v) => `${v.toFixed(2)} m`} />
        <Slider label="Uncertainty σ" min={0.05} max={0.6} step={0.01} value={sigma} onChange={setSigma} format={(v) => `±${v.toFixed(2)} m`} />
      </Controls>
      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>Jacobian H = −f·L/x̂²: <b className="text-white">{slope.toFixed(2)}</b></span>
        <span>EKF predicted spread |H|·σ: <b className="text-white">{predStd.toFixed(3)}</b></span>
        <span>actual pile spread: <b ref={pileStdEl} className="text-white">—</b></span>
        <span>pile center off by: <b ref={shiftEl} className="text-white">—</b></span>
      </div>
    </Demo>
  );
}
