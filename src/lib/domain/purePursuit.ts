// Pure pursuit path following: transform a lookahead point into the robot frame
// and convert it into the curvature of the one arc that starts at the robot
// (tangent to its heading) and passes through that point. See
// docs/path-following/pure-pursuit.mdx for the full derivation; curvature
// matches R. C. Coulter, "Implementation of the Pure Pursuit Path Tracking
// Algorithm," CMU Robotics Institute, 1992.

export interface Point {
  x: number;
  y: number;
}

export interface Pose {
  x: number;
  y: number;
  th: number;
}

export interface PathProgress {
  segmentIndex: number;
  t: number;
}

export interface LookaheadResult {
  point: Point;
  progress: PathProgress;
}

function validatePath(path: Point[], lookahead?: number): void {
  if (path.length === 0) throw new Error('Path must contain at least one point');
  if (!path.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) {
    throw new Error('Path points must be finite');
  }
  if (lookahead !== undefined && (!Number.isFinite(lookahead) || lookahead <= 0)) {
    throw new Error('Lookahead distance must be finite and positive');
  }
}

/**
 * Transform a world-frame point into the robot frame, where +x is forward
 * and +y is left. Equivalent to rotating the world by -theta about the
 * robot's position.
 */
export function toRobotFrame(point: Point, pose: Pose): Point {
  const dx = point.x - pose.x;
  const dy = point.y - pose.y;
  const c = Math.cos(-pose.th);
  const s = Math.sin(-pose.th);
  return {
    x: dx * c - dy * s,
    y: dx * s + dy * c,
  };
}

/**
 * Walk the path, starting at index `fromIndex`, for the first point at least
 * `lookahead` away from `pose`. Falls back to the last path point when no
 * point on the path is that far away (e.g. the remaining path is shorter
 * than the lookahead distance, or the robot has nearly reached the end).
 */
export function lookaheadPoint<T extends Point>(path: T[], pose: Pose, lookahead: number, fromIndex = 0): T {
  validatePath(path, lookahead);
  const start = Math.max(0, Math.min(path.length - 1, Math.trunc(fromIndex)));
  for (let i = start; i < path.length; i++) {
    if (Math.hypot(path[i].x - pose.x, path[i].y - pose.y) >= lookahead) return path[i];
  }
  return path[path.length - 1];
}

/** Furthest valid intersection parameter on one nondegenerate segment. */
export function segmentCircleIntersectionT(
  start: Point,
  end: Point,
  center: Point,
  radius: number,
  minimumT = 0,
): number | null {
  if (!Number.isFinite(radius) || radius <= 0) throw new Error('Circle radius must be positive');
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const a = dx * dx + dy * dy;
  if (a <= 1e-12) return null;
  const fx = start.x - center.x;
  const fy = start.y - center.y;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(Math.max(0, discriminant));
  const candidates = [(-b - root) / (2 * a), (-b + root) / (2 * a)]
    .filter((t) => t >= Math.max(0, minimumT) && t <= 1);
  return candidates.length ? Math.max(...candidates) : null;
}

/** Circle/polyline lookahead that never moves backward from the supplied progress. */
export function continuousLookaheadPoint(
  path: Point[],
  center: Point,
  radius: number,
  from: PathProgress = {segmentIndex: 0, t: 0},
): LookaheadResult {
  validatePath(path, radius);
  if (path.length === 1) return {point: path[0], progress: {segmentIndex: 0, t: 0}};
  if (!Number.isFinite(from.segmentIndex) || !Number.isFinite(from.t)) {
    throw new Error('Path progress must be finite');
  }
  const firstSegment = Math.max(0, Math.min(path.length - 2, Math.trunc(from.segmentIndex)));
  const firstT = Math.max(0, Math.min(1, from.t));
  for (let segmentIndex = firstSegment; segmentIndex < path.length - 1; segmentIndex++) {
    const minimumT = segmentIndex === firstSegment ? firstT : 0;
    const t = segmentCircleIntersectionT(path[segmentIndex], path[segmentIndex + 1], center, radius, minimumT);
    if (t !== null) {
      const a = path[segmentIndex];
      const b = path[segmentIndex + 1];
      return {
        point: {...a, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t},
        progress: {segmentIndex, t},
      };
    }
  }

  const endpoint = path[path.length - 1];
  if (Math.hypot(endpoint.x - center.x, endpoint.y - center.y) <= radius) {
    return {point: endpoint, progress: {segmentIndex: path.length - 2, t: 1}};
  }

  // A robot far from the path may have no circle intersection at all. Recover
  // toward the last accepted progress instead of irreversibly jumping to the end.
  const a = path[firstSegment];
  const b = path[firstSegment + 1];
  return {
    point: {x: a.x + (b.x - a.x) * firstT, y: a.y + (b.y - a.y) * firstT},
    progress: {segmentIndex: firstSegment, t: firstT},
  };
}

