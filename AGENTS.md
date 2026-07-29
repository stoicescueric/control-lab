# Control Lab: Instructions for AI Contributors

This is the canonical, tool-neutral guide for AI systems working in this
repository. It follows the open [AGENTS.md format](https://agents.md/) and is
intentionally committed so contributors can use Codex, Claude, Copilot, Gemini,
Cursor, or another assistant without first teaching it the repository from
scratch.

If an AI tool does not load `AGENTS.md` automatically, ask it to read this file
before it proposes or edits anything.

## Mission and Authority

Control Lab is an open-source, interactive curriculum for control theory,
state estimation, and FTC robotics. Contributions should make a concept easier
to understand, mathematically defensible, and safer to deploy on a real robot.

AI assistance is welcome, but it is not an author, source, reviewer, or
maintainer:

- The human contributor is responsible for every submitted claim and change.
- The project maintainer decides curriculum scope and must approve every pull
  request before it is merged.
- Never merge, publish, deploy, approve a review, or change repository settings
  unless the maintainer explicitly asks for that action.
- Never treat generated prose, code, a simulation, or a passing build as proof
  that the mathematics is correct.

Read `GOVERNANCE.md` for decision authority and `CONTRIBUTING.md` for the full
human contribution policy.

## Required Reading

Before changing the repository, read:

1. `CONTRIBUTING.md`
2. `ARCHITECTURE.md`
3. `docs/notation.mdx`
4. The target module's `index.mdx`
5. One or two nearby lessons with a similar teaching purpose
6. The nearest relevant README under `src/components/` or `src/lib/`

For a new lesson, run `npm run new:lesson -- --help` or start from
`templates/lesson.mdx`. For a contributor using an AI assistant interactively,
`AI_WORKFLOW.md` provides reusable prompts and review stages.

## Repository Map

- `docs/`: MDX lessons grouped by curriculum module.
- `src/components/simulations/`: lesson-specific interactive models.
- `src/components/kit/`: reusable, subject-neutral lesson UI.
- `src/lib/domain/`: deterministic mathematics and physics, with tests.
- `src/lib/visualization/`: shared plotting and canvas infrastructure.
- `src/lib/platform/`: browser, privacy, analytics, and progress behavior.
- `src/theme/`: narrow Docusaurus integrations.
- `static/img/`: source-controlled static images.
- `scripts/`: deterministic repository checks.
- `.github/`: proposals, pull request templates, CI, and ownership.

Do not edit generated output in `build/` or `.docusaurus/`.

## Standard Contribution Workflow

### 1. Confirm the scope

New substantive lessons should begin with a lesson proposal issue and
maintainer feedback. Small corrections and focused improvements may go
directly to a pull request.

Before writing:

- State the learning objective in one sentence.
- Identify the prerequisite lesson and the module where the lesson belongs.
- Identify the physical or software failure that motivates the concept.
- List the primary or authoritative sources that will support it.
- Define what a reader should be able to calculate, explain, or implement.

Do not broaden an accepted proposal into a module rewrite, dependency change,
or design-system change.

### 2. Inspect before editing

Search the repository for:

- existing explanations of the same concept;
- notation and coordinate conventions;
- reusable demos, components, and domain functions;
- API shapes used in neighboring Java examples;
- tests for related mathematical behavior.

Reuse established conventions. Do not create a second geometry type, angle
convention, control-law notation, or simulation primitive without a concrete
reason.

### 3. Research and model

Use primary sources when possible: papers, official documentation, SDK
documentation, manufacturer documentation, or the source repository for the
algorithm being described.

- Never fabricate a citation, quotation, constant, benchmark, or hardware
  specification.
- Distinguish a sourced fact from an inference or engineering recommendation.
- If a source cannot be verified, omit the claim or mark the uncertainty for
  the human contributor.
- Do not copy source prose. Explain the idea independently and cite it.

For mathematical or physical logic, write the deterministic model in
`src/lib/domain/` when it is substantial enough to test independently.

### 4. Write the lesson

Every substantive lesson should contain:

1. frontmatter with `title`, `description`, `sidebar_position`, and `tags`;
2. one H1 title, a `Difficulty` label, and a concise `Abstract`;
3. a concrete robotics or engineering problem;
4. visual intuition before or alongside the formal derivation;
5. equations with every non-obvious symbol and unit explained;
6. a focused, non-blocking implementation example;
7. real-hardware limitations and failure modes;
8. links to prerequisites, follow-up lessons, and sources.

Do not force generic section names when subject-specific headings are clearer.
Keep prose precise and calm. Avoid promotional language, generic AI
introductions, invented anecdotes, and decorative content that does not teach.

### 5. Verify the mathematics

For each equation or algorithm, explicitly check:

- coordinate frame, axis direction, angle sign, and wrapping interval;
- dimensions and units on both sides;
- exact relationship versus approximation or discretization;
- zero, negative, boundary, saturation, and singular cases;
- dependence on measured loop time where integration or differentiation is
  involved;
- whether curvature, norms, energy, and square roots need magnitudes;
- whether a statement is true for a specific plant or claimed for all plants;
- whether code implements the same equation and sign convention as the prose;
- whether an interactive demo uses the same constants and assumptions;
- whether Java record components use accessor methods outside the record.

Test invariants and failure cases, not only one nominal example. A graph that
looks plausible is not a mathematical test.

### 6. Build interactive material only when it teaches

A simulation must expose one named model, parameter, trade-off, or failure
mode. Use the shared `Demo`, `Controls`, `Slider`, `Readout`, and `Legend`
primitives where appropriate.

- Keep reusable equations outside React.
- Keep browser APIs inside effects or event handlers.
- Clean up animation frames, timers, and listeners.
- Provide keyboard operation and an accessible label.
- Check narrow screens, light mode, dark mode, and reduced motion.
- Do not add a package for a small visualization utility already supported by
  the repository.

### 7. Validate and self-review

Install and validate with:

```bash
npm ci --ignore-scripts
npm run verify
```

During iteration, use the narrower relevant commands, but run `npm run verify`
before declaring the contribution complete.

Then inspect the diff and search for:

- stale versions of a corrected equation or name;
- unrelated formatting changes;
- placeholders;
- missing or invented sources;
- duplicated models;
- generated build files;
- secrets, private telemetry, or student data.

Report exactly what was checked. Do not claim a command passed unless it was
actually run successfully.

## Code and Content Boundaries

- Preserve the dependency direction documented in `ARCHITECTURE.md`.
- Prefer direct simulation imports over barrels.
- Keep domain modules independent of React, Docusaurus, and browser globals.
- Do not introduce raw iframes; use the consent-aware video component.
- Do not add dependencies or edit the lockfile unless the accepted scope
  requires it.
- Preserve unrelated work in a dirty working tree.
- Keep a pull request focused enough for a maintainer to verify.

## Pull Request Handoff

The pull request must state:

- the accepted proposal or issue, when applicable;
- the learning objective and files changed;
- the primary sources checked;
- mathematical assumptions and approximations;
- automated commands run and their results;
- manual checks performed;
- which parts used AI assistance and what the human verified;
- any uncertainty or follow-up work.

AI-assisted work is held to the same review standard as handwritten work. The
maintainer may request smaller scope, additional sources, tests, corrections,
or a rewrite before approval.

## Definition of Done

A contribution is ready for maintainer review only when:

- its scope matches the proposal or stated purpose;
- the prose, formulas, code, and simulation agree;
- nontrivial claims are traceable to reliable sources;
- edge cases and hardware limitations are stated;
- deterministic behavior has suitable tests;
- `npm run verify` passes;
- the diff contains no unrelated or generated changes;
- the human contributor has reviewed and can explain the result.
