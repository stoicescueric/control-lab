/* Extended Kalman Filter tracking a target from noisy range + bearing radar.
   Linearises the nonlinear measurement with a Jacobian each step. Uses the
   shared lib/linalg matrix helpers. */

import {useRef, useState} from 'react';
import {LA} from '@site/src/lib/linalg';
import {useDprCanvas, useRaf} from '@site/src/lib/canvas';
import {Demo, Buttons, Button, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const WX = 100;
const WY = 60;
const dt = 0.06;
const SX = 12;
const SY = 14; // radar position

function randn(): number {
  let u = 0;
  let v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function wrap(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

const F: number[][] = [
  [1, dt, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, dt],
  [0, 0, 0, 1],
];
function Qmat(): number[][] {
  const qd = 30;
  const a = (qd * dt ** 4) / 4;
  const b = (qd * dt ** 3) / 2;
  const c = qd * dt ** 2;
  return [
    [a, b, 0, 0],
    [b, c, 0, 0],
    [0, 0, a, b],
    [0, 0, b, c],
  ];
}
function truePos(tt: number): [number, number] {
  return [50 + 30 * Math.cos(tt * 0.45), 32 + 18 * Math.sin(tt * 0.45)];
}

export default function EKF() {
  const [rNoise, setRNoise] = useState(1.2);
  const [bDeg, setBDeg] = useState(4);
  const [showRays, setShowRays] = useState(false);
  const ctrl = useRef({rNoise, bDeg, showRays});
  ctrl.current = {rNoise, bDeg, showRays};

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const size = useDprCanvas(canvas, 340);
  const errMEl = useRef<HTMLElement | null>(null);
  const errKEl = useRef<HTMLElement | null>(null);

  const st = useRef({
    inited: false,
    x: null as number[][] | null,
    P: null as number[][] | null,
    t: 0,
    errM: 4,
    errK: 2,
    truePath: [] as number[][],
    measPts: [] as number[][],
    estPath: [] as number[][],
  });
  const acc = useRef(0);

  function reset() {
    const s = st.current;
    const p = truePos(0);
    s.x = [[p[0]], [0], [p[1]], [18 * 0.45]];
    s.P = [
      [20, 0, 0, 0],
      [0, 20, 0, 0],
      [0, 0, 20, 0],
      [0, 0, 0, 20],
    ];
    s.truePath = [];
    s.measPts = [];
    s.estPath = [];
    s.t = 0;
    s.errM = 4;
    s.errK = 2;
    s.inited = true;
  }

  function step() {
    const s = st.current;
    if (!s.x || !s.P) return;
    const rNoise = ctrl.current.rNoise;
    const bSd = (ctrl.current.bDeg * Math.PI) / 180;
    s.t += dt;
    const [tx, ty] = truePos(s.t);
    const dx = tx - SX;
    const dy = ty - SY;
    const rng = Math.hypot(dx, dy);
    const bear = Math.atan2(dy, dx);
    const zr = rng + rNoise * randn();
    const zb = wrap(bear + bSd * randn());
    const mx = SX + zr * Math.cos(zb);
    const my = SY + zr * Math.sin(zb);

    // predict
    s.x = LA.mul(F, s.x);
    s.P = LA.add(LA.mul(LA.mul(F, s.P), LA.transpose(F)), Qmat());
    // update (linearise range/bearing about the current estimate)
    const px = s.x[0][0] - SX;
    const py = s.x[2][0] - SY;
    const r2 = px * px + py * py;
    const r = Math.sqrt(r2);
    const H = [
      [px / r, 0, py / r, 0],
      [-py / r2, 0, px / r2, 0],
    ];
    const hx = [Math.sqrt(r2), Math.atan2(py, px)];
    const yk = [[zr - hx[0]], [wrap(zb - hx[1])]];
    const R = [
      [rNoise * rNoise, 0],
      [0, bSd * bSd],
    ];
    const S = LA.add(LA.mul(LA.mul(H, s.P), LA.transpose(H)), R);
    const K = LA.mul(LA.mul(s.P, LA.transpose(H)), LA.inv(S));
    s.x = LA.add(s.x, LA.mul(K, yk));
    s.P = LA.mul(LA.sub(LA.identity(4), LA.mul(K, H)), s.P);

    const ex = s.x[0][0];
    const ey = s.x[2][0];
    s.truePath.push([tx, ty]);
    s.measPts.push([mx, my]);
    s.estPath.push([ex, ey]);
    if (s.truePath.length > 150) {
      s.truePath.shift();
      s.estPath.shift();
    }
    if (s.measPts.length > 40) s.measPts.shift();
    s.errM = 0.95 * s.errM + 0.05 * Math.hypot(mx - tx, my - ty);
    s.errK = 0.95 * s.errK + 0.05 * Math.hypot(ex - tx, ey - ty);
  }

  function draw() {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const {w, h} = size.current;
    const s = st.current;
    if (!s.x) return;
    const showRays = ctrl.current.showRays;
    const pad = 18;
    const scale = Math.min((w - 2 * pad) / WX, (h - 2 * pad) / WY);
    const ox = (w - WX * scale) / 2;
    const oy = (h - WY * scale) / 2;
    const PX = (x: number) => ox + x * scale;
    const PY = (y: number) => oy + (WY - y) * scale;

    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= WX; gx += 10) {
      ctx.beginPath();
      ctx.moveTo(PX(gx), PY(0));
      ctx.lineTo(PX(gx), PY(WY));
      ctx.stroke();
    }
    for (let gy = 0; gy <= WY; gy += 10) {
      ctx.beginPath();
      ctx.moveTo(PX(0), PY(gy));
      ctx.lineTo(PX(WX), PY(gy));
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(47,211,192,.14)';
    for (let rr = 20; rr <= 80; rr += 20) {
      ctx.beginPath();
      ctx.arc(PX(SX), PY(SY), rr * scale, 0, 7);
      ctx.stroke();
    }
    if (showRays) {
      const tp = s.truePath[s.truePath.length - 1];
      if (tp) {
        ctx.strokeStyle = 'rgba(47,211,192,.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(PX(SX), PY(SY));
        ctx.lineTo(PX(tp[0]), PY(tp[1]));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    if (s.truePath.length > 1) {
      ctx.strokeStyle = 'rgba(92,224,138,.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      s.truePath.forEach((p, i) => (i ? ctx.lineTo(PX(p[0]), PY(p[1])) : ctx.moveTo(PX(p[0]), PY(p[1]))));
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,194,77,.8)';
    for (const m of s.measPts) {
      ctx.beginPath();
      ctx.arc(PX(m[0]), PY(m[1]), 2.6, 0, 7);
      ctx.fill();
    }
    if (s.estPath.length > 1) {
      ctx.strokeStyle = '#6f8bff';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      s.estPath.forEach((p, i) => (i ? ctx.lineTo(PX(p[0]), PY(p[1])) : ctx.moveTo(PX(p[0]), PY(p[1]))));
      ctx.stroke();
    }
    ctx.fillStyle = '#2fd3c0';
    ctx.beginPath();
    ctx.arc(PX(SX), PY(SY), 6, 0, 7);
    ctx.fill();
    const tp = s.truePath[s.truePath.length - 1];
    if (tp) {
      ctx.fillStyle = '#5ce08a';
      ctx.beginPath();
      ctx.arc(PX(tp[0]), PY(tp[1]), 5, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = '#cfe0ff';
    ctx.beginPath();
    ctx.arc(PX(s.x[0][0]), PY(s.x[2][0]), 4, 0, 7);
    ctx.fill();

    if (errMEl.current) errMEl.current.textContent = s.errM.toFixed(2);
    if (errKEl.current) errKEl.current.textContent = s.errK.toFixed(2);
  }

  useRaf((frameDt: number) => {
    if (!st.current.inited) reset();
    acc.current += Math.min(frameDt, 0.1);
    const fr = 1 / 60;
    let k = 0;
    while (acc.current >= fr && k < 6) {
      step();
      acc.current -= fr;
      k++;
    }
    draw();
  });

  return (
    <Demo title="EKF radar tracking">
      <canvas ref={canvas} className="block w-full rounded-xl bg-[#0b1120]" />
      <Legend
        items={[
          {color: '#2fd3c0', label: 'Radar', dot: true},
          {color: '#5ce08a', label: 'True target', dot: true},
          {color: '#ffc24d', label: 'Raw measurements', dot: true},
          {color: '#6f8bff', label: 'EKF estimate'},
        ]}
      />
      <div className="mt-4 grid gap-x-[22px] gap-y-3.5 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <Slider label="Distance noise" value={rNoise} min={0.2} max={6} step={0.1} onChange={setRNoise} format={(v) => v.toFixed(1)} />
        <div>
          <Slider label="Angle noise" value={bDeg} min={0.5} max={12} step={0.5} onChange={setBDeg} format={(v) => v.toFixed(1) + '°'} />
          <div className="mt-1 text-[0.74rem] text-[#8294b8]">Watch the blips fan into arcs far from the radar.</div>
        </div>
      </div>
      <Buttons>
        <Button active={showRays} onClick={() => setShowRays((v) => !v)}>
          📡 {showRays ? 'Hide' : 'Show'} radar beam
        </Button>
        <Button onClick={reset}>↺ Reset</Button>
      </Buttons>
      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>Raw measurement error: <b ref={errMEl} className="text-white">—</b></span>
        <span>EKF error: <b ref={errKEl} className="text-white">—</b></span>
      </div>
    </Demo>
  );
}
