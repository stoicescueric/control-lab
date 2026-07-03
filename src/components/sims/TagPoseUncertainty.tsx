/* The Jacobian as an exchange rate, run backwards: a tag detection jitters
   by a pixel or so, and every jittered detection is inverted into "then the
   robot must be HERE" — a green dot on the field. The cloud those dots build
   is what pixel noise actually does to your pose; the amber ellipse over it
   is what the EKF computes from the Jacobian (pixel covariance pushed
   through H⁻¹). Near the tag they are centimeters tight; far away they
   balloon along the line of sight, because bearing is precise and range
   from apparent size is not. */

import {useRef, useState} from 'react';
import {useDprCanvas, useRaf} from '@site/src/lib/canvas';
import {Demo, Controls, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const F = 600; // focal length, pixel units (~640×480 webcam)
const L = 0.165; // tag width, m
const IMG_W = 640; // sensor width, px
const X_RANGE = 2.1; // field half-width shown, m
const Y_MAX = 4.6; // field depth shown, m
const DOT_LIFE = 3.5; // seconds a sample stays on the field
const SPAWN_RATE = 45; // detections per second

function randn(): number {
  let u = 0;
  let v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* pose covariance from the Jacobian: Σ = σ² · J⁻¹ · J⁻ᵀ for
   u = F·x/y, s = F·L/y  (robot squared to the wall, heading from the IMU) */
function poseCovariance(x: number, y: number, sigma: number) {
  const j00 = F / y;
  const j01 = (-F * x) / (y * y);
  const j11 = (-F * L) / (y * y);
  const det = j00 * j11; // j10 = 0
  const i00 = j11 / det;
  const i01 = -j01 / det;
  const i11 = j00 / det;
  const s2 = sigma * sigma;
  return {
    xx: s2 * (i00 * i00 + i01 * i01),
    xy: s2 * i01 * i11,
    yy: s2 * i11 * i11,
  };
}

type Dot = {x: number; y: number; age: number};

export default function TagPoseUncertainty() {
  const [lateral, setLateral] = useState(0.8);
  const [depth, setDepth] = useState(2.6);
  const [sigma, setSigma] = useState(1.2);
  const ctrl = useRef({lateral, depth, sigma});
  ctrl.current = {lateral, depth, sigma};

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const size = useDprCanvas(canvasRef, 340);

  const st = useRef({
    dots: [] as Dot[],
    spawnAcc: 0,
    lastU: 0, // most recent noisy detection, for the camera panel
    lastS: 0,
    haveSample: false,
  });

  function step(dt: number) {
    const s = st.current;
    const {lateral, depth, sigma} = ctrl.current;
    const u = (F * lateral) / depth;
    const sz = (F * L) / depth;
    const inView = Math.abs(u) < IMG_W / 2 - sz / 2 && sz > 6;

    if (inView) {
      s.spawnAcc += dt * SPAWN_RATE;
      while (s.spawnAcc >= 1) {
        s.spawnAcc -= 1;
        const un = u + sigma * randn();
        const sn = Math.max(4, sz + sigma * randn());
        const yEst = (F * L) / sn; // invert apparent size → depth
        const xEst = (un * yEst) / F; // invert offset → lateral
        s.dots.push({x: xEst, y: yEst, age: 0});
        s.lastU = un;
        s.lastS = sn;
        s.haveSample = true;
      }
    } else {
      s.haveSample = false;
      s.spawnAcc = 0;
    }

    for (let i = s.dots.length - 1; i >= 0; i--) {
      s.dots[i].age += dt;
      if (s.dots[i].age > DOT_LIFE) s.dots.splice(i, 1);
    }
    while (s.dots.length > 400) s.dots.shift();
  }

  function draw() {
    const c = canvasRef.current;
    const cx = c?.getContext('2d');
    if (!c || !cx) return;
    const {w, h: hh} = size.current;
    const s = st.current;
    const {lateral, depth, sigma} = ctrl.current;

    cx.fillStyle = '#0b1120';
    cx.fillRect(0, 0, w, hh);

    // --- field panel (top-down), left ------------------------------------
    const fw = Math.max(220, w * 0.58);
    const wallY = 30;
    const scale = Math.min((fw - 44) / (2 * X_RANGE), (hh - wallY - 46) / Y_MAX);
    const fcx = fw / 2;
    const px = (x: number) => fcx + x * scale;
    const py = (y: number) => wallY + y * scale;

    const u = (F * lateral) / depth;
    const sz = (F * L) / depth;
    const inView = Math.abs(u) < IMG_W / 2 - sz / 2 && sz > 6;

    // wall + tag
    cx.strokeStyle = 'rgba(255,255,255,0.25)';
    cx.lineWidth = 2;
    cx.beginPath();
    cx.moveTo(14, wallY);
    cx.lineTo(fw - 14, wallY);
    cx.stroke();
    cx.fillStyle = '#6f8bff';
    cx.fillRect(px(0) - 7, wallY - 5, 14, 8);
    cx.fillStyle = '#8294b8';
    cx.font = '11px ui-monospace,monospace';
    cx.textAlign = 'center';
    cx.fillText('tag', px(0), wallY - 10);
    cx.textAlign = 'left';
    cx.fillText('field (top-down) · heading held by the IMU', 14, hh - 12);

    // camera field of view (|x/y| < half-sensor / f)
    const tanHalf = IMG_W / 2 / F;
    cx.fillStyle = 'rgba(255,255,255,0.035)';
    cx.beginPath();
    cx.moveTo(px(lateral), py(depth));
    cx.lineTo(px(lateral - tanHalf * depth), wallY);
    cx.lineTo(px(lateral + tanHalf * depth), wallY);
    cx.closePath();
    cx.fill();
    cx.strokeStyle = 'rgba(255,255,255,0.1)';
    cx.lineWidth = 1;
    cx.stroke();

    // line of sight from the tag through the robot: the stretch direction
    cx.strokeStyle = 'rgba(130,148,184,0.35)';
    cx.setLineDash([4, 6]);
    cx.beginPath();
    cx.moveTo(px(0), py(0));
    const rayLen = 1.18;
    cx.lineTo(px(lateral * rayLen), py(depth * rayLen));
    cx.stroke();
    cx.setLineDash([]);

    // the cloud: every dot is one noisy detection inverted to a position
    for (const d of s.dots) {
      const a = (1 - d.age / DOT_LIFE) * 0.75;
      cx.globalAlpha = a;
      cx.fillStyle = '#5ce08a';
      cx.beginPath();
      cx.arc(px(d.x), py(Math.min(d.y, Y_MAX)), 2.2, 0, 7);
      cx.fill();
    }
    cx.globalAlpha = 1;

    // the EKF's answer: 2σ ellipse from the Jacobian
    if (inView) {
      const cov = poseCovariance(lateral, depth, sigma);
      const tr2 = (cov.xx + cov.yy) / 2;
      const dd = Math.sqrt(((cov.xx - cov.yy) / 2) ** 2 + cov.xy * cov.xy);
      const l1 = Math.max(tr2 + dd, 1e-12);
      const l2 = Math.max(tr2 - dd, 1e-12);
      const phi = 0.5 * Math.atan2(2 * cov.xy, cov.xx - cov.yy);
      const r1 = 2 * Math.sqrt(l1);
      const r2 = 2 * Math.sqrt(l2);
      cx.strokeStyle = '#ffc24d';
      cx.lineWidth = 2.5;
      cx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const t = (i / 48) * 2 * Math.PI;
        const ex = lateral + r1 * Math.cos(phi) * Math.cos(t) - r2 * Math.sin(phi) * Math.sin(t);
        const ey = depth + r1 * Math.sin(phi) * Math.cos(t) + r2 * Math.cos(phi) * Math.sin(t);
        if (i === 0) cx.moveTo(px(ex), py(ey));
        else cx.lineTo(px(ex), py(ey));
      }
      cx.stroke();
    }

    // robot
    cx.save();
    cx.translate(px(lateral), py(depth));
    cx.fillStyle = '#1c2844';
    cx.strokeStyle = '#6f8bff';
    cx.lineWidth = 2;
    cx.beginPath();
    cx.rect(-11, -11, 22, 22);
    cx.fill();
    cx.stroke();
    cx.fillStyle = '#6f8bff';
    cx.fillRect(-4, -14, 8, 5); // camera notch, facing the wall
    cx.restore();

    // --- camera panel, right ----------------------------------------------
    const camX = fw + 12;
    const camW = w - camX - 12;
    const camH = Math.min(hh - 64, camW * 0.75);
    const camY = 30;
    cx.strokeStyle = 'rgba(255,255,255,0.22)';
    cx.lineWidth = 1.5;
    cx.strokeRect(camX, camY, camW, camH);
    cx.fillStyle = '#8294b8';
    cx.font = '11px ui-monospace,monospace';
    cx.textAlign = 'left';
    cx.fillText('camera image', camX, camY - 8);

    const imgScale = camW / IMG_W;
    const camCx = camX + camW / 2;
    const camCy = camY + camH / 2;
    cx.strokeStyle = 'rgba(255,255,255,0.08)';
    cx.beginPath();
    cx.moveTo(camCx, camY);
    cx.lineTo(camCx, camY + camH);
    cx.moveTo(camX, camCy);
    cx.lineTo(camX + camW, camCy);
    cx.stroke();

    if (inView) {
      // true projection (blue) and the latest jittered detection (amber)
      const drawTag = (uu: number, ss: number, color: string, lw: number) => {
        const half = (ss * imgScale) / 2;
        const ctr = camCx + uu * imgScale;
        cx.strokeStyle = color;
        cx.lineWidth = lw;
        cx.strokeRect(ctr - half, camCy - half, half * 2, half * 2);
      };
      drawTag(u, sz, 'rgba(111,139,255,0.9)', 2);
      if (s.haveSample) drawTag(s.lastU, s.lastS, '#ffc24d', 1.5);
      cx.fillStyle = '#8294b8';
      cx.textAlign = 'center';
      cx.fillText(`u = ${u.toFixed(0)} px · s = ${sz.toFixed(0)} px · jitter ±${sigma.toFixed(1)} px`, camX + camW / 2, camY + camH + 16);
    } else {
      cx.fillStyle = '#ff6f9c';
      cx.textAlign = 'center';
      cx.font = 'bold 12px ui-monospace,monospace';
      cx.fillText('tag out of view', camX + camW / 2, camCy - 4);
      cx.font = '11px ui-monospace,monospace';
      cx.fillText('no measurement, no update', camX + camW / 2, camCy + 14);
    }
    cx.textAlign = 'left';
  }

  useRaf((frameDt: number) => {
    step(Math.min(frameDt, 0.05));
    draw();
  }, canvasRef);

  const cov = poseCovariance(lateral, depth, sigma);
  const lat2s = 2 * Math.sqrt(cov.xx) * 100; // cm
  const dep2s = 2 * Math.sqrt(cov.yy) * 100; // cm
  const cmPerPx = ((depth * depth) / (F * L)) * 100;

  return (
    <Demo title="One pixel of noise, converted to field position">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Top-down field view where noisy AprilTag detections are inverted into a scatter of possible robot positions, next to the live camera image; an amber ellipse shows the uncertainty the EKF computes from the Jacobian."
        className="block w-full rounded-xl bg-[#0b1120]"
      />
      <Legend
        items={[
          {color: '#5ce08a', label: 'positions implied by jittered detections'},
          {color: '#ffc24d', label: "the EKF's 2σ ellipse, from the Jacobian"},
          {color: '#6f8bff', label: 'true detection / robot'},
          {color: '#8294b8', label: 'line of sight — the stretch direction'},
        ]}
      />
      <Controls>
        <Slider label="Lateral offset" min={-1.5} max={1.5} step={0.05} value={lateral} onChange={setLateral} format={(v) => `${v.toFixed(2)} m`} />
        <Slider label="Distance to wall" min={0.6} max={4.2} step={0.05} value={depth} onChange={setDepth} format={(v) => `${v.toFixed(2)} m`} />
        <Slider label="Pixel noise σ" min={0.3} max={3} step={0.1} value={sigma} onChange={setSigma} format={(v) => `±${v.toFixed(1)} px`} />
      </Controls>
      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>lateral ±2σ: <b className="text-white">{lat2s.toFixed(1)} cm</b></span>
        <span>depth ±2σ: <b className="text-white">{dep2s.toFixed(1)} cm</b></span>
        <span>1 px of size here ↦ <b className="text-white">{cmPerPx.toFixed(1)} cm</b> of depth</span>
      </div>
    </Demo>
  );
}
