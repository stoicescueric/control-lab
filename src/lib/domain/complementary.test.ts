import {describe, expect, it} from 'vitest';
import {
  circularComplementaryStepDegrees,
  complementaryFrequencyResponse,
  nyquistFrequency,
} from './complementary';

describe('circular complementary filter', () => {
  it('corrects from 359 degrees toward 1 degree through the short seam', () => {
    const result = circularComplementaryStepDegrees(359, 0, 1, 0.9);
    expect(result).toBeCloseTo(-0.8, 10);
    expect(result).toBeGreaterThanOrEqual(-180);
    expect(result).toBeLessThan(180);
  });

  it('always returns the canonical angle interval', () => {
    for (const estimate of [-1080, -181, 0, 181, 1080]) {
      const result = circularComplementaryStepDegrees(estimate, 47, -173, 0.98);
      expect(result).toBeGreaterThanOrEqual(-180);
      expect(result).toBeLessThan(180);
    }
  });
});

describe('sampled complementary response', () => {
  it('has complex relative and absolute paths that sum to one', () => {
    const dt = 0.05;
    for (const frequency of [0, 0.2, 1, 5, nyquistFrequency(dt)]) {
      const {absolute, relative} = complementaryFrequencyResponse(0.98, frequency, dt);
      expect(absolute.re + relative.re).toBeCloseTo(1, 12);
      expect(absolute.im + relative.im).toBeCloseTo(0, 12);
    }
  });

  it('caps the valid response domain at the 50 ms Nyquist frequency', () => {
    expect(nyquistFrequency(0.05)).toBe(10);
    expect(() => complementaryFrequencyResponse(0.98, 10.001, 0.05)).toThrow(/Nyquist/);
  });
});
