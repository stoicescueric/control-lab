# ADR 0003 — Java in the foundations; derivation prompts out of code comments

- Status: Superseded in part by [ADR 0004](./0004-java-everywhere-retire-pseudocode.md)
- Date: 2026-08-25
- Supersedes in part: [ADR 0002](./0002-pseudocode-over-drop-in-code.md)
- Context source: reading every `<Pseudocode>` block produced by ADR 0002, plus a measurement of
  comment density across all 64 of them.

## Context

ADR 0002 converted 70 `<JavaCode>` blocks into 64 `<Pseudocode>` blocks. It was right about the thing
it set out to fix — the curriculum was shipping complete, compilable FTC subsystems, and a reader who
pastes one learns nothing. Two problems came out of the conversion.

**The foundations lost too much.** Modules 1–3 (Software Architecture, Motor Dynamics & Control
Theory, Signal Processing) are where a reader is still learning what a control loop body looks like.
Structured English costs them more than it teaches: they have to translate the notation *and* the
concept at the same time, and the notation is the part with no educational payoff. By Module 4 the
reader has written several controllers and can implement from an algorithm; before that, they cannot.

**The blocks filled up with essays.** ADR 0002 sanctioned `#` comments for "look this up" and "work
this out" hints. Measured across all 64 blocks afterwards: **1,751 lines, of which 728 (41%) were
comment-only**, plus 174 more carrying inline comments. Half of every block was commentary.
`preface/control-and-feedback.mdx` had a block of 4 code lines under 14 lines of comment. The blocks
had also drifted stylistically — real assignments (`error <- target - measured`) next to English
sentences (`remember measurement for next loop`), broken up by ASCII banners (`# ---- 1. I-ZONE ----`)
and one-off column alignment.

The prompts themselves were good. They were in the wrong container: a code block is for code, and a
question addressed to the reader is not code.

## Decision

**Modules 1–3 teach in `<JavaCode>`. Every other module teaches in `<Pseudocode>`.**

> Superseded by [ADR 0004](./0004-java-everywhere-retire-pseudocode.md): the module split was
> dropped and the whole curriculum moved to `<JavaCode>`. The two rules below it — method-level
> Java only, and prompts in `<Exercise>` rather than comments — carried forward unchanged.

The split is pedagogical, not arbitrary: the foundations show real syntax because the reader is still
acquiring it; from Module 4 on, the reader implements from an algorithm because that is the skill
being built. `docs/notation.mdx` states this to readers; `CONTRIBUTING.md` states it to authors.

**ADR 0002's core constraint survives: no paste-ready subsystems.** The Java is method-level, scoped
to the method that *is* the lesson:

- No Javadoc. `//` comments only, for units and ranges.
- No constructor boilerplate, no `@Config`, no `HardwareMap` wiring, no OpMode lifecycle, no
  `telemetry`.
- Fields only where the method genuinely reads state across loops.
- Guards are kept. `if (!Double.isFinite(dt) || dt <= 0) return;` teaches a failure mode.

The 33 pre-conversion Java blocks in git at `8ef79ed~1` were the source for the algorithms, not for
the text. Restoring them verbatim would restore exactly the shape ADR 0002 removed.

**Derivation prompts move into `<Exercise>` / `<Solution>`.** The component already existed at
`src/components/kit/Exercise.tsx`, built and unregistered; it is now registered in
`src/theme/MDXComponents.tsx`. Prompts sit immediately after the block they came from, written as
prose, with a `<Solution>` only where the answer is short and checkable by eye.

**A pseudocode style, enforced rather than described.** Every line is an assignment (`<-`), a call, a
control-flow line, or a `return`; English survives only in control flow (`for each segment A -> B:`)
and in actions with no natural symbol (`power off`). Headers are signatures with `in:` / `out:` lines,
not prose. Two-space indentation. Multi-space alignment only where it aligns a column across two or
more adjacent lines. Comments carry units and ranges, nothing else.

## Consequences

- 30 blocks in Modules 1–3 became Java; the 34 elsewhere were restyled. Several split, because a block
  that needed section banners was really two blocks — 64 blocks became 85, each labelled.
- **Comment-only lines went from 41% to 3.8%** (1,149 lines across 85 blocks). 106 `<Exercise>` blocks
  and 100 `<Solution>` blocks now carry what those comments used to.
- `scripts/content-check.mjs` enforces all of it: `<Pseudocode>` in Modules 1–3 fails, more than three
  comment-only lines in any block fails, an ASCII banner comment fails, an unlabelled block fails.
  This is the part ADR 0002 lacked — it described a style and had no way to notice drift.
- `templates/lesson.mdx` keeps `<Pseudocode>` (required by `scripts/contributor-check.mjs`) and points
  Module 1–3 authors at `<JavaCode>`. `scripts/scaffold-lesson.mjs` copies the template without module
  awareness, so the pointer is a comment rather than a code path.
- Notation now differs across the module boundary: `lowerCamelCase` in Modules 1–3, `snake_case`
  elsewhere. The shared vocabulary from `path-following/common-implementation.mdx` (`Vector2d`,
  `Pose2d`, `PoseSample`, `wrap`, `moveStatus`, `kStatic`, `drive`) keeps its exact spelling on both
  sides, since lessons cite those names in prose.
- **The regression to watch is the one ADR 0002 named, in the other direction.** Java in Modules 1–3
  will accumulate constructors, annotations and hardware wiring until it is a drop-in subsystem again.
  The comment budget catches essays; nothing automatic catches ceremony. Review it by hand.
- Unchanged from ADR 0002: simulations under `src/components/simulations/**` keep their real
  TypeScript. They are running demonstrations, not something the reader reimplements.
