/* RST pole placement on a first-order plant, and the plant itself.

   Pure model, no framework and no rendering. The lesson at
   docs/control-theory/rst-pole-placement.mdx derives every equation here, and the
   simulation in src/components/simulations/control-theory/ only drives it. */

export interface FirstOrderPlant {
  /** Steady-state velocity per volt. The reciprocal of kV. */
  kDc: number;
  /** Open-loop time constant in seconds, kA / kV. */
  tau: number;
  /** Volts to break static friction. Deliberately outside the linear model. */
  kS: number;
}

export interface RstDesign {
  /** Tracking pole, as the closed-loop time constant it stands for, in seconds. */
  tauClosedLoop: number;
  /** Integral pole, same convention. Slower than tauClosedLoop on purpose. */
  tauIntegral: number;
  /**
   * True for `T = t0 (1 - p2 q^-1)`, which cancels the integral pole out of the
   * reference path. False for the plain gain that leaves it there, which is the
   * comparison the lesson asks the reader to look at.
   */
  cancelIntegralPole: boolean;
}

export interface RstCoefficients {
  /** Discrete plant: `v_k = a v_{k-1} + b u_{k-1}`. */
  a: number;
  b: number;
  /** Closed-loop poles, as discrete roots. */
  p1: number;
  p2: number;
  /** Feedback polynomial `R = r0 + r1 q^-1`. */
  r0: number;
  r1: number;
  /** Reference gain. With cancelIntegralPole it multiplies `(1 - p2 q^-1)`. */
  t0: number;
}

export interface RstState {
  /** In incremental form the previous command IS the integrator state. */
  previousOutput: number;
  previousMeasurement: number;
  previousReference: number;
  primed: boolean;
}

export interface PlantState {
  /** Velocity, in whatever unit the plant was identified in. */
  v: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Solves the controller for one loop period.
 *
 * The Diophantine equation `A S + B R = A_cl` with `A = 1 - a q^-1`, `B = b q^-1`
 * and `S = 1 - q^-1` has a closed-form solution for two chosen real poles, so
 * nothing here iterates. Every coefficient depends on `dt`, which is why this is
 * called per loop rather than once at construction: a fixed-coefficient discrete
 * controller quietly retunes itself when the loop period moves.
 */
export function solveRst(plant: FirstOrderPlant, design: RstDesign, dt: number): RstCoefficients {
  const a = Math.exp(-dt / Math.max(plant.tau, 1e-4));
  const b = plant.kDc * (1 - a);

  // A pole cannot usefully be placed faster than a handful of loop periods,
  // however good the model, so the request is floored rather than honoured.
  const p1 = Math.exp(-dt / Math.max(design.tauClosedLoop, 4 * dt));
  const p2 = Math.exp(-dt / Math.max(design.tauIntegral, 1e-4));

  const alpha1 = -(p1 + p2);
  const alpha2 = p1 * p2;

  const safeB = Math.abs(b) < 1e-9 ? 1e-9 : b;
  const t0 = design.cancelIntegralPole ? (1 - p1) / safeB : (1 + alpha1 + alpha2) / safeB;

  return {
    a,
    b,
    p1,
    p2,
    r0: (alpha1 + 1 + a) / safeB,
    r1: (alpha2 - a) / safeB,
    t0,
  };
}

export function createRstState(): RstState {
  return {previousOutput: 0, previousMeasurement: 0, previousReference: 0, primed: false};
}

/**
 * Advances the controller one loop and returns the volts to command.
 *
 * The returned value is clamped and stored clamped, which is the whole of the
 * anti-windup: the previous output is the integrator, so a saturated axis cannot
 * accumulate a command it would later have to unwind.
 */
export function stepRst(
  state: RstState,
  reference: number,
  measurement: number,
  dt: number,
  plant: FirstOrderPlant,
  design: RstDesign,
  voltLimit: number,
): number {
  if (!state.primed) {
    // Read as already being at the reference, so a controller seeded at an
    // operating point does not treat its own first loop as a step.
    state.previousMeasurement = measurement;
    state.previousReference = reference;
    state.primed = true;
  }

  const k = solveRst(plant, design, dt);
  const referenceTerm = design.cancelIntegralPole
    ? k.t0 * (reference - k.p2 * state.previousReference)
    : k.t0 * reference;

  const raw =
    state.previousOutput + referenceTerm - k.r0 * measurement - k.r1 * state.previousMeasurement;
  const out = clamp(raw, -voltLimit, voltLimit);

  state.previousOutput = out;
  state.previousMeasurement = measurement;
  state.previousReference = reference;
  return out;
}

/**
 * Integrates the plant under a held voltage, including the friction the linear
 * model leaves out.
 *
 * Sub-stepped so the simulation is not quietly agreeing with the controller's own
 * discretisation, and so that a slow control loop still sees a plausible plant.
 */
export function stepPlant(
  state: PlantState,
  volts: number,
  dt: number,
  plant: FirstOrderPlant,
  substeps = 20,
): void {
  const h = dt / substeps;
  const tau = Math.max(plant.tau, 1e-4);
  for (let i = 0; i < substeps; i++) {
    const moving = Math.abs(state.v) > 1e-4;
    // Friction opposes motion, and cannot start it. Below breakaway nothing moves.
    let net = volts;
    if (moving) {
      net = volts - plant.kS * Math.sign(state.v);
    } else if (Math.abs(volts) <= plant.kS) {
      net = 0;
    } else {
      net = volts - plant.kS * Math.sign(volts);
    }
    state.v += (h * (plant.kDc * net - state.v)) / tau;
  }
}

/**
 * Volts the first loop of a step asks for, before any clamp.
 *
 * Matching the plant's own response to the one requested gives a demand of
 * `(tau / tauClosedLoop)` times what holding the reference costs, which is the
 * price of the design parameter and the reason it cannot be made arbitrarily
 * small. Returned as a bare number so a caller can compare it with a supply.
 */
export function firstLoopDemandVolts(
  plant: FirstOrderPlant,
  design: RstDesign,
  reference: number,
): number {
  const steady = reference / Math.max(plant.kDc, 1e-9);
  return (plant.tau / Math.max(design.tauClosedLoop, 1e-4)) * steady;
}
