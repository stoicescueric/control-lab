import {describe, expect, it} from 'vitest';
import {lookaheadPoint, pursuitCurvature, toRobotFrame} from './purePursuit';
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
});
