/* Ordinary least-squares fit of the quasistatic ramp test: V = kS + kV*v.
   Matches WPILib's SimpleMotorFeedforward form and the Java `fitLine` sample
   in docs/control-theory/system-identification.mdx. The slope is computed as
   the mean-centered sxy/sxx and the intercept is back-computed from the means,
   which is algebraically identical to (and numerically better conditioned
   than) the raw normal-equations form. */

const MIN_SAMPLES = 3;
const MIN_VARIANCE = 1e-9; // guards divide-by-zero when velocity samples have no spread

export interface VelocitySample {
  velocity: number;
  voltage: number;
}

export interface VelocityModelFit {
  kS: number;
  kV: number;
}

export const QUASISTATIC_SIM = {
  kS: 0.9,
  kV: 0.035,
  maxVoltage: 12,
  rampRate: 0.1,
  timeConstant: 0.35,
  samplePeriod: 0.15,
  movingThreshold: 6,
} as const;

/** One exact first-order plant step at a fixed applied voltage. */
export function quasistaticVelocityStep(
  velocityRpm: number,
  appliedVoltage: number,
  dtSeconds: number,
): number {
  if (![velocityRpm, appliedVoltage, dtSeconds].every(Number.isFinite) || dtSeconds < 0) {
    throw new Error('Quasistatic plant inputs must be finite and dt must be non-negative');
  }
  const steadyRpm =
    appliedVoltage > QUASISTATIC_SIM.kS
      ? (appliedVoltage - QUASISTATIC_SIM.kS) / QUASISTATIC_SIM.kV
      : 0;
  const decay = Math.exp(-dtSeconds / QUASISTATIC_SIM.timeConstant);
  return steadyRpm + (velocityRpm - steadyRpm) * decay;
}

/**
 * Generates the same zero-noise ramp/plant samples used by the live demo.
 * The small integration step makes the changing ramp effectively continuous.
 */
export function simulateQuasistaticRamp(
  rampRate: number = QUASISTATIC_SIM.rampRate,
): VelocitySample[] {
  if (!Number.isFinite(rampRate) || rampRate <= 0) {
    throw new Error('Ramp rate must be finite and positive');
  }

  const samples: VelocitySample[] = [];
  const dt = 0.005;
  let time = 0;
  let sinceSample = 0;
  let velocity = 0;
  let voltage = 0;
  const maxTime = QUASISTATIC_SIM.maxVoltage / rampRate + 4 * QUASISTATIC_SIM.timeConstant;

  while (time < maxTime) {
    time += dt;
    sinceSample += dt;
    voltage = Math.min(QUASISTATIC_SIM.maxVoltage, rampRate * time);
    velocity = quasistaticVelocityStep(velocity, voltage, dt);
    if (sinceSample + 1e-12 >= QUASISTATIC_SIM.samplePeriod) {
      sinceSample -= QUASISTATIC_SIM.samplePeriod;
      if (velocity >= QUASISTATIC_SIM.movingThreshold) {
        samples.push({velocity, voltage});
      }
    }
  }
  return samples;
}

/**
 * Fits V = kS + kV*velocity to the given samples by ordinary least squares.
 *
 * Returns null when there are fewer than MIN_SAMPLES samples, or when the
 * velocity samples have too little variance to pin down a slope (all equal,
 * or numerically indistinguishable from equal) — the caller should keep its
 * previous fit in that case rather than treat null as "zero".
 */
export function fitVelocityModel(samples: VelocitySample[]): VelocityModelFit | null {
  const n = samples.length;
  if (n < MIN_SAMPLES) return null;

  let meanV = 0;
  let meanVoltage = 0;
  for (const {velocity, voltage} of samples) {
    if (!Number.isFinite(velocity) || !Number.isFinite(voltage)) return null;
    meanV += velocity;
    meanVoltage += voltage;
  }
  meanV /= n;
  meanVoltage /= n;

  let sxy = 0;
  let sxx = 0;
  for (const {velocity, voltage} of samples) {
    sxy += (velocity - meanV) * (voltage - meanVoltage);
    sxx += (velocity - meanV) * (velocity - meanV);
  }
  if (sxx < MIN_VARIANCE) return null;

  const kV = sxy / sxx;
  const kS = meanVoltage - kV * meanV;
  return Number.isFinite(kS) && Number.isFinite(kV) ? {kS, kV} : null;
}
