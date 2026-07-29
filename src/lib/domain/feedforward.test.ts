import {describe, expect, it} from 'vitest';
import {armFeedforward, motorFeedforward} from './feedforward';

describe('motorFeedforward', () => {
  it('omits the kS term entirely at v = 0 (no spurious static-friction kick at rest)', () => {
    const kS = 0.7;
    const kV = 2.4;
    const kA = 0.5;
    const acceleration = 1.2;
    expect(motorFeedforward(kS, kV, kA, 0, acceleration)).toBeCloseTo(kA * acceleration, 12);
  });

  it('adds +kS when velocity is positive', () => {
    const kS = 0.7;
    const kV = 2.4;
    const kA = 0.5;
    const v = 3;
    const a = 0;
    expect(motorFeedforward(kS, kV, kA, v, a)).toBeCloseTo(kS + kV * v, 12);
  });

  it('flips to -kS when velocity is negative', () => {
    const kS = 0.7;
    const kV = 2.4;
    const kA = 0.5;
    const v = -3;
    const a = 0;
    expect(motorFeedforward(kS, kV, kA, v, a)).toBeCloseTo(-kS + kV * v, 12);
  });
});

describe('armFeedforward', () => {
  it('returns the full kG term when the arm is horizontal (angle = 0)', () => {
    const kG = 1.3;
    const result = armFeedforward(0, 0, 0, kG, 0, 0, 0);
    expect(result).toBeCloseTo(kG, 12);
  });

  it('returns ~0 gravity term when the arm is vertical (angle = 90deg)', () => {
    const kG = 1.3;
    const result = armFeedforward(0, 0, 0, kG, Math.PI / 2, 0, 0);
    expect(result).toBeCloseTo(0, 9);
  });

  it('omits the kS term at zero angular velocity', () => {
    const kS = 0.5;
    const kG = 1.3;
    const result = armFeedforward(kS, 0, 0, kG, 0, 0, 0);
    expect(result).toBeCloseTo(kG, 12);
  });

  it('applies signed kS, kV, and kA terms together', () => {
    const kS = 0.5;
    const kV = 0.2;
    const kA = 0.1;
    const kG = 1.3;
    const angle = Math.PI / 4;
    const omega = -2;
    const alpha = 3;
    const expected = kS * -1 + kG * Math.cos(angle) + kV * omega + kA * alpha;
    expect(armFeedforward(kS, kV, kA, kG, angle, omega, alpha)).toBeCloseTo(expected, 12);
  });
});
