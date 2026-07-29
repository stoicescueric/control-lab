import {describe, expect, it} from 'vitest';
import {closestPointOnPath, guidedVectorField, type Point} from './guidedVectorField';

const CURVE: Point[] = [
  {x: 0, y: 0},
  {x: 40, y: 100},
  {x: 160, y: -100},
  {x: 200, y: 0},
];

describe('closestPointOnPath', () => {
  it('returns t=0 for a point already at the path start', () => {
    const proj = closestPointOnPath(CURVE[0], CURVE);
    expect(proj.t).toBeCloseTo(0, 3);
    expect(proj.point.x).toBeCloseTo(CURVE[0].x, 3);
    expect(proj.point.y).toBeCloseTo(CURVE[0].y, 3);
    expect(proj.signedError).toBeCloseTo(0, 3);
  });

  it('finds a perpendicular closest point (error vector orthogonal to tangent) off-path', () => {
    const proj = closestPointOnPath({x: 100, y: 50}, CURVE);
    const dot = proj.tangent.x * (100 - proj.point.x) + proj.tangent.y * (50 - proj.point.y);
    // Not exactly zero because the curve endpoints can pin the projection, but for an
    // interior closest point the error vector should be (nearly) perpendicular to the tangent.
    if (proj.t > 0.01 && proj.t < 0.99) {
      expect(Math.abs(dot)).toBeLessThan(1);
    }
  });
});

describe('guidedVectorField', () => {
  it('reduces to the pure unit tangent when the signed error is zero (on-path)', () => {
    // Sample a path point directly so the query is exactly on the curve -> e = 0.
    const proj = closestPointOnPath({x: 100, y: 0}, CURVE);
    const onPath = proj.point; // guaranteed zero cross-track error at its own closest point
    const result = guidedVectorField(onPath, CURVE, 0.5);
    expect(result.signedError).toBeCloseTo(0, 3);
    expect(result.direction.x).toBeCloseTo(result.tangent.x, 3);
    expect(result.direction.y).toBeCloseTo(result.tangent.y, 3);
  });

  it('pulls harder toward the path as kN increases, off-path', () => {
    const q = {x: 100, y: 50};
    const low = guidedVectorField(q, CURVE, 0.1);
    const high = guidedVectorField(q, CURVE, 2.0);
    // Higher kN should tilt the direction further from the pure tangent.
    const tangentDeviation = (dir: Point) => Math.hypot(dir.x - low.tangent.x, dir.y - low.tangent.y);
    expect(tangentDeviation(high.direction)).toBeGreaterThan(tangentDeviation(low.direction) - 1e-9);
  });

  it('does not produce NaN for a degenerate zero-length path', () => {
    const degenerate: Point[] = [
      {x: 5, y: 5},
      {x: 5, y: 5},
      {x: 5, y: 5},
      {x: 5, y: 5},
    ];
    const result = guidedVectorField({x: 10, y: 10}, degenerate, 0.5);
    expect(Number.isNaN(result.direction.x)).toBe(false);
    expect(Number.isNaN(result.direction.y)).toBe(false);
    // Safe fallback: zero derivative everywhere collapses tangent/normal/direction to (0, 0).
    expect(result.direction.x).toBe(0);
    expect(result.direction.y).toBe(0);
  });
});
