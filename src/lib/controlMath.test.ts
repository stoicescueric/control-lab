import {describe, expect, it} from 'vitest';
import {
  desaturate,
  kalmanGain,
  mecanumMix,
  poseExponential,
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

  it('rejects negative variances', () => {
    expect(() => kalmanGain(-1, 1)).toThrow(/non-negative/);
  });
});

describe('pose exponential', () => {
  it('uses the straight-line limit for tiny heading changes', () => {
    expect(poseExponential(3, -2, 0)).toEqual({x: 3, y: -2, theta: 0});
  });

  it('maps a forward arc into the SE(2) closed form', () => {
    const delta = poseExponential(10, 0, Math.PI / 2);
    expect(delta.x).toBeCloseTo(20 / Math.PI, 10);
    expect(delta.y).toBeCloseTo(20 / Math.PI, 10);
    expect(delta.theta).toBeCloseTo(Math.PI / 2, 10);
  });
});
