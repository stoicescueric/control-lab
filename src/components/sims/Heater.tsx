/* Open-loop vs closed-loop heating demo, live. Two rooms warm toward 21 °C:
   one runs a fixed heater power chosen for +5 °C outside ("set and forget"),
   the other measures its own temperature and corrects. The left panel draws the
   rooms — interior color follows temperature, the radiator glows with heater
   power — and the right panel plots both temperatures. Drop the outdoor
   temperature and watch the open-loop room drift while the closed-loop room
   works harder and holds. */

import {useRef, useState} from 'react';
import {Trace} from '@site/src/lib/plot';
import {useDprCanvas, usePlot, useRaf} from '@site/src/lib/canvas';
import {Demo, Stage, Buttons, Button, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const SET = 21;
const lossK = 0.09; // how fast heat leaks out
const heatGain = 1.0;
const U_MAX = 3;
const openPower = (lossK * (SET - 5)) / heatGain; // "set once and forget" for +5°C outside

// map a temperature to an interior color: cold blue -> comfortable warm
function roomColor(temp: number): string {
  const t = Math.max(0, Math.min(1, (temp - 4) / 22));
  const r = Math.round(28 + t * 92);
  const g = Math.round(44 + t * 50);
  const b = Math.round(86 - t * 22);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function Heater() {
  const [outDial, setOutDial] = useState(5);
  const outRef = useRef(5);
  outRef.current = outDial;

  const roomCanvas = useRef<HTMLCanvasElement | null>(null);
  const plotCanvas = useRef<HTMLCanvasElement | null>(null);
  const rsize = useDprCanvas(roomCanvas, 280);
  const plotRef = usePlot(plotCanvas, {
    height: 280,
    xmin: 0,
    xmax: 30,
    ymin: -12,
    ymax: 30,
    padL: 40,
    xLabel: 'seconds',
    yLabel: '°C',
  });

  const roClosed = useRef<HTMLElement | null>(null);
  const roOpen = useRef<HTMLElement | null>(null);
  const roPower = useRef<HTMLElement | null>(null);

  const st = useRef({
    closed: 12,
    open: 12,
    integ: 0,
    gust: 0,
    t: 0,
    uClosed: 0,
    tClosed: new Trace(900),
    tOpen: new Trace(900),
  });
  const acc = useRef(0);

  function reset() {
    const s = st.current;
    s.closed = 12;
    s.open = 12;
    s.integ = 0;
    s.t = 0;
    s.uClosed = 0;
    s.tClosed.clear();
    s.tOpen.clear();
  }

  function step(dt: number) {
    const s = st.current;
    const out = outRef.current + s.gust;
    s.gust *= 0.98;

    // closed loop: proportional + a little integral so it nails the setpoint
    const err = SET - s.closed;
    s.integ = Math.max(-3, Math.min(3, s.integ + err * dt * 0.25));
    let u = 0.18 * err + s.integ;
    u = Math.max(0, Math.min(U_MAX, u)); // a heater can't cool, and has a max
    s.uClosed = u;
    s.closed += (heatGain * u - lossK * (s.closed - out)) * dt;

    // open loop: fixed power forever
    s.open += (heatGain * openPower - lossK * (s.open - out)) * dt;

    s.t += dt;
    s.tClosed.push(s.t, s.closed);
    s.tOpen.push(s.t, s.open);
  }

  function drawRoom(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    temp: number,
    power: number,
    color: string,
    label: string,
    sub: string,
  ) {
    // walls + interior colored by temperature
    c.fillStyle = roomColor(temp);
    c.strokeStyle = color;
    c.lineWidth = 3;
    c.beginPath();
    c.rect(x, y, w, h);
    c.fill();
    c.stroke();
    // roof
    c.fillStyle = '#16203a';
    c.strokeStyle = color;
    c.beginPath();
    c.moveTo(x - 8, y);
    c.lineTo(x + w / 2, y - 22);
    c.lineTo(x + w + 8, y);
    c.closePath();
    c.fill();
    c.stroke();
    // radiator with glow proportional to heater power
    const rw = w * 0.42;
    const rx = x + 12;
    const ry = y + h - 24;
    if (power > 0.04) {
      const g = c.createRadialGradient(rx + rw / 2, ry + 6, 4, rx + rw / 2, ry + 6, rw);
      g.addColorStop(0, `rgba(255,140,60,${0.5 * Math.min(1, power / U_MAX) + 0.15})`);
      g.addColorStop(1, 'rgba(255,140,60,0)');
      c.fillStyle = g;
      c.fillRect(rx - rw / 2, ry - rw / 2, rw * 2, rw);
    }
    c.fillStyle = '#101a2e';
    c.strokeStyle = '#8294b8';
    c.lineWidth = 1.5;
    c.beginPath();
    c.rect(rx, ry, rw, 14);
    c.fill();
    c.stroke();
    for (let i = 1; i < 5; i++) {
      c.beginPath();
      c.moveTo(rx + (i * rw) / 5, ry);
      c.lineTo(rx + (i * rw) / 5, ry + 14);
      c.stroke();
    }
    // heater power bar under the radiator
    c.fillStyle = 'rgba(255,255,255,0.14)';
    c.fillRect(rx, ry + 20, rw, 5);
    c.fillStyle = '#ffc24d';
    c.fillRect(rx, ry + 20, rw * Math.min(1, power / U_MAX), 5);
    // thermometer on the right wall
    const tx = x + w - 22;
    const t0 = y + h - 14;
    const t1 = y + 16;
    const frac = Math.max(0, Math.min(1, (temp + 10) / 40));
    c.fillStyle = 'rgba(255,255,255,0.15)';
    c.fillRect(tx, t1, 7, t0 - t1);
    c.fillStyle = temp < SET - 1.5 ? '#6fb1ff' : '#ff8c5a';
    c.fillRect(tx, t0 - frac * (t0 - t1), 7, frac * (t0 - t1));
    // setpoint notch on the thermometer
    const sy = t0 - ((SET + 10) / 40) * (t0 - t1);
    c.strokeStyle = '#e8eefc';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(tx - 4, sy);
    c.lineTo(tx + 11, sy);
    c.stroke();
    // labels
    c.fillStyle = color;
    c.font = 'bold 12px Inter, sans-serif';
    c.textAlign = 'center';
    c.fillText(label, x + w / 2, y + h + 20);
    c.fillStyle = '#8294b8';
    c.font = '10px ui-monospace, monospace';
    c.fillText(sub, x + w / 2, y + h + 35);
    c.fillStyle = '#e8eefc';
    c.font = 'bold 13px ui-monospace, monospace';
    c.fillText(temp.toFixed(1) + ' °C', x + w / 2, y + 22);
  }

  function draw() {
    const s = st.current;
    const el = roomCanvas.current;
    const c = el?.getContext('2d');
    if (el && c) {
      const {w, h} = rsize.current;
      // sky shifts with the outdoor temperature
      const out = outRef.current + s.gust;
      const cold = Math.max(0, Math.min(1, (10 - out) / 20));
      const grd = c.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, cold > 0.5 ? '#0a1226' : '#0d1530');
      grd.addColorStop(1, '#0b1120');
      c.fillStyle = grd;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#8294b8';
      c.font = '11px ui-monospace, monospace';
      c.textAlign = 'left';
      c.fillText(`outside: ${out.toFixed(1)} °C`, 12, 18);
      // ground line
      c.strokeStyle = '#2a3656';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(0, h - 46);
      c.lineTo(w, h - 46);
      c.stroke();

      const rw = Math.min(170, w * 0.38);
      const rh = 130;
      const gap = Math.min(46, w * 0.08);
      const x0 = w / 2 - rw - gap / 2;
      const x1 = w / 2 + gap / 2;
      const ry = h - 46 - rh;
      drawRoom(c, x0, ry, rw, rh, s.closed, s.uClosed, '#ffc24d', 'closed loop', 'measures & corrects');
      drawRoom(c, x1, ry, rw, rh, s.open, openPower, '#ff6f9c', 'open loop', `fixed power ${openPower.toFixed(1)}`);
    }

    const p = plotRef.current;
    if (p) {
      p.setX(Math.max(0, s.t - 30), Math.max(30, s.t));
      p.clear();
      p.grid();
      p.hline(SET, {color: '#6f8bff', dash: [6, 5], width: 1.5});
      p.clip(() => {
        p.line(s.tOpen.points(), {color: '#ff6f9c', width: 2.5});
        p.line(s.tClosed.points(), {color: '#ffc24d', width: 2.5});
      });
    }
    if (roClosed.current) roClosed.current.textContent = s.closed.toFixed(1) + ' °C';
    if (roOpen.current) {
      roOpen.current.textContent = s.open.toFixed(1) + ' °C';
      roOpen.current.style.color = Math.abs(s.open - SET) > 2 ? '#ff6f9c' : '#fff';
    }
    if (roPower.current) roPower.current.textContent = ((s.uClosed / U_MAX) * 100).toFixed(0) + ' %';
  }

  useRaf((frameDt: number) => {
    acc.current += Math.min(frameDt, 0.05);
    const dt = 1 / 60;
    let n = 0;
    while (acc.current >= dt && n < 8) {
      step(dt * 4); // 4x sim speed
      acc.current -= dt;
      n++;
    }
    draw();
  }, roomCanvas);

  return (
    <Demo title="Open loop vs. closed loop heating">
      <Stage split>
        <canvas
          ref={roomCanvas}
          role="img"
          aria-label="Two animated rooms, one heated open-loop at fixed power and one closed-loop with feedback."
          className="block w-full rounded-xl bg-[#0b1120]"
        />
        <div>
          <canvas
            ref={plotCanvas}
            role="img"
            aria-label="Scrolling plot comparing open-loop and closed-loop room temperature toward the setpoint."
            className="block w-full rounded-xl bg-[#0b1120]"
          />
          <Legend
            items={[
              {color: '#ffc24d', label: 'Closed-loop room (feedback)'},
              {color: '#ff6f9c', label: 'Open-loop room (fixed power)'},
              {color: '#6f8bff', label: 'Setpoint 21°C', dot: true},
            ]}
          />
        </div>
      </Stage>
      <div className="mt-4 max-w-sm">
        <Slider
          label="Outdoor temperature"
          value={outDial}
          min={-10}
          max={25}
          step={1}
          onChange={setOutDial}
          format={(v) => v + ' °C'}
        />
        <div className="mt-1 text-[0.74rem] text-[#8294b8]">
          Drag me down — feel the open-loop room get cold.
        </div>
      </div>
      <Buttons>
        <Button onClick={() => (st.current.gust -= 12)}>🌬️ Open a window (disturbance)</Button>
        <Button onClick={reset}>↺ Reset</Button>
      </Buttons>
      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>
          Closed-loop: <b ref={roClosed} className="text-white">—</b>
        </span>
        <span>
          Open-loop: <b ref={roOpen} className="text-white">—</b>
        </span>
        <span>
          Closed-loop heater: <b ref={roPower} className="text-white">—</b>
        </span>
      </div>
    </Demo>
  );
}
