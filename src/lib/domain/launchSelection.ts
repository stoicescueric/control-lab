import {entersGoal, simulateDrag} from './projectile';

// Expanded event tile: every deployed perturbation is represented, even outside
// the nominal command envelope. Integer lattice indices avoid floating drift.
export const SPEED_MIN = 4;
export const SPEED_STEP = 0.025;
export const SPEED_COUNT = 133;
export const ANGLE_MIN = 40.5;
export const ANGLE_STEP = 0.1;
export const ANGLE_COUNT = 191;
export const SPEED_RADIUS = 28;
export const ANGLE_RADIUS = 15;
export const BOX_COUNT = (2 * SPEED_RADIUS + 1) * (2 * ANGLE_RADIUS + 1);
export const speedAt = (i: number): number => SPEED_MIN + i * SPEED_STEP;
export const angleAt = (j: number): number => ANGLE_MIN + j * ANGLE_STEP;

export function buildEventMap(): Float64Array {
  const events = new Float64Array(SPEED_COUNT * ANGLE_COUNT);
  for (let i = 0; i < SPEED_COUNT; i++) {
    for (let j = 0; j < ANGLE_COUNT; j++) {
      events[i * ANGLE_COUNT + j] =
        simulateDrag({v0: speedAt(i), angle: (angleAt(j) * Math.PI) / 180, stopAtRim: true})
          .rimCross ?? NaN;
    }
  }
  return events;
}

export function prefixSum(values: Uint8Array, rows: number, cols: number): Uint32Array {
  const sums = new Uint32Array((rows + 1) * (cols + 1));
  for (let i = 0; i < rows; i++) {
    let row = 0;
    for (let j = 0; j < cols; j++) {
      row += values[i * cols + j];
      sums[(i + 1) * (cols + 1) + j + 1] = sums[i * (cols + 1) + j + 1] + row;
    }
  }
  return sums;
}

// Inclusive rectangle; callers provide indices inside the tile.
export function rectangleCount(
  sums: Uint32Array,
  cols: number,
  row0: number,
  col0: number,
  row1: number,
  col1: number,
): number {
  const stride = cols + 1;
  return (
    sums[(row1 + 1) * stride + col1 + 1] -
    sums[row0 * stride + col1 + 1] -
    sums[(row1 + 1) * stride + col0] +
    sums[row0 * stride + col0]
  );
}

export interface LaunchCandidate {
  speed: number;
  angle: number;
  row: number;
  col: number;
  made: number;
  total: number;
  coverage: number;
  crossing: number;
}
export interface Selection {
  made: Uint8Array;
  candidates: LaunchCandidate[];
  best: LaunchCandidate | null;
  baseline: LaunchCandidate | null;
}

export function selectLaunch(events: Float64Array, frontLipM: number): Selection {
  if (events.length !== SPEED_COUNT * ANGLE_COUNT || !Number.isFinite(frontLipM)) {
    throw new Error('Expected a complete event tile and a finite target distance');
  }
  const made = Uint8Array.from(events, (x) => Number(entersGoal(x, frontLipM)));
  const sums = prefixSum(made, SPEED_COUNT, ANGLE_COUNT);
  const candidates: LaunchCandidate[] = [];
  let best: LaunchCandidate | null = null;
  let baseline: LaunchCandidate | null = null;
  // Ascending iteration implements exact tie breaks: lower speed, then angle.
  for (let row = SPEED_RADIUS; speedAt(row) <= 6.61; row++) {
    for (let col = ANGLE_RADIUS; angleAt(col) <= 58; col++) {
      const index = row * ANGLE_COUNT + col;
      if (!made[index]) continue;
      const count = rectangleCount(
        sums,
        ANGLE_COUNT,
        row - SPEED_RADIUS,
        col - ANGLE_RADIUS,
        row + SPEED_RADIUS,
        col + ANGLE_RADIUS,
      );
      const candidate = {
        speed: speedAt(row),
        angle: angleAt(col),
        row,
        col,
        made: count,
        total: BOX_COUNT,
        coverage: count / BOX_COUNT,
        crossing: events[index],
      };
      candidates.push(candidate);
      if (!best || count > best.made) best = candidate;
      if (!baseline || count < baseline.made) baseline = candidate;
    }
  }
  return {made, candidates, best, baseline};
}
