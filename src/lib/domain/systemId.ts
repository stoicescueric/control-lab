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
  return {kS, kV};
}
