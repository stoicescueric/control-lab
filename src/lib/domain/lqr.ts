/* Scalar LQR gain (state-space module).
   ------------------------------------------------------------------
   For a one-state plant dx/dt = a*x + b*u with cost J = ∫ (Q x² + R u²) dt,
   the continuous algebraic Riccati equation 2aP - b²P²/R + Q = 0 collapses to
   a quadratic in P, and the optimal gain K = P b / R simplifies to a closed
   form. LqrExplorer (docs/state-space-control/lqr.mdx) computes this live as
   the reader drags the Q/R sliders, so the formula lives here once, tested,
   instead of only inline in React.

   Source: docs/state-space-control/lqr.mdx, docs/state-space-control/state-feedback.mdx. */

/**
 * Optimal state-feedback gain for a scalar plant dx/dt = a*x + b*u under the
 * quadratic cost J = ∫ (Q x² + R u²) dt.
 *
 * K = (a + sqrt(a² + b²·Q/R)) / b
 */
export function scalarLqrGain(a: number, b: number, Q: number, R: number): number {
  return (a + Math.sqrt(a * a + (b * b * Q) / R)) / b;
}
