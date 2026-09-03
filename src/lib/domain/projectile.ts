/* Physics and launcher maps for the audited launcher case study. SI units for flight. */
export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
export const INCH = 0.0254;
export const G = 9.80665;
export const RHO = 1.204;
export const CD = 0.47; // effective constant, not identified from the tracking video
export const MASS = 0.0748;
export const DIAMETER = 0.127;
export const AREA = Math.PI * (DIAMETER / 2) ** 2;
export const H0 = 0.4;
export const H_RIM = 0.984;
export const GOAL_DEPTH = 0.465;
export const DRAG_K = (RHO * CD * AREA) / (2 * MASS);
export type State = readonly [x: number, z: number, vx: number, vz: number];
type Deriv = (s: State) => number[];
export function derivative(dragCoefficient = CD, windMps = 0): Deriv {
  const k = (RHO * dragCoefficient * AREA) / (2 * MASS);
  return ([, , vx, vz]) => {
    const airX = vx - windMps;
    const speed = Math.hypot(airX, vz);
    return [vx, vz, -k * speed * airX, -G - k * speed * vz];
  };
}
export const projectileDeriv: Deriv = derivative();
export function eulerStep(s: State, dt: number, deriv: Deriv = projectileDeriv): number[] {
  const k = deriv(s);
  return s.map((v, i) => v + dt * k[i]);
}
export function rk4Step(s: State, dt: number, deriv: Deriv = projectileDeriv): number[] {
  const k1 = deriv(s);
  const k2 = deriv(s.map((v, i) => v + 0.5 * dt * k1[i]) as unknown as State);
  const k3 = deriv(s.map((v, i) => v + 0.5 * dt * k2[i]) as unknown as State);
  const k4 = deriv(s.map((v, i) => v + dt * k3[i]) as unknown as State);
  return s.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}
