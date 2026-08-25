import {describe, expect, it} from 'vitest';
import {
  desaturate,
  kalmanGain,
  mecanumMix,
  scalarKalmanUpdate,
  wrapDegrees,
  wrapRadians,
} from './controlMath';

describe('angle wrapping', () => {
  it('wraps across the +/-180 degree seam to the short turn', () => {
    expect(wrapDegrees(-179 - 179)).toBeCloseTo(2, 10);
    expect(wrapDegrees(179 - -179)).toBeCloseTo(-2, 10);
  });

  it('wraps radians into the shortest signed error', () => {
    expect(wrapRadians((3 * Math.PI) / 2)).toBeCloseTo(-Math.PI / 2, 10);
    expect(wrapRadians(-Math.PI / 2)).toBeCloseTo(-Math.PI / 2, 10);
  });

  it('uses the canonical [-pi, pi) endpoints and normalizes signed zero', () => {
    const inputs = [0, -0, Math.PI, -Math.PI, 3 * Math.PI, -3 * Math.PI];
    const expected = [0, 0, -Math.PI, -Math.PI, -Math.PI, -Math.PI];

    inputs.forEach((input, index) => {
      const result = wrapRadians(input);
      expect(result).toBeCloseTo(expected[index], 12);
      expect(result).toBeGreaterThanOrEqual(-Math.PI);
      expect(result).toBeLessThan(Math.PI);
      expect(Object.is(result, -0)).toBe(false);
    });
  });

  it('keeps every representative angle in range', () => {
    for (let turns = -8; turns <= 8; turns += 1) {
      for (const offset of [-Math.PI, -1.2, 0, 1.2, Math.PI]) {
        const result = wrapRadians(turns * 2 * Math.PI + offset);
        expect(result).toBeGreaterThanOrEqual(-Math.PI);
        expect(result).toBeLessThan(Math.PI);
      }
    }
  });
});

describe('mecanum mixing', () => {
  it('matches the lesson matrix for forward, strafe, and turn', () => {
    expect(mecanumMix(1, 0, 0)).toEqual({fl: 1, fr: 1, bl: 1, br: 1});
    expect(mecanumMix(0, 1, 0)).toEqual({fl: -1, fr: 1, bl: 1, br: -1});
    expect(mecanumMix(0, 0, 1)).toEqual({fl: -1, fr: 1, bl: -1, br: 1});
  });

  it('desaturates without changing wheel-power ratios', () => {
    const scaled = desaturate({fl: 2, fr: -1, bl: 0.5, br: -0.25});
    expect(scaled).toEqual({fl: 1, fr: -0.5, bl: 0.25, br: -0.125});
  });

  it('leaves already-valid wheel powers unchanged', () => {
    expect(desaturate({fl: 0.5, fr: -0.25, bl: 0.1, br: 0.9})).toEqual({
      fl: 0.5,
      fr: -0.25,
      bl: 0.1,
      br: 0.9,
    });
  });
});

describe('scalar Kalman update', () => {
  it('trusts the measurement more when prediction variance is high', () => {
    expect(kalmanGain(9, 1)).toBeCloseTo(0.9, 10);
    expect(kalmanGain(1, 9)).toBeCloseTo(0.1, 10);
  });

  it('moves the estimate by gain times innovation and shrinks variance', () => {
    const out = scalarKalmanUpdate(2, 4, 10, 1);
    expect(out.gain).toBeCloseTo(0.8, 10);
    expect(out.innovation).toBe(8);
    expect(out.estimate).toBeCloseTo(8.4, 10);
    expect(out.variance).toBeCloseTo(0.8, 10);
  });

  it('matches the three-loop scalar lesson sequence with persistent state', () => {
    let estimate = 0;
    let variance = 4;
    for (const measurement of [1.2, 2.1, 2.9]) {
      estimate += 1;
      variance += 1;
      ({estimate, variance} = scalarKalmanUpdate(estimate, variance, measurement, 4));
    }
    expect(estimate).toBeCloseTo(3.02154195, 7);
    expect(variance).toBeCloseTo(1.64172336, 7);
  });

  it('rejects negative variances', () => {
    expect(() => kalmanGain(-1, 1)).toThrow(/non-negative/);
  });
});
