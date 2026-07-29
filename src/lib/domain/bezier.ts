export interface Point {
  x: number;
  y: number;
}

/** Cubic Bézier position at parameter t in [0, 1], given control points [P0, P1, P2, P3]. */
export function bezierPoint(p: Point[], t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
    y: u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y,
  };
}

/** First derivative (tangent) of the cubic Bézier at parameter t. */
export function bezierDerivative(p: Point[], t: number): Point {
  const u = 1 - t;
  return {
    x: 3 * u * u * (p[1].x - p[0].x) + 6 * u * t * (p[2].x - p[1].x) + 3 * t * t * (p[3].x - p[2].x),
    y: 3 * u * u * (p[1].y - p[0].y) + 6 * u * t * (p[2].y - p[1].y) + 3 * t * t * (p[3].y - p[2].y),
  };
}

/** Second derivative of the cubic Bézier at parameter t. */
export function bezierSecondDerivative(p: Point[], t: number): Point {
  const u = 1 - t;
  return {
    x: 6 * u * (p[2].x - 2 * p[1].x + p[0].x) + 6 * t * (p[3].x - 2 * p[2].x + p[1].x),
    y: 6 * u * (p[2].y - 2 * p[1].y + p[0].y) + 6 * t * (p[3].y - 2 * p[2].y + p[1].y),
  };
}

/** Signed curvature kappa = (x'y'' - y'x'') / |B'|^3 from first and second derivatives. */
export function curvature(d: Point, dd: Point): number {
  const denom = Math.pow(d.x * d.x + d.y * d.y, 1.5);
  return denom < 1e-6 ? 0 : (d.x * dd.y - d.y * dd.x) / denom;
}

/**
 * Catmull-Rom (cubic Hermite) interpolation through four waypoints [P0, P1, P2, P3].
 * Tangents at P1 and P2 are estimated from neighboring points (one-sided at the ends);
 * the curve passes through all four points, unlike the Bézier control polygon above.
 * Returns `stepsPerSegment + 1` sampled points per one of the three segments.
 */
export function catmullRomPath(p: Point[], stepsPerSegment = 30): Point[] {
  const m = [
    {x: p[1].x - p[0].x, y: p[1].y - p[0].y},
    {x: (p[2].x - p[0].x) / 2, y: (p[2].y - p[0].y) / 2},
    {x: (p[3].x - p[1].x) / 2, y: (p[3].y - p[1].y) / 2},
    {x: p[3].x - p[2].x, y: p[3].y - p[2].y},
  ];
  const out: Point[] = [];
  for (let seg = 0; seg < 3; seg++) {
    const p0 = p[seg];
    const p1 = p[seg + 1];
    const m0 = m[seg];
    const m1 = m[seg + 1];
    for (let i = 0; i <= stepsPerSegment; i++) {
      const t = i / stepsPerSegment;
      const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
      const h10 = t ** 3 - 2 * t ** 2 + t;
      const h01 = -2 * t ** 3 + 3 * t ** 2;
      const h11 = t ** 3 - t ** 2;
      out.push({
        x: h00 * p0.x + h10 * m0.x + h01 * p1.x + h11 * m1.x,
        y: h00 * p0.y + h10 * m0.y + h01 * p1.y + h11 * m1.y,
      });
    }
  }
  return out;
}
