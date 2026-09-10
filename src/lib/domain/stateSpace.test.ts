import {describe, expect, it} from 'vitest';
import {
  discretizeScalarPlant,
  elevatorPlantStep,
  scalarPlantStep,
  stateSpaceOperationEstimate,
} from './stateSpace';

describe('discretizeScalarPlant', () => {
  it('uses the finite A=0 limit', () => {
    const result = discretizeScalarPlant(0, 3, 0.2);
    expect(result.ad).toBe(1);
    expect(result.bd).toBeCloseTo(0.6, 12);
  });

  it('matches a stable negative-A plant', () => {
    const result = discretizeScalarPlant(-4, 200, 0.02);
    expect(result.ad).toBeCloseTo(Math.exp(-0.08), 12);
    expect(result.bd).toBeCloseTo((200 * (Math.exp(-0.08) - 1)) / -4, 12);
  });

  it('is continuous for very small A', () => {
    const zero = discretizeScalarPlant(0, 2, 0.05);
    const near = discretizeScalarPlant(1e-10, 2, 0.05);
    expect(near.ad).toBeCloseTo(zero.ad, 9);
    expect(near.bd).toBeCloseTo(zero.bd, 9);
  });

  it('returns identity/no input effect at dt=0', () => {
    expect(discretizeScalarPlant(-4, 200, 0)).toEqual({ad: 1, bd: 0});
    expect(scalarPlantStep(12, 6, -4, 200, 0)).toBe(12);
  });

  it('rejects non-finite inputs and negative dt', () => {
    expect(() => discretizeScalarPlant(Number.NaN, 1, 0.02)).toThrow(/finite/);
    expect(() => discretizeScalarPlant(1, Number.POSITIVE_INFINITY, 0.02)).toThrow(/finite/);
    expect(() => discretizeScalarPlant(1, 1, -0.02)).toThrow(/non-negative/);
    expect(() => scalarPlantStep(Number.NaN, 0, 1, 1, 0.02)).toThrow(/finite/);
  });
});

describe('elevatorPlantStep', () => {
  it.each([-1e-16, 1e-16, -1e-8, 1e-8])('approaches constant acceleration at a=%s', (a) => {
    const next = elevatorPlantStep({position: 1, velocity: 2}, 3, a, 4, 0.5);
    expect(next.position).toBeCloseTo(3.5, 7);
    expect(next.velocity).toBeCloseTo(8, 7);
  });

  it('uses the constant-acceleration limit when damping is zero', () => {
    expect(elevatorPlantStep({position: 1, velocity: 2}, 3, 0, 4, 0.5)).toEqual({
      position: 3.5,
      velocity: 8,
    });
  });

  it('integrates position consistently with the scalar velocity model', () => {
    const state = {position: 0.4, velocity: 3};
    const next = elevatorPlantStep(state, 2, -4, 5, 0.02);
    expect(next.velocity).toBeCloseTo(scalarPlantStep(3, 2, -4, 5, 0.02), 12);
    expect(next.position).toBeGreaterThan(state.position);
  });
});

describe('stateSpaceOperationEstimate', () => {
  it('shows cubic growth only when covariance is solved online', () => {
    expect(stateSpaceOperationEstimate(2, 1)).toEqual({
      controller: 2,
      steadyObserver: 10,
      covarianceUpdate: 25,
    });
    expect(stateSpaceOperationEstimate(4, 1).covarianceUpdate).toBe(161);
  });

  it('rejects non-positive and fractional dimensions', () => {
    expect(() => stateSpaceOperationEstimate(0, 1)).toThrow(/positive integers/);
    expect(() => stateSpaceOperationEstimate(2.5, 1)).toThrow(/positive integers/);
  });
});
