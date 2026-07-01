/* Predictive braking, live. Two robots drive the same 6 m to a target with the
   same gain and the same real deceleration limit. The rose robot runs a plain
   PID on the live pose — it is still fast when the target is close, brakes too
   late, and sails past. The amber robot runs the identical PID against its
   PREDICTED STOPPING POSE, p + v·‖v‖/2a: racing in, the prediction overshoots
   the target, the error flips sign, and the controller brakes automatically —
   on the speed-vs-distance plot it rides the √(2·a·d) braking limit exactly.
   The run replays in a loop. */

import {useRef, useState} from 'react';
import {Trace} from '@site/src/lib/plot';
import {useDprCanvas, usePlot, useRaf} from '@site/src/lib/canvas';
import {Demo, Controls, Buttons, Button, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const TARGET = 6; // metres
const V_MAX = 2.2; // m/s
const DT = 0.01;
const PAUSE = 1.4; // seconds to rest before replaying
const D_MIN = -1.0; // metres shown past the target (the overshoot zone)

type Bot = {
  x: number;
  v: number;
  overshoot: number;
  settleT: number | null;
  trace: Trace;
};

const newBot = (): Bot => ({x: 0, v: 0, overshoot: 0, settleT: null, trace: new Trace(1200)});

export default function PredictiveBraking() {
  const [kP, setKp] = useState(2.0);
  const [decel, setDecel] = useState(1.6);
  const ctrl = useRef({kP, decel});
  ctrl.current = {kP, decel};

  const trackCanvas = useRef<HTMLCanvasElement | null>(null);
  const plotCanvas = useRef<HTMLCanvasElement | null>(null);
  const tsize = useDprCanvas(trackCanvas, 190);
  const plotRef = usePlot(plotCanvas, {
    height: 280,
    xmin: D_MIN,
    xmax: TARGET,
    ymin: 0,
    ymax: 3.0,
    yLabel: 'speed (m/s)',
    xLabel: 'distance to target (m) — target at 0',
  });

  const roPlain = useRef<HTMLElement | null>(null);
  const roPred = useRef<HTMLElement | null>(null);
  const roGlide = useRef<HTMLElement | null>(null);
  const roClock = useRef<HTMLElement | null>(null);

  const st = useRef({t: 0, done: 0, plain: newBot(), pred: newBot()});
  const acc = useRef(0);

  function restart() {
    st.current = {t: 0, done: 0, plain: newBot(), pred: newBot()};
  }

  function stepBot(b: Bot, predictive: boolean, t: number) {
    const {kP, decel} = ctrl.current;
    const glide = (b.v * Math.abs(b.v)) / (2 * decel);
    const e = predictive ? TARGET - (b.x + glide) : TARGET - b.x;
    const vCmd = Math.max(-V_MAX, Math.min(V_MAX, kP * e));
    // the robot's real acceleration limit — same for both
    const dv = Math.max(-decel * DT, Math.min(decel * DT, vCmd - b.v));
    b.v += dv;
    b.x += b.v * DT;
    b.overshoot = Math.max(b.overshoot, b.x - TARGET);
    if (b.settleT == null && Math.abs(TARGET - b.x) < 0.02 && Math.abs(b.v) < 0.03) b.settleT = t;
    b.trace.push(TARGET - b.x, Math.abs(b.v));
  }

  function step() {
    const s = st.current;
    if (s.done > 0) {
      s.done += DT;
      if (s.done > PAUSE) restart();
      return;
    }
    s.t += DT;
    stepBot(s.plain, false, s.t);
    stepBot(s.pred, true, s.t);
    const settled = (b: Bot) => b.settleT != null && s.t - b.settleT > 0.5;
    if ((settled(s.plain) && settled(s.pred)) || s.t > 12) s.done = DT;
  }

  function drawRobot(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    ghost = false,
  ) {
    c.save();
    if (ghost) {
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.setLineDash([5, 4]);
      c.globalAlpha = 0.6;
      c.strokeRect(x - 15, y - 11, 30, 22);
    } else {
      c.fillStyle = '#16203a';
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.beginPath();
      c.rect(x - 15, y - 11, 30, 22);
      c.fill();
      c.stroke();
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(15 + x, y - 6);
      c.lineTo(24 + x, y);
      c.lineTo(15 + x, y + 6);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  function drawTrack() {
    const el = trackCanvas.current;
    const c = el?.getContext('2d');
    if (!el || !c) return;
    const {w, h} = tsize.current;
    const s = st.current;
    const {decel} = ctrl.current;

    const grd = c.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#0d1530');
    grd.addColorStop(1, '#0b1120');
    c.fillStyle = grd;
    c.fillRect(0, 0, w, h);

    const x0 = 96;
    const x1 = w - 26;
    const scale = (x1 - x0) / (TARGET - D_MIN);
    const pxm = (m: number) => x0 + m * scale;
    const xTgt = pxm(TARGET);

    const lanes: [Bot, string, string, number][] = [
      [s.plain, '#ff6f9c', 'plain PID', 52],
      [s.pred, '#ffc24d', 'predictive', 128],
    ];

    // target line through both lanes
    c.strokeStyle = '#5ce08a';
    c.lineWidth = 2;
    c.setLineDash([6, 5]);
    c.beginPath();
    c.moveTo(xTgt, 18);
    c.lineTo(xTgt, h - 26);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#5ce08a';
    c.font = '11px ui-monospace, monospace';
    c.textAlign = 'center';
    c.fillText('target', xTgt, h - 10);

    for (const [b, color, label, y] of lanes) {
      // lane rail
      c.strokeStyle = '#2a3656';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x0 - 20, y + 14);
      c.lineTo(x1 + 10, y + 14);
      c.stroke();
      c.fillStyle = color;
      c.font = 'bold 11px ui-monospace, monospace';
      c.textAlign = 'right';
      c.fillText(label, x0 - 30, y + 4);

      const xr = pxm(Math.max(0, b.x));

      if (b === s.pred) {
        // glide vector + ghost predicted stopping pose
        const glide = (b.v * Math.abs(b.v)) / (2 * decel);
        const xPred = pxm(Math.max(0, b.x + glide));
        if (Math.abs(b.v) > 0.05) {
          c.strokeStyle = '#ffc24d';
          c.lineWidth = 2;
          c.setLineDash([6, 5]);
          c.beginPath();
          c.moveTo(xr, y - 20);
          c.lineTo(xPred, y - 20);
          c.stroke();
          c.setLineDash([]);
          c.fillStyle = '#ffc24d';
          c.font = '10px ui-monospace, monospace';
          c.textAlign = 'center';
          c.fillText('glide', (xr + xPred) / 2, y - 26);
          drawRobot(c, xPred, y, '#e8eefc', true);
        }
      }
      drawRobot(c, xr, y, color);
      // speed tag over the robot
      c.fillStyle = color;
      c.font = '10px ui-monospace, monospace';
      c.textAlign = 'center';
      c.fillText(`${Math.abs(b.v).toFixed(2)} m/s`, xr, y + 32);
    }
  }

  function drawPlot() {
    const p = plotRef.current;
    if (!p) return;
    const s = st.current;
    const {decel} = ctrl.current;

    p.clear();
    p.grid();
    p.clip(() => {
      // overshoot zone: past the target
      p.band(
        [
          [D_MIN, 0, 3.0],
          [0, 0, 3.0],
        ],
        'rgba(255,111,156,0.08)',
      );
      p.hline(V_MAX, {color: '#8294b8', width: 1.2, dash: [2, 8]});
      // the braking limit v = sqrt(2·a·d)
      const lim: [number, number][] = [];
      for (let i = 0; i <= 90; i++) {
        const d = (i / 90) * TARGET;
        lim.push([d, Math.sqrt(2 * decel * d)]);
      }
      p.line(lim, {color: '#5ce08a', width: 3, dash: [2, 6], alpha: 0.75});
      // live trajectories
      p.line(s.plain.trace.points(), {color: '#ff6f9c', width: 2.5});
      p.line(s.pred.trace.points(), {color: '#ffc24d', width: 3});
      // live dots
      p.dot(TARGET - s.plain.x, Math.abs(s.plain.v), {color: '#ff6f9c', r: 4.5, ring: '#0b1120', ringW: 2});
      p.dot(TARGET - s.pred.x, Math.abs(s.pred.v), {color: '#ffc24d', r: 4.5, ring: '#0b1120', ringW: 2});
    });
    p.text(D_MIN + 0.06, 2.85, 'overshoot zone', {color: '#ff9cbb', font: '10px ui-monospace, monospace'});
    p.text(TARGET - 0.08, V_MAX + 0.12, 'v_max', {color: '#8294b8', align: 'right', font: '11px ui-monospace, monospace'});

    const fmt = (b: Bot) =>
      `${(b.overshoot * 100).toFixed(0)} cm over` + (b.settleT != null ? `, settled ${b.settleT.toFixed(1)} s` : '');
    if (roPlain.current) {
      roPlain.current.textContent = fmt(s.plain);
      roPlain.current.style.color = s.plain.overshoot > 0.05 ? '#ff6f9c' : '#fff';
    }
    if (roPred.current) {
      roPred.current.textContent = fmt(s.pred);
      roPred.current.style.color = s.pred.overshoot > 0.05 ? '#ff6f9c' : '#5ce08a';
    }
    if (roGlide.current) {
      const g = (s.pred.v * Math.abs(s.pred.v)) / (2 * ctrl.current.decel);
      roGlide.current.textContent = g.toFixed(2) + ' m';
    }
    if (roClock.current) roClock.current.textContent = s.t.toFixed(1) + ' s';
  }

  useRaf((frameDt: number) => {
    acc.current += Math.min(frameDt, 0.1);
    let n = 0;
    while (acc.current >= DT && n < 30) {
      step();
      acc.current -= DT;
      n++;
    }
    drawTrack();
    drawPlot();
  }, trackCanvas);

  return (
    <Demo title="Predictive braking — the same PID, aimed at where you'd coast to">
      <canvas
        ref={trackCanvas}
        role="img"
        aria-label="Two robots driving to a target: a plain PID overshoots while the predictive PID's ghost stopping pose makes it brake on time."
        className="block w-full rounded-xl bg-[#0b1120]"
      />
      <div className="mt-3.5">
        <canvas
          ref={plotCanvas}
          role="img"
          aria-label="Speed versus distance to the target: the predictive controller rides the square-root braking limit while the plain PID crosses into the overshoot zone."
          className="block w-full rounded-xl bg-[#0b1120]"
        />
      </div>
      <Legend
        items={[
          {color: '#ff6f9c', label: 'plain PID — error from the live pose'},
          {color: '#ffc24d', label: 'predictive PID — error from the predicted stop'},
          {color: '#5ce08a', label: 'braking limit v = √(2·a·d)'},
        ]}
      />

      <Controls>
        <Slider label="Gain kP" min={0.8} max={4} step={0.1} value={kP} onChange={setKp} format={(v) => v.toFixed(1)} />
        <Slider label="Decel limit a" min={0.8} max={3} step={0.1} value={decel} onChange={setDecel} format={(v) => `${v.toFixed(1)} m/s²`} />
      </Controls>
      <Buttons>
        <Button primary onClick={restart}>
          ▶ Run again
        </Button>
      </Buttons>
      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>
          Plain PID: <b ref={roPlain} className="text-white">—</b>
        </span>
        <span>
          Predictive: <b ref={roPred} className="text-white">—</b>
        </span>
        <span>
          Glide distance now: <b ref={roGlide} className="text-white">—</b>
        </span>
        <span>
          t: <b ref={roClock} className="text-white">—</b>
        </span>
      </div>
    </Demo>
  );
}
