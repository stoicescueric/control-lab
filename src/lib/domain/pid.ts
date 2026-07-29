export interface PidGains {
  kp: number;
  ki: number;
  kd: number;
}

export interface SaturatingPidPlantConfig {
  /** Measured loop time in seconds. */
  dt: number;
  gains: PidGains;
  /** Symmetric clamp, in output volts, on the integral contribution K_i * I. */
  integralLimitVolts: number;
  /** Simple first-order plant: acceleration = plantGain * output - damping * velocity. */
  plantGain: number;
  damping: number;
}

export interface SaturatingPidPlantState {
  /** Plant position. */
  x: number;
  /** Plant velocity. */
  v: number;
  /** Stored integral of error, in error*time units (not yet multiplied by K_i). */
  integral: number;
  /** Unsaturated PID command, in volts. */
  raw: number;
  /** Saturated command actually applied to the plant, in volts. */
  out: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Advances a saturating PID position controller and its first-order plant by one loop.
 *
 * Matches the `SaturatingPidController` sample in
 * `docs/control-theory/actuator-saturation-anti-windup.mdx`: the integral recurrence
 * `I_{k+1} = I_k + e_k * dt`, a clamp of `K_i * integral` to +-`integralLimitVolts` with
 * back-computation of the stored integral, and conditional integration that freezes the
 * integral once the unsaturated command would push further into the actuator limit in the
 * direction of the current error.
 *
 * When `antiWindup` is false, neither the integrator clamp nor conditional integration is
 * applied, so the stored integral is free to wind up while the output is still saturated to
 * `voltageLimit`.
 *
 * Mutates `state` in place to match the caller's per-frame simulation loop.
 */
export function stepSaturatingPidPlant(
  state: SaturatingPidPlantState,
  target: number,
  voltageLimit: number,
  antiWindup: boolean,
  config: SaturatingPidPlantConfig,
): void {
  const {dt, gains, integralLimitVolts, plantGain, damping} = config;
  const {kp, ki, kd} = gains;

  const error = target - state.x;
  let nextIntegral = state.integral + error * dt;

  if (antiWindup) {
    const integralContribution = ki * nextIntegral;
    const limitedContribution = clamp(integralContribution, -integralLimitVolts, integralLimitVolts);
    nextIntegral = ki === 0 ? 0 : limitedContribution / ki;
  }

  const rawCandidate = kp * error + ki * nextIntegral - kd * state.v;

  if (antiWindup) {
    const tryingToPushFurtherPositive = rawCandidate > voltageLimit && error > 0;
    const tryingToPushFurtherNegative = rawCandidate < -voltageLimit && error < 0;
    if (tryingToPushFurtherPositive || tryingToPushFurtherNegative) {
      nextIntegral = state.integral;
    }
  }

  const raw = kp * error + ki * nextIntegral - kd * state.v;
  const out = clamp(raw, -voltageLimit, voltageLimit);

  const accel = plantGain * out - damping * state.v;
  state.v += accel * dt;
  state.x += state.v * dt;
  state.integral = nextIntegral;
  state.raw = raw;
  state.out = out;
}
