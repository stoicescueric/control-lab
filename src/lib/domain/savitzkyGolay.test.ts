import {describe, expect, it} from 'vitest';
import {applyWeights, savitzkyGolayWeights, smoothSeries} from './savitzkyGolay';

describe('Savitzky-Golay weights', () => {
  it('reduces to a moving average at degree 0', () => {
    const weights = savitzkyGolayWeights({halfWidth: 3, degree: 0});
    expect(weights).toHaveLength(7);
    for (const w of weights) expect(w).toBeCloseTo(1 / 7, 12);
  });

  it('reproduces the classic 5-point quadratic kernel', () => {
    const weights = savitzkyGolayWeights({halfWidth: 2, degree: 2});
    const expected = [-3, 12, 17, 12, -3].map((n) => n / 35);
    weights.forEach((w, i) => expect(w).toBeCloseTo(expected[i], 12));
  });

  it('reproduces the classic 5-point first-derivative kernel', () => {
    const weights = savitzkyGolayWeights({halfWidth: 2, degree: 2, derivative: 1});
    const expected = [-2, -1, 0, 1, 2].map((n) => n / 10);
    weights.forEach((w, i) => expect(w).toBeCloseTo(expected[i], 12));
  });

  it('gives a cubic fit the same smoothing weights as a quadratic on five points', () => {
    const quadratic = savitzkyGolayWeights({halfWidth: 2, degree: 2});
    const cubic = savitzkyGolayWeights({halfWidth: 2, degree: 3});
    cubic.forEach((w, i) => expect(w).toBeCloseTo(quadratic[i], 12));
  });

  it('passes a constant through untouched, for every smoothing setting', () => {
    for (const halfWidth of [1, 2, 5, 9]) {
      // A span of 2m+1 samples can only pin down a degree up to 2m.
      for (let degree = 0; degree <= Math.min(4, 2 * halfWidth); degree++) {
        const weights = savitzkyGolayWeights({halfWidth, degree});
        const sum = weights.reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1, 10);
      }
    }
  });

  it('leaves a polynomial of the fitted order exactly unchanged', () => {
    // The defining property: fitting degree d reproduces any degree-d signal.
    const cubic = (x: number) => 4 - 0.5 * x + 0.25 * x ** 2 - 0.05 * x ** 3;
    const weights = savitzkyGolayWeights({halfWidth: 4, degree: 3});
    const span = Array.from({length: 9}, (_, i) => cubic(i - 4));
    expect(applyWeights(span, weights)).toBeCloseTo(cubic(0), 10);
  });

  it('flattens a parabola when only a moving average is fitted', () => {
    // The failure the lesson is built on: degree 0 cannot follow curvature.
    const parabola = (x: number) => 10 - x ** 2;
    const span = Array.from({length: 5}, (_, i) => parabola(i - 2));
    const average = applyWeights(span, savitzkyGolayWeights({halfWidth: 2, degree: 0}));
    const quadratic = applyWeights(span, savitzkyGolayWeights({halfWidth: 2, degree: 2}));

    expect(quadratic).toBeCloseTo(10, 10);
    expect(average).toBeCloseTo(8, 10); // pulled 2 units below the true peak
  });

  it('recovers the slope of a known ramp', () => {
    const ramp = (x: number) => 3 + 2.5 * x;
    const weights = savitzkyGolayWeights({halfWidth: 3, degree: 1, derivative: 1});
    const span = Array.from({length: 7}, (_, i) => ramp(i - 3));
    expect(applyWeights(span, weights)).toBeCloseTo(2.5, 10);
  });

  it('recovers the slope of a parabola at the span edge', () => {
    // d/dx (10 - x^2) at x = +2 is -4; evaluating at the newest sample is the
    // causal variant, so this covers the `at` offset too.
    const parabola = (x: number) => 10 - x ** 2;
    const weights = savitzkyGolayWeights({halfWidth: 2, degree: 2, derivative: 1, at: 2});
    const span = Array.from({length: 5}, (_, i) => parabola(i - 2));
    expect(applyWeights(span, weights)).toBeCloseTo(-4, 10);
  });

  it('evaluates the smoothed value at the newest sample when asked', () => {
    const parabola = (x: number) => 10 - x ** 2;
    const weights = savitzkyGolayWeights({halfWidth: 2, degree: 2, at: 2});
    const span = Array.from({length: 5}, (_, i) => parabola(i - 2));
    expect(applyWeights(span, weights)).toBeCloseTo(parabola(2), 10);
  });

  it('returns all zeros for a derivative above the fitted order', () => {
    const weights = savitzkyGolayWeights({halfWidth: 2, degree: 1, derivative: 2});
    for (const w of weights) expect(w).toBe(0);
  });

  it('averages noise down without moving a straight line', () => {
    const weights = savitzkyGolayWeights({halfWidth: 5, degree: 2});
    const line = Array.from({length: 11}, (_, i) => 7 + 0.3 * (i - 5));
    expect(applyWeights(line, weights)).toBeCloseTo(7, 10);
  });

  it('rejects settings that cannot define a fit', () => {
    expect(() => savitzkyGolayWeights({halfWidth: 0, degree: 1})).toThrow();
    expect(() => savitzkyGolayWeights({halfWidth: 1.5, degree: 1})).toThrow();
    expect(() => savitzkyGolayWeights({halfWidth: 1, degree: 3})).toThrow();
    expect(() => savitzkyGolayWeights({halfWidth: 2, degree: -1})).toThrow();
    expect(() => savitzkyGolayWeights({halfWidth: 2, degree: 2, at: 3})).toThrow();
  });
});

describe('applyWeights', () => {
  it('rejects a span that does not match the weights', () => {
    expect(() => applyWeights([1, 2, 3], [0.5, 0.5])).toThrow();
  });
});

describe('smoothSeries', () => {
  it('holds the untouchable edge samples and smooths the interior', () => {
    const samples = [5, 5, 5, 5, 40, 5, 5, 5, 5];
    const out = smoothSeries(samples, {halfWidth: 2, degree: 2});

    // The first and last m samples have no full span, so they pass through.
    expect(out.slice(0, 2)).toEqual([5, 5]);
    expect(out.slice(7)).toEqual([5, 5]);

    // 770/35: the spike is pulled down hard but is still the peak.
    expect(out[4]).toBeCloseTo(22, 10);
    // 595/35, one sample either side of the peak.
    expect(out[3]).toBeCloseTo(17, 10);
    expect(out[5]).toBeCloseTo(17, 10);
    // 70/35: the outer weights are negative, so the kernel undershoots the
    // baseline two samples out. A moving average can never do this.
    expect(out[2]).toBeCloseTo(2, 10);
    expect(out[6]).toBeCloseTo(2, 10);
  });

  it('returns a copy when the series is shorter than the span', () => {
    const samples = [1, 2, 3];
    const out = smoothSeries(samples, {halfWidth: 2, degree: 1});
    expect(out).toEqual(samples);
    expect(out).not.toBe(samples);
  });
});
