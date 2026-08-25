/** Exact zero-order-hold discretization of dx/dt = a*x + b*u. */
export function discretizeScalarPlant(a: number, b: number, dtSeconds: number): {ad: number; bd: number} {
  if (![a, b, dtSeconds].every(Number.isFinite) || dtSeconds < 0) {
    throw new Error('Scalar plant inputs must be finite and dt must be non-negative');
  }
  if (dtSeconds === 0) return {ad: 1, bd: 0};

  const ad = Math.exp(a * dtSeconds);
  // At exactly a=0, (exp(a*dt)-1)/a has the finite limit dt. Math.expm1
  // preserves accuracy for every small but nonzero a, so no arbitrary seam
  // changes the sampled model.
  const bd = a === 0 ? b * dtSeconds : b * Math.expm1(a * dtSeconds) / a;
  return {ad, bd};
}

export function scalarPlantStep(
  state: number,
  input: number,
  a: number,
  b: number,
  dtSeconds: number,
): number {
  if (![state, input].every(Number.isFinite)) throw new Error('State and input must be finite');
  const {ad, bd} = discretizeScalarPlant(a, b, dtSeconds);
  return ad * state + bd * input;
}
