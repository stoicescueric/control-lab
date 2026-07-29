import {describe, expect, it} from 'vitest';
import {scalarLqrGain} from './lqr';

describe('scalarLqrGain', () => {
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
