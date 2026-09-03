import {describe, expect, it} from 'vitest';
import {
  ANGLE_COUNT,
  ANGLE_RADIUS,
  BOX_COUNT,
  SPEED_COUNT,
  SPEED_RADIUS,
  buildEventMap,
  prefixSum,
  rectangleCount,
  selectLaunch,
} from './launchSelection';
import {INCH, entersGoal} from './projectile';

describe('bounded perturbation selection', () => {
  const events = buildEventMap();
  it('reproduces the audited 70-inch selection and make count', () => {
    const {best} = selectLaunch(events, 70 * INCH);
    expect(best).toMatchObject({speed: 5.25, angle: 58, made: 494, total: 1767});
    expect(best!.coverage).toBeCloseTo(0.28, 3);
  });
  it('matches exhaustive counting and selection at several distances', () => {
    for (const distance of [60, 70, 95, 105]) {
      const result = selectLaunch(events, distance * INCH);
      let max = -1;
      let chosen = result.candidates[0];
      for (const candidate of result.candidates) {
        let count = 0;
        for (let row = candidate.row - SPEED_RADIUS; row <= candidate.row + SPEED_RADIUS; row++) {
          for (let col = candidate.col - ANGLE_RADIUS; col <= candidate.col + ANGLE_RADIUS; col++) {
            count += Number(entersGoal(events[row * ANGLE_COUNT + col], distance * INCH));
          }
        }
        expect(candidate.made).toBe(count);
        if (count > max) {
          max = count;
          chosen = candidate;
        }
      }
      expect(result.best).toEqual(chosen);
    }
  });
  it('breaks equal counts by speed then angle and rejects missing events', () => {
    const uniform = new Float64Array(SPEED_COUNT * ANGLE_COUNT).fill(2);
    const best = selectLaunch(uniform, 70 * INCH).best!;
    expect(best.speed).toBeCloseTo(4.7, 12);
    expect(best.angle).toBe(42);
    expect(best.made).toBe(BOX_COUNT);
    expect(selectLaunch(uniform.fill(NaN), 70 * INCH).best).toBeNull();
    expect(selectLaunch(events, 20).best).toBeNull();
  });
  it('counts rectangles touching each tile edge', () => {
    const values = Uint8Array.from([1, 0, 1, 0, 1, 0]);
    const sums = prefixSum(values, 2, 3);
    expect(rectangleCount(sums, 3, 0, 0, 1, 2)).toBe(3);
    expect(rectangleCount(sums, 3, 0, 2, 1, 2)).toBe(1);
    expect(rectangleCount(sums, 3, 1, 0, 1, 1)).toBe(1);
  });
});
