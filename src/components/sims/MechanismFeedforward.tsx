/* Gravity feedforward, live. An arm and a vertical slide run real dynamics:
   gravity pulls on both while a weak proportional controller chases the target.
   With the gravity feedforward ON (kG·cosθ for the arm, interpolated kG(h) for
   the slide) both mechanisms sit exactly on target; switch it OFF and they sag
   below — the standing error a P controller can't remove. The slide's kG comes
   from measured calibration points, interpolated live. */

import {useRef, useState} from 'react';
import {useDprCanvas, useRaf} from '@site/src/lib/canvas';
import {Demo, Stage, Controls, Buttons, Button, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const SLIDE_TABLE = [
  {height: 0.0, volts: 0.78},
  {height: 0.35, volts: 0.92},
  {height: 0.7, volts: 1.2},
  {height: 1.0, volts: 1.42},
];
const ARM_KG = 1.3; // volts to hold the arm horizontal
const KP = 5; // weak on purpose, so the sag without FF is visible
const DT = 0.01;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function interpolateKg(height: number): number {
  const h = clamp(height, 0, 1);
  for (let i = 0; i < SLIDE_TABLE.length - 1; i++) {
    const a = SLIDE_TABLE[i];
    const b = SLIDE_TABLE[i + 1];
    if (h >= a.height && h <= b.height) {
      const t = (h - a.height) / (b.height - a.height);
      return a.volts + t * (b.volts - a.volts);
    }
  }
  return SLIDE_TABLE[SLIDE_TABLE.length - 1].volts;
}

export default function MechanismFeedforward() {
  const [armTargetDeg, setArmTargetDeg] = useState(20);
  const [slideTarget, setSlideTarget] = useState(0.65);
  const [ffOn, setFfOn] = useState(true);
  const ctrl = useRef({armTargetDeg, slideTarget, ffOn});
  ctrl.current = {armTargetDeg, slideTarget, ffOn};

  const armCanvas = useRef<HTMLCanvasElement | null>(null);
  const slideCanvas = useRef<HTMLCanvasElement | null>(null);
  const asize = useDprCanvas(armCanvas, 320);
  const ssize = useDprCanvas(slideCanvas, 320);

  const roArmHold = useRef<HTMLElement | null>(null);
  const roSlideHold = useRef<HTMLElement | null>(null);
  const roArmErr = useRef<HTMLElement | null>(null);
  const roSlideErr = useRef<HTMLElement | null>(null);

  const st = useRef({
    theta: (20 * Math.PI) / 180, // arm angle from horizontal (rad)
    thetaDot: 0,
    h: 0.65, // slide height 0..1
    hDot: 0,
  });
  const acc = useRef(0);

  function step() {
    const s = st.current;
    const {armTargetDeg, slideTarget, ffOn} = ctrl.current;

    // arm: J·θ'' = u − kG·cosθ − b·θ'   (volts standing in for torque)
    const thetaT = (armTargetDeg * Math.PI) / 180;
    const armFF = ffOn ? ARM_KG * Math.cos(s.theta) : 0;
    const armU = KP * (thetaT - s.theta) + armFF;
    const armAcc = (armU - ARM_KG * Math.cos(s.theta)) * 14 - 7 * s.thetaDot;
    s.thetaDot += armAcc * DT;
    s.theta = clamp(s.theta + s.thetaDot * DT, (-75 * Math.PI) / 180, (100 * Math.PI) / 180);

    // slide: m·h'' = u − kG(h) − b·h'
    const slideFF = ffOn ? interpolateKg(s.h) : 0;
    const slideU = KP * (slideTarget - s.h) + slideFF;
    const slideAcc = (slideU - interpolateKg(s.h)) * 9 - 6 * s.hDot;
    s.hDot += slideAcc * DT;
    s.h = clamp(s.h + s.hDot * DT, 0, 1);
    if (s.h === 0 || s.h === 1) s.hDot = 0;
  }

  function drawArm() {
    const el = armCanvas.current;
    const c = el?.getContext('2d');
    if (!el || !c) return;
    const {w, h} = asize.current;
    const s = st.current;
    const {armTargetDeg, ffOn} = ctrl.current;
    const holdV = ARM_KG * Math.cos(s.theta);

    const grd = c.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#0d1530');
    grd.addColorStop(1, '#0b1120');
    c.fillStyle = grd;
    c.fillRect(0, 0, w, h);

    const bx = w * 0.42;
    const by = h * 0.62;
    const L = Math.min(120, w * 0.32);

    // reference axes
    c.strokeStyle = '#31405f';
    c.lineWidth = 1.5;
    c.setLineDash([5, 6]);
    c.beginPath();
    c.moveTo(bx, by);
    c.lineTo(bx + L + 34, by);
    c.moveTo(bx, by);
    c.lineTo(bx, by - L - 30);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#8294b8';
    c.font = '11px ui-monospace, monospace';
    c.textAlign = 'left';
    c.fillText('horizontal', bx + L - 16, by + 16);

    // target ghost arm
    const tt = (armTargetDeg * Math.PI) / 180;
    c.strokeStyle = 'rgba(255,194,77,0.5)';
    c.lineWidth = 3;
    c.setLineDash([7, 6]);
    c.beginPath();
    c.moveTo(bx, by);
    c.lineTo(bx + L * Math.cos(tt), by - L * Math.sin(tt));
    c.stroke();
    c.setLineDash([]);

    // the arm itself
    c.strokeStyle = '#60a5fa';
    c.lineWidth = 14;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(bx, by);
    c.lineTo(bx + L * Math.cos(s.theta), by - L * Math.sin(s.theta));
    c.stroke();
    c.lineCap = 'butt';
    // pivot + end effector
    c.fillStyle = '#eaf0ff';
    c.beginPath();
    c.arc(bx, by, 11, 0, 7);
    c.fill();
    c.fillStyle = '#f97316';
    c.beginPath();
    c.arc(bx + L * Math.cos(s.theta), by - L * Math.sin(s.theta), 9, 0, 7);
    c.fill();
    c.strokeStyle = '#fff7ed';
    c.lineWidth = 2.5;
    c.stroke();

    // title + hold-voltage meter
    c.fillStyle = '#c7d2e8';
    c.font = 'bold 13px Inter, sans-serif';
    c.textAlign = 'left';
    c.fillText('Arm: kG · cos(θ)', 16, 26);
    c.fillStyle = ffOn ? '#5ce08a' : '#ff6f9c';
    c.font = '11px ui-monospace, monospace';
    c.fillText(ffOn ? 'feedforward ON — holds the target' : 'feedforward OFF — sags below target', 16, 44);

    const bw = Math.min(170, w - 130);
    c.fillStyle = 'rgba(255,255,255,0.1)';
    c.fillRect(16, h - 34, bw, 9);
    c.fillStyle = '#ffc24d';
    c.fillRect(16, h - 34, bw * clamp(holdV / 1.5, 0, 1), 9);
    c.fillStyle = '#8294b8';
    c.font = '10px ui-monospace, monospace';
    c.fillText(`gravity hold now: ${holdV.toFixed(2)} V`, 16 + bw + 10, h - 26);
    c.fillStyle = '#ffc24d';
    c.fillText(`θ = ${((s.theta * 180) / Math.PI).toFixed(0)}°`, 16, h - 12);
  }

  function drawSlide() {
    const el = slideCanvas.current;
    const c = el?.getContext('2d');
    if (!el || !c) return;
    const {w, h} = ssize.current;
    const s = st.current;
    const {slideTarget, ffOn} = ctrl.current;

    const grd = c.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#0d1530');
    grd.addColorStop(1, '#0b1120');
    c.fillStyle = grd;
    c.fillRect(0, 0, w, h);

    const railX = w * 0.22;
    const yBot = h - 40;
    const yTop = 62;
    const yOf = (hh: number) => yBot - hh * (yBot - yTop);

    // rail
    c.strokeStyle = '#2a3656';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(railX, yBot + 8);
    c.lineTo(railX, yTop - 8);
    c.stroke();
    // target line
    c.strokeStyle = 'rgba(255,194,77,0.55)';
    c.lineWidth = 2;
    c.setLineDash([6, 5]);
    c.beginPath();
    c.moveTo(railX - 26, yOf(slideTarget));
    c.lineTo(railX + 26, yOf(slideTarget));
    c.stroke();
    c.setLineDash([]);
    // carriage
    c.fillStyle = '#cfe0ff';
    c.strokeStyle = '#6f8bff';
    c.lineWidth = 2;
    c.beginPath();
    c.rect(railX - 18, yOf(s.h) - 11, 36, 22);
    c.fill();
    c.stroke();

    // inset: the measured kG(height) table, interpolated
    const ix0 = w * 0.44;
    const ix1 = w - 22;
    const iy0 = yBot;
    const iy1 = yTop + 26;
    const pxOf = (hh: number) => ix0 + hh * (ix1 - ix0);
    const pyOf = (v: number) => iy0 - (v / 1.7) * (iy0 - iy1);
    c.strokeStyle = '#31405f';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(ix0, iy0);
    c.lineTo(ix1, iy0);
    c.moveTo(ix0, iy0);
    c.lineTo(ix0, iy1);
    c.stroke();
    c.strokeStyle = '#2dd4bf';
    c.lineWidth = 3;
    c.beginPath();
    for (let i = 0; i <= 60; i++) {
      const hh = i / 60;
      const x = pxOf(hh);
      const y = pyOf(interpolateKg(hh));
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
    for (const p of SLIDE_TABLE) {
      c.fillStyle = '#f97316';
      c.beginPath();
      c.arc(pxOf(p.height), pyOf(p.volts), 5, 0, 7);
      c.fill();
    }
    // live point at the carriage's height
    c.fillStyle = '#ffc24d';
    c.beginPath();
    c.arc(pxOf(s.h), pyOf(interpolateKg(s.h)), 6.5, 0, 7);
    c.fill();
    c.strokeStyle = '#fff7ed';
    c.lineWidth = 2;
    c.stroke();
    c.strokeStyle = 'rgba(255,194,77,0.4)';
    c.lineWidth = 1;
    c.setLineDash([3, 4]);
    c.beginPath();
    c.moveTo(pxOf(s.h), iy0);
    c.lineTo(pxOf(s.h), pyOf(interpolateKg(s.h)));
    c.stroke();
    c.setLineDash([]);

    c.fillStyle = '#c7d2e8';
    c.font = 'bold 13px Inter, sans-serif';
    c.textAlign = 'left';
    c.fillText('Slide: interpolate measured kG(height)', 16, 26);
    c.fillStyle = ffOn ? '#5ce08a' : '#ff6f9c';
    c.font = '11px ui-monospace, monospace';
    c.fillText(ffOn ? 'feedforward ON' : 'feedforward OFF', 16, 44);
    c.fillStyle = '#8294b8';
    c.font = '10px ui-monospace, monospace';
    c.textAlign = 'center';
    c.fillText('height →', (ix0 + ix1) / 2, iy0 + 16);
    c.save();
    c.translate(ix0 - 10, (iy0 + iy1) / 2);
    c.rotate(-Math.PI / 2);
    c.fillText('hold volts', 0, 0);
    c.restore();
  }

  useRaf((frameDt: number) => {
    acc.current += Math.min(frameDt, 0.1);
    let n = 0;
    while (acc.current >= DT && n < 30) {
      step();
      acc.current -= DT;
      n++;
    }
    drawArm();
    drawSlide();

    const s = st.current;
    const {armTargetDeg, slideTarget} = ctrl.current;
    if (roArmHold.current) roArmHold.current.textContent = (ARM_KG * Math.cos(s.theta)).toFixed(2) + ' V';
    if (roSlideHold.current) roSlideHold.current.textContent = interpolateKg(s.h).toFixed(2) + ' V';
    const armErr = armTargetDeg - (s.theta * 180) / Math.PI;
    if (roArmErr.current) {
      roArmErr.current.textContent = (armErr >= 0 ? '+' : '') + armErr.toFixed(1) + '°';
      roArmErr.current.style.color = Math.abs(armErr) > 3 ? '#ff6f9c' : '#5ce08a';
    }
    const slideErr = (slideTarget - s.h) * 100;
    if (roSlideErr.current) {
      roSlideErr.current.textContent = (slideErr >= 0 ? '+' : '') + slideErr.toFixed(1) + ' %';
      roSlideErr.current.style.color = Math.abs(slideErr) > 3 ? '#ff6f9c' : '#5ce08a';
    }
  }, armCanvas);

  return (
    <Demo title="Mechanism feedforward — switch gravity compensation off and watch the sag">
      <Stage split>
        <canvas
          ref={armCanvas}
          role="img"
          aria-label="Animated arm held against gravity by a kG cos-theta feedforward, with a dashed target arm."
          className="block w-full rounded-xl bg-[#0b1120]"
        />
        <canvas
          ref={slideCanvas}
          role="img"
          aria-label="Animated vertical slide held by an interpolated gravity feedforward, with the measured calibration curve."
          className="block w-full rounded-xl bg-[#0b1120]"
        />
      </Stage>

      <Controls>
        <Slider label="Arm target angle (from horizontal)" min={-70} max={100} step={1} value={armTargetDeg} onChange={setArmTargetDeg} format={(v) => `${v.toFixed(0)}°`} />
        <Slider label="Slide target height" min={0} max={1} step={0.01} value={slideTarget} onChange={setSlideTarget} format={(v) => `${(v * 100).toFixed(0)}%`} />
      </Controls>

      <Buttons>
        <Button primary={ffOn} onClick={() => setFfOn(true)}>
          Gravity FF on
        </Button>
        <Button primary={!ffOn} onClick={() => setFfOn(false)}>
          Gravity FF off
        </Button>
        <Button onClick={() => setArmTargetDeg(90)}>Arm vertical</Button>
        <Button onClick={() => setArmTargetDeg(0)}>Arm horizontal</Button>
        <Button
          onClick={() => {
            setArmTargetDeg(20);
            setSlideTarget(0.65);
            setFfOn(true);
          }}>
          ↺ Reset
        </Button>
      </Buttons>

      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>
          Arm gravity hold: <b ref={roArmHold} className="text-white">—</b>
        </span>
        <span>
          Slide kG(height): <b ref={roSlideHold} className="text-white">—</b>
        </span>
        <span>
          Arm error: <b ref={roArmErr} className="text-white">—</b>
        </span>
        <span>
          Slide error: <b ref={roSlideErr} className="text-white">—</b>
        </span>
      </div>
      <Legend
        items={[
          {color: '#60a5fa', label: 'arm link'},
          {color: 'rgba(255,194,77,0.7)', label: 'target'},
          {color: '#2dd4bf', label: 'interpolated slide hold voltage'},
          {color: '#f97316', label: 'measured calibration points', dot: true},
          {color: '#ffc24d', label: 'current operating point', dot: true},
        ]}
      />
    </Demo>
  );
}
