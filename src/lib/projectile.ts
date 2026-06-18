/* Shared physics for the Advanced Research module.
   ------------------------------------------------------------------
   Every sim in Module 6 (DragAwakening, the IntegratorBattle and
   TransferRealityCheck panels, InterpolationTrap, ShootOnTheMove) draws on the
   same paper model, so the model lives here exactly once. Keeping it pure (no
   React, no DOM) means it is unit-tested in projectile.test.ts and the demos
   cannot quietly disagree with each other about the physics.

   Source: Stoicescu, "Real-Time Trajectory Compensation and Shoot-on-the-Move
   Control for Subcritical Asymmetric Projectiles." */

// ---- small shared helpers ----------------------------------------------

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export interface Vec2 {
  x: number;
  y: number;
}

export const sub = (a: Vec2, b: Vec2): Vec2 => ({x: a.x - b.x, y: a.y - b.y});
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

// ---- projectile constants (SI, paper §2-3) -----------------------------

export const G = 9.81; // gravitational acceleration (m/s^2)
export const RHO = 1.204; // air density at 20 C, sea level (kg/m^3)
export const CD = 0.47; // subcritical sphere drag coefficient (Achenbach)
export const MASS = 0.0748; // projectile mass (kg)
export const AREA = 0.01267; // frontal area pi*(0.0635)^2 (m^2)
export const H0 = 0.4; // launch height above floor (m), per Fig. 5
export const H_RIM = 0.984; // target aperture rim height (m), per §2.2

/* Lumped drag term: a_drag = -DRAG_K * |v| * v, so DRAG_K has units 1/m.
   This single number replaces the made-up constant the dashboard demos used
   to carry, so the integrator panel and the drag panel now match. */
export const DRAG_K = (RHO * CD * AREA) / (2 * MASS);

export type State = readonly [x: number, z: number, vx: number, vz: number];

/* State derivative for [x, z, vx, vz] under gravity + quadratic drag. */
export function projectileDeriv(s: State): number[] {
  const [, , vx, vz] = s;
  const speed = Math.hypot(vx, vz);
  return [vx, vz, -DRAG_K * speed * vx, -G - DRAG_K * speed * vz];
}

type Deriv = (s: State) => number[];

/* One explicit Euler step: trust the start-of-step slope for the whole step. */
export function eulerStep(s: State, dt: number, deriv: Deriv = projectileDeriv): number[] {
  const k = deriv(s);
  return s.map((v, i) => v + dt * k[i]);
}

/* One classical RK4 step: sample the slope four times across the step. Exact
   for motion whose state is polynomial up to degree 4, which is why it nails
   the gravity term that Euler smears. */
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

export interface DragFlight {
  pts: Pt[];
  range: number; // ground range where z returns to 0 (m)
  rimCross: number | null; // x where the descending arc crosses H_RIM (m)
  peak: number; // apex height (m)
}

export interface SimOptions {
  v0: number; // exit speed (m/s)
  angle: number; // launch angle (radians)
  dt?: number; // integration step (s)
  method?: 'rk4' | 'euler';
  h0?: number; // launch height (m)
  thin?: number; // keep every Nth sample in the returned polyline
  maxX?: number; // stop integrating past this range (m)
}

/* Drag-corrected flight, integrated step by step. Interpolates the exact
   ground impact and the descending rim crossing so the demos can mark them. */
export function simulateDrag({
  v0,
  angle,
  dt = 0.001,
  method = 'rk4',
  h0 = H0,
  thin = 8,
  maxX = 20,
}: SimOptions): DragFlight {
  const step = method === 'rk4' ? rk4Step : eulerStep;
  let s: State = [0, h0, v0 * Math.cos(angle), v0 * Math.sin(angle)];
  const pts: Pt[] = [{x: s[0], y: s[1]}];
  let range = 0;
  let rimCross: number | null = null;
  let peak = s[1];

  for (let i = 0; i < 40000 && s[0] < maxX; i++) {
    const prev = s;
    s = step(s, dt) as unknown as State;
    peak = Math.max(peak, s[1]);

    if (rimCross === null && s[3] < 0 && prev[1] >= H_RIM && s[1] < H_RIM) {
      const f = (prev[1] - H_RIM) / (prev[1] - s[1]);
      rimCross = prev[0] + f * (s[0] - prev[0]);
    }
    if (s[1] <= 0) {
      const f = prev[1] / (prev[1] - s[1]);
      range = prev[0] + f * (s[0] - prev[0]);
      pts.push({x: range, y: 0});
      break;
    }
    if (i % thin === 0) pts.push({x: s[0], y: s[1]});
  }
  if (range === 0) range = s[0];
  return {pts, range, rimCross, peak};
}

