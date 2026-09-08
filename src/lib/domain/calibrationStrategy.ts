export interface CalibrationCampaign {
  distanceStations: number;
  candidatePairsPerStation: number;
  repeatsPerPair: number;
  heldOutShotsPerStation: number;
  setupShots?: number;
}

export interface CalibrationBudget {
  tuningShots: number;
  validationShots: number;
  setupShots: number;
  totalShots: number;
}

/** A transparent trial-count model for planning a physical calibration campaign. */
export function calibrationShotBudget({
  distanceStations,
  candidatePairsPerStation,
  repeatsPerPair,
  heldOutShotsPerStation,
  setupShots = 0,
}: CalibrationCampaign): CalibrationBudget {
  const values = [
    distanceStations,
    candidatePairsPerStation,
    repeatsPerPair,
    heldOutShotsPerStation,
    setupShots,
  ];
  if (
    !values.every(Number.isInteger) ||
    values.some((value) => value < 0) ||
    distanceStations < 1
  ) {
    throw new Error('campaign counts must be nonnegative integers with at least one station');
  }
  const tuningShots = distanceStations * candidatePairsPerStation * repeatsPerPair;
  const validationShots = distanceStations * heldOutShotsPerStation;
  return {
    tuningShots,
    validationShots,
    setupShots,
    totalShots: tuningShots + validationShots + setupShots,
  };
}
