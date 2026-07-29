// Natural cubic spline through uniformly spaced knots (h = 1), solved via the
// Thomas algorithm for the tridiagonal system of second derivatives ("moments").
// Used to interpolate a sequence of waypoints parametrized by index t = 0..n-1,
// independently in each coordinate (see NaturalCubicSpline.tsx).

export interface SplineSample {
  v: number;
  d: number;
  dd: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Second derivatives (moments) M_i for a natural cubic spline through `y`,
 * with unit knot spacing. Natural boundary conditions: M[0] = M[n-1] = 0.
 * Returns an all-zero array for n < 3 (no interior points to solve for).
 */
export function moments(y: number[]): number[] {
  const n = y.length;
  if (n < 3) return new Array(n).fill(0);
  const diag = new Array(n).fill(0);
  const sup = new Array(n).fill(0);
  const sub = new Array(n).fill(0);
  const rhs = new Array(n).fill(0);
  diag[0] = diag[n - 1] = 1; // natural boundary: M0 = M(n-1) = 0
  for (let i = 1; i < n - 1; i++) {
    sub[i] = 1;
    diag[i] = 4;
    sup[i] = 1;
    rhs[i] = 6 * (y[i + 1] - 2 * y[i] + y[i - 1]);
  }
  for (let i = 1; i < n; i++) {
    const m = sub[i] / diag[i - 1];
    diag[i] -= m * sup[i - 1];
    rhs[i] -= m * rhs[i - 1];
  }
  const M = new Array(n).fill(0);
  M[n - 1] = rhs[n - 1] / diag[n - 1];
  for (let i = n - 2; i >= 0; i--) M[i] = (rhs[i] - sup[i] * M[i + 1]) / diag[i];
  return M;
}

/**
 * Value, first and second derivative of the spline defined by knot values
 * `Y` and moments `M` (from `moments(Y)`), evaluated at global parameter `t`
 * (t = 0 at the first knot, t = n - 1 at the last).
 */
export function evalSpline(Y: number[], M: number[], t: number): SplineSample {
  const n = Y.length;
  const i = clamp(Math.floor(t), 0, n - 2);
  const u = t - i;
  const A = 1 - u;
  const B = u;
  const v = (M[i] * A ** 3 + M[i + 1] * B ** 3) / 6 + (Y[i] - M[i] / 6) * A + (Y[i + 1] - M[i + 1] / 6) * B;
  const d = (-M[i] * A * A + M[i + 1] * B * B) / 2 + (Y[i + 1] - Y[i]) - (M[i + 1] - M[i]) / 6;
  const dd = M[i] * A + M[i + 1] * B;
  return {v, d, dd};
}
