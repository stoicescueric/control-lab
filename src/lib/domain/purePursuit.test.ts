import {describe, expect, it} from 'vitest';
import {
  continuousLookaheadPoint,
  lookaheadPoint,
  planPathSpeeds,
  pursuitCurvature,
  resamplePolyline,
  segmentCircleIntersectionT,
  speedScaledLookahead,
  toRobotFrame,
} from './purePursuit';
import type {Pose} from './purePursuit';

describe('robot-frame transform', () => {
  it('leaves a point on the heading axis with yr = 0', () => {
    const pose: Pose = {x: 0, y: 0, th: 0};
    const p = toRobotFrame({x: 10, y: 0}, pose);
    expect(p.x).toBeCloseTo(10, 10);
    expect(p.y).toBeCloseTo(0, 10);
  });
});

describe('pursuitCurvature', () => {
  it('returns zero for a zero-length chord', () => {
    expect(pursuitCurvature({x: 0, y: 0}, 0)).toBe(0);
  });

  it('is zero when the lookahead point is directly ahead (yr = 0)', () => {
    const pose: Pose = {x: 0, y: 0, th: 0};
    const target = {x: 20, y: 0};
    const rf = toRobotFrame(target, pose);
    const L = Math.hypot(rf.x, rf.y);
    expect(pursuitCurvature(rf, L)).toBeCloseTo(0, 10);
  });

  it('is positive (turn left) for a lookahead point to the left of the robot', () => {
    const pose: Pose = {x: 0, y: 0, th: 0};
    const target = {x: 10, y: 5}; // ahead and to the world +y side == robot-frame left
    const rf = toRobotFrame(target, pose);
    const L = Math.hypot(rf.x, rf.y);
    expect(pursuitCurvature(rf, L)).toBeGreaterThan(0);
  });

  it('is negative (turn right) for a lookahead point to the right of the robot', () => {
    const pose: Pose = {x: 0, y: 0, th: 0};
    const target = {x: 10, y: -5};
    const rf = toRobotFrame(target, pose);
    const L = Math.hypot(rf.x, rf.y);
    expect(pursuitCurvature(rf, L)).toBeLessThan(0);
  });

  it('flips sign when the robot heading is rotated 180 degrees', () => {
    // Same world offset, but the robot is now facing the opposite way, so a
    // world-left point becomes robot-frame right.
    const pose: Pose = {x: 0, y: 0, th: Math.PI};
    const target = {x: -10, y: 5};
    const rf = toRobotFrame(target, pose);
    const L = Math.hypot(rf.x, rf.y);
    expect(pursuitCurvature(rf, L)).toBeLessThan(0);
  });

  it('matches the closed-form kappa = 2*yr / L^2 for an off-axis point', () => {
    const rf = {x: 8, y: 6};
    const L = Math.hypot(rf.x, rf.y);
    expect(pursuitCurvature(rf, L)).toBeCloseTo((2 * rf.y) / (L * L), 10);
  });
});

describe('lookaheadPoint search', () => {
  const straightPath = Array.from({length: 21}, (_, i) => ({x: i * 5, y: 0}));

  it('returns the first path point at least the lookahead distance away', () => {
    const pose: Pose = {x: 0, y: 0, th: 0};
    const pt = lookaheadPoint(straightPath, pose, 12);
    // First point with x >= 12 is x = 15 (index 3).
    expect(pt).toEqual({x: 15, y: 0});
  });

  it('starts the search at fromIndex, ignoring earlier path points', () => {
    const pose: Pose = {x: 0, y: 0, th: 0};
    const pt = lookaheadPoint(straightPath, pose, 12, 10);
    expect(pt).toEqual({x: 50, y: 0});
  });

  it('falls back to the final path point when the path is shorter than the lookahead distance', () => {
    const shortPath = [
      {x: 0, y: 0},
      {x: 3, y: 0},
      {x: 6, y: 0},
    ];
    const pose: Pose = {x: 0, y: 0, th: 0};
    const pt = lookaheadPoint(shortPath, pose, 100);
    expect(pt).toEqual({x: 6, y: 0});
  });

  it('falls back to the final path point when the robot is already within lookahead of every remaining point', () => {
    const pose: Pose = {x: 95, y: 0, th: 0};
    const pt = lookaheadPoint(straightPath, pose, 50, 19);
    expect(pt).toEqual({x: 100, y: 0});
  });

  it('rejects an empty path and nonpositive lookahead', () => {
    const pose: Pose = {x: 0, y: 0, th: 0};
    expect(() => lookaheadPoint([], pose, 1)).toThrow(/at least one/);
    expect(() => lookaheadPoint(straightPath, pose, 0)).toThrow(/positive/);
  });
});

