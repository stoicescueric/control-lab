export interface MecanumWheelPowers {
  fl: number;
  fr: number;
  bl: number;
  br: number;
}

export function wrapRadians(radians: number): number {
  const turn = 2 * Math.PI;
  const wrapped = ((radians + Math.PI) % turn + turn) % turn - Math.PI;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

export function wrapDegrees(degrees: number): number {
  const wrapped = ((degrees + 180) % 360 + 360) % 360 - 180;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

export function mecanumMix(vx: number, vy: number, omega: number): MecanumWheelPowers {
  return {
    fl: vx - vy - omega,
    fr: vx + vy + omega,
    bl: vx + vy - omega,
    br: vx - vy + omega,
  };
}

export function desaturate(wheels: MecanumWheelPowers): MecanumWheelPowers {
  const scale = Math.max(
    1,
    Math.abs(wheels.fl),
    Math.abs(wheels.fr),
    Math.abs(wheels.bl),
    Math.abs(wheels.br),
  );
  return {
    fl: wheels.fl / scale,
    fr: wheels.fr / scale,
    bl: wheels.bl / scale,
    br: wheels.br / scale,
  };
}

export function kalmanGain(predictedVariance: number, measurementVariance: number): number {
  if (predictedVariance < 0 || measurementVariance < 0) {
    throw new Error('Kalman variances must be non-negative');
  }
  const total = predictedVariance + measurementVariance;
  if (total <= 0) return 0;
  return predictedVariance / total;
}

export function scalarKalmanUpdate(
  estimate: number,
  predictedVariance: number,
  measurement: number,
  measurementVariance: number,
) {
  const gain = kalmanGain(predictedVariance, measurementVariance);
  const innovation = measurement - estimate;
  return {
    gain,
    innovation,
    estimate: estimate + gain * innovation,
    variance: (1 - gain) * predictedVariance,
  };
}
