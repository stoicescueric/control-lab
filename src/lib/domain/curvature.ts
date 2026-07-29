// Menger curvature of three points: kappa = 4 * Area / (a * b * c), where a, b, c
// are the side lengths of the triangle P1 P2 P3 and Area is its (unsigned) area.
// This is the same curvature a circle through the three points would have
// (kappa = 1 / R), but computed directly from the points without solving for
// the circumcenter first. Collinear (or nearly collinear) points make the
// triangle degenerate -- area and denominator both vanish -- so we guard that
// case and return 0 (a straight line has zero curvature) instead of NaN or
// Infinity from a division by (near) zero.

export interface Point {
  x: number;
  y: number;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Curvature (1 / length units of p1, p2, p3) of the circle through three
 * points, via the Menger curvature formula 4*Area/(a*b*c). Returns 0 for
 * collinear or near-collinear points (denominator near zero) rather than
 * NaN or Infinity.
 */
export function threePointCurvature(p1: Point, p2: Point, p3: Point): number {
  const area = 0.5 * Math.abs((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y));
  const a = dist(p2, p3);
  const b = dist(p1, p3);
  const c = dist(p1, p2);
  const denom = a * b * c;
  return denom < 1e-6 ? 0 : (4 * area) / denom;
}