export interface Pt {
  x: number;
  y: number;
}
export interface RimEvent {
  x: number;
  time: number;
  vx: number;
  vz: number;
  fraction: number;
  before: State;
  after: State;
}
export function hermitePosition(
  p0: number,
  p1: number,
  v0: number,
  v1: number,
  dt: number,
  t: number,
): number {
  return (
    (2 * t ** 3 - 3 * t * t + 1) * p0 +
    (t ** 3 - 2 * t * t + t) * dt * v0 +
    (-2 * t ** 3 + 3 * t * t) * p1 +
    (t ** 3 - t * t) * dt * v1
  );
}
function hermiteVelocity(
  p0: number,
  p1: number,
  v0: number,
  v1: number,
  dt: number,
  t: number,
): number {
  return (
    ((6 * t * t - 6 * t) * p0 +
      (3 * t * t - 4 * t + 1) * dt * v0 +
      (-6 * t * t + 6 * t) * p1 +
      (3 * t * t - 2 * t) * dt * v1) /
    dt
  );
}
export function reconstructRim(before: State, after: State, time: number, dt: number): RimEvent {
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (hermitePosition(before[1], after[1], before[3], after[3], dt, mid) > H_RIM) lo = mid;
    else hi = mid;
  }
  const fraction = (lo + hi) / 2;
  return {
    x: hermitePosition(before[0], after[0], before[2], after[2], dt, fraction),
    time: time + fraction * dt,
    vx: hermiteVelocity(before[0], after[0], before[2], after[2], dt, fraction),
    vz: hermiteVelocity(before[1], after[1], before[3], after[3], dt, fraction),
    fraction,
    before,
    after,
  };
}
export interface SimOptions {
  v0: number;
  angle: number; // radians
  dt?: number;
  method?: 'rk4' | 'euler';
  h0?: number;
  thin?: number;
  maxX?: number;
  dragCoefficient?: number;
  windMps?: number;
  stopAtRim?: boolean;
}
export interface DragFlight {
  pts: Pt[];
  range: number;
  rimCross: number | null;
  rimEvent: RimEvent | null;
  peak: number;
}
export function simulateDrag({
  v0,
  angle,
  dt = 0.02,
  method = 'rk4',
  h0 = H0,
  thin = 1,
  maxX = 20,
  dragCoefficient = CD,
  windMps = 0,
  stopAtRim = false,
}: SimOptions): DragFlight {
  if (
    ![v0, angle, dt, h0, dragCoefficient, windMps, maxX, thin].every(Number.isFinite) ||
    v0 < 0 ||
    dt <= 0 ||
    dt > 0.25 ||
    h0 < 0 ||
    dragCoefficient < 0 ||
    maxX <= 0 ||
    thin < 1
  ) {
    throw new Error('Flight inputs must be finite and physically valid');
  }
  const step = method === 'rk4' ? rk4Step : eulerStep;
  const deriv = derivative(dragCoefficient, windMps);
  let s: State = [0, h0, v0 * Math.cos(angle), v0 * Math.sin(angle)];
  const pts: Pt[] = stopAtRim ? [] : [{x: 0, y: h0}];
  let rimEvent: RimEvent | null = null;
  let peak = h0,
    range = 0;
  for (let i = 0; i < Math.ceil(8 / dt) && s[0] < maxX; i++) {
    const prev = s;
    s = step(s, dt, deriv) as unknown as State;
    peak = Math.max(peak, s[1]);
    if (!rimEvent && s[3] < 0 && prev[1] >= H_RIM && s[1] < H_RIM) {
      rimEvent = reconstructRim(prev, s, i * dt, dt);
      if (stopAtRim) break;
    }
    if (s[1] <= 0) {
      const f = prev[1] / (prev[1] - s[1]);
      range = prev[0] + f * (s[0] - prev[0]);
      if (!stopAtRim) pts.push({x: range, y: 0});
      break;
    }
    if (stopAtRim && s[3] < 0 && s[1] < H_RIM) break;
    if (!stopAtRim && i % thin === 0) pts.push({x: s[0], y: s[1]});
  }
  return {pts, range: range || s[0], rimCross: rimEvent?.x ?? null, rimEvent, peak};
}
export function entryInterval(frontLipM: number): readonly [number, number] {
  return [frontLipM + DIAMETER / 2, frontLipM + GOAL_DEPTH - DIAMETER / 2];
}
export function entersGoal(crossing: number | null, frontLipM: number): boolean {
  const [lo, hi] = entryInterval(frontLipM);
  return crossing !== null && Number.isFinite(crossing) && crossing >= lo && crossing <= hi;
}
export interface VacuumFlight {
  pts: Pt[];
  range: number;
  apex: number;
  rimCross: number | null;
}
export function simulateVacuum(v0: number, angle: number, h0 = H0): VacuumFlight {
  const vx = v0 * Math.cos(angle),
    vz = v0 * Math.sin(angle);
  const end = (vz + Math.sqrt(vz * vz + 2 * G * h0)) / G;
  const pts = Array.from({length: 91}, (_, i) => {
    const t = (end * i) / 90;
    return {x: vx * t, y: h0 + vz * t - (G * t * t) / 2};
  });
  const disc = vz * vz - 2 * G * (H_RIM - h0);
  const time = disc >= 0 ? (vz + Math.sqrt(disc)) / G : null;
  return {
    pts,
    range: vx * end,
    apex: h0 + (vz * vz) / (2 * G),
    rimCross: time !== null && time > 0 && time <= end ? vx * time : null,
  };
}
export const MEAN_ETA = 0.259;
export const WHEEL_RADIUS = 0.0692;
export const TICKS_PER_REV = 28;
export function wheelSurfaceSpeed(ticksPerSecond: number): number {
  return (2 * Math.PI * WHEEL_RADIUS * ticksPerSecond) / TICKS_PER_REV;
}

export interface TimedPosition {
  time: number;
  x: number;
  z: number;
}

export interface ReleaseEstimate {
  state: State;
  speed: number;
  angleDeg: number;
}

/** Advance or rewind a drag-model state by a signed duration. */
export function integrateStateFor(
  initial: State,
  duration: number,
  maxStep = 0.001,
  dragCoefficient = CD,
): State {
  if (
    !initial.every(Number.isFinite) ||
    !Number.isFinite(duration) ||
    !Number.isFinite(maxStep) ||
    maxStep <= 0 ||
    !Number.isFinite(dragCoefficient) ||
    dragCoefficient < 0
  ) {
    throw new Error('Integration inputs must be finite and physically valid');
  }
  if (duration === 0) return initial;
  const steps = Math.ceil(Math.abs(duration) / maxStep);
  const dt = duration / steps;
  const deriv = derivative(dragCoefficient);
  let state = initial;
  for (let i = 0; i < steps; i++) {
    state = rk4Step(state, dt, deriv) as unknown as State;
  }
  return state;
}

