/* Odometry vs. truth. A robot drives a perfect circle (green); odometry rebuilt
   from slightly-wrong encoder deltas (amber) drifts away. "AprilTag fix" snaps
   the estimate back. */

import {useRef, useState} from 'react';
import {useDprCanvas, useRaf} from '@site/src/lib/canvas';
import {Demo, Buttons, Button, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const T = 0.4; // track width (m) for the math
const vSpeed = 70; // px/s forward speed
const R = 90; // circle radius px
const omega = vSpeed / R; // rad/s
const dt = 1 / 60;

function randn(): number {
  return (Math.random() + Math.random() + Math.random() - 1.5) * 0.7;
}

interface Pose {
  x: number;
  y: number;
  th: number;
}

export default function OdometryField() {
  const [slip, setSlip] = useState(0.25);
  const [playing, setPlaying] = useState(true);
  const slipRef = useRef(slip);
  slipRef.current = slip;
  const playingRef = useRef(playing);
  playingRef.current = playing;

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const size = useDprCanvas(canvas, 400);

  const roTrue = useRef<HTMLElement | null>(null);
  const roEst = useRef<HTMLElement | null>(null);
  const roErr = useRef<HTMLElement | null>(null);

  const st = useRef({
    inited: false,
    tx: 0,
    ty: 0,
    tth: 0,
    ex: 0,
    ey: 0,
    eth: 0,
    t: 0,
    trueTrail: [] as number[][],
    estTrail: [] as number[][],
  });
  const acc = useRef(0);

  function reset() {
    const {w, h} = size.current;
    const s = st.current;
    s.tx = w / 2;
    s.ty = h / 2 + 90;
    s.tth = 0;
    s.ex = s.tx;
    s.ey = s.ty;
    s.eth = s.tth;
    s.t = 0;
    s.trueTrail = [];
    s.estTrail = [];
    s.inited = true;
  }

  // expose AprilTag fix
  function aprilTagFix() {
    const s = st.current;
    s.ex = s.tx;
    s.ey = s.ty;
    s.eth = s.tth;
  }

  function odoStep(p: Pose, dL: number, dR: number) {
    const ds = (dL + dR) / 2;
    const dth = (dR - dL) / T;
    let sinC: number;
    let cosC: number;
    if (Math.abs(dth) < 1e-9) {
      sinC = 1;
      cosC = 0.5 * dth;
    } else {
      sinC = Math.sin(dth) / dth;
      cosC = (1 - Math.cos(dth)) / dth;
    }
    p.x += ds * (sinC * Math.cos(p.th) - cosC * Math.sin(p.th));
    p.y += ds * (sinC * Math.sin(p.th) + cosC * Math.cos(p.th));
    p.th += dth;
  }

  function step() {
    if (!playingRef.current) return;
    const s = st.current;
    const slip = slipRef.current;
    s.t += dt;
    // true robot: perfect circle (unicycle)
    s.tx += vSpeed * Math.cos(s.tth) * dt;
    s.ty += vSpeed * Math.sin(s.tth) * dt;
    s.tth += omega * dt;
    // wheel deltas from the true motion
    const dL = (vSpeed - (omega * T) / 2) * dt;
    const dR = (vSpeed + (omega * T) / 2) * dt;
    // corrupt with slip: systematic scale mismatch + random noise
    const bias = 0.04 * slip;
    const dLm = dL * (1 + bias) * (1 + randn() * 0.05 * slip);
    const dRm = dR * (1 - bias) * (1 + randn() * 0.05 * slip);
    const p: Pose = {x: s.ex, y: s.ey, th: s.eth};
    odoStep(p, dLm, dRm);
    s.ex = p.x;
    s.ey = p.y;
    s.eth = p.th;
    const tt = s.trueTrail;
    const et = s.estTrail;
    if (tt.length === 0 || Math.hypot(s.tx - tt[tt.length - 1][0], s.ty - tt[tt.length - 1][1]) > 2) {
      tt.push([s.tx, s.ty]);
      et.push([s.ex, s.ey]);
      if (tt.length > 900) {
        tt.shift();
        et.shift();
      }
    }
  }

  function robot(cx: CanvasRenderingContext2D, x: number, y: number, th: number, color: string) {
    cx.save();
    cx.translate(x, y);
    cx.rotate(th);
    cx.fillStyle = color;
    cx.globalAlpha = 0.9;
    cx.beginPath();
    cx.moveTo(14, 0);
    cx.lineTo(-10, -9);
    cx.lineTo(-10, 9);
    cx.closePath();
    cx.fill();
    cx.globalAlpha = 1;
    cx.restore();
  }

  function draw() {
    const cv = canvas.current;
    if (!cv) return;
    const cx = cv.getContext('2d');
    if (!cx) return;
    const {w, h} = size.current;
    const s = st.current;
    cx.fillStyle = '#0b1120';
    cx.fillRect(0, 0, w, h);
    cx.strokeStyle = 'rgba(255,255,255,0.06)';
    cx.lineWidth = 1;
    for (let x = 0; x <= w; x += 40) {
      cx.beginPath();
      cx.moveTo(x, 0);
      cx.lineTo(x, h);
      cx.stroke();
    }
    for (let y = 0; y <= h; y += 40) {
      cx.beginPath();
      cx.moveTo(0, y);
      cx.lineTo(w, y);
      cx.stroke();
    }
    const drawTrail = (arr: number[][], color: string) => {
      if (arr.length < 2) return;
      cx.strokeStyle = color;
      cx.lineWidth = 2;
      cx.globalAlpha = 0.7;
      cx.beginPath();
      cx.moveTo(arr[0][0], arr[0][1]);
      for (let i = 1; i < arr.length; i++) cx.lineTo(arr[i][0], arr[i][1]);
      cx.stroke();
      cx.globalAlpha = 1;
    };
    drawTrail(s.trueTrail, '#5ce08a');
    drawTrail(s.estTrail, '#ffc24d');
    cx.strokeStyle = '#6f8bff';
    cx.lineWidth = 1.5;
    cx.setLineDash([4, 4]);
    cx.beginPath();
    cx.moveTo(s.tx, s.ty);
    cx.lineTo(s.ex, s.ey);
    cx.stroke();
    cx.setLineDash([]);
    robot(cx, s.tx, s.ty, s.tth, '#5ce08a');
    robot(cx, s.ex, s.ey, s.eth, '#ffc24d');
    const errPx = Math.hypot(s.tx - s.ex, s.ty - s.ey);
    if (roTrue.current) roTrue.current.textContent = `(${(s.tx / 100).toFixed(2)}, ${(-s.ty / 100).toFixed(2)}) m`;
    if (roEst.current) roEst.current.textContent = `(${(s.ex / 100).toFixed(2)}, ${(-s.ey / 100).toFixed(2)}) m`;
    if (roErr.current) roErr.current.textContent = (errPx / 100).toFixed(2) + ' m';
  }

  useRaf((frameDt: number) => {
    if (!st.current.inited && size.current.w > 0) reset();
    acc.current += Math.min(frameDt, 0.1);
    let k = 0;
    while (acc.current >= dt && k < 10) {
      step();
      acc.current -= dt;
      k++;
    }
    draw();
  }, canvas);

  return (
    <Demo title="Odometry vs. truth">
      <canvas
        ref={canvas}
        role="img"
        aria-label="Animated field view comparing an odometry-estimated robot pose against ground truth."
        className="block w-full rounded-xl bg-[#0b1120]"
      />
      <Legend
        items={[
          {color: '#5ce08a', label: 'true pose'},
          {color: '#ffc24d', label: 'odometry estimate'},
          {color: '#6f8bff', label: 'error'},
        ]}
      />
      <div className="mt-4 max-w-sm">
        <Slider
          label="Wheel slip / noise"
          value={slip}
          min={0}
          max={1}
          step={0.02}
          onChange={setSlip}
          format={(v) => (v < 0.02 ? 'none' : (v * 100).toFixed(0) + '%')}
        />
        <div className="mt-1 text-[0.74rem] text-[#8294b8]">How untrustworthy the encoders are.</div>
      </div>
      <Buttons>
        <Button primary={playing} active={playing} onClick={() => setPlaying((v) => !v)}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </Button>
        <Button onClick={aprilTagFix}>📸 AprilTag fix</Button>
        <Button onClick={reset}>↺ Reset</Button>
      </Buttons>
      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>True: <b ref={roTrue} className="text-white">—</b></span>
        <span>Estimate: <b ref={roEst} className="text-white">—</b></span>
        <span>Position error: <b ref={roErr} className="text-white">—</b></span>
      </div>
    </Demo>
  );
}
