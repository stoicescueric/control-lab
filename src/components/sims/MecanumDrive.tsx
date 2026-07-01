/* Interactive mecanum-drive widget, live. The four ideas of the kinematics
   lesson in one animated field:
     1. the wheel-mixing matrix (forward / strafe / turn -> four wheel powers),
     2. field-centric driving (rotate the command by -heading first),
     3. joystick response curves (raise the magnitude to a power),
     4. desaturation (scale all four wheels down so none exceeds 1).
   The robot actually drives: its pose integrates the (desaturated) chassis
   command, the wheels' 45° rollers scroll with each wheel's power, and a fading
   trail shows the field-frame path.

   Convention matches the Linear Algebra lesson: +vx forward, +vy strafe LEFT,
   +omega counter-clockwise, wheel order FL, FR, BL, BR. */

import {useRef, useState} from 'react';
import {useDprCanvas, useRaf} from '@site/src/lib/canvas';
import {Demo, Controls, Buttons, Button, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const SPEED = 95; // px/s at full command
const TURN_RATE = 1.9; // rad/s at full turn command
const HW = 34; // wheel layout half-width (px)
const HL = 44; // wheel layout half-length (px)

const sign = (v: number) => (v < 0 ? -1 : 1);

export default function MecanumDrive() {
  const [fwd, setFwd] = useState(0.7);
  const [str, setStr] = useState(0.45);
  const [turn, setTurn] = useState(0);
  const [headingDeg, setHeadingDeg] = useState(30);
  const [curve, setCurve] = useState(1);
  const [fieldCentric, setFieldCentric] = useState(true);
  const ctrl = useRef({fwd, str, turn, curve, fieldCentric});
  ctrl.current = {fwd, str, turn, curve, fieldCentric};

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const size = useDprCanvas(canvas, 400);

  const roVx = useRef<HTMLElement | null>(null);
  const roVy = useRef<HTMLElement | null>(null);
  const roNorm = useRef<HTMLElement | null>(null);
  const roHead = useRef<HTMLElement | null>(null);
  const roFL = useRef<HTMLElement | null>(null);
  const roFR = useRef<HTMLElement | null>(null);
  const roBL = useRef<HTMLElement | null>(null);
  const roBR = useRef<HTMLElement | null>(null);

  const st = useRef({
    x: 0, // screen px, set on first frame
    y: 0,
    heading: (30 * Math.PI) / 180, // rad, CCW positive
    placed: false,
    rollerPhase: [0, 0, 0, 0],
    trail: [] as {x: number; y: number}[],
  });

  function setHeading(deg: number) {
    setHeadingDeg(deg);
    st.current.heading = (deg * Math.PI) / 180;
  }

  function reset() {
    setFwd(0.7);
    setStr(0.45);
    setTurn(0);
    setCurve(1);
    setFieldCentric(true);
    setHeading(30);
    st.current.placed = false;
    st.current.trail = [];
  }

  function step(dt: number) {
    const s = st.current;
    const {fwd, str, turn, curve, fieldCentric} = ctrl.current;
    const {w, h} = size.current;
    if (!s.placed && w > 0) {
      s.x = w / 2;
      s.y = h / 2;
      s.placed = true;
    }

    // 3) joystick response curve on the translation magnitude + turn
    const transMag = Math.min(1, Math.hypot(fwd, str));
    const dir = Math.atan2(str, fwd);
    const curvedMag = Math.pow(transMag, curve);
    const fwdC = curvedMag * Math.cos(dir);
    const strC = curvedMag * Math.sin(dir);
    const turnC = sign(turn) * Math.pow(Math.abs(turn), curve);

    // 2) field-centric: rotate the field command by -heading into the robot frame
    const th = s.heading;
    const vx = fieldCentric ? fwdC * Math.cos(th) + strC * Math.sin(th) : fwdC;
    const vy = fieldCentric ? -fwdC * Math.sin(th) + strC * Math.cos(th) : strC;
    const omega = turnC;

    // 1) the wheel-mixing matrix
    const rawFL = vx - vy - omega;
    const rawFR = vx + vy + omega;
    const rawBL = vx + vy - omega;
    const rawBR = vx - vy + omega;

    // 4) desaturate: divide by the largest magnitude if it exceeds 1
    const norm = Math.max(1, Math.abs(rawFL), Math.abs(rawFR), Math.abs(rawBL), Math.abs(rawBR));
    const wheels = [rawFL / norm, rawFR / norm, rawBL / norm, rawBR / norm];

    // the achieved chassis motion is the command scaled by the same desaturation
    const achVx = vx / norm;
    const achVy = vy / norm;
    const achW = omega / norm;

    // integrate the pose. Field frame: +x = screen up, +y = screen left.
    const fx = fieldCentric ? fwdC / norm : achVx * Math.cos(th) - achVy * Math.sin(th);
    const fy = fieldCentric ? strC / norm : achVx * Math.sin(th) + achVy * Math.cos(th);
    s.x -= fy * SPEED * dt;
    s.y -= fx * SPEED * dt;
    s.heading += achW * TURN_RATE * dt;

    // wrap at the field edges (and cut the trail so it doesn't streak across)
    const m = 8;
    let wrapped = false;
    if (s.x < -m) (s.x = w + m), (wrapped = true);
    if (s.x > w + m) (s.x = -m), (wrapped = true);
    if (s.y < -m) (s.y = h + m), (wrapped = true);
    if (s.y > h + m) (s.y = -m), (wrapped = true);
    if (wrapped) s.trail = [];

    s.trail.push({x: s.x, y: s.y});
    if (s.trail.length > 170) s.trail.shift();

    for (let i = 0; i < 4; i++) s.rollerPhase[i] += wheels[i] * 60 * dt;

    return {vx, vy, norm, wheels};
  }

  function drawWheel(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    p: number,
    phase: number,
    mirror: boolean,
    label: string,
  ) {
    const ww = 24;
    const wh = 40;
    const color = p >= 0 ? '#5ce08a' : '#ff6f9c';
    const glow = 0.14 + 0.86 * Math.min(1, Math.abs(p));
    c.save();
    c.translate(x, y);
    // wheel body
    c.fillStyle = '#101a2e';
    c.strokeStyle = color;
    c.globalAlpha = 1;
    c.lineWidth = 2;
    c.beginPath();
    c.rect(-ww / 2, -wh / 2, ww, wh);
    c.fill();
    c.globalAlpha = glow;
    c.stroke();
    // scrolling 45° roller stripes (mirrored so the four form an X)
    c.beginPath();
    c.rect(-ww / 2, -wh / 2, ww, wh);
    c.clip();
    c.lineWidth = 4;
    c.globalAlpha = 0.25 + 0.55 * Math.min(1, Math.abs(p));
    c.strokeStyle = color;
    const dirn = mirror ? -1 : 1;
    const off = ((phase % 12) + 12) % 12;
    for (let sBase = -wh; sBase <= wh; sBase += 12) {
      const sPos = sBase + off;
      c.beginPath();
      c.moveTo(-ww / 2 - 6, sPos - dirn * ww);
      c.lineTo(ww / 2 + 6, sPos + dirn * ww);
      c.stroke();
    }
    c.restore();
    // power value + label just outside the wheel
    c.fillStyle = '#e8eefc';
    c.font = 'bold 11px ui-monospace, monospace';
    c.textAlign = 'center';
    c.fillText(p.toFixed(2), x, y + wh / 2 + 14);
    c.fillStyle = '#8294b8';
    c.font = '10px ui-monospace, monospace';
    c.fillText(label, x, y - wh / 2 - 6);
  }

  function draw(vx: number, vy: number, norm: number, wheels: number[]) {
    const el = canvas.current;
    const c = el?.getContext('2d');
    if (!el || !c) return;
    const {w, h} = size.current;
    const s = st.current;
    const {fwd, str, curve, fieldCentric} = ctrl.current;

    const grd = c.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#0d1530');
    grd.addColorStop(1, '#0b1120');
    c.fillStyle = grd;
    c.fillRect(0, 0, w, h);
    // field tiles
    c.strokeStyle = 'rgba(255,255,255,0.05)';
    c.lineWidth = 1;
    const tile = 60;
    for (let gx = tile; gx < w; gx += tile) {
      c.beginPath();
      c.moveTo(gx, 0);
      c.lineTo(gx, h);
      c.stroke();
    }
    for (let gy = tile; gy < h; gy += tile) {
      c.beginPath();
      c.moveTo(0, gy);
      c.lineTo(w, gy);
      c.stroke();
    }

    // fading trail
    for (let i = 1; i < s.trail.length; i++) {
      const a = i / s.trail.length;
      c.strokeStyle = `rgba(255,194,77,${0.45 * a})`;
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(s.trail[i - 1].x, s.trail[i - 1].y);
      c.lineTo(s.trail[i].x, s.trail[i].y);
      c.stroke();
    }

    // field-frame stick direction (what the driver is asking for)
    const mag = Math.min(1, Math.hypot(fwd, str));
    if (fieldCentric && mag > 0.02) {
      const dir = Math.atan2(str, fwd);
      const len = 60 + 40 * Math.pow(mag, curve);
      const tipX = s.x - len * Math.sin(dir);
      const tipY = s.y - len * Math.cos(dir);
      c.strokeStyle = '#ffc24d';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(s.x, s.y);
      c.lineTo(tipX, tipY);
      c.stroke();
      const ang = Math.atan2(tipY - s.y, tipX - s.x);
      c.fillStyle = '#ffc24d';
      c.beginPath();
      c.moveTo(tipX + 11 * Math.cos(ang), tipY + 11 * Math.sin(ang));
      c.lineTo(tipX + 11 * Math.cos(ang + 2.5), tipY + 11 * Math.sin(ang + 2.5));
      c.lineTo(tipX + 11 * Math.cos(ang - 2.5), tipY + 11 * Math.sin(ang - 2.5));
      c.closePath();
      c.fill();
    }

    // the robot, rotated by heading (CCW positive => canvas rotate negative)
    c.save();
    c.translate(s.x, s.y);
    c.rotate(-s.heading);
    c.fillStyle = '#16203a';
    c.strokeStyle = '#2a3656';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-HW - 8, -HL - 12);
    c.arcTo(HW + 12, -HL - 12, HW + 12, HL + 12, 12);
    c.arcTo(HW + 12, HL + 12, -HW - 12, HL + 12, 12);
    c.arcTo(-HW - 12, HL + 12, -HW - 12, -HL - 12, 12);
    c.arcTo(-HW - 12, -HL - 12, HW + 12, -HL - 12, 12);
    c.closePath();
    c.fill();
    c.stroke();
    // front marker
    c.fillStyle = '#6f8bff';
    c.beginPath();
    c.moveTo(-11, -HL - 12);
    c.lineTo(11, -HL - 12);
    c.lineTo(0, -HL - 24);
    c.closePath();
    c.fill();
    // wheels: FL/BR stripes one way, FR/BL mirrored — the X pattern
    drawWheel(c, -HW, -HL, wheels[0], s.rollerPhase[0], false, 'FL');
    drawWheel(c, HW, -HL, wheels[1], s.rollerPhase[1], true, 'FR');
    drawWheel(c, -HW, HL, wheels[2], s.rollerPhase[2], true, 'BL');
    drawWheel(c, HW, HL, wheels[3], s.rollerPhase[3], false, 'BR');
    c.restore();

    // desaturation badge, only when it's actually active
    if (norm > 1.001) {
      c.fillStyle = 'rgba(255,111,156,0.15)';
      c.strokeStyle = '#ff6f9c';
      c.lineWidth = 1.5;
      c.beginPath();
      c.rect(12, 12, 118, 26);
      c.fill();
      c.stroke();
      c.fillStyle = '#ff9cbb';
      c.font = 'bold 12px ui-monospace, monospace';
      c.textAlign = 'left';
      c.fillText(`desaturate ÷ ${norm.toFixed(2)}`, 20, 29);
    }

    if (roVx.current) roVx.current.textContent = vx.toFixed(2);
    if (roVy.current) roVy.current.textContent = vy.toFixed(2);
    if (roNorm.current) {
      roNorm.current.textContent = norm.toFixed(2);
      roNorm.current.style.color = norm > 1.001 ? '#ff6f9c' : '#fff';
    }
    if (roHead.current) {
      const deg = ((((s.heading * 180) / Math.PI) % 360) + 360) % 360;
      roHead.current.textContent = deg.toFixed(0) + '°';
    }
    if (roFL.current) roFL.current.textContent = wheels[0].toFixed(2);
    if (roFR.current) roFR.current.textContent = wheels[1].toFixed(2);
    if (roBL.current) roBL.current.textContent = wheels[2].toFixed(2);
    if (roBR.current) roBR.current.textContent = wheels[3].toFixed(2);
  }

  useRaf((frameDt: number) => {
    const out = step(Math.min(frameDt, 0.1));
    draw(out.vx, out.vy, out.norm, out.wheels);
  }, canvas);

  return (
    <Demo title="Mecanum drive — command in, four wheel powers out, robot in motion">
      <canvas
        ref={canvas}
        role="img"
        aria-label="Top-down mecanum robot driving across a field; each wheel shows its power and its 45-degree rollers scroll with it."
        className="block w-full rounded-xl bg-[#0b1120]"
      />

      <Controls>
        <Slider label="Forward (vₓ)" min={-1} max={1} step={0.05} value={fwd} onChange={setFwd} format={(v) => v.toFixed(2)} />
        <Slider label="Strafe (v_y, +left)" min={-1} max={1} step={0.05} value={str} onChange={setStr} format={(v) => v.toFixed(2)} />
        <Slider label="Turn (ω, +CCW)" min={-1} max={1} step={0.05} value={turn} onChange={setTurn} format={(v) => v.toFixed(2)} />
        <Slider label="Set heading θ" min={0} max={360} step={5} value={headingDeg} onChange={setHeading} format={(v) => `${v.toFixed(0)}°`} />
        <Slider label="Joystick curve (exp)" min={1} max={3} step={0.1} value={curve} onChange={setCurve} format={(v) => v.toFixed(1)} />
      </Controls>

      <Buttons>
        <Button active={fieldCentric} onClick={() => setFieldCentric(true)}>
          Field-centric
        </Button>
        <Button active={!fieldCentric} onClick={() => setFieldCentric(false)}>
          Robot-centric
        </Button>
        <Button onClick={reset}>↺ Reset</Button>
      </Buttons>

      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>
          robot vₓ: <b ref={roVx} className="text-white">—</b>
        </span>
        <span>
          robot v_y: <b ref={roVy} className="text-white">—</b>
        </span>
        <span>
          desaturate ÷: <b ref={roNorm} className="text-white">—</b>
        </span>
        <span>
          heading: <b ref={roHead} className="text-white">—</b>
        </span>
        <span>
          FL: <b ref={roFL} className="text-white">—</b>
        </span>
        <span>
          FR: <b ref={roFR} className="text-white">—</b>
        </span>
        <span>
          BL: <b ref={roBL} className="text-white">—</b>
        </span>
        <span>
          BR: <b ref={roBR} className="text-white">—</b>
        </span>
      </div>
      <Legend
        items={[
          {color: '#5ce08a', label: 'wheel forward'},
          {color: '#ff6f9c', label: 'wheel reverse'},
          {color: '#ffc24d', label: 'field travel direction & trail'},
        ]}
      />
    </Demo>
  );
}
