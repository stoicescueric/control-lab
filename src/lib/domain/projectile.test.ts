import {describe, expect, it} from 'vitest';
import {
  DRAG_K,
  backtrackRelease,
  entryInterval,
  entersGoal,
  fitReleaseFromPositions,
  G,
  H0,
  integrateStateFor,
  monotoneHermite,
  naturalCubic,
  rk4Step,
  simulateDrag,
  simulateVacuum,
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

describe('video-based release reconstruction', () => {
  const speed = 6.03;
  const angleDeg = 52;
  const angle = (angleDeg * Math.PI) / 180;
  const release: State = [0, H0, speed * Math.cos(angle), speed * Math.sin(angle)];
  const positionAt = (time: number) => {
    const state = integrateStateFor(release, time, 0.00025);
    return {time, x: state[0], z: state[1]};
  };

  it('reverses an exact integrated state back to release', () => {
    const later = integrateStateFor(release, 0.08, 0.00025);
    const recovered = integrateStateFor(later, -0.08, 0.00025);
    recovered.forEach((value, i) => expect(value).toBeCloseTo(release[i], 8));
  });

  it('recovers release speed from three high-rate positions', () => {
    const dt = 1 / 480;
    const estimate = backtrackRelease(positionAt(9 * dt), positionAt(10 * dt), positionAt(11 * dt));
    expect(estimate.speed).toBeCloseTo(speed, 3);
    expect(estimate.angleDeg).toBeCloseTo(angleDeg, 2);
  });

  it('fits release speed and angle to a complete position sequence', () => {
    const samples = Array.from({length: 18}, (_, i) => positionAt((i + 1) / 240));
    const fit = fitReleaseFromPositions(samples, {
      speedMin: 5,
      speedMax: 7,
      angleMinDeg: 45,
      angleMaxDeg: 60,
    });
    expect(Math.abs(fit.speed - speed)).toBeLessThan(0.015);
    expect(Math.abs(fit.angleDeg - angleDeg)).toBeLessThan(0.12);
    expect(fit.rmse).toBeLessThan(0.0003);
  });

  it('rejects invalid inverse-calibration inputs', () => {
    expect(() => integrateStateFor(release, 0.1, 0)).toThrow();
    expect(() => fitReleaseFromPositions([positionAt(0.1)])).toThrow();
    expect(() => backtrackRelease(positionAt(0.02), positionAt(0.01), positionAt(0.03))).toThrow();
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

  it('does not reverse inside intervals around a local extremum', () => {
    const localPeak = [0, 3, 2, 2.5];
    const mono = monotoneHermite([0, 1, 2, 3], localPeak);
    for (let interval = 0; interval < localPeak.length - 1; interval++) {
      const lo = Math.min(localPeak[interval], localPeak[interval + 1]);
      const hi = Math.max(localPeak[interval], localPeak[interval + 1]);
      for (let step = 0; step <= 20; step++) {
        const y = mono.evaluate(interval + step / 20);
        expect(y).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(y).toBeLessThanOrEqual(hi + 1e-9);
      }
    }
  });

  it('rejects malformed knot tables', () => {
    expect(() => naturalCubic([0], [1])).toThrow();
    expect(() => monotoneHermite([0, 0], [1, 2])).toThrow();
    expect(() => monotoneHermite([0, 1], [1, Number.NaN])).toThrow();
  });
});

// Independent scalar midpoint integrator. It uses linear event interpolation,
// no production RK4/Hermite functions, and a 10 microsecond reference step.
function midpointReference(speed: number, degrees: number, dt: number) {
  let x = 0,
    z = 0.4,
    vx = speed * Math.cos((degrees * Math.PI) / 180),
    vz = speed * Math.sin((degrees * Math.PI) / 180);
  const k = (1.204 * 0.47 * Math.PI * (0.127 / 2) ** 2) / (2 * 0.0748);
  for (let i = 0; i < 2 / dt; i++) {
    const magnitude = Math.hypot(vx, vz);
    const mx = vx - (dt / 2) * k * magnitude * vx;
    const mz = vz - (dt / 2) * (9.80665 + k * magnitude * vz);
    const midSpeed = Math.hypot(mx, mz);
    const nextX = x + dt * mx,
      nextZ = z + dt * mz;
    if (z >= 0.984 && nextZ < 0.984 && vz < 0) {
      const fraction = (z - 0.984) / (z - nextZ);
      return {x: x + fraction * (nextX - x), time: (i + fraction) * dt};
    }
    x = nextX;
    z = nextZ;
    vx -= dt * k * midSpeed * mx;
    vz -= dt * (9.80665 + k * midSpeed * mz);
  }
  throw new Error('Reference did not find an event');
}

describe('audited rim-event calculation', () => {
  it('matches analytic vacuum event position and time', () => {
    for (const speed of [4.7, 5.25, 6.6])
      for (const degrees of [42, 50, 58]) {
        const angle = (degrees * Math.PI) / 180,
          vz = speed * Math.sin(angle);
        const disc = vz * vz - 2 * G * (0.984 - H0);
        const event = simulateDrag({v0: speed, angle, dragCoefficient: 0}).rimEvent;
        if (disc < 0) {
          expect(event).toBeNull();
          continue;
        }
        const time = (vz + Math.sqrt(disc)) / G;
        expect(event).not.toBeNull();
        expect(Math.abs(event!.time - time)).toBeLessThan(3e-7);
        expect(Math.abs(event!.x - speed * Math.cos(angle) * time)).toBeLessThan(1e-6);
      }
  });
  it('agrees with a converged independent midpoint reference under drag', () => {
    for (const [speed, degrees] of [
      [5.25, 58],
      [6, 50],
      [4.7, 58],
      [6.6, 42],
    ]) {
      const reference = midpointReference(speed, degrees, 0.00001);
      const finer = midpointReference(speed, degrees, 0.000005);
      expect(Math.abs(reference.x - finer.x)).toBeLessThan(1e-7);
      const event = simulateDrag({v0: speed, angle: (degrees * Math.PI) / 180}).rimEvent!;
      expect(Math.abs(event.x - reference.x)).toBeLessThan(2e-6);
      expect(Math.abs(event.time - reference.time)).toBeLessThan(5e-7);
      expect(event.vz).toBeLessThan(0);
    }
  });
  it('reproduces the paper crossing and exposes missing events', () => {
    expect(simulateDrag({v0: 5.25, angle: (58 * Math.PI) / 180}).rimCross).toBeCloseTo(1.859, 3);
    expect(simulateVacuum(5.25, (58 * Math.PI) / 180).rimCross).toBeCloseTo(2.084, 3);
    expect(simulateDrag({v0: 1, angle: Math.PI / 4}).rimEvent).toBeNull();
    expect(() => simulateDrag({v0: 5, angle: 1, dt: 0})).toThrow();
    expect(() => simulateDrag({v0: NaN, angle: 1})).toThrow();
  });
});

describe('calibration and aperture boundaries', () => {
  it('includes center-entry endpoints and excludes unavailable events', () => {
    const [lo, hi] = entryInterval(1.778);
    expect(hi - lo).toBeCloseTo(0.338, 12);
    expect(entersGoal(lo, 1.778)).toBe(true);
    expect(entersGoal(hi, 1.778)).toBe(true);
    expect(entersGoal(lo - 0.000001, 1.778)).toBe(false);
    expect(entersGoal(hi + 0.000001, 1.778)).toBe(false);
    expect(entersGoal(null, 1.778)).toBe(false);
    expect(entersGoal(NaN, 1.778)).toBe(false);
  });
});
