# ADR 0002 — Teach algorithms as pseudocode; stop shipping drop-in Java

- Status: Accepted
- Date: 2026-08-24
- Context source: curriculum review of every `<JavaCode>` block in `docs/**/*.mdx`.

## Context

The curriculum's stated goal (`README.md`) is "to make the ideas behind those tools
visible enough that a serious FTC programmer can debug, tune, extend, and defend their
own robot code." Individual lessons already said so directly:

- `advanced-topics/how-pedro-pathing-works.mdx`: "an **architecture explainer**, not
  drop-in Pedro source."
- `advanced-topics/inverse-kinematics-jacobians.mdx`: "intentionally a skeleton rather
  than a copy-paste subsystem."

The code contradicted the prose. The audit found **70 `<JavaCode>` blocks totalling
2,131 lines** across 33 lesson files, and the long ones were complete, compilable FTC
classes: `@Config` annotations, `HardwareMap` wiring, Javadoc, defensive guards,
`public final class`. `SaturatingPidController` was 102 lines; the pure-pursuit spline
follower was 127.

A reader who pastes those gets a working robot and learns nothing. A disclaimer in the
surrounding paragraph does not survive contact with a copy button.

Two lessons had already been written the other way. `advanced-research/shoot-on-the-move.mdx`
and `trajectory-simulation.mdx` used structured-English pseudocode in ` ```text ` fences,
with `<-` assignment and no types. That was the house style worth generalizing; it just
was not written down or available as a component.

## Decision

Algorithmic blocks are **pseudocode**, in a new `<Pseudocode>` component
(`src/components/kit/Pseudocode.tsx`, rendered as `language="text"` so nothing is
syntax-highlighted into looking like source).

House style, documented in `CONTRIBUTING.md` and `docs/notation.mdx`:

- `<-` for assignment; `snake_case` locals; `SCREAMING_CASE` constants.
- No types, braces or semicolons. Indentation carries structure.
- Control flow in English: `for each segment A -> B:`, `repeat at most N times:`.
- Guards are kept, because they teach failure modes.
- Research hints inline as `#` comments, at the step where the reader stalls.
  Never `TODO:` — `content-check.mjs` rejects that string in `docs/`.

**Exception, both directions:**

Literal Java survives in `<JavaCode>` only where there is nothing to derive — an
anti-pattern the lesson is criticizing, or bare SDK surface where the message is "call
the library." Nine blocks qualified: the boolean-flag and step-counter anti-patterns,
the two open-loop examples, `Reading the gamepad`, and the three FRC WPILib
constructions.

And `snake_case` does **not** apply to the shared vocabulary from
`path-following/common-implementation.mdx`. `Vector2d`, `Pose2d`, `PoseSample`, `wrap`,
`moveStatus`, `kStatic` and `drive` keep their exact spelling, because eight other
lessons and `docs/notation.mdx` refer to them by name in prose. That page is now a
notation contract rather than a Java API.

## Consequences

- 60 blocks converted; 2,131 lines of Java became 64 pseudocode blocks. The largest
  single win was `software-architecture/state-machines.mdx`, where five serial blocks
  of one `AdaptiveAuto` class collapsed into a state table, a transition gate, and the
  three handler shapes that recur.
- `scripts/contributor-check.mjs` now requires `'<Pseudocode'` rather than `'<JavaCode'`
  in `templates/lesson.mdx`; the template's code section was retitled
  "Turn it into an algorithm."
- The two pre-existing ` ```text ` pseudocode fences moved into the component, and the
  stray ` ```java ` fence in `actuator-saturation-anti-windup.mdx` was converted. No
  fenced code blocks remain anywhere in `docs/`.
- **A future contributor or agent will want to "helpfully" restore working Java.** That
  is the regression this ADR exists to prevent. Adding a drop-in implementation of a
  technique a lesson teaches is a reversal of this decision, not an improvement to it.
- Not addressed here: `src/components/kit/Exercise.tsx` and `Solution` remain built,
  unused and unregistered. They are the natural home for a future "try it yourself"
  pass, but research hints are inline comments for now, so nothing depends on them.
- The simulations in `src/components/simulations/**` keep their real TypeScript. They
  are running demonstrations, not something the reader reimplements.
