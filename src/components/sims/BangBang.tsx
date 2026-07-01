/* Flywheel velocity control, live: bang-bang (full on / full off) recovers fast
   after every shot but chatters around the setpoint forever; takeback-half (TBH)
   keeps the recovery and converges to a smooth hold. Two flywheels run the two
   controllers side by side in real time — fire a shot and watch both dip and
   recover. Physics: dω/dt = K·u − B·ω (RPM units), fixed-timestep like Drone. */

import {useRef, useState} from 'react';
import {Trace} from '@site/src/lib/plot';
import {useDprCanvas, usePlot, useRaf} from '@site/src/lib/canvas';
import {Demo, Stage, Controls, Buttons, Button, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const DT = 0.02; // s, fixed physics step
const K = 900; // rpm/s at full power
const B = 2.2; // damping (1/s)
const SHOT = 95; // rpm stolen by firing a game element
const RPM_AXIS = 360;
const WINDOW = 8; // seconds of scrolling plot

type Wheel = {
  rpm: number;
  angle: number; // for the spinning graphic
  u: number; // applied drive [0,1]
  flash: number; // shot flash, decays
};

export default function BangBang() {
  const [target, setTarget] = useState(250);
  const [gain, setGain] = useState(0.9);
  const [autoFire, setAutoFire] = useState(true);
  const ctrl = useRef({target, gain, autoFire});
  ctrl.current = {target, gain, autoFire};

  const wheelCanvas = useRef<HTMLCanvasElement | null>(null);
  const plotCanvas = useRef<HTMLCanvasElement | null>(null);
  const wsize = useDprCanvas(wheelCanvas, 300);
  const plotRef = usePlot(plotCanvas, {
    height: 300,
    xmin: 0,
    xmax: WINDOW,
    ymin: 0,
    ymax: RPM_AXIS,
    yLabel: 'RPM',
    xLabel: 'seconds',
  });

  const roRipple = useRef<HTMLElement | null>(null);
  const roDrive = useRef<HTMLElement | null>(null);

  const st = useRef({
    t: 0,
    sinceShot: 0,
    bang: {rpm: 0, angle: 0, u: 0, flash: 0} as Wheel,
    tbh: {rpm: 0, angle: 0, u: 0, flash: 0} as Wheel,
    drive: 0, // TBH accumulated drive
    driveAtZero: 0,
    prevErr: 1,
    bangT: new Trace(700),
    tbhT: new Trace(700),
    tgtT: new Trace(700),
  });
  const acc = useRef(0);

  function fire() {
    const s = st.current;
    s.bang.rpm = Math.max(0, s.bang.rpm - SHOT);
    s.tbh.rpm = Math.max(0, s.tbh.rpm - SHOT);
    s.bang.flash = 1;
    s.tbh.flash = 1;
    s.sinceShot = 0;
  }

  function reset() {
    const s = st.current;
    s.t = 0;
    s.sinceShot = 0;
    s.bang = {rpm: 0, angle: 0, u: 0, flash: 0};
    s.tbh = {rpm: 0, angle: 0, u: 0, flash: 0};
    s.drive = 0;
    s.driveAtZero = 0;
    s.prevErr = 1;
    s.bangT.clear();
    s.tbhT.clear();
    s.tgtT.clear();
  }

  function step() {
    const s = st.current;
    const {target, gain, autoFire} = ctrl.current;
    s.t += DT;
    s.sinceShot += DT;
    if (autoFire && s.sinceShot > 2.6 && s.t > 2.5) fire();

    // bang-bang: full power below target, coast above
    const errB = target - s.bang.rpm;
    s.bang.u = errB > 0 ? 1 : 0;

    // takeback-half: integrate, halve the drive at every zero crossing
    const errT = target - s.tbh.rpm;
    s.drive += gain * errT * DT * 0.004;
    s.drive = Math.max(0, Math.min(1, s.drive));
    if (Math.sign(errT) !== Math.sign(s.prevErr) && Math.abs(errT) > 0.5) {
      s.drive = 0.5 * (s.drive + s.driveAtZero);
      s.driveAtZero = s.drive;
    }
    s.prevErr = errT;
    s.tbh.u = s.drive;

    for (const w of [s.bang, s.tbh]) {
      w.rpm += (K * w.u - B * w.rpm) * DT;
      w.angle += w.rpm * 0.0125; // scaled so the spin reads well
      w.flash *= 0.94;
    }

    s.bangT.push(s.t, s.bang.rpm);
    s.tbhT.push(s.t, s.tbh.rpm);
    s.tgtT.push(s.t, target);
  }

  function drawWheel(
    c: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    w: Wheel,
    color: string,
    label: string,
  ) {
    // power plume behind the wheel: glow scales with drive
    if (w.u > 0.03) {
      const g = c.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 1.45);
      g.addColorStop(0, 'rgba(255,194,77,0)');
      g.addColorStop(1, `rgba(255,140,60,${0.28 * w.u})`);
      c.fillStyle = g;
      c.beginPath();
      c.arc(cx, cy, r * 1.45, 0, 7);
      c.fill();
    }
    // rim
    c.strokeStyle = color;
    c.lineWidth = 7;
    c.beginPath();
    c.arc(cx, cy, r, 0, 7);
    c.stroke();
    // shot flash ring
    if (w.flash > 0.02) {
      c.strokeStyle = `rgba(255,255,255,${w.flash * 0.8})`;
      c.lineWidth = 2 + 10 * (1 - w.flash);
      c.beginPath();
      c.arc(cx, cy, r + 8 + 16 * (1 - w.flash), 0, 7);
      c.stroke();
    }
    // spokes
    c.strokeStyle = 'rgba(232,238,252,0.85)';
    c.lineWidth = 3;
    for (let k = 0; k < 4; k++) {
      const a = w.angle + (k * Math.PI) / 2;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6);
      c.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6));
      c.stroke();
    }
    c.fillStyle = '#0b1120';
    c.beginPath();
    c.arc(cx, cy, 7, 0, 7);
    c.fill();
    c.strokeStyle = color;
    c.lineWidth = 2;
    c.stroke();
    // label + rpm
    c.fillStyle = color;
    c.font = 'bold 12px Inter, sans-serif';
    c.textAlign = 'center';
    c.fillText(label, cx, cy + r + 24);
    c.fillStyle = '#e8eefc';
    c.font = '12px ui-monospace, monospace';
    c.fillText(Math.round(w.rpm) + ' rpm', cx, cy + r + 40);
    // drive bar under the label
    const bw = r * 1.5;
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.fillRect(cx - bw / 2, cy + r + 48, bw, 6);
    c.fillStyle = color;
    c.fillRect(cx - bw / 2, cy + r + 48, bw * Math.max(0, Math.min(1, w.u)), 6);
  }

  function draw() {
    const s = st.current;
    const canvas = wheelCanvas.current;
    const c = canvas?.getContext('2d');
    if (canvas && c) {
      const {w, h} = wsize.current;
      const grd = c.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#0d1530');
      grd.addColorStop(1, '#0b1120');
      c.fillStyle = grd;
      c.fillRect(0, 0, w, h);
      const r = Math.min(56, w / 5.4);
      drawWheel(c, w * 0.28, h / 2 - 24, r, s.bang, '#ff6f9c', 'bang-bang');
      drawWheel(c, w * 0.72, h / 2 - 24, r, s.tbh, '#5ce08a', 'takeback-half');
    }

    const p = plotRef.current;
    if (p) {
      p.setX(Math.max(0, s.t - WINDOW), Math.max(WINDOW, s.t));
      p.clear();
      p.grid();
      p.clip(() => {
        p.line(s.tgtT.points(), {color: '#8294b8', width: 1.5, dash: [2, 8]});
        p.line(s.bangT.points(), {color: '#ff6f9c', width: 2});
        p.line(s.tbhT.points(), {color: '#5ce08a', width: 3});
      });
    }

    // steady-state ripple of bang-bang over the last ~2 s
    const tail = s.bangT.points().filter(([t]) => t > s.t - 2);
    if (tail.length > 4 && roRipple.current) {
      let lo = Infinity;
      let hi = -Infinity;
      for (const [, v] of tail) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
      roRipple.current.textContent = `±${((hi - lo) / 2).toFixed(0)} rpm`;
    }
    if (roDrive.current) roDrive.current.textContent = s.drive.toFixed(2);
  }

  useRaf((frameDt: number) => {
    acc.current += Math.min(frameDt, 0.1);
    let n = 0;
    while (acc.current >= DT && n < 12) {
      step();
      acc.current -= DT;
      n++;
    }
    draw();
  }, wheelCanvas);

  return (
    <Demo title="Bang-bang vs. takeback-half — fire a shot, watch the recovery">
      <Stage split>
        <canvas
          ref={wheelCanvas}
          role="img"
          aria-label="Two animated flywheels running bang-bang and takeback-half velocity control."
          className="block w-full rounded-xl bg-[#0b1120]"
        />
        <div>
          <canvas
            ref={plotCanvas}
            role="img"
            aria-label="Scrolling plot of flywheel RPM over time for bang-bang versus takeback-half control."
            className="block w-full rounded-xl bg-[#0b1120]"
          />
          <Legend
            items={[
              {color: '#ff6f9c', label: 'bang-bang — chatters around target'},
              {color: '#5ce08a', label: 'takeback-half — settles smoothly'},
              {color: '#8294b8', label: 'target'},
            ]}
          />
        </div>
      </Stage>

      <Controls>
        <Slider label="Target speed" min={120} max={330} step={10} value={target} onChange={setTarget} format={(v) => `${v.toFixed(0)} rpm`} />
        <Slider label="TBH gain" min={0.2} max={2} step={0.1} value={gain} onChange={setGain} format={(v) => v.toFixed(1)} />
      </Controls>
      <Buttons>
        <Button primary onClick={fire}>
          🎯 Fire!
        </Button>
        <Button active={autoFire} onClick={() => setAutoFire((a) => !a)}>
          Auto-fire every 2.6 s
        </Button>
        <Button onClick={reset}>↺ Reset</Button>
      </Buttons>
      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>
          Bang-bang ripple: <b ref={roRipple} className="text-white">—</b>
        </span>
        <span>
          TBH holding drive: <b ref={roDrive} className="text-white">—</b>
        </span>
      </div>
    </Demo>
  );
}
