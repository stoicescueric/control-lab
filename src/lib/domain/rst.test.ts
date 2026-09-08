import {describe, expect, it} from 'vitest';
import {
  createRstState,
  firstLoopDemandVolts,
  solveRst,
  stepPlant,
  stepRst,
  type FirstOrderPlant,
  type RstDesign,
} from './rst';

// A plausible FTC drivetrain axis: about 67 in/s per volt of net drive, a fifth of
// a second of lag, and a volt and a half to break away.
const PLANT: FirstOrderPlant = {kDc: 1 / 0.15, tau: 0.2, kS: 1.4};
const DT = 0.02;

function design(overrides: Partial<RstDesign> = {}): RstDesign {
  return {tauClosedLoop: 0.08, tauIntegral: 0.4, cancelIntegralPole: true, ...overrides};
}

/** Runs a step response and returns the velocity history, one entry per loop. */
function stepResponse(d: RstDesign, reference: number, loops: number, voltLimit = 12): number[] {
  const state = createRstState();
  const plant = {v: 0};
  const history: number[] = [];
  for (let i = 0; i < loops; i++) {
    const volts = stepRst(state, reference, plant.v, DT, PLANT, d, voltLimit);
    stepPlant(plant, volts, DT, PLANT);
    history.push(plant.v);
  }
  return history;
}

/**
 * Settles at one reference, then steps to another and counts the loops to cover
 * 63% of the change.
 *
 * The settling matters. A reference held from rest never steps at all, because
 * priming reads the first loop as already being at the reference, and for a
 * constant reference the two forms of T are algebraically identical:
 * `t0_poly (1 - p2)` is exactly `t0_gain`. The difference between them only
 * exists on a reference CHANGE, which is why measuring from rest shows nothing.
 */
function settleThenStep(
  d: RstDesign,
  from: number,
  to: number,
  plant: FirstOrderPlant = PLANT,
  voltLimit = 12,
): {settled: number; loops: number; peakVolts: number} {
  const state = createRstState();
  const p = {v: 0};
  for (let i = 0; i < 400; i++) {
    stepPlant(p, stepRst(state, from, p.v, DT, plant, d, voltLimit), DT, plant);
  }
  const settled = p.v;
  const target = settled + 0.632 * (to - settled);
  let loops = 0;
  let peakVolts = 0;
  while (loops < 400) {
    const volts = stepRst(state, to, p.v, DT, plant, d, voltLimit);
    peakVolts = Math.max(peakVolts, Math.abs(volts));
    stepPlant(p, volts, DT, plant);
    loops++;
    if (to < settled ? p.v <= target : p.v >= target) break;
  }
  return {settled, loops, peakVolts};
}

describe('solveRst', () => {
  it('satisfies the Diophantine equation it was derived from', () => {
    const k = solveRst(PLANT, design(), DT);
    // A*S + B*R must equal A_cl coefficient by coefficient, with
    // A*S = 1 - (1+a) q^-1 + a q^-2 and B*R = b r0 q^-1 + b r1 q^-2.
    const alpha1 = -(k.p1 + k.p2);
    const alpha2 = k.p1 * k.p2;
    expect(-(1 + k.a) + k.b * k.r0).toBeCloseTo(alpha1, 10);
    expect(k.a + k.b * k.r1).toBeCloseTo(alpha2, 10);
  });

  it('describes the plant it was given', () => {
    const k = solveRst(PLANT, design(), DT);
    expect(k.a).toBeCloseTo(Math.exp(-DT / PLANT.tau), 12);
    expect(k.b).toBeCloseTo(PLANT.kDc * (1 - k.a), 12);
  });

  it('refuses to place a pole faster than four loop periods', () => {
    const absurd = solveRst(PLANT, design({tauClosedLoop: 0.0001}), DT);
    const floored = solveRst(PLANT, design({tauClosedLoop: 4 * DT}), DT);
    expect(absurd.p1).toBeCloseTo(floored.p1, 12);
  });

  it('recomputes with the loop period rather than assuming one', () => {
    const fast = solveRst(PLANT, design(), 0.01);
    const slow = solveRst(PLANT, design(), 0.05);
    expect(fast.a).toBeGreaterThan(slow.a);
    expect(fast.r0).not.toBeCloseTo(slow.r0, 3);
  });

  it('rejects invalid timing and an unsolvable plant gain', () => {
    expect(() => solveRst(PLANT, design(), Number.NaN)).toThrow(RangeError);
    expect(() => solveRst(PLANT, design(), -DT)).toThrow(RangeError);
    expect(() => solveRst({...PLANT, kDc: 0}, design(), DT)).toThrow(RangeError);
    expect(() => solveRst(PLANT, design({tauIntegral: Number.NaN}), DT)).toThrow(RangeError);
  });
});

