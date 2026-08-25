import {wrapDegrees} from './controlMath';

export interface ComplexValue {
  re: number;
  im: number;
}

export interface ComplementaryResponse {
  absolute: ComplexValue;
  relative: ComplexValue;
}

function divide(numerator: ComplexValue, denominator: ComplexValue): ComplexValue {
  const scale = denominator.re * denominator.re + denominator.im * denominator.im;
  return {
    re: (numerator.re * denominator.re + numerator.im * denominator.im) / scale,
    im: (numerator.im * denominator.re - numerator.re * denominator.im) / scale,
  };
}

export function circularComplementaryStepDegrees(
  estimateDegrees: number,
  relativeDeltaDegrees: number,
  absoluteDegrees: number,
  alpha: number,
): number {
  if (![estimateDegrees, relativeDeltaDegrees, absoluteDegrees, alpha].every(Number.isFinite)) {
    throw new Error('Complementary-filter inputs must be finite');
  }
  if (alpha < 0 || alpha > 1) throw new Error('Alpha must be in [0, 1]');

  const prediction = wrapDegrees(estimateDegrees + relativeDeltaDegrees);
  const innovation = wrapDegrees(absoluteDegrees - prediction);
  return wrapDegrees(prediction + (1 - alpha) * innovation);
}

export function nyquistFrequency(dtSeconds: number): number {
  if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) {
    throw new Error('Sample period must be finite and positive');
  }
  return 1 / (2 * dtSeconds);
}

/** Exact z-domain split for the sampled recursive complementary filter. */
export function complementaryFrequencyResponse(
  alpha: number,
  frequencyHz: number,
  dtSeconds: number,
): ComplementaryResponse {
  if (!Number.isFinite(alpha) || alpha < 0 || alpha >= 1) {
    throw new Error('Alpha must be finite and in [0, 1)');
  }
  const nyquist = nyquistFrequency(dtSeconds);
  if (!Number.isFinite(frequencyHz) || frequencyHz < 0 || frequencyHz > nyquist) {
    throw new Error('Frequency must lie between zero and Nyquist');
  }

  const omega = 2 * Math.PI * frequencyHz * dtSeconds;
  const zInverse = {re: Math.cos(omega), im: -Math.sin(omega)};
  const denominator = {re: 1 - alpha * zInverse.re, im: -alpha * zInverse.im};
  const absolute = divide({re: 1 - alpha, im: 0}, denominator);
  const relative = divide(
    {re: alpha * (1 - zInverse.re), im: -alpha * zInverse.im},
    denominator,
  );
  return {absolute, relative};
}

export function discreteCrossoverFrequency(alpha: number, dtSeconds: number): number | null {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alpha must be finite and in (0, 1)');
  }
  nyquistFrequency(dtSeconds);
  const ratio = (1 - alpha) / (2 * alpha);
  if (ratio > 1) return null;
  return Math.asin(ratio) / (Math.PI * dtSeconds);
}

export function complexMagnitude(value: ComplexValue): number {
  return Math.hypot(value.re, value.im);
}
