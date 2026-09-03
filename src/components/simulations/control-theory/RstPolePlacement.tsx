import {useRef, useState} from 'react';

import {Trace} from '@site/src/lib/visualization/plot';
import {usePlot, useRaf} from '@site/src/lib/visualization/canvas';
import {Button, Buttons, Controls, Demo, Legend, Readout} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';
import {
  createRstState,
  firstLoopDemandVolts,
  stepPlant,
  stepRst,
  type FirstOrderPlant,
  type RstDesign,
  type RstState,
} from '@site/src/lib/domain/rst';

/** A plausible drivetrain axis: kV = 0.15 V per in/s, kA = 0.03, kS = 1.4 V. */
const PLANT: FirstOrderPlant = {kDc: 1 / 0.15, tau: 0.2, kS: 1.4};

/** Control period. A real FTC loop, not a graphics frame. */
const DT = 0.02;

/** The reference alternates between these so a CHANGE is always a second away. */
const CRUISE = 40;
const SLOW = 15;
const HOLD_SECONDS = 1.6;

interface Controller {
  state: RstState;
  plant: {v: number};
  velocity: Trace;
  volts: Trace;
  /** Loops since the last reference change, and the loops it took to cover 63%. */
  sinceChange: number;
  loopsTo63: number;
  settledAt: number;
}

function makeController(): Controller {
  return {
    state: createRstState(),
    plant: {v: 0},
    velocity: new Trace(1200),
    volts: new Trace(1200),
    sinceChange: 0,
    loopsTo63: 0,
    settledAt: 0,
  };
}

function reference(t: number): number {
  return Math.floor(t / HOLD_SECONDS) % 2 === 0 ? CRUISE : SLOW;
}