describe('closed-loop behaviour', () => {
  it('reaches the reference it was given', () => {
    const history = stepResponse(design(), 30, 300);
    expect(history[history.length - 1]).toBeCloseTo(30, 0);
  });

  it('gets there without overshooting, because both poles are real', () => {
    const history = stepResponse(design(), 30, 300);
    expect(Math.max(...history)).toBeLessThan(30 * 1.02);
  });

  it('cannot break static friction on its own, which is why kS is fed forward', () => {
    // The linear design knows nothing about kS, and priming means the first loop
    // is not read as a step, so the opening command is a fraction of breakaway.
    // The lesson feeds kS forward for exactly this reason; the model does not
    // pretend otherwise.
    const state = createRstState();
    const first = stepRst(state, 30, 0, DT, PLANT, design(), 12);
    expect(Math.abs(first)).toBeLessThan(PLANT.kS);
  });

  it('tracks a reference change in about the time constant it was asked for', () => {
    // tauClosedLoop is 0.08s, which is four loops at this dt. Allowing twice that
    // still fails by a wide margin if the integral pole is in the reference path.
    const {loops} = settleThenStep(design(), 30, 10);
    expect(loops).toBeLessThanOrEqual(8);
  });

  it('is held back by the integral pole when T is a plain gain', () => {
    const polynomial = settleThenStep(design(), 30, 10).loops;
    const gain = settleThenStep(design({cancelIntegralPole: false}), 30, 10).loops;
    // The lesson's least obvious claim, so the one worth pinning: same poles, same
    // plant, several times slower to answer a change of reference.
    expect(gain).toBeGreaterThanOrEqual(polynomial * 4);
  });

  it('shows that difference on a frictionless plant too, so it is the design not the friction', () => {
    const ideal: FirstOrderPlant = {...PLANT, kS: 0};
    const polynomial = settleThenStep(design(), 30, 10, ideal).loops;
    const gain = settleThenStep(design({cancelIntegralPole: false}), 30, 10, ideal).loops;
    expect(polynomial).toBeLessThanOrEqual(8);
    expect(gain).toBeGreaterThanOrEqual(polynomial * 4);
  });

  it('never commands more than the supply, however hard it is pushed', () => {
    const state = createRstState();
    const plant = {v: 0};
    for (let i = 0; i < 400; i++) {
      const volts = stepRst(state, 400, plant.v, DT, PLANT, design(), 12);
      expect(Math.abs(volts)).toBeLessThanOrEqual(12 + 1e-9);
      stepPlant(plant, volts, DT, PLANT);
    }
  });

  it('comes back promptly from saturation instead of unwinding a stored command', () => {
    const state = createRstState();
    const plant = {v: 0};
    for (let i = 0; i < 300; i++) {
      stepPlant(plant, stepRst(state, 400, plant.v, DT, PLANT, design(), 12), DT, PLANT);
    }
    const saturatedSpeed = plant.v;
    let loops = 0;
    while (plant.v > 21 && loops < 200) {
      stepPlant(plant, stepRst(state, 20, plant.v, DT, PLANT, design(), 12), DT, PLANT);
      loops++;
    }
    expect(saturatedSpeed).toBeGreaterThan(30);
    expect(loops).toBeLessThan(60);
  });

  it('holds the previous command when the plant cannot be solved', () => {
    const state = createRstState();
    state.previousOutput = 3.5;
    state.primed = true;
    expect(stepRst(state, 30, 10, DT, {...PLANT, kDc: 0}, design(), 12)).toBe(3.5);
    expect(stepRst(state, 30, 10, Number.NaN, PLANT, design(), 12)).toBe(3.5);
  });
});

describe('stepPlant', () => {
  it('does not move below breakaway', () => {
    const plant = {v: 0};
    stepPlant(plant, PLANT.kS * 0.9, DT, PLANT);
    expect(plant.v).toBe(0);
  });

  it('settles at the velocity the plant model predicts', () => {
    const plant = {v: 0};
    for (let i = 0; i < 500; i++) stepPlant(plant, 6, DT, PLANT);
    expect(plant.v).toBeCloseTo((6 - PLANT.kS) * PLANT.kDc, 1);
  });
});

describe('firstLoopDemandVolts', () => {
  it('uses the same discrete coefficient as the controller', () => {
    const d = design({tauClosedLoop: 0.1});
    const expected = solveRst(PLANT, d, DT).t0 * 40;
    expect(firstLoopDemandVolts(PLANT, d, 40, DT)).toBeCloseTo(expected, 12);
  });

  it('honours the controller floor of four loop periods', () => {
    const floored = firstLoopDemandVolts(PLANT, design({tauClosedLoop: 4 * DT}), 40, DT);
    const tooFast = firstLoopDemandVolts(PLANT, design({tauClosedLoop: 0.0001}), 40, DT);
    expect(tooFast).toBeCloseTo(floored, 12);
  });

  it('matches the exact discrete value in the worked example', () => {
    expect(firstLoopDemandVolts(PLANT, design({tauClosedLoop: 0.1}), 40, DT)).toBeCloseTo(
      11.429,
      3,
    );
  });
});
