/* Open-loop vs closed-loop heating demo. Two rooms warm toward 21°C: one runs a
   fixed heater power, the other measures itself and corrects. */

import {useRef, useState} from 'react';
import {Trace} from '@site/src/lib/plot';
import {usePlot, useRaf} from '@site/src/lib/canvas';
import {Demo, Buttons, Button, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const SET = 21;
const lossK = 0.09; // how fast heat leaks out
const heatGain = 1.0;
const openPower = (lossK * (SET - 5)) / heatGain; // "set once and forget" for +5°C outside

export default function Heater() {
  const [outDial, setOutDial] = useState(5);
  const outRef = useRef(5);
  outRef.current = outDial;

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const plotRef = usePlot(canvas, {
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

  const st = useRef({
    closed: 12,
    open: 12,
    integ: 0,
    gust: 0,
    t: 0,
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
    u = Math.max(0, Math.min(3, u)); // a heater can't cool, and has a max
    s.closed += (heatGain * u - lossK * (s.closed - out)) * dt;

    // open loop: fixed power forever
    s.open += (heatGain * openPower - lossK * (s.open - out)) * dt;

    s.t += dt;
    s.tClosed.push(s.t, s.closed);
    s.tOpen.push(s.t, s.open);
  }

  function draw() {
    const s = st.current;
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
    if (roOpen.current) roOpen.current.textContent = s.open.toFixed(1) + ' °C';
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
  }, canvas);

  return (
    <Demo title="Open loop vs. closed loop heating">
      <canvas
        ref={canvas}
        role="img"
        aria-label="Animated simulation comparing open-loop and closed-loop room heating toward a setpoint."
        className="block w-full rounded-xl bg-[#0b1120]"
      />
      <Legend
        items={[
          {color: '#ffc24d', label: 'Closed-loop room (feedback)'},
          {color: '#ff6f9c', label: 'Open-loop room (fixed power)'},
          {color: '#6f8bff', label: 'Setpoint 21°C', dot: true},
        ]}
      />
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
      </div>
    </Demo>
  );
}
