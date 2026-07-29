import {describe, expect, it} from 'vitest';
import {evalSpline, moments} from './naturalCubicSpline';

describe('moments', () => {
  it('solves the known three-point case [0, 1, 0] by hand', () => {
    // Natural BC forces M0 = M2 = 0. Interior equation: 4*M1 = 6*(y2 - 2y1 + y0)
    // = 6*(0 - 2 + 0) = -12, so M1 = -3.
    const M = moments([0, 1, 0]);
    expect(M[0]).toBeCloseTo(0, 12);
    expect(M[1]).toBeCloseTo(-3, 12);
    expect(M[2]).toBeCloseTo(0, 12);
  });

  it('returns all zeros for the degenerate n < 3 cases', () => {
    expect(moments([])).toEqual([]);
    expect(moments([5])).toEqual([0]);
    expect(moments([1, 7])).toEqual([0, 0]);
  });
});

describe('evalSpline', () => {
  it('reproduces the hand-verified [0, 1, 0] spline at a mid-segment point', () => {
    const Y = [0, 1, 0];
    const M = moments(Y);
    // First segment: v(u) = -0.5*u^3 + 1.5*u (derived from M0=0, M1=-3, Y0=0, Y1=1).
    const at0_5 = evalSpline(Y, M, 0.5);
    expect(at0_5.v).toBeCloseTo(0.6875, 12);
  });

  it('passes through every knot exactly', () => {
    const Y = [3, -2, 5, 1, 4];
    const M = moments(Y);
    Y.forEach((y, i) => {
      expect(evalSpline(Y, M, i).v).toBeCloseTo(y, 9);
    });
  });

  it('reduces to linear interpolation for the n = 2 degenerate case', () => {
    const Y = [0, 10];
    const M = moments(Y);
    expect(evalSpline(Y, M, 0).v).toBeCloseTo(0, 12);
    expect(evalSpline(Y, M, 0.5).v).toBeCloseTo(5, 12);
    expect(evalSpline(Y, M, 1).v).toBeCloseTo(10, 12);
    // A straight line has zero curvature everywhere.
    expect(evalSpline(Y, M, 0.5).dd).toBeCloseTo(0, 12);
  });

  it('has ~0 curvature at both endpoints for the natural boundary condition', () => {
    const Y = [3, -2, 5, 1, 4, 8];
    const M = moments(Y);
    const n = Y.length;
    expect(evalSpline(Y, M, 0).dd).toBeCloseTo(0, 9);
    expect(evalSpline(Y, M, n - 1).dd).toBeCloseTo(0, 9);
  });
});
