/* Scalar LQR gain (state-space module).
   ------------------------------------------------------------------
   For a one-state plant dx/dt = a*x + b*u with cost J = ∫ (Q x² + R u²) dt,
   the continuous algebraic Riccati equation 2aP - b²P²/R + Q = 0 collapses to
   a quadratic in P, and the optimal gain K = P b / R simplifies to a closed
   form. The same module also exposes the stabilizing scalar discrete-time
   Riccati solution used by LqrExplorer (docs/state-space-control/lqr.mdx), so
   both formulas live here once, tested, instead of only inline in React.

   Source: docs/state-space-control/lqr.mdx, docs/state-space-control/state-feedback.mdx. */

/**
 * Optimal state-feedback gain for a scalar plant dx/dt = a*x + b*u under the
 * quadratic cost J = ∫ (Q x² + R u²) dt.
 *
 * K = (a + sqrt(a² + b²·Q/R)) / b
 */
export function scalarLqrGain(a: number, b: number, Q: number, R: number): number {
  if (![a, b, Q, R].every(Number.isFinite) || b === 0 || Q < 0 || R <= 0) {
    throw new Error('LQR inputs must be finite, with b nonzero, Q non-negative, and R positive');
  }
  return (a + Math.sqrt(a * a + (b * b * Q) / R)) / b;
}

export interface ScalarDiscreteLqrResult {
  gain: number;
  riccati: number;
  closedLoopPole: number;
}

/**
 * Infinite-horizon LQR for x[k+1] = ad*x[k] + bd*u[k] and
 * sum(Q*x[k]^2 + R*u[k]^2). Uses the stabilizing positive scalar DARE root.
 */
export function scalarDiscreteLqr(
  ad: number,
  bd: number,
  Q: number,
  R: number,
): ScalarDiscreteLqrResult {
  if (![ad, bd, Q, R].every(Number.isFinite) || bd === 0 || Q < 0 || R <= 0) {
    throw new Error(
      'Discrete LQR inputs must be finite, with bd nonzero, Q non-negative, and R positive',
    );
  }
  const bd2 = bd * bd;
  const linear = R * (1 - ad * ad) - Q * bd2;
  const discriminant = linear * linear + 4 * bd2 * Q * R;
  const riccati = (-linear + Math.sqrt(discriminant)) / (2 * bd2);
  const gain = (ad * bd * riccati) / (R + bd2 * riccati);
  return {gain, riccati, closedLoopPole: ad - bd * gain};
}
