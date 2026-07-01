/* Trapezoidal motion profile, live. The top panel is a carriage actually
   driving the move: accelerate at aMax, cruise at vMax, decelerate to stop
   exactly on the target — replaying in a loop. The plot shows the velocity and
   position setpoints with the accel / cruise / decel phases shaded and a cursor
   synced to the carriage. Short moves never reach vMax and the trapezoid
   collapses to a triangle. */

import {useRef, useState} from 'react';
import {useDprCanvas, usePlot, useRaf} from '@site/src/lib/canvas';
import {Demo, Controls, Buttons, Button, Readout, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

type Profile = {
  T: number;
  tAcc: number;
  tFlat: number;
  vPeak: number;
  triangle: boolean;
  v: (t: number) => number;
  x: (t: number) => number;
};

function build(d: number, vMax: number, aMax: number): Profile {
  const tRamp = vMax / aMax;
  const dRamp = 0.5 * aMax * tRamp * tRamp;
  let triangle = false;
  let vPeak = vMax;
  let tAcc: number;
  let tFlat: number;
  if (2 * dRamp >= d) {
    triangle = true;
    tAcc = Math.sqrt(d / aMax);
    vPeak = aMax * tAcc;
    tFlat = 0;
  } else {
    tAcc = tRamp;
    tFlat = (d - 2 * dRamp) / vMax;
  }
  const T = 2 * tAcc + tFlat;
  const v = (t: number) => {
    if (t < tAcc) return aMax * t;
    if (t < tAcc + tFlat) return vPeak;
    if (t <= T) return Math.max(0, vPeak - aMax * (t - tAcc - tFlat));
    return 0;
  };
  const x = (t: number) => {
    if (t < tAcc) return 0.5 * aMax * t * t;
    const xAcc = 0.5 * aMax * tAcc * tAcc;
    if (t < tAcc + tFlat) return xAcc + vPeak * (t - tAcc);
    const xFlat = xAcc + vPeak * tFlat;
    const td = Math.min(t, T) - tAcc - tFlat;
    return xFlat + vPeak * td - 0.5 * aMax * td * td;
  };
  return {T, tAcc, tFlat, vPeak, triangle, v, x};
}

const PAUSE = 0.7; // seconds to rest at the target before replaying

export default function MotionProfile() {
  const [d, setD] = useState(60);
  const [vMax, setVMax] = useState(40);
  const [aMax, setAMax] = useState(40);
  const ctrl = useRef({d, vMax, aMax});
  ctrl.current = {d, vMax, aMax};

  const railCanvas = useRef<HTMLCanvasElement | null>(null);
  const plotCanvas = useRef<HTMLCanvasElement | null>(null);
  const rsize = useDprCanvas(railCanvas, 130);
  const plotRef = usePlot(plotCanvas, {
    height: 280,
    xmin: 0,
    xmax: 3,
    ymin: 0,
    ymax: 50,
    yLabel: 'velocity (in/s)',
    xLabel: 'seconds',
  });

  const st = useRef({t: 0});

  const p = build(d, vMax, aMax);

  function drawRail(prof: Profile, t: number) {
    const canvas = railCanvas.current;
    const c = canvas?.getContext('2d');
    if (!canvas || !c) return;
    const {w, h} = rsize.current;
    const {d} = ctrl.current;

    const grd = c.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#0d1530');
    grd.addColorStop(1, '#0b1120');
    c.fillStyle = grd;
    c.fillRect(0, 0, w, h);

    const x0 = 36;
    const x1 = w - 36;
    const railY = h - 40;
    const pos = x0 + (Math.min(prof.x(t), d) / d) * (x1 - x0);
    const vel = prof.v(t);

    // rail + tick marks
    c.strokeStyle = '#2a3656';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x0, railY);
    c.lineTo(x1, railY);
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.12)';
    c.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const tx = x0 + (i / 10) * (x1 - x0);
      c.beginPath();
      c.moveTo(tx, railY - 4);
      c.lineTo(tx, railY + 4);
      c.stroke();
    }
    // start + target flags
    c.fillStyle = '#8294b8';
    c.font = '11px ui-monospace, monospace';
    c.textAlign = 'center';
    c.fillText('start', x0, railY + 20);
    c.fillText(`target ${d.toFixed(0)} in`, x1, railY + 20);
    c.strokeStyle = '#6f8bff';
    c.lineWidth = 2;
    c.setLineDash([5, 4]);
    c.beginPath();
    c.moveTo(x1, railY - 34);
    c.lineTo(x1, railY + 6);
    c.stroke();
    c.setLineDash([]);

    // speed streaks behind the carriage
    const streak = (vel / Math.max(1, prof.vPeak)) * 46;
    if (streak > 3) {
      const sg = c.createLinearGradient(pos - streak, 0, pos, 0);
      sg.addColorStop(0, 'rgba(255,194,77,0)');
      sg.addColorStop(1, 'rgba(255,194,77,0.55)');
      c.fillStyle = sg;
      c.fillRect(pos - streak, railY - 22, streak, 14);
    }
    // carriage
    c.fillStyle = '#cfe0ff';
    c.strokeStyle = '#6f8bff';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(pos - 11, railY - 26);
    c.arcTo(pos + 16, railY - 26, pos + 16, railY - 8, 5);
    c.arcTo(pos + 16, railY - 8, pos - 16, railY - 8, 5);
    c.arcTo(pos - 16, railY - 8, pos - 16, railY - 26, 5);
    c.arcTo(pos - 16, railY - 26, pos + 16, railY - 26, 5);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#0b1120';
    for (const dx of [-9, 9]) {
      c.beginPath();
      c.arc(pos + dx, railY - 6, 4.5, 0, 7);
      c.fill();
      c.strokeStyle = '#9fb4e6';
      c.lineWidth = 1.5;
      c.stroke();
    }
    // live numbers over the carriage
    c.fillStyle = '#ffc24d';
    c.font = 'bold 11px ui-monospace, monospace';
    c.textAlign = 'center';
    c.fillText(`${vel.toFixed(0)} in/s`, pos, railY - 34);
  }

  function drawPlot(prof: Profile, t: number) {
    const plot = plotRef.current;
    if (!plot) return;
    const {d} = ctrl.current;
    const vAxis = prof.vPeak * 1.18;
    plot.setX(0, prof.T);
    plot.setY(0, vAxis);
    plot.clear();
    plot.grid();
    plot.clip(() => {
      // phase shading: accel / cruise / decel
      plot.band(
        [
          [0, 0, vAxis],
          [prof.tAcc, 0, vAxis],
        ],
        'rgba(47,211,192,0.06)',
      );
      if (prof.tFlat > 0) {
        plot.band(
          [
            [prof.tAcc, 0, vAxis],
            [prof.tAcc + prof.tFlat, 0, vAxis],
          ],
          'rgba(111,139,255,0.05)',
        );
      }
      plot.band(
        [
          [prof.tAcc + prof.tFlat, 0, vAxis],
          [prof.T, 0, vAxis],
        ],
        'rgba(255,111,156,0.06)',
      );
      if (!prof.triangle) plot.hline(ctrl.current.vMax, {color: '#8294b8', width: 1.2, dash: [2, 8]});

      const N = 140;
      const vPts: [number, number][] = [];
      const xPts: [number, number][] = [];
      for (let i = 0; i <= N; i++) {
        const tt = (i / N) * prof.T;
        vPts.push([tt, prof.v(tt)]);
        xPts.push([tt, (prof.x(tt) / d) * vAxis]); // position on its own normalized axis
      }
      plot.line(xPts, {color: '#6f8bff', width: 2.5, alpha: 0.85});
      plot.line(vPts, {color: '#ffc24d', width: 3.5});

      // synced cursor + live setpoints
      const tc = Math.min(t, prof.T);
      plot.vline(tc, {color: 'rgba(255,255,255,0.35)', width: 1, dash: [4, 4]});
      plot.dot(tc, prof.v(tc), {color: '#ffc24d', r: 5, ring: '#0b1120', ringW: 2});
      plot.dot(tc, (prof.x(tc) / d) * vAxis, {color: '#6f8bff', r: 5, ring: '#0b1120', ringW: 2});
    });
    const labelY = vAxis * 0.94;
    plot.text(prof.tAcc / 2, labelY, 'accel', {color: '#2fd3c0', align: 'center', font: '10px ui-monospace, monospace'});
    if (prof.tFlat > 0.15) {
      plot.text(prof.tAcc + prof.tFlat / 2, labelY, 'cruise', {color: '#8fa3ff', align: 'center', font: '10px ui-monospace, monospace'});
    }
    plot.text(prof.T - prof.tAcc / 2, labelY, 'decel', {color: '#ff6f9c', align: 'center', font: '10px ui-monospace, monospace'});
  }

  useRaf((frameDt: number) => {
    const {d, vMax, aMax} = ctrl.current;
    const prof = build(d, vMax, aMax);
    const s = st.current;
    s.t += Math.min(frameDt, 0.1);
    if (s.t > prof.T + PAUSE) s.t = 0;
    drawRail(prof, s.t);
    drawPlot(prof, s.t);
  }, railCanvas);

  return (
    <Demo title="Trapezoidal motion profile — the move, replayed live">
      <canvas
        ref={railCanvas}
        role="img"
        aria-label="Animated carriage following the trapezoidal profile along a rail to the target."
        className="block w-full rounded-xl bg-[#0b1120]"
      />
      <div className="mt-3.5">
        <canvas
          ref={plotCanvas}
          role="img"
          aria-label="Velocity and position setpoints of the trapezoidal profile over time with a synced cursor."
          className="block w-full rounded-xl bg-[#0b1120]"
        />
      </div>
      <Legend
        items={[
          {color: '#ffc24d', label: 'velocity setpoint'},
          {color: '#6f8bff', label: 'position setpoint'},
          {color: '#8294b8', label: 'cruise-speed cap'},
        ]}
      />

      <Controls>
        <Slider label="Distance" min={5} max={120} step={5} value={d} onChange={setD} format={(v) => `${v.toFixed(0)} in`} />
        <Slider label="Cruise speed vMax" min={10} max={80} step={5} value={vMax} onChange={setVMax} format={(v) => `${v.toFixed(0)} in/s`} />
        <Slider label="Max accel aMax" min={10} max={120} step={5} value={aMax} onChange={setAMax} format={(v) => `${v.toFixed(0)} in/s²`} />
      </Controls>
      <Buttons>
        <Button onClick={() => (st.current.t = 0)}>▶ Replay</Button>
        <Button
          onClick={() => {
            setD(60);
            setVMax(40);
            setAMax(40);
            st.current.t = 0;
          }}>
          ↺ Reset
        </Button>
      </Buttons>
      <Readout
        items={[
          ['total time', `${p.T.toFixed(2)} s`],
          ['peak speed', `${p.vPeak.toFixed(0)} in/s`],
          ['shape', p.triangle ? 'triangle (too short for vMax)' : 'trapezoid'],
        ]}
      />
    </Demo>
  );
}
