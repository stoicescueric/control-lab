/* Glide-braking kinematics used by predictive-stop controllers: the signed
   distance a robot coasts before stopping under a bounded deceleration, and
   its inverse, the reference braking curve v = sqrt(2*a*d). Matches
   docs/path-following/predictive-braking-style lessons and
   src/components/simulations/path-following/PredictiveBraking.tsx. */

/**
 * Predicted signed stopping distance: v*|v| / (2*decel).
 *
 * Using |v| instead of v keeps the result signed the same way as `velocity`
 * (negative-direction travel predicts a negative-direction stop), while still
 * squaring the magnitude for the standard v^2 = 2*a*d relation. `deceleration`
 * must be strictly positive (callers typically bound it away from zero, e.g.
 * a slider minimum) or the result is +/-Infinity or NaN.
 */
export function predictedStoppingDistance(velocity: number, deceleration: number): number {
  return (velocity * Math.abs(velocity)) / (2 * deceleration);
}

/**
 * Inverse reference curve: the braking-limit speed sqrt(2*decel*distance) for
 * a non-negative `distance`. This is the unsigned v(d) curve a controller
 * should ride to stop exactly at `distance` under `deceleration`.
 *
 * `distance` is expected to be >= 0; a negative distance returns NaN (no real
 * speed brakes you to a point behind where you already are).
 */
export function brakingVelocityForDistance(distance: number, deceleration: number): number {
  return Math.sqrt(2 * deceleration * distance);
}
