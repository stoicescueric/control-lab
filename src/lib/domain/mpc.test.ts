import {describe, expect, it} from 'vitest';
import {motionStep, planConstrainedMotion} from './mpc';

describe('motionStep', () => {
  it('advances the double integrator with constant acceleration', () => {
    expect(motionStep({position: 1, velocity: 2}, -4, 0.5)).toEqual({
      position: 1.5,
      velocity: 0,
    });
  });
});

describe('planConstrainedMotion', () => {
  it.each([
    {position: 2, velocity: 0.2},
    {position: 0, velocity: -0.2},
    {position: 2.01, velocity: -0.2},
  ])('rejects a limit violation even when endpoints return inside: %o', (state) => {
    const plan = planConstrainedMotion({
      state,
      targetPosition: 1,
      horizon: 1,
      dtSeconds: 0.2,
      maxAcceleration: 2,
      minPosition: 0,
      maxPosition: 2,
    });
    expect(plan.feasibleCount).toBe(0);
    expect(plan.feasible).toBe(false);
  });

  it('checks every discrete input sequence', () => {
    const plan = planConstrainedMotion({
      state: {position: 0.2, velocity: 0},
      targetPosition: 1.5,
      horizon: 4,
      dtSeconds: 0.2,
      maxAcceleration: 2,
      minPosition: 0,
      maxPosition: 2,
    });
    expect(plan.candidateCount).toBe(81);
    expect(plan.feasibleCount).toBeGreaterThan(0);
    expect(plan.states).toHaveLength(5);
  });

  it('brakes before a hard upper position bound', () => {
    const plan = planConstrainedMotion({
      state: {position: 1.7, velocity: 0.8},
      targetPosition: 1.9,
      horizon: 4,
      dtSeconds: 0.2,
      maxAcceleration: 2,
      minPosition: 0,
      maxPosition: 2,
    });
    expect(plan.feasible).toBe(true);
    expect(plan.inputs[0]).toBe(-2);
    expect(Math.max(...plan.states.map((state) => state.position))).toBeLessThanOrEqual(2);
  });

  it('reports when no candidate can satisfy the bounds', () => {
    const plan = planConstrainedMotion({
      state: {position: 1.99, velocity: 2},
      targetPosition: 1.5,
      horizon: 2,
      dtSeconds: 0.2,
      maxAcceleration: 1,
      minPosition: 0,
      maxPosition: 2,
    });
    expect(plan.feasible).toBe(false);
    expect(plan.feasibleCount).toBe(0);
  });

  it('rejects invalid problem dimensions', () => {
    expect(() =>
      planConstrainedMotion({
        state: {position: 0, velocity: 0},
        targetPosition: 1,
        horizon: 0,
        dtSeconds: 0.02,
        maxAcceleration: 1,
        minPosition: 0,
        maxPosition: 2,
      }),
    ).toThrow(/horizon/);
  });
});
