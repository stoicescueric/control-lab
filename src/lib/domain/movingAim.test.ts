import {describe, expect, it} from 'vitest';
import {
  FLIGHT_TIME_DISTANCE_IN,
  FLIGHT_TIME_S,
  lookupFlightTime,
  solveMovingAim,
} from './movingAim';
import {INCH} from './projectile';

describe('moving-shot virtual target', () => {
  it('reproduces every archived flight-time knot and clamps outside the map', () => {
    FLIGHT_TIME_DISTANCE_IN.forEach((distance, index) => {
      expect(lookupFlightTime(distance * INCH).seconds).toBeCloseTo(FLIGHT_TIME_S[index], 12);
    });
    expect(lookupFlightTime(20 * INCH)).toMatchObject({seconds: 0.5, clamped: true});
    expect(lookupFlightTime(160 * INCH)).toMatchObject({seconds: 1.05, clamped: true});
  });

  it('leaves a stationary target unchanged', () => {
    const result = solveMovingAim({
      shooter: {x: 0, y: 0},
      target: {x: 95 * INCH, y: 0},
      robotVelocity: {x: 0, y: 0},
    });
    expect(result.converged).toBe(true);
    expect(result.iterations).toHaveLength(1);
    expect(result.virtualTarget).toEqual({x: 95 * INCH, y: 0});
  });

  it('reproduces the 1.1475 m first sideways correction', () => {
    const result = solveMovingAim({
      shooter: {x: 0, y: 0},
      target: {x: 95 * INCH, y: 0},
      robotVelocity: {x: 0, y: 1.5},
    });
    const first = result.iterations[0];
    expect(result.initialTimeS).toBeCloseTo(0.8, 12);
    expect(Math.hypot(first.correctionM.x, first.correctionM.y)).toBeCloseTo(1.1475, 12);
    expect(first.virtualTarget.y).toBeLessThan(0);
  });

  it('shifts an approaching shot closer and a retreating shot farther away', () => {
    const options = {shooter: {x: 0, y: 0}, target: {x: 95 * INCH, y: 0}};
    const approaching = solveMovingAim({...options, robotVelocity: {x: 1.5, y: 0}});
    const retreating = solveMovingAim({...options, robotVelocity: {x: -1.5, y: 0}});
    expect(approaching.iterations[0].virtualDistanceM).toBeLessThan(95 * INCH);
    expect(retreating.iterations[0].virtualDistanceM).toBeGreaterThan(95 * INCH);
  });

  it('reports the update cap and rejects invalid inputs', () => {
    const result = solveMovingAim({
      shooter: {x: 0, y: 0},
      target: {x: 95 * INCH, y: 0},
      robotVelocity: {x: 0, y: 1.7},
      toleranceS: 0,
      maxUpdates: 1,
    });
    expect(result.converged).toBe(false);
    expect(result.iterations).toHaveLength(1);
    expect(() =>
      solveMovingAim({
        shooter: {x: 0, y: 0},
        target: {x: Number.NaN, y: 0},
        robotVelocity: {x: 0, y: 0},
      }),
    ).toThrow(/finite/);
  });
});
