/* 2-D constant-velocity Kalman tracker: turns noisy radar blips into a smooth
   estimate with an uncertainty bubble. */

import {useRef, useState} from 'react';
import {useDprCanvas, useRaf} from '@site/src/lib/canvas';
import {Demo, Buttons, Button, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const WX = 100;
const WY = 60;
const dt = 0.06;

interface Axis {
  x: number[];
  P: number[][];
}

function randn(): number {
  let u = 0;
  let v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function makeAxis(p0: number): Axis {
  return {x: [p0, 0], P: [[10, 0], [0, 10]]};
}

function kfStep(ax: Axis, z: number, q: number, r: number) {
  const [p, v] = ax.x;
  const pp = p + v * dt;
  const pv = v;
  const P = ax.P;
  let Pp = [
    [P[0][0] + dt * P[1][0] + dt * (P[0][1] + dt * P[1][1]), P[0][1] + dt * P[1][1]],
    [P[1][0] + dt * P[1][1], P[1][1]],
  ];
  const Q = [
    [(q * dt ** 4) / 4, (q * dt ** 3) / 2],
    [(q * dt ** 3) / 2, q * dt ** 2],
  ];
  Pp = [
    [Pp[0][0] + Q[0][0], Pp[0][1] + Q[0][1]],
    [Pp[1][0] + Q[1][0], Pp[1][1] + Q[1][1]],
  ];
  const y = z - pp;
  const S = Pp[0][0] + r;
  const K0 = Pp[0][0] / S;
  const K1 = Pp[1][0] / S;
  ax.x = [pp + K0 * y, pv + K1 * y];
  ax.P = [
    [(1 - K0) * Pp[0][0], (1 - K0) * Pp[0][1]],
    [Pp[1][0] - K1 * Pp[0][0], Pp[1][1] - K1 * Pp[0][1]],
  ];
}

function truePos(tt: number): [number, number] {
  return [50 + 34 * Math.sin(tt * 0.32), 30 + 17 * Math.sin(tt * 0.46 + 0.5)];
}

export default function Kalman() {
  const [kfR, setKfR] = useState(3.5);
  const [kfQ, setKfQ] = useState(18);
  const [hideTruth, setHideTruth] = useState(false);
  const ctrl = useRef({kfR, kfQ, hideTruth});
  ctrl.current = {kfR, kfQ, hideTruth};

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const size = useDprCanvas(canvas, 340);

  const errMEl = useRef<HTMLElement | null>(null);
  const errKEl = useRef<HTMLElement | null>(null);
  const impEl = useRef<HTMLElement | null>(null);

  const st = useRef({
    inited: false,
    axX: null as Axis | null,
    axY: null as Axis | null,
    t: 0,
    errM: 2,
    errK: 1,
    truePath: [] as number[][],
    measPts: [] as number[][],
    estPath: [] as number[][],
  });
  const acc = useRef(0);

  function reset() {
    const p = truePos(0);
    const s = st.current;
    s.axX = makeAxis(p[0]);
    s.axY = makeAxis(p[1]);
    s.truePath = [];
    s.measPts = [];
    s.estPath = [];
    s.t = 0;
    s.errM = 2;
    s.errK = 1;
    s.inited = true;
  }

  function step() {
    const s = st.current;
    if (!s.axX || !s.axY) return;
    const R = (ctrl.current.kfR * ctrl.current.kfR) / 3.5;
    const Q = ctrl.current.kfQ;
    s.t += dt;
    const [tx, ty] = truePos(s.t);
    const sd = Math.sqrt(R);
    const mx = tx + sd * randn();
    const my = ty + sd * randn();
    kfStep(s.axX, mx, Q, R);
    kfStep(s.axY, my, Q, R);
    const ex = s.axX.x[0];
    const ey = s.axY.x[0];
    s.truePath.push([tx, ty]);
    s.measPts.push([mx, my]);
    s.estPath.push([ex, ey]);
    if (s.truePath.length > 140) {
      s.truePath.shift();
      s.estPath.shift();
    }
    if (s.measPts.length > 45) s.measPts.shift();
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
    if (!s.axX || !s.axY) return;
    const hideTruth = ctrl.current.hideTruth;
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
    if (!hideTruth && s.truePath.length > 1) {
      ctx.strokeStyle = 'rgba(92,224,138,.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      s.truePath.forEach((p, i) => (i ? ctx.lineTo(PX(p[0]), PY(p[1])) : ctx.moveTo(PX(p[0]), PY(p[1]))));
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,194,77,.85)';
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
    const ex = s.axX.x[0];
    const ey = s.axY.x[0];
    const unc = Math.sqrt(Math.max(s.axX.P[0][0], s.axY.P[0][0])) * 2;
    ctx.fillStyle = 'rgba(111,139,255,.16)';
    ctx.strokeStyle = 'rgba(111,139,255,.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(PX(ex), PY(ey), Math.max(unc * scale, 4), 0, 7);
    ctx.fill();
    ctx.stroke();
    if (!hideTruth) {
      const tp = s.truePath[s.truePath.length - 1];
      if (tp) {
        ctx.fillStyle = '#5ce08a';
        ctx.beginPath();
        ctx.arc(PX(tp[0]), PY(tp[1]), 5, 0, 7);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#cfe0ff';
    ctx.beginPath();
    ctx.arc(PX(ex), PY(ey), 4, 0, 7);
    ctx.fill();

    if (errMEl.current) errMEl.current.textContent = s.errM.toFixed(2);
    if (errKEl.current) errKEl.current.textContent = s.errK.toFixed(2);
    if (impEl.current) impEl.current.textContent = (s.errM > 0.01 ? s.errM / Math.max(s.errK, 1e-3) : 1).toFixed(1) + '× cleaner';
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
    <Demo title="2-D Kalman tracking">
      <canvas ref={canvas} className="block w-full rounded-xl bg-[#0b1120]" />
      <Legend
        items={[
          {color: '#5ce08a', label: 'True target', dot: true},
          {color: '#ffc24d', label: 'Noisy measurements', dot: true},
          {color: '#6f8bff', label: 'Kalman estimate'},
          {color: 'rgba(111,139,255,.5)', label: 'Uncertainty', dot: true},
        ]}
      />
      <div className="mt-4 grid gap-x-[22px] gap-y-3.5 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <div>
          <Slider label="Measurement noise" value={kfR} min={0.5} max={9} step={0.1} onChange={setKfR} format={(v) => v.toFixed(1)} />
          <div className="mt-1 text-[0.74rem] text-[#8294b8]">How blurry the radar blips are.</div>
        </div>
        <div>
          <Slider label="Model trust" value={kfQ} min={0.3} max={40} step={0.5} onChange={setKfQ} format={(v) => v.toFixed(1)} />
          <div className="mt-1 text-[0.74rem] text-[#8294b8]">Low = "moves predictably" (smoother, lags turns) · High = "could do anything"</div>
        </div>
      </div>
      <Buttons>
        <Button active={hideTruth} onClick={() => setHideTruth((v) => !v)}>
          {hideTruth ? '👁️ Show truth' : '👁️ Show only blips (hide truth)'}
        </Button>
        <Button onClick={reset}>↺ Reset</Button>
      </Buttons>
      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>Raw blip error: <b ref={errMEl} className="text-white">—</b></span>
        <span>Kalman error: <b ref={errKEl} className="text-white">—</b></span>
        <span>Improvement: <b ref={impEl} className="text-white">—</b></span>
      </div>
    </Demo>
  );
}
