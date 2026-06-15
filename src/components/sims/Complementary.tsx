/* Complementary filter: fuse a drifting gyro (high-pass) with a noisy
   accelerometer (low-pass) into one tilt estimate. */

import {useRef, useState} from 'react';
import {Trace} from '@site/src/lib/plot';
import {useDprCanvas, usePlot, useRaf} from '@site/src/lib/canvas';
import {Demo, Stage, Buttons, Button, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

function randn(): number {
  let u = 0;
  let v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export default function Complementary() {
  const [alpha, setAlpha] = useState(0.98);
  const [bias, setBias] = useState(0.18);
  const [noise, setNoise] = useState(8);
  const ctrl = useRef({alpha, bias, noise});
  ctrl.current = {alpha, bias, noise};

  const beamRef = useRef<HTMLCanvasElement | null>(null);
  const plotCanvas = useRef<HTMLCanvasElement | null>(null);
  const bsize = useDprCanvas(beamRef, 290);
  const plotRef = usePlot(plotCanvas, {height: 290, xmin: 0, xmax: 12, ymin: -45, ymax: 45, yLabel: 'tilt (°)'});

  const errGEl = useRef<HTMLElement | null>(null);
  const errCEl = useRef<HTMLElement | null>(null);

  const st = useRef({
    t: 0,
    trueA: 0,
    estComp: 0,
    estGyro: 0,
    errG: 1,
    errC: 1,
    T_true: new Trace(800),
    T_gyro: new Trace(800),
    T_acc: new Trace(800),
    T_comp: new Trace(800),
  });
  const acc = useRef(0);

  function reset() {
    st.current.estComp = st.current.trueA;
    st.current.estGyro = st.current.trueA;
  }

  function step(dt: number) {
    const s = st.current;
    const {alpha, bias, noise} = ctrl.current;
    s.t += dt;
    s.trueA = 30 * Math.sin(s.t * 0.5) + 12 * Math.sin(s.t * 0.17 + 1);
    const trueRate = 30 * 0.5 * Math.cos(s.t * 0.5) + 12 * 0.17 * Math.cos(s.t * 0.17 + 1);
    const gyroMeas = trueRate + bias + 2 * randn();
    const accMeas = s.trueA + noise * randn();
    s.estGyro += gyroMeas * dt;
    s.estComp = alpha * (s.estComp + gyroMeas * dt) + (1 - alpha) * accMeas;
    s.T_true.push(s.t, s.trueA);
    s.T_gyro.push(s.t, s.estGyro);
    s.T_acc.push(s.t, accMeas);
    s.T_comp.push(s.t, s.estComp);
    s.errG = 0.97 * s.errG + 0.03 * Math.abs(s.estGyro - s.trueA);
    s.errC = 0.97 * s.errC + 0.03 * Math.abs(s.estComp - s.trueA);
  }

  function drawBeam() {
    const bc = beamRef.current;
    if (!bc) return;
    const bx = bc.getContext('2d');
    if (!bx) return;
    const {w, h} = bsize.current;
    const s = st.current;
    bx.fillStyle = '#0b1120';
    bx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h * 0.62;
    const len = Math.min(w * 0.36, 110);
    bx.fillStyle = '#2a3656';
    bx.beginPath();
    bx.arc(cx, cy, 8, 0, 7);
    bx.fill();
    const drawTilt = (angDeg: number, color: string, wd: number, al: number) => {
      const a = (angDeg * Math.PI) / 180;
      bx.save();
      bx.translate(cx, cy);
      bx.rotate(a);
      bx.globalAlpha = al;
      bx.strokeStyle = color;
      bx.lineWidth = wd;
      bx.lineCap = 'round';
      bx.beginPath();
      bx.moveTo(-len, 0);
      bx.lineTo(len, 0);
      bx.stroke();
      bx.restore();
    };
    drawTilt(s.trueA, '#5ce08a', 10, 0.5);
    drawTilt(s.estComp, '#6f8bff', 5, 1);
    bx.fillStyle = '#8294b8';
    bx.font = '12px ui-monospace,monospace';
    bx.textAlign = 'center';
    bx.fillText('estimated tilt: ' + s.estComp.toFixed(1) + '°', cx, h - 14);
  }

  function draw() {
    const s = st.current;
    const p = plotRef.current;
    if (p) {
      p.setX(Math.max(0, s.t - 12), Math.max(12, s.t));
      p.clear();
      p.grid();
      p.hline(0, {color: 'rgba(255,255,255,.12)'});
      p.clip(() => {
        p.line(s.T_true.points(), {color: '#5ce08a', width: 3, alpha: 0.55});
        p.line(s.T_acc.points(), {color: '#ffc24d', width: 1.3, alpha: 0.55});
        p.line(s.T_gyro.points(), {color: '#ff6f9c', width: 2});
        p.line(s.T_comp.points(), {color: '#6f8bff', width: 2.6});
      });
    }
    drawBeam();
    if (errGEl.current) errGEl.current.textContent = s.errG.toFixed(1) + '°';
    if (errCEl.current) errCEl.current.textContent = s.errC.toFixed(1) + '°';
  }

  useRaf((frameDt: number) => {
    acc.current += Math.min(frameDt, 0.05);
    const dt = 1 / 60;
    let k = 0;
    while (acc.current >= dt && k < 6) {
      step(dt * 1.3);
      acc.current -= dt;
      k++;
    }
    draw();
  });

  return (
    <Demo title="Fusing a gyro & accelerometer">
      <Stage split>
        <div>
          <canvas ref={beamRef} className="block w-full rounded-xl bg-[#0b1120]" />
          <Legend
            items={[
              {color: '#5ce08a', label: 'True tilt'},
              {color: '#6f8bff', label: 'Filter estimate'},
            ]}
          />
        </div>
        <div>
          <canvas ref={plotCanvas} className="block w-full rounded-xl bg-[#0b1120]" />
          <Legend
            items={[
              {color: '#5ce08a', label: 'True'},
              {color: '#ff6f9c', label: 'Gyro only'},
              {color: '#ffc24d', label: 'Accel only'},
              {color: '#6f8bff', label: 'Complementary'},
            ]}
          />
        </div>
      </Stage>
      <div className="mt-4 grid gap-x-[22px] gap-y-3.5 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <div>
          <Slider label="Trust in gyro α" value={alpha} min={0.5} max={0.999} step={0.001} onChange={setAlpha} format={(v) => v.toFixed(3)} />
          <div className="mt-1 text-[0.74rem] text-[#8294b8]">High = smooth but drifts · Low = jittery but centered</div>
        </div>
        <div>
          <Slider label="Gyro drift" value={bias} min={0} max={0.6} step={0.01} onChange={setBias} format={(v) => v.toFixed(2) + '°/s'} />
          <div className="mt-1 text-[0.74rem] text-[#8294b8]">Real gyros always have a little of this.</div>
        </div>
        <Slider label="Accel noise" value={noise} min={0} max={20} step={0.5} onChange={setNoise} format={(v) => v.toFixed(1) + '°'} />
      </div>
      <Buttons>
        <Button onClick={reset}>↺ Reset estimates</Button>
      </Buttons>
      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>Gyro-only error: <b ref={errGEl} className="text-white">—</b></span>
        <span>Complementary error: <b ref={errCEl} className="text-white">—</b></span>
      </div>
    </Demo>
  );
}
