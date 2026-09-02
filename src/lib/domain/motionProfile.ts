export interface MotionProfileState {
  position: number;
  velocity: number;
  acceleration: number;
}

export interface TrapezoidalProfile {
  duration: number;
  accelerationTime: number;
  cruiseTime: number;
  peakSpeed: number;
  triangular: boolean;
  distance: number;
  sample: (timeSeconds: number) => MotionProfileState;
}

export function buildTrapezoidalProfile(
  signedDistance: number,
  maxSpeed: number,
  maxAcceleration: number,
): TrapezoidalProfile {
  if (![signedDistance, maxSpeed, maxAcceleration].every(Number.isFinite)) {
    throw new Error('Profile parameters must be finite');
  }
  if (maxSpeed <= 0 || maxAcceleration <= 0) {
    throw new Error('Maximum speed and acceleration must be positive');
  }

  const distance = Math.abs(signedDistance);
  const direction = Math.sign(signedDistance);
  const rampTime = maxSpeed / maxAcceleration;
  const rampDistance = 0.5 * maxAcceleration * rampTime * rampTime;
  const triangular = 2 * rampDistance >= distance;
  const accelerationTime = triangular ? Math.sqrt(distance / maxAcceleration) : rampTime;
  const peakSpeed = maxAcceleration * accelerationTime;
  const cruiseTime = triangular ? 0 : (distance - 2 * rampDistance) / maxSpeed;
  const duration = 2 * accelerationTime + cruiseTime;

  const sample = (timeSeconds: number): MotionProfileState => {
    if (!Number.isFinite(timeSeconds)) throw new Error('Sample time must be finite');
    if (timeSeconds >= duration || duration === 0) {
      return {position: signedDistance, velocity: 0, acceleration: 0};
    }
    const t = Math.max(0, timeSeconds);
    let position: number;
    let velocity: number;
    let acceleration: number;
    if (t < accelerationTime) {
      acceleration = maxAcceleration;
      velocity = maxAcceleration * t;
      position = 0.5 * maxAcceleration * t * t;
    } else if (t < accelerationTime + cruiseTime) {
      acceleration = 0;
      velocity = peakSpeed;
      position = 0.5 * maxAcceleration * accelerationTime ** 2 + peakSpeed * (t - accelerationTime);
    } else {
      const decelerationTime = t - accelerationTime - cruiseTime;
      acceleration = -maxAcceleration;
      velocity = peakSpeed - maxAcceleration * decelerationTime;
      position =
        0.5 * maxAcceleration * accelerationTime ** 2 +
        peakSpeed * cruiseTime +
        peakSpeed * decelerationTime -
        0.5 * maxAcceleration * decelerationTime ** 2;
    }
    return {
      position: direction * position,
      velocity: direction * velocity,
      acceleration: direction * acceleration,
    };
  };

  return {
    duration,
    accelerationTime,
    cruiseTime,
    peakSpeed,
    triangular,
    distance: signedDistance,
    sample,
  };
}
