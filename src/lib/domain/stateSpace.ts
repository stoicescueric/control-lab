/** Exact zero-order-hold discretization of dx/dt = a*x + b*u. */
export function discretizeScalarPlant(
  a: number,
  b: number,
  dtSeconds: number,
): {ad: number; bd: number} {
  if (![a, b, dtSeconds].every(Number.isFinite) || dtSeconds < 0) {
    throw new Error('Scalar plant inputs must be finite and dt must be non-negative');
  }
  if (dtSeconds === 0) return {ad: 1, bd: 0};

  const ad = Math.exp(a * dtSeconds);
  // At exactly a=0, (exp(a*dt)-1)/a has the finite limit dt. Math.expm1
  // preserves accuracy for every small but nonzero a, so no arbitrary seam
  // changes the sampled model.
  const bd = a === 0 ? b * dtSeconds : (b * Math.expm1(a * dtSeconds)) / a;
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

export type ElevatorState = {position: number; velocity: number};

/** Exact zero-order-hold step for pDot=v, vDot=a*v+b*u. */
export function elevatorPlantStep(
  state: ElevatorState,
  input: number,
  a: number,
  b: number,
  dtSeconds: number,
): ElevatorState {
  if (![state.position, state.velocity, input, a, b, dtSeconds].every(Number.isFinite)) {
    throw new Error('Elevator plant inputs must be finite');
  }
  if (dtSeconds < 0) throw new Error('Elevator plant dt must be non-negative');
  if (dtSeconds === 0) return {...state};

  if (a === 0) {
    return {
      position: state.position + state.velocity * dtSeconds + 0.5 * b * input * dtSeconds ** 2,
      velocity: state.velocity + b * input * dtSeconds,
    };
  }

  const z = a * dtSeconds;
  const expm1 = Math.expm1(z);
  const phi1 = expm1 / z;
  // Avoid subtracting nearly equal numbers in the acceleration integral.
  const phi2 = Math.abs(z) < 1e-4 ? 0.5 + z / 6 + z ** 2 / 24 + z ** 3 / 120 : (expm1 - z) / z ** 2;
  const velocityIntegral = state.velocity * dtSeconds * phi1 + b * input * dtSeconds ** 2 * phi2;
  return {
    position: state.position + velocityIntegral,
    velocity: (expm1 + 1) * state.velocity + (b * input * expm1) / a,
  };
}

/** Approximate scalar multiply counts for dense, naive state-space arithmetic. */
export function stateSpaceOperationEstimate(states: number, outputs: number) {
  if (![states, outputs].every(Number.isInteger) || states < 1 || outputs < 1) {
    throw new Error('State and output counts must be positive integers');
  }

  const controller = states;
  const steadyObserver = states ** 2 + states + 2 * states * outputs;
  const covarianceUpdate = 2 * states ** 3 + 2 * outputs * states ** 2 + outputs ** 3;
  return {controller, steadyObserver, covarianceUpdate};
}
