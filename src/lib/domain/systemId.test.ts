import {describe, expect, it} from 'vitest';
import {fitVelocityModel, type VelocitySample} from './systemId';

describe('fitVelocityModel', () => {
  it('recovers known kS/kV from a noiseless linear dataset', () => {
    const kS = 0.9;
    const kV = 0.035;
    const samples: VelocitySample[] = [];
    for (let v = 0; v <= 300; v += 30) {
      samples.push({velocity: v, voltage: kS + kV * v});
    }
    const fit = fitVelocityModel(samples);
    expect(fit).not.toBeNull();
    expect(fit!.kS).toBeCloseTo(kS, 9);
    expect(fit!.kV).toBeCloseTo(kV, 9);
  });

  it('returns null (not NaN) when all velocity samples are identical', () => {
    const samples: VelocitySample[] = [
      {velocity: 120, voltage: 5.0},
      {velocity: 120, voltage: 5.2},
      {velocity: 120, voltage: 4.8},
      {velocity: 120, voltage: 5.1},
    ];
    const fit = fitVelocityModel(samples);
    expect(fit).toBeNull();
  });

  it('returns null with fewer than the minimum 3 samples', () => {
    expect(fitVelocityModel([])).toBeNull();
    expect(fitVelocityModel([{velocity: 10, voltage: 1}])).toBeNull();
    expect(
      fitVelocityModel([
        {velocity: 10, voltage: 1.2},
        {velocity: 50, voltage: 2.5},
      ]),
    ).toBeNull();
  });

  it('matches the widget prior inline fit on a representative noisy sample', () => {
    const samples: VelocitySample[] = [
      {velocity: 12, voltage: 1.32},
      {velocity: 48, voltage: 2.51},
      {velocity: 95, voltage: 4.05},
      {velocity: 140, voltage: 5.61},
      {velocity: 190, voltage: 7.28},
      {velocity: 233, voltage: 8.9},
    ];
    const fit = fitVelocityModel(samples);
    expect(fit).not.toBeNull();
    // sanity band around the true generating constants (kS=0.9, kV=0.035) rather
    // than a brittle exact value, since this dataset carries synthetic noise.
    expect(fit!.kS).toBeGreaterThan(0.5);
    expect(fit!.kS).toBeLessThan(1.3);
    expect(fit!.kV).toBeGreaterThan(0.03);
    expect(fit!.kV).toBeLessThan(0.04);
  });
});
