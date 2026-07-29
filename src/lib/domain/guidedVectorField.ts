import {bezierDerivative, bezierPoint, type Point} from './bezier';

export type {Point};

/**
 * The closest point on a cubic Bézier path to a query point, plus the local
 * frame at that point: unit tangent, unit normal (tangent rotated +90deg),
 * and the signed distance from the path along the normal.
 *
 * Units follow the caller's control-point coordinates directly (no implicit
 * scaling) -- a widget rendering in pixels-per-inch should scale `distance`
 * and `signedError` itself, the way both PathProjection and
 * GuidedVectorField already do for display.
 */
export interface PathProjection {
  /** Path parameter in [0, 1] at the closest point. */
  t: number;
  /** The closest point on the path. */
  point: Point;
  /** Unit tangent (along-track direction) at the closest point. */
  tangent: Point;
  /** Unit normal (tangent rotated +90deg) at the closest point. */
  normal: Point;
  /** Euclidean distance from the query point to the closest point. */
  distance: number;
  /** Signed cross-track error: (query - point) . normal. */
  signedError: number;
}

/**
 * Unit tangent of the cubic Bézier at parameter t. If the derivative vanishes
 * (e.g. a degenerate, zero-length path where all control points coincide),
 * the `|| 1` guard avoids a 0/0 NaN and returns the zero vector instead.
 */
function unitTangentAt(controlPoints: Point[], t: number): Point {
  const d = bezierDerivative(controlPoints, t);
  const m = Math.hypot(d.x, d.y) || 1;
  return {x: d.x / m, y: d.y / m};
}

/**
 * Closest point on a cubic Bézier path to `point`, found by a coarse dense
 * scan followed by ternary-search refinement (distance-to-a-point along a
 * simple curve is locally unimodal near the coarse minimum), matching the
 * search both widgets used inline. `samples` controls the coarse grid
 * resolution; the default (260) matches the widgets' original precision.
 */
export function closestPointOnPath(point: Point, controlPoints: Point[], samples = 260): PathProjection {
  const distSq = (t: number): number => {
    const p = bezierPoint(controlPoints, t);
    const dx = p.x - point.x;
    const dy = p.y - point.y;
    return dx * dx + dy * dy;
  };

  let bestT = 0;
  let bestDistSq = Infinity;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const d = distSq(t);
    if (d < bestDistSq) {
      bestDistSq = d;
      bestT = t;
    }
  }

  // Local ternary refinement around the coarse minimum narrows the parameter
  // (and the perpendicularity it implies) to far better than the sampling grid.
  let lo = Math.max(0, bestT - 1 / samples);
  let hi = Math.min(1, bestT + 1 / samples);
  for (let k = 0; k < 40; k++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (distSq(m1) < distSq(m2)) hi = m2;
    else lo = m1;
  }
  bestT = (lo + hi) / 2;

  const closest = bezierPoint(controlPoints, bestT);
  const tangent = unitTangentAt(controlPoints, bestT);
  const normal = {x: -tangent.y, y: tangent.x};
  const rx = point.x - closest.x;
  const ry = point.y - closest.y;
  const signedError = rx * normal.x + ry * normal.y;

  return {
    t: bestT,
    point: closest,
    tangent,
    normal,
    distance: Math.hypot(rx, ry),
    signedError,
  };
}

export interface GuidedVectorFieldResult extends PathProjection {
  /** Unit desired-direction vector: tangent minus the converge-onto-path pull. */
  direction: Point;
}

/**
 * The guiding vector field direction at `position`: flow along the path's
 * tangent, minus a pull toward the path proportional to the signed
 * cross-track error, then normalized -- chi = t_hat - kN * e * n_hat.
 * See docs/path-following/guided-vector-fields.mdx.
 *
 * `kN` is the converge gain (1 / length). Falls back to the raw (unnormalized,
 * zero) vector rather than NaN when the field vector's magnitude is zero
 * (e.g. a degenerate zero-length path), matching the `|| 1` guard both
 * widgets used inline.
 */
export function guidedVectorField(position: Point, controlPoints: Point[], kN: number): GuidedVectorFieldResult {
  const proj = closestPointOnPath(position, controlPoints);
  const vx = proj.tangent.x - kN * proj.signedError * proj.normal.x;
  const vy = proj.tangent.y - kN * proj.signedError * proj.normal.y;
  const m = Math.hypot(vx, vy) || 1;
  return {...proj, direction: {x: vx / m, y: vy / m}};
}
