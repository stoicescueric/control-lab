import {INCH, clamp, monotoneHermite} from './projectile';

export interface Vec2 {
  x: number;
  y: number;
}

export const SOTM_GAIN = 0.9;
export const RELEASE_DELAY_S = 0.05;
export const SOTM_TOLERANCE_S = 0.05;
export const SOTM_MAX_UPDATES = 5;
export const FLIGHT_TIME_DISTANCE_IN = [50, 60, 76, 85, 95, 110, 130];
export const FLIGHT_TIME_S = [0.5, 0.54, 0.6, 0.7, 0.8, 0.95, 1.05];

const flightTimeMap = monotoneHermite(FLIGHT_TIME_DISTANCE_IN, FLIGHT_TIME_S);

export interface FlightTimeLookup {
  seconds: number;
  requestedDistanceIn: number;
  usedDistanceIn: number;
  clamped: boolean;
}

export function lookupFlightTime(distanceM: number): FlightTimeLookup {
  if (!Number.isFinite(distanceM) || distanceM < 0) {
    throw new Error('distance must be finite and nonnegative');
  }
  const requestedDistanceIn = distanceM / INCH;
  const usedDistanceIn = clamp(
    requestedDistanceIn,
    FLIGHT_TIME_DISTANCE_IN[0],
    FLIGHT_TIME_DISTANCE_IN[FLIGHT_TIME_DISTANCE_IN.length - 1],
  );
  return {
    seconds: flightTimeMap.evaluate(usedDistanceIn),
    requestedDistanceIn,
    usedDistanceIn,
    clamped: usedDistanceIn !== requestedDistanceIn,
  };
}

export interface MovingAimOptions {
  shooter: Vec2;
  target: Vec2;
  robotVelocity: Vec2;
  gain?: number;
  releaseDelayS?: number;
  toleranceS?: number;
  maxUpdates?: number;
}

export interface MovingAimIteration {
  update: number;
  timeUsedS: number;
  correctionM: Vec2;
  virtualTarget: Vec2;
  virtualDistanceM: number;
  nextTimeS: number;
  incrementS: number;
  clamped: boolean;
}

export interface MovingAimResult {
  initialTimeS: number;
  initialLookupClamped: boolean;
  iterations: MovingAimIteration[];
  virtualTarget: Vec2;
  virtualDistanceM: number;
  converged: boolean;
}

/** Replays the archived virtual-target fixed-point update in SI units. */
export function solveMovingAim({
  shooter,
  target,
  robotVelocity,
  gain = SOTM_GAIN,
  releaseDelayS = RELEASE_DELAY_S,
  toleranceS = SOTM_TOLERANCE_S,
  maxUpdates = SOTM_MAX_UPDATES,
}: MovingAimOptions): MovingAimResult {
  const values = [
    shooter.x,
    shooter.y,
    target.x,
    target.y,
    robotVelocity.x,
    robotVelocity.y,
    gain,
    releaseDelayS,
    toleranceS,
    maxUpdates,
  ];
  if (
    !values.every(Number.isFinite) ||
    gain < 0 ||
    releaseDelayS < 0 ||
    toleranceS < 0 ||
    maxUpdates < 1 ||
    !Number.isInteger(maxUpdates)
  ) {
    throw new Error('moving-aim inputs must be finite and physically valid');
  }

  const realDistance = Math.hypot(target.x - shooter.x, target.y - shooter.y);
  const initial = lookupFlightTime(realDistance);
  let time = initial.seconds;
  const iterations: MovingAimIteration[] = [];
  let converged = false;

  for (let update = 1; update <= maxUpdates; update++) {
    const totalTime = releaseDelayS + time;
    const correctionM = {
      x: gain * robotVelocity.x * totalTime,
      y: gain * robotVelocity.y * totalTime,
    };
    const virtualTarget = {
      x: target.x - correctionM.x,
      y: target.y - correctionM.y,
    };
    const virtualDistanceM = Math.hypot(virtualTarget.x - shooter.x, virtualTarget.y - shooter.y);
    const next = lookupFlightTime(virtualDistanceM);
    const incrementS = Math.abs(next.seconds - time);
    iterations.push({
      update,
      timeUsedS: time,
      correctionM,
      virtualTarget,
      virtualDistanceM,
      nextTimeS: next.seconds,
      incrementS,
      clamped: next.clamped,
    });
    if (incrementS <= toleranceS) {
      converged = true;
      break;
    }
    time = next.seconds;
  }

  const final = iterations[iterations.length - 1];
  return {
    initialTimeS: initial.seconds,
    initialLookupClamped: initial.clamped,
    iterations,
    virtualTarget: final.virtualTarget,
    virtualDistanceM: final.virtualDistanceM,
    converged,
  };
}