export default function RstPolePlacement() {
  const [tauClosedLoop, setTauClosedLoop] = useState(0.08);
  const [tauIntegral, setTauIntegral] = useState(0.4);
  const [supplyVolts, setSupplyVolts] = useState(12);

  const tauClRef = useRef(tauClosedLoop);
  const tauIRef = useRef(tauIntegral);
  const supplyRef = useRef(supplyVolts);
  tauClRef.current = tauClosedLoop;
  tauIRef.current = tauIntegral;
  supplyRef.current = supplyVolts;

  const velocityCanvas = useRef<HTMLCanvasElement | null>(null);
  const voltsCanvas = useRef<HTMLCanvasElement | null>(null);

  const velocityPlot = usePlot(velocityCanvas, {
    height: 250,
    xmin: 0,
    xmax: 6,
    ymin: 0,
    ymax: 50,
    padL: 48,
    xLabel: 'seconds',
    yLabel: 'in/s',
  });
  const voltsPlot = usePlot(voltsCanvas, {
    height: 170,
    xmin: 0,
    xmax: 6,
    ymin: -14,
    ymax: 14,
    padL: 48,
    xLabel: 'seconds',
    yLabel: 'volts',
  });

  const polynomial = useRef<Controller>(makeController());
  const gain = useRef<Controller>(makeController());
  const referenceTrace = useRef(new Trace(1200));
  const sim = useRef({t: 0, lastReference: reference(0)});
  const acc = useRef(0);

  const readouts = {
    polyLoops: useRef<HTMLElement | null>(null),
    gainLoops: useRef<HTMLElement | null>(null),
    demand: useRef<HTMLElement | null>(null),
    saturating: useRef<HTMLElement | null>(null),
  };

  function reset() {
    polynomial.current = makeController();
    gain.current = makeController();
    referenceTrace.current.clear();
    sim.current.t = 0;
    sim.current.lastReference = reference(0);
    acc.current = 0;
  }

  function advance(controller: Controller, design: RstDesign, want: number, changed: boolean) {
    if (changed) {
      controller.sinceChange = 0;
      controller.settledAt = controller.plant.v;
      controller.loopsTo63 = 0;
    }

    const volts = stepRst(
      controller.state,
      want,
      controller.plant.v,
      DT,
      PLANT,
      design,
      supplyRef.current,
    );
    stepPlant(controller.plant, volts, DT, PLANT);

    controller.sinceChange++;
    if (controller.loopsTo63 === 0) {
      const target = controller.settledAt + 0.632 * (want - controller.settledAt);
      const covered =
        want < controller.settledAt ? controller.plant.v <= target : controller.plant.v >= target;
      if (covered) controller.loopsTo63 = controller.sinceChange;
    }

    controller.velocity.push(sim.current.t, controller.plant.v);
    controller.volts.push(sim.current.t, volts);
  }

  function runStep() {
    const want = reference(sim.current.t);
    const changed = want !== sim.current.lastReference;
    sim.current.lastReference = want;

    const shared = {tauClosedLoop: tauClRef.current, tauIntegral: tauIRef.current};
    advance(polynomial.current, {...shared, cancelIntegralPole: true}, want, changed);
    advance(gain.current, {...shared, cancelIntegralPole: false}, want, changed);
    referenceTrace.current.push(sim.current.t, want);
    sim.current.t += DT;
  }

  function draw() {
    const t = sim.current.t;
    const from = Math.max(0, t - 6);
    const to = Math.max(6, t);

    const vp = velocityPlot.current;
    if (vp) {
      vp.setX(from, to);
      vp.setY(0, CRUISE + 12);
      vp.clear();
      vp.grid();
      vp.clip(() => {
        vp.line(referenceTrace.current.points(), {color: '#6f8bff', width: 1.6, dash: [6, 5]});
        vp.line(gain.current.velocity.points(), {color: '#ff6f9c', width: 2.2});
        vp.line(polynomial.current.velocity.points(), {color: '#5ce08a', width: 3});
      });
    }

    const up = voltsPlot.current;
    if (up) {
      const supply = supplyRef.current;
      up.setX(from, to);
      up.setY(-supply - 2, supply + 2);
      up.clear();
      up.grid();
      up.hline(supply, {color: '#ff7a7a', dash: [5, 4], width: 1.4});
      up.hline(-supply, {color: '#ff7a7a', dash: [5, 4], width: 1.4});
      up.clip(() => {
        up.line(gain.current.volts.points(), {color: '#ff6f9c', width: 1.8});
        up.line(polynomial.current.volts.points(), {color: '#ffc24d', width: 2.2});
      });
    }

    if (readouts.polyLoops.current) {
      const loops = polynomial.current.loopsTo63;
      readouts.polyLoops.current.textContent =
        loops > 0 ? `${(loops * DT).toFixed(3)} s` : 'measuring';
    }
    if (readouts.gainLoops.current) {
      const loops = gain.current.loopsTo63;
      readouts.gainLoops.current.textContent =
        loops > 0 ? `${(loops * DT).toFixed(3)} s` : 'measuring';
    }
    if (readouts.demand.current) {
      const demand = firstLoopDemandVolts(
        PLANT,
        {
          tauClosedLoop: tauClRef.current,
          tauIntegral: tauIRef.current,
          cancelIntegralPole: true,
        },
        CRUISE - SLOW,
      );
      readouts.demand.current.textContent = `${demand.toFixed(1)} V`;
    }
    if (readouts.saturating.current) {
      const last = polynomial.current.volts.last();
      const hit = last ? Math.abs(last[1]) >= supplyRef.current - 1e-6 : false;
      readouts.saturating.current.textContent = hit ? 'yes' : 'no';
    }
  }

  useRaf((frameDt: number) => {
    acc.current += Math.min(frameDt, 0.08);
    let n = 0;
    while (acc.current >= DT && n < 80) {
      runStep();
      acc.current -= DT;
      n++;
    }
    draw();
  }, velocityCanvas);

  return (
    <Demo title="Pole placement: the time constant you ask for, and what it costs">
      <canvas
        ref={velocityCanvas}
        role="img"
        aria-label="Velocity against a reference that alternates between 40 and 15 inches per second, comparing an RST controller whose T polynomial cancels the integral pole against one whose T is a plain gain."
        className="block w-full rounded-xl bg-[#0b1120]"
      />
      <canvas
        ref={voltsCanvas}
        role="img"
        aria-label="Commanded volts for the same two controllers, with the supply limit drawn as a dashed line."
        className="mt-2 block w-full rounded-xl bg-[#0b1120]"
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'velocity reference', dot: true},
          {color: '#5ce08a', label: 'T cancels the integral pole'},
          {color: '#ff6f9c', label: 'T is a plain gain'},
          {color: '#ffc24d', label: 'volts commanded (polynomial T)'},
          {color: '#ff7a7a', label: 'supply limit', dot: true},
        ]}
      />
      <Controls>
        <Slider
          label="tauClosedLoop"
          min={0.04}
          max={0.4}
          step={0.01}
          value={tauClosedLoop}
          onChange={(v) => {
            setTauClosedLoop(v);
            reset();
          }}
          format={(v) => `${v.toFixed(2)} s`}
        />
        <Slider
          label="tauIntegral"
          min={0.1}
          max={1.2}
          step={0.05}
          value={tauIntegral}
          onChange={(v) => {
            setTauIntegral(v);
            reset();
          }}
          format={(v) => `${v.toFixed(2)} s`}
        />
        <Slider
          label="Supply"
          min={5}
          max={13}
          step={0.5}
          value={supplyVolts}
          onChange={(v) => {
            setSupplyVolts(v);
            reset();
          }}
          format={(v) => `${v.toFixed(1)} V`}
        />
      </Controls>
      <Buttons>
        <Button onClick={reset}>Reset</Button>
        <Button
          active={tauClosedLoop === 0.08 && tauIntegral === 0.4 && supplyVolts === 12}
          onClick={() => {
            setTauClosedLoop(0.08);
            setTauIntegral(0.4);
            setSupplyVolts(12);
            reset();
          }}>
          A reasonable design
        </Button>
        <Button
          onClick={() => {
            setTauClosedLoop(0.08);
            setTauIntegral(1.2);
            setSupplyVolts(12);
            reset();
          }}>
          Slow the integral pole
        </Button>
        <Button
          onClick={() => {
            setTauClosedLoop(0.04);
            setTauIntegral(0.4);
            setSupplyVolts(7);
            reset();
          }}>
          Ask for more volts than exist
        </Button>
      </Buttons>
      <Readout
        items={[
          [
            'polynomial T reaches 63% in',
            <b key="poly" ref={readouts.polyLoops} className="text-white">
              measuring
            </b>,
          ],
          [
            'plain gain T reaches 63% in',
            <b key="gain" ref={readouts.gainLoops} className="text-white">
              measuring
            </b>,
          ],
          [
            'first-loop demand for this step',
            <b key="demand" ref={readouts.demand} className="text-white">
              0.0 V
            </b>,
          ],
          [
            'saturating',
            <b key="sat" ref={readouts.saturating} className="text-white">
              no
            </b>,
          ],
        ]}
      />
    </Demo>
  );
}
