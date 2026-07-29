import {describe, expect, it} from 'vitest';
import {brakingVelocityForDistance, predictedStoppingDistance} from './braking';

describe('predictedStoppingDistance', () => {
  it('matches the hand-verifiable case v=10, decel=5 -> 10 m', () => {
    expect(predictedStoppingDistance(10, 5)).toBeCloseTo(10, 10);
  });

  it('is negative for negative-direction travel, with the same magnitude as the positive case', () => {
    const forward = predictedStoppingDistance(10, 5);
    const backward = predictedStoppingDistance(-10, 5);
    expect(backward).toBeCloseTo(-forward, 10);
    expect(backward).toBeCloseTo(-10, 10);
  });

  it('returns zero at zero velocity', () => {
    expect(predictedStoppingDistance(0, 5)).toBe(0);
  });
});

describe('brakingVelocityForDistance', () => {
  it('is the inverse of predictedStoppingDistance for positive distance/velocity', () => {
    const decel = 3.2;
    for (const v of [0.5, 1, 2.5, 6, 10]) {
      const d = predictedStoppingDistance(v, decel);
      expect(brakingVelocityForDistance(d, decel)).toBeCloseTo(v, 8);
    }
  });

  it('is the inverse the other way: distance -> velocity -> distance', () => {
    const decel = 1.6;
    for (const d of [0, 0.8, 3, 6]) {
      const v = brakingVelocityForDistance(d, decel);
      expect(predictedStoppingDistance(v, decel)).toBeCloseTo(d, 8);
    }
  });
});