export function speedScaledLookahead(
  speed: number,
  scaleSeconds: number,
  minimum: number,
  maximum: number,
): number {
  if (![speed, scaleSeconds, minimum, maximum].every(Number.isFinite)
      || scaleSeconds < 0 || minimum <= 0 || maximum < minimum) {
    throw new Error('Dynamic-lookahead parameters are invalid');
  }
  return Math.max(minimum, Math.min(maximum, scaleSeconds * Math.abs(speed)));
}

export function resamplePolyline<T extends Point>(path: T[], step: number): Point[] {
  validatePath(path);
  if (!Number.isFinite(step) || step <= 0) throw new Error('Resampling step must be positive');
  if (path.length === 1) return [{...path[0]}];

  const result: Point[] = [{...path[0]}];
  let distanceUntilSample = step;
  for (let i = 0; i < path.length - 1; i++) {
    let start: Point = {...path[i]};
    const end = path[i + 1];
    let remaining = Math.hypot(end.x - start.x, end.y - start.y);
    while (remaining > 1e-12 && remaining + 1e-12 >= distanceUntilSample) {
      const ratio = distanceUntilSample / remaining;
      start = {x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio};
      result.push(start);
      remaining = Math.hypot(end.x - start.x, end.y - start.y);
      distanceUntilSample = step;
    }
    distanceUntilSample -= remaining;
  }
  const endpoint = path[path.length - 1];
  const last = result[result.length - 1];
  if (Math.hypot(last.x - endpoint.x, last.y - endpoint.y) > 1e-9) result.push({...endpoint});
  return result;
}

export function planPathSpeeds(
  path: Point[],
  speedCaps: number[],
  maxAcceleration: number,
  startSpeed = 0,
  endSpeed = 0,
): number[] {
  validatePath(path);
  if (speedCaps.length !== path.length || speedCaps.some((v) => !Number.isFinite(v) || v < 0)) {
    throw new Error('Every path point needs a finite non-negative speed cap');
  }
  if (!Number.isFinite(maxAcceleration) || maxAcceleration <= 0
      || !Number.isFinite(startSpeed) || startSpeed < 0
      || !Number.isFinite(endSpeed) || endSpeed < 0) {
    throw new Error('Acceleration must be positive and endpoint speeds finite and non-negative');
  }
  const speeds = speedCaps.slice();
  speeds[0] = Math.min(speeds[0], startSpeed);
  for (let i = 1; i < path.length; i++) {
    const ds = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    speeds[i] = Math.min(speeds[i], Math.sqrt(speeds[i - 1] ** 2 + 2 * maxAcceleration * ds));
  }
  speeds[speeds.length - 1] = Math.min(speeds[speeds.length - 1], endSpeed);
  for (let i = path.length - 2; i >= 0; i--) {
    const ds = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
    speeds[i] = Math.min(speeds[i], Math.sqrt(speeds[i + 1] ** 2 + 2 * maxAcceleration * ds));
  }
  return speeds;
}

/**
 * Curvature (1 / length units) of the single arc, tangent to the robot's
 * heading, that passes through a lookahead point already expressed in the
 * robot frame: kappa = 2*yr / L^2, where L is the chord length to the point
 * and yr its lateral (robot-frame +y) offset. Zero when the point is dead
 * ahead (yr = 0); positive curvature turns left (+y), negative turns right.
 */
export function pursuitCurvature(robotFramePoint: Point, chordLength: number): number {
  if (!Number.isFinite(chordLength) || chordLength <= 1e-9) return 0;
  return (2 * robotFramePoint.y) / (chordLength * chordLength);
}
