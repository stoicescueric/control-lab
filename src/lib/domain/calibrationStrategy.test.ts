import {describe, expect, it} from 'vitest';
import {calibrationShotBudget} from './calibrationStrategy';

describe('calibration campaign budget', () => {
  it('separates tuning, validation, and setup shots', () => {
    expect(
      calibrationShotBudget({
        distanceStations: 15,
        candidatePairsPerStation: 9,
        repeatsPerPair: 5,
        heldOutShotsPerStation: 5,
        setupShots: 7,
      }),
    ).toEqual({tuningShots: 675, validationShots: 75, setupShots: 7, totalShots: 757});
  });

  it('rejects fractional and negative campaign counts', () => {
    expect(() =>
      calibrationShotBudget({
        distanceStations: 2.5,
        candidatePairsPerStation: 3,
        repeatsPerPair: 5,
        heldOutShotsPerStation: 5,
      }),
    ).toThrow(/integers/);
    expect(() =>
      calibrationShotBudget({
        distanceStations: 5,
        candidatePairsPerStation: -1,
        repeatsPerPair: 5,
        heldOutShotsPerStation: 5,
      }),
    ).toThrow(/nonnegative/);
  });
});
