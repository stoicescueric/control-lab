import {describe, expect, it} from 'vitest';
import {discretizeScalarPlant, scalarPlantStep} from './stateSpace';

describe('discretizeScalarPlant', () => {
  it('uses the finite A=0 limit', () => {
    const result = discretizeScalarPlant(0, 3, 0.2);
    expect(result.ad).toBe(1);
    expect(result.bd).toBeCloseTo(0.6, 12);
  });

  it('matches a stable negative-A plant', () => {
    const result = discretizeScalarPlant(-4, 200, 0.02);
    expect(result.ad).toBeCloseTo(Math.exp(-0.08), 12);
    expect(result.bd).toBeCloseTo(200 * (Math.exp(-0.08) - 1) / -4, 12);
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
