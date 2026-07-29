import {describe, expect, it} from 'vitest';
import {
  clamp,
  stepSaturatingPidPlant,
  type SaturatingPidPlantConfig,
  type SaturatingPidPlantState,
} from './pid';

const CONFIG: SaturatingPidPlantConfig = {
  dt: 1 / 180,
  gains: {kp: 3.8, ki: 1.25, kd: 1.35},
  integralLimitVolts: 2.2,
  plantGain: 4.8,
  damping: 2.2,
};

function freshState(): SaturatingPidPlantState {
  return {x: 0, v: 0, integral: 0, raw: 0, out: 0};
}

describe('clamp', () => {
  it('bounds a value to the given range', () => {
    expect(clamp(5, -1, 1)).toBe(1);
    expect(clamp(-5, -1, 1)).toBe(-1);
    expect(clamp(0.3, -1, 1)).toBe(0.3);
  });
});

describe('stepSaturatingPidPlant: step response', () => {
  it('settles the plant toward the setpoint over many iterations', () => {
    const state = freshState();
    const target = 6;
    const voltageLimit = 8;
    for (let i = 0; i < 3000; i++) {
      stepSaturatingPidPlant(state, target, voltageLimit, true, CONFIG);
    }
    expect(state.x).toBeCloseTo(target, 1);
    expect(Math.abs(state.v)).toBeLessThan(0.1);
  });
});

describe('stepSaturatingPidPlant: integrator clamp', () => {
  it('never lets K_i * integral exceed the configured limit, even under sustained large error', () => {
    const state = freshState();
    // A target far outside the actuator's reach keeps the error large and positive
    // for a long time, which is exactly the condition that would wind up the integral
    // without the clamp.
    const target = 1000;
    const voltageLimit = 4;
    for (let i = 0; i < 5000; i++) {
      stepSaturatingPidPlant(state, target, voltageLimit, true, CONFIG);
      const integralContribution = CONFIG.gains.ki * state.integral;
      expect(Math.abs(integralContribution)).toBeLessThanOrEqual(CONFIG.integralLimitVolts + 1e-9);
    }
  });

  it('winds up without bound when anti-windup is disabled', () => {
    const state = freshState();
    const target = 1000;
    const voltageLimit = 4;
    for (let i = 0; i < 5000; i++) {
      stepSaturatingPidPlant(state, target, voltageLimit, false, CONFIG);
    }
    const integralContribution = CONFIG.gains.ki * state.integral;
    expect(Math.abs(integralContribution)).toBeGreaterThan(CONFIG.integralLimitVolts);
  });
});

describe('stepSaturatingPidPlant: conditional integration', () => {
  // A plant with zero gain and zero damping never moves (x stays 0 forever), which
  // isolates the integral bookkeeping from the plant dynamics: the "error" seen by
  // the controller is then controlled directly by `target`, letting the test drive
  // an unsaturated build-up, then a saturating push, then a sign flip.
  const isolatedConfig: SaturatingPidPlantConfig = {
    dt: 1,
    gains: {kp: 1, ki: 1, kd: 0},
    integralLimitVolts: 100, // effectively disabled, so only conditional integration is under test
    plantGain: 0,
    damping: 0,
  };

  it('halts integral growth once the raw candidate saturates in the direction of the error, then resumes once the error flips sign', () => {
    const state = freshState();
    const voltageLimit = 2;

    // A small, unsaturated positive error lets the integral build up normally.
    for (let i = 0; i < 5; i++) {
      stepSaturatingPidPlant(state, 0.5, voltageLimit, true, isolatedConfig);
    }
    const builtUpIntegral = state.integral;
    expect(builtUpIntegral).toBeGreaterThan(0);

    // A large positive error now pushes the raw candidate far past the voltage limit
    // in the same direction as the error: conditional integration should freeze the
    // integral rather than let it keep growing.
    let grew = false;
    for (let i = 0; i < 10; i++) {
      stepSaturatingPidPlant(state, 100, voltageLimit, true, isolatedConfig);
      if (state.integral > builtUpIntegral + 1e-9) {
        grew = true;
      }
    }
    expect(grew).toBe(false);
    expect(state.integral).toBeCloseTo(builtUpIntegral, 9);

    // A small negative error no longer saturates, so conditional integration should
    // un-freeze and let the integral shrink again.
    const integralBeforeFlip = state.integral;
    let changed = false;
    for (let i = 0; i < 5; i++) {
      stepSaturatingPidPlant(state, -0.1, voltageLimit, true, isolatedConfig);
      if (Math.abs(state.integral - integralBeforeFlip) > 1e-9) {
        changed = true;
      }
    }
    expect(changed).toBe(true);
    expect(state.integral).toBeLessThan(integralBeforeFlip);
  });
});
