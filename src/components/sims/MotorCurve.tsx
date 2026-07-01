/* The DC motor's defining tradeoff: the torque–speed curve — now live. The
   motor has real rotor inertia (J·dω/dt = τ_motor − τ_load), so the green
   operating point rides down the line during spin-up instead of teleporting to
   equilibrium, and a thermal state accumulates I²R heat so holding a stall
   visibly cooks the motor. Constants are fit to the real goBILDA 5000-0002-0117
   (MATRIX) motor at 12 V (free speed 5900 RPM, stall torque 0.19 N·m, stall
   current 11 A) — peak power lands at 29 W near 2950 RPM, matching its
   published curve. Data: gm0.org motor guide. */

import {useRef, useState} from 'react';
import {useDprCanvas, usePlot, useRaf} from '@site/src/lib/canvas';
import {Demo, Stage, Buttons, Button, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

// Constants fit to the goBILDA 5000-0002-0117 (MATRIX) motor at 12 V:
//   R  = 12 V / 11 A stall current                      -> 1.0909 Ω
//   kt = 0.19 N·m stall torque / 11 A stall current     -> 0.017273 N·m/A
//   ke = 12 V / 617.8 rad/s (5900 RPM) free speed       -> 0.019426 V·s/rad
const KT = 0.017273; // torque constant (N·m/A)
const KE = 0.019426; // back-EMF constant (V·s/rad)
const R = 1.0909; // armature resistance (Ω)
const VNOM = 12;
const RAD_TO_RPM = 60 / (2 * Math.PI);
const J = 3e-4; // rotor+mechanism inertia (kg·m²) → ~1 s spin-up
const HEAT_C = 55; // thermal mass (J/K)
const COOL_TAU = 16; // cooling time constant (s)
const AMBIENT = 25;

const freeSpeedRpm = (v: number) => (v / KE) * RAD_TO_RPM;
const stallTorque = (v: number) => (KT * v) / R;

export default function MotorCurve() {
  const [volts, setVolts] = useState(12);
  const [load, setLoad] = useState(0.06); // N·m of resisting torque
  const ctrl = useRef({volts, load});
  ctrl.current = {volts, load};

  const motorCanvas = useRef<HTMLCanvasElement | null>(null);
  const plotCanvas = useRef<HTMLCanvasElement | null>(null);
  const msize = useDprCanvas(motorCanvas, 330);
  const plotRef = usePlot(plotCanvas, {
    height: 330,
    xmin: 0,
    xmax: 6300,
    ymin: 0,
    ymax: 0.25,
    xLabel: 'speed (RPM)',
    yLabel: 'torque (N·m)',
  });

  const roSpeed = useRef<HTMLElement | null>(null);
  const roCurr = useRef<HTMLElement | null>(null);
  const roPout = useRef<HTMLElement | null>(null);
  const roEff = useRef<HTMLElement | null>(null);
  const roHeat = useRef<HTMLElement | null>(null);
  const roTemp = useRef<HTMLElement | null>(null);
  const roState = useRef<HTMLElement | null>(null);

  const st = useRef({w: 0, angle: 0, temp: AMBIENT, trail: [] as [number, number][]});
  const acc = useRef(0);
  const DT = 0.01;

  function step() {
    const s = st.current;
    const {volts: v, load: tau} = ctrl.current;
    const current = Math.max(0, (v - KE * s.w) / R);
    const tauM = KT * current;
    let alpha = (tauM - tau) / J;
    // static load can't spin the motor backwards
    if (s.w <= 0 && alpha < 0) alpha = 0;
    s.w = Math.max(0, s.w + alpha * DT);
    s.angle += s.w * DT * 0.06; // scaled for a readable spin
    const heat = current * current * R;
    s.temp += (heat / HEAT_C - (s.temp - AMBIENT) / COOL_TAU) * DT;
  }

  function drawMotor() {
    const el = motorCanvas.current;
    const c = el?.getContext('2d');
    if (!el || !c) return;
    const {w, h} = msize.current;
    const s = st.current;
    const {volts: v} = ctrl.current;
    const current = Math.max(0, (v - KE * s.w) / R);
    const hot = Math.max(0, Math.min(1, (s.temp - AMBIENT) / 90));

    const grd = c.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#0d1530');
    grd.addColorStop(1, '#0b1120');
    c.fillStyle = grd;
    c.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 - 16;
    const rOut = Math.min(74, w / 4.6);

    // heat glow builds with the thermal state
    if (hot > 0.02) {
      const g = c.createRadialGradient(cx, cy, rOut * 0.5, cx, cy, rOut * 2.1);
      g.addColorStop(0, `rgba(255,90,70,${0.4 * hot})`);
      g.addColorStop(1, 'rgba(255,90,70,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(cx, cy, rOut * 2.1, 0, 7);
      c.fill();
    }
    // stator can — reddens as the windings heat up
    c.strokeStyle = `rgb(${Math.round(74 + 160 * hot)}, ${Math.round(90 - 30 * hot)}, ${Math.round(134 - 40 * hot)})`;
    c.lineWidth = 8;
    c.beginPath();
    c.arc(cx, cy, rOut, 0, 7);
    c.stroke();
    // magnets
    c.fillStyle = '#31405f';
    for (const a0 of [-0.5, Math.PI - 0.5]) {
      c.beginPath();
      c.arc(cx, cy, rOut - 8, a0, a0 + 1, false);
      c.arc(cx, cy, rOut - 20, a0 + 1, a0, true);
      c.closePath();
      c.fill();
    }
    // rotor spokes
    c.strokeStyle = '#cfe0ff';
    c.lineWidth = 5;
    for (let k = 0; k < 3; k++) {
      const a = s.angle + (k * 2 * Math.PI) / 3;
      c.beginPath();
      c.moveTo(cx - Math.cos(a) * (rOut - 26), cy - Math.sin(a) * (rOut - 26));
      c.lineTo(cx + Math.cos(a) * (rOut - 26), cy + Math.sin(a) * (rOut - 26));
      c.stroke();
    }
    c.fillStyle = '#0b1120';
    c.beginPath();
    c.arc(cx, cy, 9, 0, 7);
    c.fill();
    c.strokeStyle = '#9fb4e6';
    c.lineWidth = 2;
    c.stroke();

    // meters: applied volts, current draw, winding temperature
    const meters: [string, number, number, string][] = [
      ['volts', v / VNOM, v, '#6f8bff'],
      ['amps', current / 11, current, current > 8 ? '#ff6f9c' : '#ffc24d'],
      ['temp °C', hot, s.temp, hot > 0.6 ? '#ff6f9c' : '#2fd3c0'],
    ];
    const bw = Math.min(150, w / 3.2);
    const baseY = h - 64;
    meters.forEach(([label, frac, value, color], i) => {
      const bx = cx - bw / 2;
      const by = baseY + i * 19;
      c.fillStyle = 'rgba(255,255,255,0.1)';
      c.fillRect(bx, by, bw, 8);
      c.fillStyle = color;
      c.fillRect(bx, by, bw * Math.max(0, Math.min(1, frac)), 8);
      c.fillStyle = '#8294b8';
      c.font = '10px ui-monospace, monospace';
      c.textAlign = 'right';
      c.fillText(label, bx - 8, by + 8);
      c.fillStyle = '#e8eefc';
      c.textAlign = 'left';
      c.fillText(value.toFixed(label === 'temp °C' ? 0 : 1), bx + bw + 8, by + 8);
    });

    c.fillStyle = '#8294b8';
    c.font = '11px ui-monospace, monospace';
    c.textAlign = 'center';
    c.fillText(Math.round(s.w * RAD_TO_RPM) + ' RPM', cx, cy + rOut + 24);
  }

  function drawPlot() {
    const p = plotRef.current;
    if (!p) return;
    const s = st.current;
    const {volts: v, load: tau} = ctrl.current;
    const current = Math.max(0, (v - KE * s.w) / R);
    const tauM = KT * current;
    const rpm = s.w * RAD_TO_RPM;
    const stalled = v > 0.2 && s.w * RAD_TO_RPM < 30 && tauM <= tau + 1e-4;

    s.trail.push([rpm, tauM]);
    if (s.trail.length > 45) s.trail.shift();

    p.clear();
    p.grid();
    p.clip(() => {
      // Reference line at full 12 V — voltage slides the line, it doesn't tilt it.
      p.line(
        [
          [0, stallTorque(VNOM)],
          [freeSpeedRpm(VNOM), 0],
        ],
        {color: 'rgba(255,255,255,0.22)', width: 1.5, dash: [5, 5]},
      );
      // The motor's torque–speed line at the applied voltage.
      p.line(
        [
          [0, stallTorque(v)],
          [freeSpeedRpm(v), 0],
        ],
        {color: '#6f8bff', width: 3},
      );
      // Peak output power sits at exactly half the free speed.
      p.dot(freeSpeedRpm(v) / 2, stallTorque(v) / 2, {color: '#2fd3c0', r: 3.5});
      // The load: a constant resisting torque.
      p.hline(tau, {color: '#ffc24d', width: 2, dash: [6, 4]});
      // Where the motor is right now — it slides down the line as it spins up.
      p.line(s.trail, {color: 'rgba(92,224,138,0.45)', width: 2});
      p.dot(rpm, tauM, {color: '#5ce08a', r: 6, ring: '#0b1120', ringW: 2});
    });
    p.text(freeSpeedRpm(v) / 2, stallTorque(v) / 2 + 0.013, 'max power', {
      color: '#2fd3c0',
      font: '11px ui-monospace, monospace',
      align: 'center',
    });

    const pOut = tauM * s.w;
    const pIn = v * current;
    const heat = current * current * R;
    const eff = pIn > 1e-6 ? Math.max(0, pOut / pIn) : 0;

    if (roSpeed.current) roSpeed.current.textContent = Math.round(rpm) + ' RPM';
    if (roCurr.current) {
      roCurr.current.textContent = current.toFixed(1) + ' A';
      roCurr.current.style.color = current > 8 ? '#ff6f9c' : '#fff';
    }
    if (roPout.current) roPout.current.textContent = pOut.toFixed(1) + ' W';
    if (roEff.current) roEff.current.textContent = (eff * 100).toFixed(0) + ' %';
    if (roHeat.current) roHeat.current.textContent = heat.toFixed(1) + ' W';
    if (roTemp.current) {
      roTemp.current.textContent = s.temp.toFixed(0) + ' °C';
      roTemp.current.style.color = s.temp > 80 ? '#ff6f9c' : s.temp > 50 ? '#ffc24d' : '#fff';
    }
    if (roState.current) {
      roState.current.textContent = stalled ? 'STALLED' : 'running';
      roState.current.style.color = stalled ? '#ff6f9c' : '#5ce08a';
    }
  }

  useRaf((frameDt: number) => {
    acc.current += Math.min(frameDt, 0.1);
    let n = 0;
    while (acc.current >= DT && n < 30) {
      step();
      acc.current -= DT;
      n++;
    }
    drawMotor();
    drawPlot();
  }, motorCanvas);

  return (
    <Demo title="Torque–speed curve — goBILDA 5000-0002-0117 (MATRIX), 12 V">
      <Stage split>
        <canvas
          ref={motorCanvas}
          role="img"
          aria-label="Animated DC motor spinning at its operating speed, with volts, amps, and winding temperature meters."
          className="block w-full rounded-xl bg-[#0b1120]"
        />
        <canvas
          ref={plotCanvas}
          role="img"
          aria-label="Plot of a DC motor torque versus speed curve with the live operating point sliding along it."
          className="block w-full rounded-xl bg-[#0b1120]"
        />
      </Stage>
      <Legend
        items={[
          {color: '#6f8bff', label: 'motor line (applied voltage)'},
          {color: 'rgba(255,255,255,0.5)', label: 'motor line at full 12 V'},
          {color: '#ffc24d', label: 'load (resisting torque)'},
          {color: '#5ce08a', label: 'operating point (live)', dot: true},
        ]}
      />
      <div className="mt-4 grid gap-x-[22px] gap-y-3.5 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <div>
          <Slider label="Applied voltage" value={volts} min={0} max={12} step={0.5} onChange={setVolts} format={(x) => x.toFixed(1) + ' V'} />
          <div className="mt-1 text-[0.74rem] text-[#8294b8]">Lower voltage slides the whole line inward — same slope.</div>
        </div>
        <div>
          <Slider label="Load (resisting torque)" value={load} min={0} max={0.25} step={0.005} onChange={setLoad} format={(x) => x.toFixed(3) + ' N·m'} />
          <div className="mt-1 text-[0.74rem] text-[#8294b8]">Past the stall torque, the motor can&apos;t move it — watch the temperature.</div>
        </div>
      </div>
      <Buttons>
        <Button onClick={() => setLoad(0)}>Free run (no load)</Button>
        <Button
          onClick={() => {
            setVolts(12);
            setLoad(stallTorque(12) + 0.02);
          }}>
          Stall it
        </Button>
        <Button
          onClick={() => {
            setVolts(12);
            setLoad(0.06);
            st.current.w = 0;
            st.current.temp = AMBIENT;
            st.current.trail = [];
          }}>
          ↺ Reset
        </Button>
      </Buttons>
      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>
          Speed: <b ref={roSpeed} className="text-white">—</b>
        </span>
        <span>
          Current: <b ref={roCurr} className="text-white">—</b>
        </span>
        <span>
          Power out: <b ref={roPout} className="text-white">—</b>
        </span>
        <span>
          Efficiency: <b ref={roEff} className="text-white">—</b>
        </span>
        <span>
          Heat (I²R): <b ref={roHeat} className="text-white">—</b>
        </span>
        <span>
          Winding temp: <b ref={roTemp} className="text-white">—</b>
        </span>
        <span>
          Status: <b ref={roState} className="text-white">—</b>
        </span>
      </div>
    </Demo>
  );
}
