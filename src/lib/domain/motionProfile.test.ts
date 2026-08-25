import {describe, expect, it} from 'vitest';
import {buildTrapezoidalProfile} from './motionProfile';

function expectContinuous(distance: number, speed: number, acceleration: number) {
  const profile = buildTrapezoidalProfile(distance, speed, acceleration);
  for (const boundary of [profile.accelerationTime, profile.accelerationTime + profile.cruiseTime]) {
    const before = profile.sample(boundary - 1e-7);
    const after = profile.sample(boundary + 1e-7);
    expect(after.position).toBeCloseTo(before.position, 4);
    expect(after.velocity).toBeCloseTo(before.velocity, 4);
  }
}

describe('trapezoidal motion profile', () => {
  it('is continuous for triangular and trapezoidal moves', () => {
    expectContinuous(5, 10, 20);
    expectContinuous(60, 40, 40);
  });

  it('returns the exact completed state at and after the duration', () => {
    const profile = buildTrapezoidalProfile(60, 40, 40);
    expect(profile.sample(profile.duration)).toEqual({position: 60, velocity: 0, acceleration: 0});
    expect(profile.sample(profile.duration + 10)).toEqual({position: 60, velocity: 0, acceleration: 0});
  });

  it('supports signed moves and validates physical limits', () => {
    const profile = buildTrapezoidalProfile(-5, 10, 20);
    expect(profile.sample(profile.duration)).toEqual({position: -5, velocity: 0, acceleration: 0});
    expect(() => buildTrapezoidalProfile(5, 0, 1)).toThrow(/positive/);
    expect(() => buildTrapezoidalProfile(5, 1, 0)).toThrow(/positive/);
  });
});
