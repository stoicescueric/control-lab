import {useState} from 'react';
import {Demo, Controls, Buttons, Button, Readout, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

/* Interactive mecanum-drive widget. Pure React + SVG (SSR-safe, no canvas).
   Demonstrates, in one place, the four ideas of the kinematics lesson:
     1. the wheel-mixing matrix (forward / strafe / turn -> four wheel powers),
     2. field-centric driving (rotate the command by -heading first),
     3. joystick response curves (raise the magnitude to a power),
     4. desaturation (scale all four wheels down so none exceeds 1).

   Convention matches the Linear Algebra lesson: +vx forward, +vy strafe LEFT,
   +omega counter-clockwise, wheel order FL, FR, BL, BR. */

const sign = (v: number) => (v < 0 ? -1 : 1);

export function MecanumDrive() {
  const [fwd, setFwd] = useState(0.7);
  const [str, setStr] = useState(0.45);
  const [turn, setTurn] = useState(0.25);
  const [heading, setHeading] = useState(30);
  const [curve, setCurve] = useState(1);
  const [fieldCentric, setFieldCentric] = useState(true);

  // 3) joystick response curve, applied to the translation magnitude (keeps the
  // requested direction) and to turn separately.
  const transMag = Math.min(1, Math.hypot(fwd, str));
  const dir = Math.atan2(str, fwd);
  const curvedMag = Math.pow(transMag, curve);
  const fwdC = curvedMag * Math.cos(dir);
  const strC = curvedMag * Math.sin(dir);
  const turnC = sign(turn) * Math.pow(Math.abs(turn), curve);

  // 2) field-centric: rotate the field command by -heading into the robot frame.
  const th = (heading * Math.PI) / 180;
  const vx = fieldCentric ? fwdC * Math.cos(th) + strC * Math.sin(th) : fwdC;
  const vy = fieldCentric ? -fwdC * Math.sin(th) + strC * Math.cos(th) : strC;
  const omega = turnC;

  // 1) the wheel-mixing matrix.
  const rawFL = vx - vy - omega;
  const rawFR = vx + vy + omega;
  const rawBL = vx + vy - omega;
  const rawBR = vx - vy + omega;

  // 4) desaturate: divide by the largest magnitude if it exceeds 1.
  const norm = Math.max(1, Math.abs(rawFL), Math.abs(rawFR), Math.abs(rawBL), Math.abs(rawBR));
  const FL = rawFL / norm;
  const FR = rawFR / norm;
  const BL = rawBL / norm;
  const BR = rawBR / norm;

  // ---- drawing ----
  const cx = 190;
  const cy = 180;
  const hw = 56; // half width
  const hl = 72; // half length
  const wheelColor = (p: number) => (p >= 0 ? '#5ce08a' : '#ff6f9c');
  const wheelOpacity = (p: number) => 0.16 + 0.84 * Math.min(1, Math.abs(p));

  const wheels: {key: string; x: number; y: number; p: number}[] = [
    {key: 'FL', x: -hw, y: -hl, p: FL},
    {key: 'FR', x: hw, y: -hl, p: FR},
    {key: 'BL', x: -hw, y: hl, p: BL},
    {key: 'BR', x: hw, y: hl, p: BR},
  ];

  // field-frame travel direction, drawn in screen space (forward = up). Length
  // reaches past the robot body so the arrow is always visible.
  const driveLen = 104 + 46 * curvedMag;
  const driveTip = {x: cx + driveLen * Math.sin(dir), y: cy - driveLen * Math.cos(dir)};

  return (
    <Demo title="Mecanum drive: command in, four wheel powers out">
      <svg viewBox="0 0 380 360" className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Top-down mecanum robot showing four wheel powers">
        <defs>
          <marker id="mecVec" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="11" refY="7" orient="auto" viewBox="0 0 14 14">
            <path d="M0 1 L13 7 L0 13 Z" fill="#ffc24d" />
          </marker>
        </defs>

        {/* field grid */}
        {Array.from({length: 5}, (_, i) => (
          <g key={i} stroke="rgba(255,255,255,0.06)">
            <line x1={40 + i * 75} y1="30" x2={40 + i * 75} y2="330" />
            <line x1="40" y1={30 + i * 75} x2="340" y2={30 + i * 75} />
          </g>
        ))}

        {/* field-frame drive direction */}
        {curvedMag > 0.02 && (
          <line x1={cx} y1={cy} x2={driveTip.x} y2={driveTip.y} stroke="#ffc24d" strokeWidth="3.5" strokeLinecap="round" markerEnd="url(#mecVec)" opacity="0.9" />
        )}

        {/* robot, rotated by heading (CCW positive => screen rotate negative) */}
        <g transform={`translate(${cx} ${cy}) rotate(${-heading})`}>
          <rect x={-hw - 16} y={-hl - 16} width={(hw + 16) * 2} height={(hl + 16) * 2} rx="14" fill="#16203a" stroke="#2a3656" strokeWidth="2" />
          {/* front marker */}
          <path d={`M ${-14} ${-hl - 16} L 14 ${-hl - 16} L 0 ${-hl - 30} Z`} fill="#6f8bff" />
          {wheels.map((w) => (
            <g key={w.key} transform={`translate(${w.x} ${w.y})`}>
              <rect x="-17" y="-26" width="34" height="52" rx="7" fill={wheelColor(w.p)} fillOpacity={wheelOpacity(w.p)} stroke={wheelColor(w.p)} strokeWidth="2" />
              <text x="0" y="5" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="14" fontWeight="700" fill="#ffffff">
                {w.p.toFixed(2)}
              </text>
              <text x="0" y="-32" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#8294b8">
                {w.key}
              </text>
            </g>
          ))}
        </g>
      </svg>

      <Controls>
        <Slider label="Forward (vₓ)" min={-1} max={1} step={0.05} value={fwd} onChange={setFwd} format={(v) => v.toFixed(2)} />
        <Slider label="Strafe (v_y, +left)" min={-1} max={1} step={0.05} value={str} onChange={setStr} format={(v) => v.toFixed(2)} />
        <Slider label="Turn (ω, +CCW)" min={-1} max={1} step={0.05} value={turn} onChange={setTurn} format={(v) => v.toFixed(2)} />
        <Slider label="Heading θ" min={0} max={360} step={5} value={heading} onChange={setHeading} format={(v) => `${v.toFixed(0)}°`} />
        <Slider label="Joystick curve (exp)" min={1} max={3} step={0.1} value={curve} onChange={setCurve} format={(v) => v.toFixed(1)} />
      </Controls>

      <Buttons>
        <Button active={fieldCentric} onClick={() => setFieldCentric(true)}>
          Field-centric
        </Button>
        <Button active={!fieldCentric} onClick={() => setFieldCentric(false)}>
          Robot-centric
        </Button>
        <Button
          onClick={() => {
            setFwd(0.7);
            setStr(0.45);
            setTurn(0.25);
            setHeading(30);
            setCurve(1);
            setFieldCentric(true);
          }}>
          Reset
        </Button>
      </Buttons>

      <Readout
        items={[
          ['robot vₓ', vx.toFixed(2)],
          ['robot v_y', vy.toFixed(2)],
          ['desaturate ÷', norm.toFixed(2)],
          ['FL', FL.toFixed(2)],
          ['FR', FR.toFixed(2)],
          ['BL', BL.toFixed(2)],
          ['BR', BR.toFixed(2)],
        ]}
      />
      <Legend
        items={[
          {color: '#5ce08a', label: 'wheel forward'},
          {color: '#ff6f9c', label: 'wheel reverse'},
          {color: '#ffc24d', label: 'field travel direction'},
        ]}
      />
    </Demo>
  );
}

export default MecanumDrive;
