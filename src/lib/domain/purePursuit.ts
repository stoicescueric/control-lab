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
  for (let i = fromIndex; i < path.length; i++) {
    if (Math.hypot(path[i].x - pose.x, path[i].y - pose.y) >= lookahead) return path[i];
  }
  return path[path.length - 1];
}

/**
 * Curvature (1 / length units) of the single arc, tangent to the robot's
 * heading, that passes through a lookahead point already expressed in the
 * robot frame: kappa = 2*yr / L^2, where L is the chord length to the point
 * and yr its lateral (robot-frame +y) offset. Zero when the point is dead
 * ahead (yr = 0); positive curvature turns left (+y), negative turns right.
 */
export function pursuitCurvature(robotFramePoint: Point, chordLength: number): number {
  if (chordLength <= 0) return 0;
  return (2 * robotFramePoint.y) / (chordLength * chordLength);
}
