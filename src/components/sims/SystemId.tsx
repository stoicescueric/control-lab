/* System identification, live. Runs the actual quasistatic ramp test: the
   commanded voltage climbs slowly, the motor (first-order lag + static friction)
   follows, and a sample (velocity, volts) is logged every 0.15 s. The ordinary
   least-squares fit is recomputed as the data arrives, so you watch the kS/kV
   estimate converge onto the true line. Samples taken before the mechanism
   breaks static friction are rejected (gray) — they sit on a different regime
   and would bias the intercept. */

import {useRef, useState} from 'react';
import {usePlot, useRaf} from '@site/src/lib/canvas';
import {Demo, Controls, Buttons, Button, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const TRUE_KS = 0.9; // volts to break friction
const TRUE_KV = 0.035; // volts per rpm
const V_MAX = 12;
const RAMP_RATE = 1.35; // volts per second
const V_AXIS_RPM = 340;
const SAMPLE_DT = 0.15;
const MOVE_THRESHOLD = 6; // rpm below which a sample is rejected

type Sample = [number, number]; // [rpm, volts]

export default function SystemId() {
  const [noiseAmp, setNoiseAmp] = useState(0.5);
  const ctrl = useRef({noiseAmp});
  ctrl.current = {noiseAmp};

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const plotRef = usePlot(canvas, {
    height: 330,
    xmin: 0,
    xmax: V_AXIS_RPM,
    ymin: 0,
    ymax: 13,
    yLabel: 'applied volts',
    xLabel: 'velocity (rpm)',
  });

  const roKs = useRef<HTMLElement | null>(null);
  const roKv = useRef<HTMLElement | null>(null);
  const roN = useRef<HTMLElement | null>(null);
  const roPhase = useRef<HTMLElement | null>(null);

  const st = useRef({
    t: 0,
    sinceSample: 0,
    volts: 0,
    rpm: 0,
    running: true,
    kept: [] as Sample[],
    rejected: [] as Sample[],
    fit: null as null | {kS: number; kV: number},
  });

  function restart() {
    const s = st.current;
    s.t = 0;
    s.sinceSample = 0;
    s.volts = 0;
    s.rpm = 0;
    s.running = true;
    s.kept = [];
    s.rejected = [];
    s.fit = null;
  }

  function refit() {
    const s = st.current;
    if (s.kept.length < 3) return;
    const n = s.kept.length;
    let mv = 0;
    let mV = 0;
    for (const [v, V] of s.kept) {
      mv += v;
      mV += V;
    }
    mv /= n;
    mV /= n;
    let sxy = 0;
    let sxx = 0;
    for (const [v, V] of s.kept) {
      sxy += (v - mv) * (V - mV);
      sxx += (v - mv) * (v - mv);
    }
    if (sxx < 1e-9) return;
    const kV = sxy / sxx;
    s.fit = {kV, kS: mV - kV * mv};
  }

  function step(dt: number) {
    const s = st.current;
    if (!s.running) return;
    s.t += dt;
    s.volts = Math.min(V_MAX, RAMP_RATE * s.t);

    // motor: below kS it doesn't move; above, first-order lag to (V - kS)/kV
    const vss = s.volts > TRUE_KS ? (s.volts - TRUE_KS) / TRUE_KV : 0;
    s.rpm += ((vss - s.rpm) / 0.35) * dt;

    s.sinceSample += dt;
    if (s.sinceSample >= SAMPLE_DT) {
      s.sinceSample = 0;
      const noisyV = s.volts + (Math.random() * 2 - 1) * ctrl.current.noiseAmp;
      const noisyRpm = Math.max(0, s.rpm + (Math.random() * 2 - 1) * 4);
      if (noisyRpm < MOVE_THRESHOLD) s.rejected.push([noisyRpm, noisyV]);
      else s.kept.push([noisyRpm, noisyV]);
      refit();
    }
    if (s.volts >= V_MAX && s.rpm > vss - 2) s.running = false;
  }

  function draw() {
    const p = plotRef.current;
    if (!p) return;
    const s = st.current;

    p.clear();
    p.grid();
    p.clip(() => {
      // true line, always faintly visible
      p.line(
        [
          [0, TRUE_KS],
          [V_AXIS_RPM, TRUE_KS + TRUE_KV * V_AXIS_RPM],
        ],
        {color: '#8294b8', width: 1.5, dash: [3, 7]},
      );
      // rejected (not yet moving) and kept samples
      p.dots(s.rejected, {color: 'rgba(130,148,184,0.5)', r: 3});
      p.dots(s.kept, {color: '#6f8bff', r: 3.5});
      // live least-squares fit
      if (s.fit) {
        p.line(
          [
            [0, s.fit.kS],
            [V_AXIS_RPM, s.fit.kS + s.fit.kV * V_AXIS_RPM],
          ],
          {color: '#ffc24d', width: 3},
        );
        p.dot(0, s.fit.kS, {color: '#5ce08a', r: 6, ring: '#0b1120', ringW: 2});
      }
      // the ramp's live operating point
      if (s.running) {
        p.dot(s.rpm, s.volts, {color: '#e8eefc', r: 5, ring: '#6f8bff', ringW: 2});
      }
    });
    if (s.fit) {
      p.text(8, s.fit.kS + 0.55, `kS ≈ ${s.fit.kS.toFixed(2)} V`, {
        color: '#5ce08a',
        font: '12px ui-monospace, monospace',
      });
    }
    if (s.running) {
      p.text(V_AXIS_RPM - 8, 12.4, `ramping… ${s.volts.toFixed(1)} V`, {
        color: '#8294b8',
        align: 'right',
        font: '11px ui-monospace, monospace',
      });
    }

    if (roKs.current) {
      roKs.current.textContent = s.fit ? `${s.fit.kS.toFixed(2)} / ${TRUE_KS.toFixed(2)} V` : '—';
    }
    if (roKv.current) {
      roKv.current.textContent = s.fit ? `${s.fit.kV.toFixed(4)} / ${TRUE_KV.toFixed(4)}` : '—';
    }
    if (roN.current) {
      roN.current.textContent = `${s.kept.length} kept, ${s.rejected.length} rejected`;
    }
    if (roPhase.current) {
      roPhase.current.textContent = s.running ? 'ramp running' : 'test complete';
      roPhase.current.style.color = s.running ? '#ffc24d' : '#5ce08a';
    }
  }

  useRaf((frameDt: number) => {
    step(Math.min(frameDt, 0.1));
    draw();
  }, canvas);

  return (
    <Demo title="System identification — run the ramp, watch the fit converge">
      <canvas
        ref={canvas}
        role="img"
        aria-label="Animated quasistatic ramp test: voltage-velocity samples appear live and a least-squares line fits them."
        className="block w-full rounded-xl bg-[#0b1120]"
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'ramp samples (v, V)', dot: true},
          {color: 'rgba(130,148,184,0.6)', label: 'rejected — not yet moving', dot: true},
          {color: '#ffc24d', label: 'least-squares fit (live)'},
          {color: '#8294b8', label: 'true line'},
          {color: '#5ce08a', label: 'intercept = kS', dot: true},
        ]}
      />

      <Controls>
        <Slider label="Measurement noise" min={0} max={2} step={0.1} value={noiseAmp} onChange={setNoiseAmp} format={(v) => `${v.toFixed(1)} V`} />
      </Controls>
      <Buttons>
        <Button primary onClick={restart}>
          ▶ Run a new test
        </Button>
        <Button
          onClick={() => {
            setNoiseAmp(0.5);
            restart();
          }}>
          ↺ Reset
        </Button>
      </Buttons>
      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>
          kS (fit / true): <b ref={roKs} className="text-white">—</b>
        </span>
        <span>
          kV (fit / true): <b ref={roKv} className="text-white">—</b>
        </span>
        <span>
          Samples: <b ref={roN} className="text-white">—</b>
        </span>
        <span>
          Status: <b ref={roPhase} className="text-white">—</b>
        </span>
      </div>
    </Demo>
  );
}