/** Estimate a tracked-frame velocity, then integrate that state back to release. */
export function backtrackRelease(
  previous: TimedPosition,
  current: TimedPosition,
  next: TimedPosition,
  releaseTime = 0,
): ReleaseEstimate {
  const values = [
    previous.time,
    previous.x,
    previous.z,
    current.time,
    current.x,
    current.z,
    next.time,
    next.x,
    next.z,
    releaseTime,
  ];
  if (
    !values.every(Number.isFinite) ||
    !(previous.time < current.time && current.time < next.time) ||
    releaseTime > current.time
  ) {
    throw new Error('Tracked frames must be finite, ordered, and after release');
  }
  const sampleSpan = next.time - previous.time;
  const measured: State = [
    current.x,
    current.z,
    (next.x - previous.x) / sampleSpan,
    (next.z - previous.z) / sampleSpan,
  ];
  const state = integrateStateFor(measured, releaseTime - current.time, 0.0005);
  return {
    state,
    speed: Math.hypot(state[2], state[3]),
    angleDeg: (Math.atan2(state[3], state[2]) * 180) / Math.PI,
  };
}

export interface ReleaseFitOptions {
  speedMin?: number;
  speedMax?: number;
  angleMinDeg?: number;
  angleMaxDeg?: number;
  h0?: number;
  dragCoefficient?: number;
}

export interface ReleaseFit {
  speed: number;
  angleDeg: number;
  rmse: number;
}

/** Fit one release state by integrating candidates forward to every tracked frame. */
export function fitReleaseFromPositions(
  samples: TimedPosition[],
  options: ReleaseFitOptions = {},
): ReleaseFit {
  if (
    samples.length < 3 ||
    samples.some(
      (sample, i) =>
        ![sample.time, sample.x, sample.z].every(Number.isFinite) ||
        sample.time <= 0 ||
        (i > 0 && sample.time <= samples[i - 1].time),
    )
  ) {
    throw new Error('Fit requires at least three finite, ordered post-release positions');
  }
  const h0 = options.h0 ?? H0;
  const dragCoefficient = options.dragCoefficient ?? CD;
  let speedLo = options.speedMin ?? 4;
  let speedHi = options.speedMax ?? 8;
  let angleLo = options.angleMinDeg ?? 35;
  let angleHi = options.angleMaxDeg ?? 70;
  if (
    ![h0, dragCoefficient, speedLo, speedHi, angleLo, angleHi].every(Number.isFinite) ||
    h0 < 0 ||
    dragCoefficient < 0 ||
    speedLo <= 0 ||
    speedHi <= speedLo ||
    angleHi <= angleLo
  ) {
    throw new Error('Fit bounds must be finite and physically valid');
  }

  let best: ReleaseFit = {speed: speedLo, angleDeg: angleLo, rmse: Infinity};
  const search = (sLo: number, sHi: number, aLo: number, aHi: number, divisions: number) => {
    for (let si = 0; si <= divisions; si++) {
      const speed = sLo + ((sHi - sLo) * si) / divisions;
      for (let ai = 0; ai <= divisions; ai++) {
        const angleDeg = aLo + ((aHi - aLo) * ai) / divisions;
        const angle = (angleDeg * Math.PI) / 180;
        let state: State = [0, h0, speed * Math.cos(angle), speed * Math.sin(angle)];
        let time = 0;
        let sumSquares = 0;
        for (const sample of samples) {
          state = integrateStateFor(state, sample.time - time, 0.0025, dragCoefficient);
          time = sample.time;
          sumSquares += (state[0] - sample.x) ** 2 + (state[1] - sample.z) ** 2;
        }
        const rmse = Math.sqrt(sumSquares / (2 * samples.length));
        if (rmse < best.rmse) best = {speed, angleDeg, rmse};
      }
    }
  };

  search(speedLo, speedHi, angleLo, angleHi, 22);
  const speedRadius = (speedHi - speedLo) / 22;
  const angleRadius = (angleHi - angleLo) / 22;
  speedLo = Math.max(0.01, best.speed - speedRadius);
  speedHi = best.speed + speedRadius;
  angleLo = best.angleDeg - angleRadius;
  angleHi = best.angleDeg + angleRadius;
  search(speedLo, speedHi, angleLo, angleHi, 22);
  return best;
}

// ---- calibration-table interpolation (paper §7.2) ----------------------