describe('continuous path geometry', () => {
  it('ignores a duplicate zero-length segment without dividing by zero', () => {
    expect(segmentCircleIntersectionT({x: 1, y: 1}, {x: 1, y: 1}, {x: 0, y: 0}, 2)).toBeNull();
  });

  it('scans past a duplicate at stored progress to find the next valid intersection', () => {
    const path = [{x: 0, y: 0}, {x: 0, y: 0}, {x: 10, y: 0}, {x: 20, y: 0}];
    const result = continuousLookaheadPoint(path, {x: 4, y: 0}, 3, {segmentIndex: 0, t: 0.8});
    expect(result.point).toEqual({x: 7, y: 0});
    expect(result.progress).toEqual({segmentIndex: 1, t: 0.7});
  });

  it('finds a continuous intersection without moving behind prior progress', () => {
    const path = [{x: 0, y: 0}, {x: 10, y: 0}, {x: 20, y: 0}];
    const result = continuousLookaheadPoint(path, {x: 8, y: 0}, 5, {segmentIndex: 0, t: 0.8});
    expect(result.point.x).toBeCloseTo(13, 10);
    expect(result.progress.segmentIndex).toBe(1);
    expect(result.progress.t).toBeCloseTo(0.3, 10);
  });

  it('preserves prior progress when a far-off robot has no circle intersection', () => {
    const path = [{x: 0, y: 0}, {x: 10, y: 0}, {x: 20, y: 0}];
    const result = continuousLookaheadPoint(path, {x: 5, y: 100}, 4, {segmentIndex: 0, t: 0.5});
    expect(result.point).toEqual({x: 5, y: 0});
    expect(result.progress).toEqual({segmentIndex: 0, t: 0.5});
  });

  it('hands off to the endpoint only when it lies inside the lookahead circle', () => {
    const path = [{x: 0, y: 0}, {x: 10, y: 0}];
    const result = continuousLookaheadPoint(path, {x: 9, y: 0}, 4, {segmentIndex: 0, t: 0.8});
    expect(result.point).toEqual({x: 10, y: 0});
    expect(result.progress).toEqual({segmentIndex: 0, t: 1});
  });

  it('uses speed magnitude for reverse-capable dynamic lookahead', () => {
    expect(speedScaledLookahead(-20, 0.5, 2, 30)).toBe(10);
    expect(speedScaledLookahead(20, 0.5, 2, 30)).toBe(10);
  });

  it('resamples at positive spacing and preserves the exact endpoint across duplicates', () => {
    const path = [{x: 0, y: 0}, {x: 0, y: 0}, {x: 10, y: 0}, {x: 13, y: 0}];
    const result = resamplePolyline(path, 4);
    expect(result).toEqual([
      {x: 0, y: 0},
      {x: 4, y: 0},
      {x: 8, y: 0},
      {x: 12, y: 0},
      {x: 13, y: 0},
    ]);
    expect(() => resamplePolyline(path, 0)).toThrow(/positive/);
  });
});

describe('forward and backward speed passes', () => {
  it('rejects non-finite endpoint speeds', () => {
    const path = [{x: 0, y: 0}, {x: 1, y: 0}];
    expect(() => planPathSpeeds(path, [1, 1], 1, Number.NaN, 0)).toThrow(/finite/);
    expect(() => planPathSpeeds(path, [1, 1], 1, 0, Number.POSITIVE_INFINITY)).toThrow(/finite/);
  });

  it('accelerates from zero, remains braking-feasible, and ends at zero', () => {
    const path = [{x: 0, y: 0}, {x: 2, y: 0}, {x: 4, y: 0}, {x: 6, y: 0}];
    const acceleration = 2;
    const speeds = planPathSpeeds(path, [10, 10, 10, 10], acceleration, 0, 0);
    expect(speeds[0]).toBe(0);
    expect(speeds[1]).toBeGreaterThan(0);
    expect(speeds[speeds.length - 1]).toBe(0);
    for (let i = 0; i < speeds.length - 1; i++) {
      const ds = path[i + 1].x - path[i].x;
      expect(speeds[i] ** 2).toBeLessThanOrEqual(speeds[i + 1] ** 2 + 2 * acceleration * ds + 1e-10);
    }
  });
});
