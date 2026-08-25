import {describe, expect, it} from 'vitest';
import {scalarDiscreteLqr, scalarLqrGain} from './lqr';
import {discretizeScalarPlant} from './stateSpace';

describe('scalarLqrGain', () => {
  it('rejects invalid plant and cost domains', () => {
    expect(() => scalarLqrGain(0, 0, 1, 1)).toThrow(/b nonzero/);
    expect(() => scalarLqrGain(0, 1, -1, 1)).toThrow(/non-negative/);
    expect(() => scalarLqrGain(0, 1, 1, 0)).toThrow(/R positive/);
    expect(() => scalarLqrGain(Number.NaN, 1, 1, 1)).toThrow(/finite/);
    expect(() => scalarLqrGain(0, 1, 1, Number.POSITIVE_INFINITY)).toThrow(/finite/);
  });

  it('collapses to K = sqrt(Q/R) for a=0, b=1, matching the hand-solved Riccati equation', () => {
    // dx/dt = u, cost = Q x^2 + R u^2. Riccati: -P^2/R + Q = 0 => P = sqrt(Q R),
    // K = P b / R = sqrt(Q R) / R = sqrt(Q / R). Independent of the formula
    // under test, so this checks the implementation against a hand derivation.
    expect(scalarLqrGain(0, 1, 4, 1)).toBeCloseTo(2, 10); // sqrt(4/1)
    expect(scalarLqrGain(0, 1, 9, 1)).toBeCloseTo(3, 10); // sqrt(9/1)
    expect(scalarLqrGain(0, 1, 1, 4)).toBeCloseTo(0.5, 10); // sqrt(1/4)
  });

  it('matches the worked flywheel example from docs/state-space-control/lqr.mdx', () => {
    // kV = 0.02, kA = 0.005 => a = -kV/kA = -4, b = 1/kA = 200.
    // Bryson's rule with the explorer's defaults: tolerable error 8 rad/s,
    // available effort 12 V => Q = 1/64, R = 1/144.
    const a = -4;
    const b = 200;
    const Q = 1 / 64;
    const R = 1 / 144;
    // Hand-computed: K = (a + sqrt(a^2 + b^2 * Q/R)) / b
    //   b^2 * Q/R = 40000 * 2.25 = 90000; a^2 = 16; sum = 90016
    //   sqrt(90016) ~= 300.0266655; K = (300.0266655 - 4) / 200 ~= 1.4801333
    expect(scalarLqrGain(a, b, Q, R)).toBeCloseTo(1.4801333, 6);
  });

  it('increases the gain as Q (error penalty) grows, holding a, b, R fixed', () => {
    const a = -4;
    const b = 200;
    const R = 1 / 144;
    const kSmallQ = scalarLqrGain(a, b, 1 / 40, R); // loose tolerance -> small Q
    const kBigQ = scalarLqrGain(a, b, 1 / 4, R); // tight tolerance -> big Q
    expect(kBigQ).toBeGreaterThan(kSmallQ);
  });

  it('decreases the gain as R (effort penalty) grows, holding a, b, Q fixed', () => {
    const a = -4;
    const b = 200;
    const Q = 1 / 64;
    const kBigR = scalarLqrGain(a, b, Q, 1 / 4); // small volt budget -> big R -> smaller gain
    const kSmallR = scalarLqrGain(a, b, Q, 1 / 144); // large volt budget -> small R -> bigger gain
    expect(kSmallR).toBeGreaterThan(kBigR);
  });
});

describe('scalarDiscreteLqr', () => {
  it('rejects invalid sampled plants and costs', () => {
    expect(() => scalarDiscreteLqr(1, 0, 1, 1)).toThrow(/bd nonzero/);
    expect(() => scalarDiscreteLqr(1, 1, -1, 1)).toThrow(/non-negative/);
    expect(() => scalarDiscreteLqr(1, 1, 1, 0)).toThrow(/R positive/);
    expect(() => scalarDiscreteLqr(Number.NaN, 1, 1, 1)).toThrow(/finite/);
  });

  it('matches the documented exact-ZOH 20 ms flywheel design and is sampled-stable', () => {
    const {ad, bd} = discretizeScalarPlant(-4, 200, 0.020);
    const result = scalarDiscreteLqr(ad, bd, 1 / 64, 1 / 144);
    expect(ad).toBeCloseTo(0.9231163464, 10);
    expect(bd).toBeCloseTo(3.8441826807, 10);
    expect(result.riccati).toBeCloseTo(0.0160140286, 10);
    expect(result.gain).toBeCloseTo(0.2332875778, 10);
    expect(result.closedLoopPole).toBeCloseTo(0.0263162803, 10);
    expect(Math.abs(result.closedLoopPole)).toBeLessThan(1);
  });

  it('shows why the continuous gain must not be dropped into the 20 ms loop', () => {
    const {ad, bd} = discretizeScalarPlant(-4, 200, 0.020);
    const continuousGain = scalarLqrGain(-4, 200, 1 / 64, 1 / 144);
    expect(Math.abs(ad - bd * continuousGain)).toBeGreaterThan(1);
  });

  it('becomes more aggressive when the sampled error weight grows', () => {
    const {ad, bd} = discretizeScalarPlant(-4, 200, 0.020);
    const loose = scalarDiscreteLqr(ad, bd, 1 / 40 ** 2, 1 / 12 ** 2);
    const tight = scalarDiscreteLqr(ad, bd, 1 / 4 ** 2, 1 / 12 ** 2);
    expect(tight.gain).toBeGreaterThan(loose.gain);
  });
});
