export type MotionState = {position: number; velocity: number};

export type MpcPlan = {
  inputs: number[];
  states: MotionState[];
  cost: number;
  candidateCount: number;
  feasibleCount: number;
  feasible: boolean;
};

export type MpcPlanOptions = {
  state: MotionState;
  targetPosition: number;
  horizon: number;
  dtSeconds: number;
  maxAcceleration: number;
  minPosition: number;
  maxPosition: number;
};

/** One exact constant-acceleration step of a teaching double-integrator model. */
export function motionStep(
  state: MotionState,
  acceleration: number,
  dtSeconds: number,
): MotionState {
  if (![state.position, state.velocity, acceleration, dtSeconds].every(Number.isFinite)) {
    throw new Error('Motion-step inputs must be finite');
  }
  if (dtSeconds <= 0) throw new Error('Motion-step dt must be positive');

  return {
    position: state.position + state.velocity * dtSeconds + 0.5 * acceleration * dtSeconds ** 2,
    velocity: state.velocity + acceleration * dtSeconds,
  };
}

/**
 * Exhaustive, discrete-input MPC for the lesson viewer. Production linear MPC
 * normally solves a continuous quadratic program; enumeration keeps every
 * candidate visible and deterministic for this small teaching example.
 */
export function planConstrainedMotion(options: MpcPlanOptions): MpcPlan {
  const {state, targetPosition, horizon, dtSeconds, maxAcceleration, minPosition, maxPosition} =
    options;

  if (
    ![
      state.position,
      state.velocity,
      targetPosition,
      dtSeconds,
      maxAcceleration,
      minPosition,
      maxPosition,
    ].every(Number.isFinite)
  ) {
    throw new Error('MPC inputs must be finite');
  }
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 8) {
    throw new Error('MPC horizon must be an integer from 1 through 8');
  }
  if (dtSeconds <= 0 || maxAcceleration <= 0 || minPosition >= maxPosition) {
    throw new Error('MPC timing, acceleration, and position bounds must be valid');
  }

  const choices = [-maxAcceleration, 0, maxAcceleration];
  let feasibleCount = 0;
  let bestFeasible: MpcPlan | undefined;
  let bestFallback: MpcPlan | undefined;

  function score(inputs: number[]) {
    const states = [state];
    let current = state;
    let cost = 0;
    let violation = 0;

    for (const input of inputs) {
      current = motionStep(current, input, dtSeconds);
      states.push(current);
      const error = current.position - targetPosition;
      cost += error ** 2 + 0.06 * current.velocity ** 2 + 0.025 * (input / maxAcceleration) ** 2;
      violation += Math.max(0, minPosition - current.position) ** 2;
      violation += Math.max(0, current.position - maxPosition) ** 2;
    }

    const terminal = states.at(-1)!;
    cost += 8 * (terminal.position - targetPosition) ** 2 + 0.8 * terminal.velocity ** 2;
    const feasible = violation < 1e-12;
    const plan: MpcPlan = {
      inputs: [...inputs],
      states,
      cost: cost + violation * 1_000_000,
      candidateCount: 3 ** horizon,
      feasibleCount: 0,
      feasible,
    };

    if (feasible) {
      feasibleCount += 1;
      if (!bestFeasible || plan.cost < bestFeasible.cost) bestFeasible = plan;
    }
    if (!bestFallback || plan.cost < bestFallback.cost) bestFallback = plan;
  }

  const inputs: number[] = [];
  function visit(depth: number) {
    if (depth === horizon) {
      score(inputs);
      return;
    }
    for (const choice of choices) {
      inputs.push(choice);
      visit(depth + 1);
      inputs.pop();
    }
  }
  visit(0);

  const best = bestFeasible ?? bestFallback!;
  return {...best, feasibleCount};
}
