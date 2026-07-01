/* A subsystem modelled as a finite state machine — with the mechanism animated.
   There is exactly one current state; each event only does something when it is
   legal from that state, so illegal inputs (lift while idle, score with no
   sample) are safely ignored instead of corrupting the robot. The canvas acts
   out what each state physically means: INTAKING spins the roller and pulls a
   sample in (the beam-break LED lights when it arrives), RAISING swings the arm
   up (the limit-switch LED lights at the top), SCORING opens the claw and the
   sample drops into the basket. */

import {Fragment, useRef, useState} from 'react';
import {useDprCanvas, useRaf} from '@site/src/lib/canvas';
import {Demo, Button} from '@site/src/components/kit/Demo';

type S = 'IDLE' | 'INTAKING' | 'LOADED' | 'RAISING' | 'SCORING';

const STATES: {id: S; desc: string}[] = [
  {id: 'IDLE', desc: 'at rest'},
  {id: 'INTAKING', desc: 'intake running'},
  {id: 'LOADED', desc: 'sample secured'},
  {id: 'RAISING', desc: 'arm moving up'},
  {id: 'SCORING', desc: 'releasing'},
];

interface Evt {
  id: string;
  label: string;
  kind: 'driver' | 'sensor';
  from: S;
  to: S;
}

const EVENTS: Evt[] = [
  {id: 'intake', label: '▶ Run intake', kind: 'driver', from: 'IDLE', to: 'INTAKING'},
  {id: 'cancel', label: '✋ Cancel', kind: 'driver', from: 'INTAKING', to: 'IDLE'},
  {id: 'lift', label: '▲ Lift', kind: 'driver', from: 'LOADED', to: 'RAISING'},
  {id: 'release', label: '⟲ Release & reset', kind: 'driver', from: 'SCORING', to: 'IDLE'},
  {id: 'detected', label: '⬤ Sample detected', kind: 'sensor', from: 'INTAKING', to: 'LOADED'},
  {id: 'attop', label: '⬤ Arm at top', kind: 'sensor', from: 'RAISING', to: 'SCORING'},
];

interface LogEntry {
  text: string;
  ok: boolean;
}

const ARM_STOW = 0.12; // rad above horizontal, arm at rest
const ARM_TOP = 1.32; // rad, scoring position
const ARM_LEN = 92;

