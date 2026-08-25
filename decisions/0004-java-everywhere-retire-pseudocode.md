# ADR 0004 — Java everywhere; retire the pseudocode component

- Status: Accepted
- Date: 2026-08-25
- Supersedes in part: [ADR 0003](./0003-java-in-the-foundations-exercises-out-of-comments.md)
- Context source: reading the two-notation curriculum ADR 0003 produced, end to end.

## Context

ADR 0003 split the curriculum: Modules 1–3 in `<JavaCode>`, everything else in `<Pseudocode>`. The
argument was that the foundations need visible syntax while later modules can assume the reader
implements from an algorithm. That argument is defensible in the abstract and does not survive
reading the result.

A reader crossing from Module 3 into Module 4 changes notation mid-curriculum — `error = target - x`
becomes `error <- target - x`, `Math.abs` becomes `| |`, `lowerCamelCase` becomes `snake_case` — for
a benefit they never feel, because by Module 4 the pseudocode is not meaningfully easier to read than
the Java it replaces. It is just different.

The split also cost more than it earned in the documents: a table in `CONTRIBUTING.md`, two style
sections that had to be maintained in parallel, a paragraph in `docs/notation.mdx` explaining the
boundary to readers, and an enforcement rule keyed to a hardcoded module list.

## Decision

**Every algorithm in the curriculum is a `<JavaCode>` block.** `<Pseudocode>` is deleted.

**ADR 0003's two substantive rules survive unchanged**, and they are the ones that were actually
doing the work:

1. **Method-level only. No paste-ready subsystems.** This is what ADR 0002 was right about and what
   both later ADRs preserve. A block shows the method that *is* the lesson: complete logic in an
   incomplete program. Helper methods, tuned constants and hardware stay undefined — `shape(...)`,
   `clamp(...)`, `setWheelPowers(...)` are the reader's to write. No Javadoc, no constructor
   boilerplate, no `@Config`, no `HardwareMap`, no OpMode lifecycle. Guards are kept, because they
   teach failure modes.
2. **Derivation prompts live in `<Exercise>`, never in comments.** Comments carry units and ranges.
   The three-comment-line budget is unchanged.

Notation is now uniform: `lowerCamelCase` for locals and methods, `SCREAMING_CASE` for tuned
constants, ordinary Java operators throughout. The shared vocabulary from
`path-following/common-implementation.mdx` — `Vector2d`, `Pose2d`, `PoseSample`, `wrap`,
`moveStatus`, `kStatic`, `drive` — keeps its exact spelling, since lessons cite those names in prose.

## Consequences

- 40 blocks converted across 18 files, 580 lines of pseudocode. The curriculum is now 88 `<JavaCode>`
  blocks and nothing else. Several blocks split, because a procedure that was one pseudocode block is
  two Java methods with separate concerns.
- `src/components/kit/Pseudocode.tsx` is deleted, along with its registry entry in
  `src/theme/MDXComponents.tsx`. No CSS rule keyed on `.cl-pseudocode` and no test referenced it.
- `scripts/content-check.mjs` now fails on **any** `<Pseudocode>` in `docs/`, replacing ADR 0003's
  hardcoded module list. The comment-budget, ASCII-banner and missing-label rules are unchanged and
  still match on both tag names, so they keep working if one ever reappears.
- `scripts/contributor-check.mjs` requires `'<JavaCode'` in `templates/lesson.mdx` again, reverting
  what ADR 0002 changed.
- **`common-implementation.mdx` is the risk.** ADR 0002 deliberately turned that page into "a
  notation contract rather than a Java API," and converting it moves it back toward being an API.
  Mitigation: `Vector2d` and `Pose2d` are `record` sketches with **elided bodies** —
  `Vector2d plus(Vector2d b) { ... }` — because the signatures are the contract and nobody needs the
  vector algebra taught. Only `wrap`, `moveStatus`, `kStatic` and `drive` show full bodies, since
  those carry real decisions. The page's framing prose still says the names are a contract and the
  bodies are yours. **If a future edit fills those bodies in, the page has regressed.**
- **The regression to watch, restated from ADR 0003 and still true in the other direction.** Java in
  a lesson will accumulate constructors, annotations and hardware wiring until it is a drop-in
  subsystem again. The comment budget catches essays; nothing automatic catches ceremony. Review it
  by hand.
- Unchanged: simulations under `src/components/simulations/**` keep their real TypeScript. They are
  running demonstrations, not something the reader reimplements.
