# Interactive Simulations

This directory contains the live models embedded in lessons. Files are grouped
by the curriculum concept they teach:

- `foundations/`: introductory mathematics and feedback.
- `software-architecture/`: scheduling, state, and loop timing.
- `control-theory/`: actuators, controllers, feedforward, and identification.
- `signal-processing/`: filters and estimators.
- `localization/`: odometry and pose integration.
- `path-following/`: kinematics, geometry, splines, and followers.
- `state-space/`: state feedback and optimal control.
- `research/`: projectile and dynamic-targeting case studies.

## Component Contract

Each simulation should:

1. Teach one named model, parameter, or failure mode.
2. Use typed props, state, events, and helper results.
3. Reuse controls from `src/components/kit/`.
4. Import reusable equations from `src/lib/domain/`.
5. Import canvas and plotting helpers from `src/lib/visualization/`.
6. Keep browser-only work inside effects or event handlers and clean it up.
7. Remain readable, operable, and stable in light mode, dark mode, and narrow
   viewports.

Lessons import concrete files directly:

```mdx
import MotorCurve from '@site/src/components/simulations/control-theory/MotorCurve';
```

Do not add a barrel that exports every simulation. Direct imports make ownership
obvious and avoid coupling unrelated lesson bundles.

When a component grows because it contains substantial math, move the
deterministic model into `src/lib/domain/` and test it independently.