function validateKnots(xs: number[], ys: number[]): void {
  if (xs.length !== ys.length || xs.length < 2) {
    throw new Error('xs and ys must have the same length and contain at least two knots');
  }
  for (let i = 0; i < xs.length; i++) {
    if (!Number.isFinite(xs[i]) || !Number.isFinite(ys[i])) {
      throw new Error('all knot coordinates must be finite');
    }
    if (i > 0 && xs[i] <= xs[i - 1]) {
      throw new Error('x knots must be strictly increasing');
    }
  }
}

/* Natural cubic spline: smooth, but free to overshoot a flat data shelf.
   Solves the tridiagonal system for the second derivatives (natural ends
   M_0 = M_{n-1} = 0) via the Thomas algorithm, then evaluates the cubic. */
export function naturalCubic(xs: number[], ys: number[]): (x: number) => number {
  validateKnots(xs, ys);
  const n = xs.length;
  const h = (i: number) => xs[i + 1] - xs[i];
  const M = new Array(n).fill(0);
  if (n >= 3) {
    const lower = new Array(n).fill(0);
    const diag = new Array(n).fill(1);
    const upper = new Array(n).fill(0);
    const rhs = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) {
      lower[i] = h(i - 1);
      diag[i] = 2 * (h(i - 1) + h(i));
      upper[i] = h(i);
      rhs[i] = 6 * ((ys[i + 1] - ys[i]) / h(i) - (ys[i] - ys[i - 1]) / h(i - 1));
    }
    for (let i = 2; i < n - 1; i++) {
      const w = lower[i] / diag[i - 1];
      diag[i] -= w * upper[i - 1];
      rhs[i] -= w * rhs[i - 1];
    }
    for (let i = n - 2; i >= 1; i--) {
      M[i] = (rhs[i] - upper[i] * M[i + 1]) / diag[i];
    }
  }
  return (x: number) => {
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const hi = h(i);
    const A = (xs[i + 1] - x) / hi;
    const B = (x - xs[i]) / hi;
    return (
      A * ys[i] +
      B * ys[i + 1] +
      (((A * A * A - A) * M[i] + (B * B * B - B) * M[i + 1]) * (hi * hi)) / 6
    );
  };
}

export type KnotFlag = 'ok' | 'flat' | 'projected';

export interface MonotoneHermite {
  evaluate: (x: number) => number;
  m: number[]; // per-knot tangents
  flag: KnotFlag[]; // how each knot's tangent was constrained
}

/* Monotone cubic Hermite (Fritsch-Carlson): mirrors the firmware's InterpLUT.
   Secant slopes -> averaged tangents -> clamp each tangent pair into the
   radius-3 monotonicity circle, with flat segments forced to zero slope.
   Returns the evaluator plus per-knot tangents and flags so the UI can show
   the algorithm acting. */
export function monotoneHermite(xs: number[], ys: number[]): MonotoneHermite {
  validateKnots(xs, ys);
  const n = xs.length;
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i++) delta.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));

  const m = new Array(n).fill(0);
  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = 0.5 * (delta[i - 1] + delta[i]);

  const flag: KnotFlag[] = new Array(n).fill('ok');

  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      flag[i] = flag[i] === 'projected' ? 'projected' : 'flat';
      flag[i + 1] = 'flat';
      continue;
    }
    // A tangent that opposes this interval's secant would create a local reversal.
    if (m[i] / delta[i] < 0) {
      m[i] = 0;
      if (flag[i] !== 'flat') flag[i] = 'projected';
    }
    if (m[i + 1] / delta[i] < 0) {
      m[i + 1] = 0;
      if (flag[i + 1] !== 'flat') flag[i + 1] = 'projected';
    }
    const a = m[i] / delta[i];
    const b = m[i + 1] / delta[i];
    if (a * a + b * b > 9) {
      const tau = 3 / Math.sqrt(a * a + b * b);
      m[i] = tau * a * delta[i];
      m[i + 1] = tau * b * delta[i];
      if (flag[i] !== 'flat') flag[i] = 'projected';
      if (flag[i + 1] !== 'flat') flag[i + 1] = 'projected';
    }
  }

  const evaluate = (x: number) => {
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const hk = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / hk;
    const h00 = (1 + 2 * t) * (1 - t) * (1 - t);
    const h10 = t * (1 - t) * (1 - t);
    const h01 = t * t * (3 - 2 * t);
    const h11 = t * t * (t - 1);
    return h00 * ys[i] + h10 * hk * m[i] + h01 * ys[i + 1] + h11 * hk * m[i + 1];
  };
  return {evaluate, m, flag};
}
