/* Predictive voltage models for velocity mechanisms and gravity-loaded arms.
   Matches docs/control-theory/feedforward.mdx and WPILib's
   SimpleMotorFeedforward / ArmFeedforward exactly, including the sign
   convention: Math.sign(0) === 0, so no static-friction term is added when
   the commanded velocity is exactly zero (a mechanism at rest should not
   receive a spurious kS kick). */

/**
 * V = kS*sign(velocity) + kV*velocity + kA*acceleration
 *
 * Mirrors WPILib's SimpleMotorFeedforward#calculate(velocity, acceleration).
 */
export function motorFeedforward(kS: number, kV: number, kA: number, velocity: number, acceleration: number): number {
  return kS * Math.sign(velocity) + kV * velocity + kA * acceleration;
}

/**
 * V = kS*sign(angularVelocity) + kG*cos(angleFromHorizontal) + kV*angularVelocity + kA*angularAcceleration
 *
 * `angleFromHorizontal` is radians, 0 = horizontal (matches WPILib's ArmFeedforward
 * convention and docs/control-theory/feedforward.mdx). Mirrors WPILib's
 * ArmFeedforward#calculate(angle, velocity, acceleration).
 */
export function armFeedforward(
  kS: number,
  kV: number,
  kA: number,
  kG: number,
  angleFromHorizontal: number,
  angularVelocity: number,
  angularAcceleration: number,
): number {
  return kS * Math.sign(angularVelocity) + kG * Math.cos(angleFromHorizontal) + kV * angularVelocity + kA * angularAcceleration;
}
