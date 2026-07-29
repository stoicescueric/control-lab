import {describe, expect, it} from 'vitest';
import {threePointCurvature, type Point} from './curvature';

describe('threePointCurvature', () => {
  it('matches kappa = 1/R for three points on a known circle', () => {
    const R = 5;
    const angles = [0, 120, 240].map((deg) => (deg * Math.PI) / 180);
    const [p1, p2, p3]: Point[] = angles.map((a) => ({x: R * Math.cos(a), y: R * Math.sin(a)}));
    expect(threePointCurvature(p1, p2, p3)).toBeCloseTo(1 / R, 10);
  });

  it('returns 0 (not NaN or Infinity) for collinear points', () => {
    const p1 = {x: 0, y: 0};
    const p2 = {x: 1, y: 0};
    const p3 = {x: 2, y: 0};
    const k = threePointCurvature(p1, p2, p3);
    expect(k).toBe(0);
    expect(Number.isNaN(k)).toBe(false);
    expect(Number.isFinite(k)).toBe(true);
  });

  it('returns 0 when the points are nearly coincident (near-zero side-length product) instead of a huge or NaN value', () => {
    const p1 = {x: 0, y: 0};
    const p2 = {x: 1e-8, y: 0};
    const p3 = {x: 2e-8, y: 1e-9};
    const k = threePointCurvature(p1, p2, p3);
    expect(k).toBe(0);
    expect(Number.isFinite(k)).toBe(true);
  });

  it('matches a hand-verified 45-degree right-triangle case', () => {
    // (0,0), (1,0), (1,1): legs 1 and 1, hypotenuse sqrt(2).
    // Circumradius of a right triangle = half the hypotenuse = sqrt(2)/2,
    // so kappa = 1/R = 2/sqrt(2) = sqrt(2).
    const p1 = {x: 0, y: 0};
    const p2 = {x: 1, y: 0};
    const p3 = {x: 1, y: 1};
    expect(threePointCurvature(p1, p2, p3)).toBeCloseTo(Math.SQRT2, 10);
  });
});