export default function StateMachine() {
  const [state, setState] = useState<S>('IDLE');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [flash, setFlash] = useState(false);
  const stateRef = useRef<S>('IDLE');

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const size = useDprCanvas(canvas, 240);

  const anim = useRef({
    roller: 0,
    intakePhase: 0, // sample slide-in progress 0..1
    arm: ARM_STOW,
    claw: 0, // 0 closed .. 1 open
    dropY: 0,
    dropVy: 0,
    scored: false,
  });

  function fire(e: Evt) {
    if (e.from === stateRef.current) {
      stateRef.current = e.to;
      setState(e.to);
      const a = anim.current;
      if (e.to === 'INTAKING') a.intakePhase = 0;
      if (e.to === 'SCORING') {
        a.dropY = 0;
        a.dropVy = 0;
        a.scored = false;
      }
      if (e.to === 'IDLE') a.scored = false;
      setLog((l) => [{text: `${e.from} → ${e.to}`, ok: true}, ...l].slice(0, 7));
    } else {
      setFlash(true);
      setTimeout(() => setFlash(false), 320);
      setLog((l) =>
        [{text: `✗ ignored "${e.label.replace(/^\S+\s/, '')}" — not legal in ${stateRef.current}`, ok: false}, ...l].slice(0, 7),
      );
    }
  }

  function reset() {
    stateRef.current = 'IDLE';
    setState('IDLE');
    setLog([]);
    anim.current = {roller: 0, intakePhase: 0, arm: ARM_STOW, claw: 0, dropY: 0, dropVy: 0, scored: false};
  }

  function draw(dt: number) {
    const el = canvas.current;
    const c = el?.getContext('2d');
    if (!el || !c) return;
    const {w, h} = size.current;
    const s = stateRef.current;
    const a = anim.current;

    // animate toward what the current state means physically
    if (s === 'INTAKING') {
      a.roller += 9 * dt;
      a.intakePhase = Math.min(1, a.intakePhase + dt / 1.3);
    } else if (s === 'IDLE') {
      a.intakePhase = Math.max(0, a.intakePhase - dt / 0.6);
    }
    const armTarget = s === 'RAISING' || s === 'SCORING' ? ARM_TOP : ARM_STOW;
    a.arm += (armTarget - a.arm) * Math.min(1, 3.2 * dt);
    const clawTarget = s === 'SCORING' ? 1 : 0;
    a.claw += (clawTarget - a.claw) * Math.min(1, 6 * dt);
    if (s === 'SCORING' && a.claw > 0.55 && !a.scored) {
      a.dropVy += 560 * dt;
      a.dropY += a.dropVy * dt;
      if (a.dropY > 34) {
        a.dropY = 34;
        a.scored = true;
      }
    }

    const grd = c.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#0d1530');
    grd.addColorStop(1, '#0b1120');
    c.fillStyle = grd;
    c.fillRect(0, 0, w, h);

    const ground = h - 34;
    c.strokeStyle = '#2a3656';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, ground);
    c.lineTo(w, ground);
    c.stroke();

    // chassis
    const cw = Math.min(180, w * 0.4);
    const cx0 = w * 0.5 - cw * 0.25;
    const shake = s === 'INTAKING' ? Math.sin(a.roller * 6) * 1.2 : 0;
    const cy0 = ground - 52 + shake;
    c.fillStyle = '#16203a';
    c.strokeStyle = '#3a4a72';
    c.lineWidth = 2;
    c.beginPath();
    c.rect(cx0, cy0, cw, 52);
    c.fill();
    c.stroke();
    for (const dx of [24, cw - 24]) {
      c.fillStyle = '#0b1120';
      c.beginPath();
      c.arc(cx0 + dx, ground - 1, 13, 0, 7);
      c.fill();
      c.strokeStyle = '#4a5a86';
      c.lineWidth = 2.5;
      c.stroke();
    }

    // intake roller at the right end
    const rx = cx0 + cw + 16;
    const ry = ground - 18;
    c.strokeStyle = s === 'INTAKING' ? '#5ce08a' : '#4a5a86';
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(rx, ry, 13, 0, 7);
    c.stroke();
    for (let k = 0; k < 3; k++) {
      const ang = a.roller + (k * 2 * Math.PI) / 3;
      c.beginPath();
      c.moveTo(rx, ry);
      c.lineTo(rx + Math.cos(ang) * 11, ry + Math.sin(ang) * 11);
      c.stroke();
    }

    // arm on a pivot at the chassis left-top, swinging up-left to the basket
    const px = cx0 + 16;
    const py = cy0 + 6;
    const tipX = px - ARM_LEN * Math.cos(a.arm);
    const tipY = py - ARM_LEN * Math.sin(a.arm);
    c.strokeStyle = '#60a5fa';
    c.lineWidth = 9;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(tipX, tipY);
    c.stroke();
    c.lineCap = 'butt';
    c.fillStyle = '#eaf0ff';
    c.beginPath();
    c.arc(px, py, 7, 0, 7);
    c.fill();
    // claw: two fingers that open in SCORING
    const spread = 0.25 + a.claw * 0.85;
    c.strokeStyle = '#9fb4e6';
    c.lineWidth = 3.5;
    for (const sgn of [-1, 1]) {
      const fa = a.arm + Math.PI + sgn * spread;
      c.beginPath();
      c.moveTo(tipX, tipY);
      c.lineTo(tipX - 16 * Math.cos(fa), tipY - 16 * Math.sin(fa) + 4);
      c.stroke();
    }

    // the basket the arm scores into
    const bx = px - ARM_LEN * Math.cos(ARM_TOP);
    const by = py - ARM_LEN * Math.sin(ARM_TOP) + 46;
    c.strokeStyle = '#8294b8';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(bx - 20, by - 14);
    c.lineTo(bx - 14, by + 8);
    c.lineTo(bx + 14, by + 8);
    c.lineTo(bx + 20, by - 14);
    c.stroke();

    // the sample, wherever the state says it is
    const bayX = cx0 + cw * 0.55;
    const bayY = cy0 + 30 + shake;
    let sx: number | null = null;
    let sy = 0;
    if (s === 'INTAKING' && a.intakePhase > 0) {
      sx = rx + 26 + (bayX - rx - 26) * a.intakePhase;
      sy = ry - 6 + (bayY - ry + 6) * a.intakePhase;
    } else if (s === 'LOADED') {
      sx = bayX;
      sy = bayY;
    } else if (s === 'RAISING' || (s === 'SCORING' && a.claw <= 0.55)) {
      sx = tipX;
      sy = tipY + 8;
    } else if (s === 'SCORING') {
      sx = tipX;
      sy = tipY + 8 + a.dropY;
    }
    if (sx != null) {
      c.fillStyle = '#f97316';
      c.beginPath();
      c.arc(sx, sy, 9, 0, 7);
      c.fill();
      c.strokeStyle = '#fff7ed';
      c.lineWidth = 2;
      c.stroke();
    }

    // sensor LEDs: light up when the event is physically true
    const beamOn = s === 'INTAKING' && a.intakePhase >= 1;
    const topOn = s === 'RAISING' && Math.abs(a.arm - ARM_TOP) < 0.06;
    const led = (x: number, y: number, on: boolean, label: string) => {
      c.fillStyle = on ? '#5ce08a' : 'rgba(255,255,255,0.15)';
      c.beginPath();
      c.arc(x, y, 5, 0, 7);
      c.fill();
      if (on) {
        c.strokeStyle = 'rgba(92,224,138,0.5)';
        c.lineWidth = 4;
        c.stroke();
      }
      c.fillStyle = on ? '#5ce08a' : '#8294b8';
      c.font = '10px ui-monospace, monospace';
      c.textAlign = 'left';
      c.fillText(label, x + 12, y + 3);
    };
    led(w - 170, 22, beamOn, 'beam-break (sample in)');
    led(w - 170, 42, topOn, 'limit switch (arm at top)');

    // current state, on the canvas too
    c.fillStyle = '#6f8bff';
    c.font = 'bold 13px ui-monospace, monospace';
    c.textAlign = 'left';
    c.fillText(s, 14, 24);
  }

  useRaf((frameDt: number) => draw(Math.min(frameDt, 0.1)), canvas);

  const validNow = EVENTS.filter((e) => e.from === state);
  const drivers = EVENTS.filter((e) => e.kind === 'driver');
  const sensors = EVENTS.filter((e) => e.kind === 'sensor');

  const group = (title: string, evts: Evt[]) => (
    <div className="mt-3">
      <div className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-[#8294b8]">{title}</div>
      <div className="flex flex-wrap gap-2">
        {evts.map((e) => (
          <Button key={e.id} primary={e.from === state} onClick={() => fire(e)}>
            {e.label}
          </Button>
        ))}
      </div>
    </div>
  );

  return (
    <Demo title="A subsystem as a state machine">
      <div className="mb-3.5 flex flex-wrap items-center gap-2 rounded-xl bg-black/25 p-4">
        {STATES.map((s, i) => (
          <Fragment key={s.id}>
            <div
              className={`flex min-w-[92px] flex-col items-center rounded-lg border px-3 py-2 text-center transition-colors ${
                s.id === state ? 'border-brand bg-brand/20 text-white' : 'border-white/15 bg-white/5 text-[#8294b8]'
              }`}>
              <span className="font-mono text-[0.8rem] font-bold">{s.id}</span>
              <span className="text-[0.66rem] leading-tight">{s.desc}</span>
            </div>
            {i < STATES.length - 1 && <span className="text-white/30">→</span>}
          </Fragment>
        ))}
        <span className="ml-1 font-mono text-[0.7rem] text-white/40">↺ back to IDLE</span>
      </div>

      <canvas
        ref={canvas}
        role="img"
        aria-label="Animated side view of the scoring subsystem acting out the current state: intake, loaded sample, raising arm, and scoring."
        className="block w-full rounded-xl bg-[#0b1120]"
      />

      {group('Driver inputs', drivers)}
      {group('Sensor / automatic events', sensors)}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={reset}>↺ Reset machine</Button>
      </div>

      <div
        className={`mt-4 rounded-xl border bg-black/30 p-3 font-mono text-[0.78rem] transition-colors ${
          flash ? 'border-rose' : 'border-white/10'
        }`}>
        <div className="mb-1 text-[0.7rem] uppercase tracking-wide text-[#8294b8]">Transition log</div>
        {log.length === 0 ? (
          <div className="text-[#66748f]">Fire an event to begin…</div>
        ) : (
          log.map((e, i) => (
            <div key={i} style={{color: e.ok ? '#5ce08a' : '#ff6f9c'}}>
              {e.text}
            </div>
          ))
        )}
      </div>

      <div className="mt-3 px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        Current state: <b style={{color: '#6f8bff'}}>{state}</b> · legal now:{' '}
        <b className="text-white">{validNow.map((e) => e.label.replace(/^\S+\s/, '')).join(', ') || '—'}</b>
      </div>
    </Demo>
  );
}
