/* The DC motor's defining tradeoff: the torque–speed curve. Set the applied
   voltage and the load (resisting) torque; the operating point is where the
   motor's line meets the load. Read off current, output power, efficiency, and
   heat. The constants are fit to the real goBILDA 5000-0002-0117 (MATRIX) motor
   at 12 V (free speed 5900 RPM, stall torque 0.19 N·m, stall current 11 A) — so
   peak power lands at 29 W near 2950 RPM, matching its published curve. The ideal
   line omits the ~0.3 A free current (friction); the physics is otherwise exact.
   Data: gm0.org motor guide. */

import {useRef, useState} from 'react';
import {usePlot, useRaf} from '@site/src/lib/canvas';
import {Demo, Buttons, Button, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

// Constants fit to the goBILDA 5000-0002-0117 (MATRIX) motor at 12 V:
//   R  = 12 V / 11 A stall current                      -> 1.0909 Ω
//   kt = 0.19 N·m stall torque / 11 A stall current     -> 0.017273 N·m/A
//   ke = 12 V / 617.8 rad/s (5900 RPM) free speed       -> 0.019426 V·s/rad
// Separate kt/ke (they differ slightly because of friction) so the curve hits
// all three published points exactly; peak power then falls at 29 W / 2950 RPM.
const KT = 0.017273; // torque constant (N·m/A)
const KE = 0.019426; // back-EMF constant (V·s/rad)
const R = 1.0909; // armature resistance (Ω)
const VNOM = 12; // nominal voltage
const RAD_TO_RPM = 60 / (2 * Math.PI);

const freeSpeedRpm = (v: number) => (v / KE) * RAD_TO_RPM; // where torque = 0
const stallTorque = (v: number) => (KT * v) / R; // where speed = 0

export default function MotorCurve() {
  const [volts, setVolts] = useState(12);
  const [load, setLoad] = useState(0.06); // N·m of resisting torque
  const ctrl = useRef({volts, load});
  ctrl.current = {volts, load};

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const plotRef = usePlot(canvas, {
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
  const roState = useRef<HTMLElement | null>(null);

  function draw() {
    const p = plotRef.current;
    if (!p) return;
    const {volts: v, load: tau} = ctrl.current;

    // Operating point: the motor's line, τ(ω) = kt(V − ke·ω)/R, meets the load τ.
    const wRad = v / KE - (tau * R) / (KT * KE); // rad/s
    const stalled = wRad <= 0 || v <= 0;
    const wOp = stalled ? 0 : wRad;
    const current = (v - KE * wOp) / R; // A
    const torqueOut = stalled ? stallTorque(v) : tau; // torque actually produced
    const pOut = torqueOut * wOp; // mechanical power out (0 at stall)
    const pIn = v * current; // electrical power in
    const heat = current * current * R; // I²R losses
    const eff = pIn > 1e-6 ? Math.max(0, pOut / pIn) : 0;

    p.clear();
    p.grid();
    p.clip(() => {
      // Reference line at full 12 V — shows how voltage just translates the line.
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
      // Where the motor actually settles.
      p.dot(wOp, stalled ? stallTorque(v) : tau, {color: '#5ce08a', r: 6, ring: '#0b1120', ringW: 2});
    });
    p.text(freeSpeedRpm(v) / 2, stallTorque(v) / 2 + 0.013, 'max power', {
      color: '#2fd3c0',
      font: '11px ui-monospace, monospace',
      align: 'center',
    });

    if (roSpeed.current) roSpeed.current.textContent = Math.round(wOp * RAD_TO_RPM) + ' RPM';
    if (roCurr.current) {
      roCurr.current.textContent = current.toFixed(1) + ' A';
      roCurr.current.style.color = current > 8 ? '#ff6f9c' : '#fff';
    }
    if (roPout.current) roPout.current.textContent = pOut.toFixed(1) + ' W';
    if (roEff.current) roEff.current.textContent = (eff * 100).toFixed(0) + ' %';
    if (roHeat.current) roHeat.current.textContent = heat.toFixed(1) + ' W';
    if (roState.current) {
      roState.current.textContent = stalled ? 'STALLED' : 'running';
      roState.current.style.color = stalled ? '#ff6f9c' : '#5ce08a';
    }
  }

  useRaf(() => draw(), canvas);

  return (
    <Demo title="Torque–speed curve — goBILDA 5000-0002-0117 (MATRIX), 12 V">
      <canvas
        ref={canvas}
        role="img"
        aria-label="Plot of a DC motor torque versus speed curve with the operating point marked."
        className="block w-full rounded-xl bg-[#0b1120]"
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'motor line (applied voltage)'},
          {color: 'rgba(255,255,255,0.5)', label: 'motor line at full 12 V'},
          {color: '#ffc24d', label: 'load (resisting torque)'},
          {color: '#5ce08a', label: 'operating point', dot: true},
        ]}
      />
      <div className="mt-4 grid gap-x-[22px] gap-y-3.5 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <div>
          <Slider label="Applied voltage" value={volts} min={0} max={12} step={0.5} onChange={setVolts} format={(x) => x.toFixed(1) + ' V'} />
          <div className="mt-1 text-[0.74rem] text-[#8294b8]">Lower voltage slides the whole line inward — same slope.</div>
        </div>
        <div>
          <Slider label="Load (resisting torque)" value={load} min={0} max={0.25} step={0.005} onChange={setLoad} format={(x) => x.toFixed(3) + ' N·m'} />
          <div className="mt-1 text-[0.74rem] text-[#8294b8]">Past the stall torque, the motor can&apos;t move it.</div>
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
          Status: <b ref={roState} className="text-white">—</b>
        </span>
      </div>
    </Demo>
  );
}