export interface VacuumFlight {
  pts: Pt[];
  range: number;
  apex: number;
  rimCross: number | null;
}

/* Vacuum flight: the closed form the naive firmware trusts (no drag). */
export function simulateVacuum(v0: number, angle: number, h0 = H0): VacuumFlight {
  const vx = v0 * Math.cos(angle);
  const vz0 = v0 * Math.sin(angle);
  const tLand = (vz0 + Math.sqrt(vz0 * vz0 + 2 * G * h0)) / G;
  const range = vx * tLand;
  const N = 90;
  const pts: Pt[] = [];
  let apex = h0;
  for (let i = 0; i <= N; i++) {
    const t = (tLand * i) / N;
    const z = h0 + vz0 * t - 0.5 * G * t * t;
    apex = Math.max(apex, z);
    pts.push({x: vx * t, y: z});
  }
  let rimCross: number | null = null;
  const a = -0.5 * G;
  const disc = vz0 * vz0 - 4 * a * (h0 - H_RIM);
  if (disc >= 0) {
    const t = (-vz0 - Math.sqrt(disc)) / (2 * a);
    if (t > 0 && t <= tLand) rimCross = vx * t;
  }
  return {pts, range, apex, rimCross};
}

// ---- launcher energy transfer (paper §5) -------------------------------

/* Wheel-surface speed -> projectile exit speed is not 1:1. The naive firmware
   assumes eta ~ 0.70; the measured transfer was nearer 0.26 and dropped with
   launch angle as contact time shrank. */
export const ASSUMED_ETA = 0.7;

export function measuredEta(angleDeg: number): number {
  const droop = clamp(1 - Math.max(0, angleDeg - 30) * 0.006, 0.72, 1);
  return 0.26 * droop;
}

// ---- shoot-on-the-move fixed point (paper §7.4-7.6) --------------------

export const SOTM_GAIN = 0.9; // G: accounts for the non-ballistic spin-up phase
export const FEEDER_DELAY = 0.05; // t_d (s)
export const SOTM_TOL = 0.05; // flight-time convergence tolerance (s)
export const SOTM_MAX_ITERS = 5;

/* Time-of-flight LUT, linearised from the deployed TOF table
   (d = 95 in -> 0.80 s, 113 in -> 0.96 s; paper Table 2). Monotone in d. */
export function tof(dIn: number): number {
  return clamp(-0.044 + 0.00889 * dIn, 0.3, 2.2);
}

export interface SotmIter {
  k: number;
  pv: Vec2;
  d: number;
  tf: number;
  T: number | null;
  delta: number | null;
  done: boolean;
}

export interface SotmResult {
  pv: Vec2;
  d: number;
  tf: number;
  iters: SotmIter[];
}

/* Fixed-point solver for the virtual aim point, exactly as Sensors.update()
   runs it: aim at the real target, read flight time, shift by the robot's lead,
   repeat until the flight time stops moving (<= SOTM_MAX_ITERS rounds). */
export function solveSOTM(
  shooter: Vec2,
  goal: Vec2,
  vR: Vec2,
  flightTime: (dIn: number) => number = tof,
): SotmResult {
  const iters: SotmIter[] = [];
  let pv: Vec2 = {...goal};
  let d = dist(pv, shooter);
  let tf = flightTime(d);
  iters.push({k: 0, pv, d, tf, T: null, delta: null, done: false});

  for (let k = 1; k <= SOTM_MAX_ITERS; k++) {
    const T = FEEDER_DELAY + tf;
    const pvNew: Vec2 = {x: goal.x + SOTM_GAIN * vR.x * T, y: goal.y + SOTM_GAIN * vR.y * T};
    const dNew = dist(pvNew, shooter);
    const tfNew = flightTime(dNew);
    const delta = Math.abs(tfNew - tf);
    const done = delta < SOTM_TOL;
    iters.push({k, pv: pvNew, d: dNew, tf: tfNew, T, delta, done});
    pv = pvNew;
    d = dNew;
    tf = tfNew;
    if (done) break;
  }
  return {pv, d, tf, iters};
}

// ---- calibration-table interpolation (paper §7.2) ----------------------

/* Natural cubic spline: smooth, but free to overshoot a flat data shelf.
   Solves the tridiagonal system for the second derivatives (natural ends
   M_0 = M_{n-1} = 0) via the Thomas algorithm, then evaluates the cubic. */
export function naturalCubic(xs: number[], ys: number[]): (x: number) => number {
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
    return A * ys[i] + B * ys[i + 1] + (((A * A * A - A) * M[i] + (B * B * B - B) * M[i + 1]) * (hi * hi)) / 6;
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
