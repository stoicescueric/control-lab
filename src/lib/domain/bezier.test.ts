import {describe, expect, it} from 'vitest';
import {bezierDerivative, bezierPoint, catmullRomPath, curvature, type Point} from './bezier';

const controlPoints: Point[] = [
  {x: 80, y: 300},
  {x: 210, y: 70},
  {x: 440, y: 70},
  {x: 575, y: 300},
];

describe('cubic Bézier evaluation', () => {
  it('interpolates the two anchor points at t=0 and t=1', () => {
    expect(bezierPoint(controlPoints, 0)).toEqual(controlPoints[0]);
    expect(bezierPoint(controlPoints, 1)).toEqual(controlPoints[3]);
  });

  it("matches the tangent formula B'(0) = 3(P1 - P0)", () => {
    const d0 = bezierDerivative(controlPoints, 0);
    expect(d0.x).toBeCloseTo(3 * (controlPoints[1].x - controlPoints[0].x), 10);
    expect(d0.y).toBeCloseTo(3 * (controlPoints[1].y - controlPoints[0].y), 10);
  });

  it("matches the tangent formula B'(1) = 3(P3 - P2)", () => {
    const d1 = bezierDerivative(controlPoints, 1);
    expect(d1.x).toBeCloseTo(3 * (controlPoints[3].x - controlPoints[2].x), 10);
    expect(d1.y).toBeCloseTo(3 * (controlPoints[3].y - controlPoints[2].y), 10);
  });
});

describe('curvature', () => {
  it('is zero when the derivative vector is degenerate', () => {
    expect(curvature({x: 0, y: 0}, {x: 1, y: 1})).toBe(0);
  });

  it('is zero for a straight tangent-acceleration pair (collinear vectors)', () => {
    // d and dd parallel => cross product zero => zero curvature (straight line).
    expect(curvature({x: 2, y: 0}, {x: 4, y: 0})).toBeCloseTo(0, 10);
  });
});

describe('Catmull-Rom interpolation', () => {
  const waypoints: Point[] = [
    {x: 80, y: 260},
    {x: 235, y: 110},
    {x: 410, y: 300},
    {x: 560, y: 120},
  ];
  const stepsPerSegment = 30;

  it('passes through all four input points at the corresponding parameter values', () => {
    const path = catmullRomPath(waypoints, stepsPerSegment);

    // Segment 0 runs from P0 (i=0) to P1 (i=stepsPerSegment).
    expect(path[0].x).toBeCloseTo(waypoints[0].x, 10);
    expect(path[0].y).toBeCloseTo(waypoints[0].y, 10);
    expect(path[stepsPerSegment].x).toBeCloseTo(waypoints[1].x, 10);
    expect(path[stepsPerSegment].y).toBeCloseTo(waypoints[1].y, 10);

    // Segment 1 runs from P1 (i=0) to P2 (i=stepsPerSegment); it starts right
    // after segment 0 ends, so the next sample is P1 again.
    const seg1Start = stepsPerSegment + 1;
    expect(path[seg1Start].x).toBeCloseTo(waypoints[1].x, 10);
    expect(path[seg1Start].y).toBeCloseTo(waypoints[1].y, 10);
    expect(path[seg1Start + stepsPerSegment].x).toBeCloseTo(waypoints[2].x, 10);
    expect(path[seg1Start + stepsPerSegment].y).toBeCloseTo(waypoints[2].y, 10);

    // Segment 2 runs from P2 (i=0) to P3 (i=stepsPerSegment) — the final sample.
    const last = path[path.length - 1];
    expect(last.x).toBeCloseTo(waypoints[3].x, 10);
    expect(last.y).toBeCloseTo(waypoints[3].y, 10);
  });
});
