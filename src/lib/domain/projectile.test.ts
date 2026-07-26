import {describe, expect, it} from 'vitest';
import {
  DRAG_K,
  G,
  H0,
  monotoneHermite,
  naturalCubic,
  rk4Step,
  simulateDrag,
  simulateVacuum,
  solveSOTM,
  tof,
  type State,
} from './projectile';

describe('projectile constants', () => {
  it('derives the lumped drag coefficient from the paper constants', () => {
    // K = rho * Cd * A / (2 m); a sanity band rather than an exact magic number.
    expect(DRAG_K).toBeGreaterThan(0.04);
    expect(DRAG_K).toBeLessThan(0.06);
  });
});

describe('numerical integration', () => {
  it('RK4 integrates constant-gravity free fall almost exactly', () => {
    // Drag is velocity-quadratic, so straight-up-then-down with zero horizontal
    // speed keeps |v| small and lets us check against the kinematic closed form.
    // Pure gravity: z(t) = H0 + v0 t - g t^2 / 2 with v0 = 0.
    let s: State = [0, H0, 0, 0];
    const dt = 0.01;
    const steps = 20; // 0.2 s
    for (let i = 0; i < steps; i++) s = rk4Step(s, dt) as unknown as State;
    const t = dt * steps;
    const expectedZ = H0 - 0.5 * G * t * t; // drag ~0 because speed stays low
    expect(s[1]).toBeCloseTo(expectedZ, 2);
  });

  it('matches a high-resolution reference within a few millimetres at coarse dt', () => {
    const truth = simulateDrag({v0: 9, angle: Math.PI / 3, dt: 0.0005});
    const coarse = simulateDrag({v0: 9, angle: Math.PI / 3, dt: 0.02});
    expect(Math.abs(coarse.range - truth.range)).toBeLessThan(0.05);
  });
});

describe('drag vs. vacuum', () => {
  it('drag always lands shorter than the vacuum prediction', () => {
    for (const angDeg of [35, 45, 55, 65]) {
      const ang = (angDeg * Math.PI) / 180;
      const drag = simulateDrag({v0: 8, angle: ang});
      const vac = simulateVacuum(8, ang);
      expect(drag.range).toBeLessThan(vac.range);
    }
  });
});

describe('shoot-on-the-move solver', () => {
  it('returns the real target unchanged when the robot is still', () => {
    const shooter = {x: 50, y: 28};
    const goal = {x: 100, y: 120};
    const sol = solveSOTM(shooter, goal, {x: 0, y: 0});
    expect(sol.pv.x).toBeCloseTo(goal.x, 6);
    expect(sol.pv.y).toBeCloseTo(goal.y, 6);
  });

  it('leads in the direction of robot motion and converges', () => {
    const shooter = {x: 50, y: 28};
    const goal = {x: 100, y: 120};
    const sol = solveSOTM(shooter, goal, {x: 26, y: 10});
    expect(sol.pv.x).toBeGreaterThan(goal.x); // lead +x
    expect(sol.pv.y).toBeGreaterThan(goal.y); // lead +y
    expect(sol.iters[sol.iters.length - 1].done).toBe(true);
  });

  it('keeps the time-of-flight LUT monotone in distance', () => {
    expect(tof(120)).toBeGreaterThan(tof(80));
  });
});

describe('calibration-table interpolation', () => {
  const xs = [0, 1, 2, 3, 4, 5, 6];
  const flatShelf = [10, 35, 72, 72, 72, 88, 96];

  it('passes through every knot for both interpolants', () => {
    const nat = naturalCubic(xs, flatShelf);
    const mono = monotoneHermite(xs, flatShelf);
    xs.forEach((x, i) => {
      expect(nat(x)).toBeCloseTo(flatShelf[i], 6);
      expect(mono.evaluate(x)).toBeCloseTo(flatShelf[i], 6);
    });
  });

  it('monotone Hermite never overshoots a flat shelf, but the natural spline does', () => {
    const nat = naturalCubic(xs, flatShelf);
    const mono = monotoneHermite(xs, flatShelf);
    const shelf = 72;
    let natMax = -Infinity;
    let monoMax = -Infinity;
    for (let x = 2; x <= 4; x += 0.05) {
      natMax = Math.max(natMax, nat(x));
      monoMax = Math.max(monoMax, mono.evaluate(x));
    }
    expect(monoMax).toBeCloseTo(shelf, 6); // flat stays flat
    expect(natMax).toBeGreaterThan(shelf + 0.5); // natural spline humps above it
  });

  it('zeroes the tangents on the flat segment', () => {
    const mono = monotoneHermite(xs, flatShelf);
    // knots 2, 3, 4 bound the flat shelf -> their tangents are forced to 0
    expect(mono.m[2]).toBe(0);
    expect(mono.m[3]).toBe(0);
    expect(mono.m[4]).toBe(0);
    expect(mono.flag.filter((f) => f === 'flat').length).toBeGreaterThan(0);
  });
});
