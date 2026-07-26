# ADR 0001 — Defer the feedforward module; build `pidStep` alone

- Status: Accepted
- Date: 2026-06-21
- Context source: architecture review of `src/components/sims/*`, grilling session on the deep `pidStep` controller module.

## Context

The architecture review found PID + anti-windup logic re-inlined across six sims and
proposed two deep modules: a `pidStep` controller and a `feedforward` primitive
(`kS·sign(v) + kV·v + kA·a`).

Counting *real* consumers (the "one adapter = hypothetical seam, two = real" rule):

| Module | Real consumers | Verdict |
| --- | --- | --- |
| `pidStep` (P+I+D+anti-windup) | `AntiWindup` (×2 controllers), `Drone`, `Heater` | 3+ → real seam |
| `feedforward` (simple-motor `kS+kV`) | `Flywheel` only | 1 → hypothetical seam |

`MechanismFeedforward.tsx` looks like a second feedforward consumer but is **not**: it
is *gravity* feedforward — a position-dependent `kG` from a lookup table
(`interpolateKg`). That is **ArmFeedforward**, a different interface from Flywheel's
**SimpleMotorFeedforward**. It is not a second adapter for the same seam.

## Decision

Build `pidStep` (`src/lib/controller.ts`) now. **Do not** extract a `feedforward`
module yet. Flywheel keeps its `kS+kV` feedforward inline.

`pidStep` shape settled in grilling:

- Pure function: `pidStep({error, rate, integral}, gains, limits, dt)` → `{out, raw, p, i, d, integral, saturated}`. Sim owns the integral in its ref and threads it each frame.
- Anti-windup as two orthogonal options: `conditionalIntegration` (default on) and `integral: [lo, hi]` clamp on the integral value. AntiWindup's "off" pedagogy = both disabled.
- One canonical integral-update order (integrate → clamp → conditional-revert → output from the updated integral); matches AntiWindup + Heater exactly, Drone re-verified visually.
- Controller-only: each sim keeps its bespoke plant.

## Consequences

- One real seam built and tested; the speculative seam is not.
- Anti-windup gains a unit-test surface for the first time.
- **Revisit when a second `kS/kV` simple-motor-feedforward consumer appears** — then `feedforward` becomes a real seam worth extracting. A future architecture review should not re-suggest it before that.
- ArmFeedforward (gravity/table) is tracked separately; it shares nothing with SimpleMotorFeedforward beyond the name.
