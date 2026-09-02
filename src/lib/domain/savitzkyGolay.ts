/* Savitzky-Golay smoothing: a least-squares polynomial fit over a sliding
   span, collapsed into fixed convolution weights.

   Fitting a degree-d polynomial to the span and evaluating it at one offset
   is linear in the samples, so the fit reduces to a weight row that can be
   computed once and reused every loop. The moving average is the degree-0 case:
   fit a flat line, and the least-squares answer is the mean.

   Weights come from the normal equations. With offsets x_i = i - m, the design
   matrix is A[i][j] = x_i^j and the coefficients are c = (A'A)^-1 A' y. The
   p-th derivative of the fitted polynomial at offset `at` is g'c for a fixed g,
   so solving (A'A) z = g once gives weight_i = sum_j z_j x_i^j. */

const MAX_HALF_WIDTH = 128;

export interface SavitzkyGolayOptions {
  /** m, so the span holds 2m+1 samples. */
  halfWidth: number;
  /** d, the polynomial order fitted to the span. 0 reproduces a moving average. */
  degree: number;
  /** 0 for the smoothed value, 1 for the first derivative per sample. */
  derivative?: number;
  /** Span offset the fit is evaluated at. 0 is the centre; +m is the newest sample. */
  at?: number;
}

/* Gaussian elimination with partial pivoting. The normal matrix is
   (degree+1) square, so this never exceeds a handful of rows. */
function solve(matrix: number[][], rhs: number[]): number[] {
  const n = rhs.length;
  const a = matrix.map((row, i) => [...row, rhs[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) {
      throw new Error('Savitzky-Golay normal equations are singular');
    }
    [a[col], a[pivot]] = [a[pivot], a[col]];

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col] / a[col][col];
      for (let k = col; k <= n; k++) a[row][k] -= factor * a[col][k];
    }
  }

  // Full elimination leaves a diagonal system, so each unknown reads off directly.
  return a.map((row, i) => row[n] / row[i]);
}

/**
 * Convolution weights for a Savitzky-Golay filter.
 *
 * The returned array runs oldest-to-newest across the span. For the default
 * centred, zero-derivative case the weights sum to 1, so a constant signal
 * passes through untouched.
 */
export function savitzkyGolayWeights({
  halfWidth,
  degree,
  derivative = 0,
  at = 0,
}: SavitzkyGolayOptions): number[] {
  if (!Number.isInteger(halfWidth) || halfWidth < 1 || halfWidth > MAX_HALF_WIDTH) {
    throw new Error(`halfWidth must be an integer in 1..${MAX_HALF_WIDTH}`);
  }
  if (!Number.isInteger(degree) || degree < 0) {
    throw new Error('degree must be a non-negative integer');
  }
  if (!Number.isInteger(derivative) || derivative < 0) {
    throw new Error('derivative must be a non-negative integer');
  }
  const width = 2 * halfWidth + 1;
  if (degree >= width) {
    throw new Error(`degree ${degree} needs a span longer than ${width} samples`);
  }
  if (!Number.isFinite(at) || Math.abs(at) > halfWidth) {
    throw new Error('at must lie inside the span');
  }
  if (derivative > degree) {
    // Every derivative above the fitted order is identically zero.
    return new Array<number>(width).fill(0);
  }

  const order = degree + 1;
  const offsets = Array.from({length: width}, (_, i) => i - halfWidth);

  // Normal matrix M[j][k] = sum_i x_i^(j+k).
  const normal: number[][] = Array.from({length: order}, (_, j) =>
    Array.from({length: order}, (_, k) => offsets.reduce((sum, x) => sum + x ** (j + k), 0)),
  );

  /* g_j is the p-th derivative of x^j evaluated at `at`: the falling factorial
     j(j-1)...(j-p+1) times at^(j-p), and zero for j below p. */
  const g = Array.from({length: order}, (_, j) => {
    if (j < derivative) return 0;
    let falling = 1;
    for (let s = 0; s < derivative; s++) falling *= j - s;
    return falling * at ** (j - derivative);
  });

  const z = solve(normal, g);
  return offsets.map((x) => z.reduce((sum, zj, j) => sum + zj * x ** j, 0));
}

/**
 * Applies precomputed weights to a span of samples, oldest first.
 *
 * For a derivative filter the result is per sample; divide by the loop period
 * to get a rate per second.
 */
export function applyWeights(span: readonly number[], weights: readonly number[]): number {
  if (span.length !== weights.length) {
    throw new Error('span and weights must be the same length');
  }
  let total = 0;
  for (let i = 0; i < span.length; i++) total += span[i] * weights[i];
  return total;
}

/**
 * Smooths a whole series offline, holding the first and last m samples fixed.
 *
 * Real-time code should keep a ring buffer and call applyWeights once per loop;
 * this exists for plotting a recorded log in one pass.
 */
export function smoothSeries(samples: readonly number[], options: SavitzkyGolayOptions): number[] {
  const weights = savitzkyGolayWeights(options);
  const m = options.halfWidth;
  if (samples.length < weights.length) return [...samples];

  const out = [...samples];
  for (let i = m; i < samples.length - m; i++) {
    out[i] = applyWeights(samples.slice(i - m, i + m + 1), weights);
  }
  return out;
}
