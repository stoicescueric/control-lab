# Control Lab project audit — 5 September 2026

Control Lab is a useful, technically ambitious interactive textbook for FTC programmers who already know Java. Its strongest feature is the connection between physical behavior, equations, implementation, and hardware limitations. The next investment should be in verifying that connection and improving how learners navigate and demonstrate understanding.

This is a broad repository audit with targeted deep inspection, not a certification of every derivation, external source, or robot implementation. It includes the existing uncommitted curriculum and research changes. The implementation log below distinguishes later repairs from the original audit findings.

## Implementation progress — 8 September 2026

The first repair batch is implemented:

- Corrected the PID motor-mode explanation and distinguished accidental controller conflicts from deliberately designed cascaded control.
- Migrated all 77 `Problem`, `Theory`, and `Deploy` titles to real Markdown headings, restoring anchors and table-of-contents navigation across the curriculum. The content checker now prevents the old title-prop pattern from returning.
- Added dialog semantics, background isolation, keyboard focus containment, Escape handling, and focus restoration to fullscreen demos without remounting their canvases.
- Added Run/Pause and 0.2-second Step controls to the PID experiment. Reduced-motion users start paused and can explicitly opt into continuous motion.

The production build, 161 tests, TypeScript, lint, content and architecture checks, static security checks, and bundle budgets pass after these changes. Browser checks confirmed the PID TOC, modal lifecycle, focus wrapping, and paused manual stepping.

## Evidence and verification

- Inventoried 52 MDX curriculum/reference pages, 44 simulation TSX files, and 106 Exercise blocks across 37 pages. These are file/component counts, not counts of independent simulations or assessed learning outcomes.
- Ran the complete `npm run verify` pipeline successfully: architecture, content, contributor checks, lint, formatting, TypeScript, 21 test files / 161 tests, production build, static security checks, and bundle budgets.
- Inspected architecture, shared UI, animation infrastructure, progress, CI, representative domain implementations/tests, curriculum structure, PID, Kalman, path-following material, and research source presentation.
- Viewed the freshly built homepage and PID lesson in the browser, including fullscreen and a 390 × 844 phone viewport. Other pages were assessed through source; no all-page visual or screen-reader certification is implied.
- The standard preview command crashed with a Node heap exhaustion error under the installed Node 26.7.0. A localhost static server successfully served the build. This is an environment-specific observation; reproduce under the CI runtime before attributing the crash to application code. The static server required `.html` lesson URLs; that is not a production routing defect.
- Static output: 24.51 MB total; 6.57 MB scripts/styles; 2.84 MB search index; 5.53 MB papers. These are uncompressed whole-site sizes, not initial page transfer costs. The largest main JS file is approximately 545 KB.

## Overall assessment

| Area | Assessment | Main improvement |
| --- | --- | --- |
| Architecture | Strong foundation | Finish extracting important mathematics from UI components |
| Code verification | Good for pure functions | Add browser behavior and compiled Java example coverage |
| Technical explanations | Substantial, with some overstatements | Review claims and assumptions as carefully as equations |
| Teaching method | Strong intuition and practice | Add explicit mastery criteria, transfer tasks, and delayed retrieval |
| Resources | Broad and relevant | Make sources reproducible and easier to select |
| UI | Coherent visual direction | Repair navigation, fullscreen accessibility, and phone overflow |
| Practical usefulness | High for motivated intermediate FTC learners | Supply complete, verified implementation paths |

These are qualitative judgments. Student outcomes and hardware reliability were not measured.

## Priority findings

### 1. Correct the explanation of nested motor controllers — high priority

Evidence: `docs/control-theory/pid.mdx:171–187` says adding a controller over firmware control produces oscillation that cannot be tuned away. This confuses an inappropriate command/mode combination with the general idea of nested control.

`RUN_USING_ENCODER` regulates velocity; `RUN_TO_POSITION` targets position. The command semantics differ. The current explanation can teach readers to reject valid cascaded designs. [REV's motor-mode documentation](https://docs.revrobotics.com/duo-control/hello-robot-java/using-encoder) supports this distinction.

Keep `RUN_WITHOUT_ENCODER` for the lesson's direct power-output controller. Explain why it matches the modeled actuator input. Add a separate diagram showing an outer position loop that intentionally commands an inner velocity loop, with separate tuning and bandwidth considerations. Avoid claiming inevitable oscillation.

Acceptance: a reader can identify what each loop measures, what its output means, and why the selected SDK mode matches that output.

### 2. Restore major lesson headings to the table of contents — high priority

Evidence: `src/components/kit/Steps.tsx:24–29` renders plain `<h2>` elements inside custom components. The PID page visually has three main instructional sections, but its rendered “On this page” navigation contains only the two Markdown subheadings. Major headings also lack their own generated anchors.

Use Markdown headings in MDX, with wrappers handling presentation, or explicitly integrate component headings into the build-time heading extraction. Adding an ID alone does not repair the TOC.

Acceptance: every major PID section appears in desktop and mobile TOCs, supports a direct link, and scrolls below the sticky navbar.

### 3. Make fullscreen a complete accessible modal — high priority

Evidence: `src/components/kit/Demo.tsx` locks scrolling and handles Escape but has no dialog semantics, focus containment, or background inertness. Browser inspection confirmed zero dialog elements/roles while expanded. Keyboard users can leave the apparent modal and reach obscured page controls.

Preserve the existing canvas nodes while adding a labeled modal boundary, focus containment, background inertness, and predictable focus restoration. The current concern about remounting canvases is valid and should remain part of the implementation design. Follow the [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

Acceptance: Tab and Shift+Tab stay inside; Escape closes; focus returns to the opener; the simulation continues to draw after repeated open/close cycles.

### 4. Reduced motion currently removes access to time-dependent learning — high priority

Evidence: `src/lib/visualization/canvas.ts:95–100` invokes callbacks with zero elapsed time under reduced motion. The PID drone advances only when accumulated elapsed time reaches its physics step. Its wind-gust challenge requires simulated time, while the displayed controls provide neither a single-step action nor an explicit opt-in run control.

A static initial state is reasonable, but learners still need a way to conduct the experiment. Add Run/Pause and Step controls, with reduced motion defaulting to paused. Prefer bounded instructional runs over automatic playback.

Acceptance: a learner with reduced motion enabled can complete the same conceptual exercise and challenge without changing operating-system preferences.

### 5. Separate actual sensor noise from assumed Kalman noise — medium priority

Evidence: `src/components/simulations/signal-processing/Kalman.tsx:112–121` derives one `R`, uses it to generate observations, and passes that same value into the filter. The visible slider value is also transformed by `R = value² / 3.5`, without explaining its unit or meaning.

The current demo is valid as a matched-noise illustration, but it cannot demonstrate a badly chosen measurement covariance. Provide separate controls for actual sensor standard deviation and assumed filter variance, explicitly linking standard deviation and variance. Add presets for overconfident sensors, conservative sensors, and unexpected acceleration.

The same component advances its 0.06-second model once per 1/60 second of accumulated wall time: effectively 3.6× simulation speed. Either align those clocks or label the acceleration. This is internally consistent model stepping, not evidence that the filter equations are wrong.

Extract `kfStep` into the domain layer. Use seeded observations and tests for covariance symmetry, finite results, representative estimation error, and mismatched-noise behavior. The current inline implementation is outside the dedicated domain tests.

### 6. Close the verification gap around Java examples — medium priority

Evidence: Java is embedded as strings in MDX and rendered by `JavaCode.tsx`. The verify pipeline checks TypeScript and Vitest, but contains no Java compilation. The PID samples intentionally omit class context, imports, and some field declarations.

Label snippets as either conceptual fragments or complete examples. Create a small version-pinned FTC example project for the primary deployment path and render lesson excerpts from that source. Compile it in CI. Use numerical fixtures to compare key Java algorithms with the TypeScript simulation models.

Acceptance: a student can download a complete example, compile it against the documented SDK/library versions, and identify what hardware configuration must be supplied. Compilation alone does not establish safe or correct physical behavior; include a measured commissioning procedure.

### 7. Fix phone overflow and protect mathematical readability — medium priority

The PID page reported a 453 px document scroll width at a 390 px viewport after reload. Initial DOM inspection found equation-related elements extending beyond the viewport; the precise layout source still needs isolation. Do not treat every hidden MathML bounding box as a visible defect.

`fitMath.ts` can reduce display equations to 55% of their original size. That trades scrolling for potentially difficult reading. Prefer readable multiline equations or a clearly bounded horizontally scrollable equation area. Audit callout flex children, demo controls, code, and equation containers for shrink behavior.

Acceptance: no document-level horizontal overflow at 320, 390, and 768 px; any unavoidable two-dimensional content scrolls locally; equations remain readable at 200% zoom. Test both themes.

### 8. Validate persisted progress at the storage boundary — lower priority

Evidence: `src/lib/platform/progress.ts:17–26` accepts any truthy `completed` field as the expected record. Valid JSON such as a string-valued `completed` can make `toggleComplete` throw when assigning a property. `last` is also accepted without field validation.

Validate the small schema, recover unsupported values to defaults, and restrict stored continuation paths to expected internal routes. Add tests for malformed JSON, wrong field types, blocked storage, and storage events. This is principally a resilience issue, not evidence of a remote exploit.

## Code and implementation recommendations

Preserve the existing separation of domain mathematics, visualization, platform services, simulation components, and MDX. Strict TypeScript, meaningful multi-step physics tests, local fonts, consent-aware video, pinned workflow actions, and production budgets are strengths.

Finish extraction where it enables verification, beginning with Kalman and other inline numerical updates. Large files such as `FilterMathDemos.tsx` (898 lines) and `MathDemos.tsx` (650 lines) deserve inspection, but line count alone is not a defect. Split by independent experiment or model responsibility. Avoid building a generic simulation engine merely to reduce file sizes.

Introduce a common experiment contract: reset, time units, initial state, parameter units, deterministic seed where relevant, and a few meaningful measurements. Share these conventions before sharing more implementation machinery.

Add a small browser regression suite around high-value journeys: open a lesson, search, change a slider, reset, expand/close with a keyboard, reveal a solution, and retain progress after reload. Include mobile, reduced-motion, and storage-denied cases. Current successful tests do not cover those interactions.

Measure per-route compressed transfers and responsiveness before optimizing the 6.57 MB aggregate JS/CSS total. Test homepage, PID, Pure Pursuit, and a research lesson. Track search startup separately because its index is 2.84 MB. The papers category is already at 92% of its budget; investigate compression or optional delivery before increasing limits.

The security script is a useful static guard, not a vulnerability scan or proof of runtime consent behavior. Add a dependency advisory check and a browser network check before/after consent if those are intended release guarantees. Document a tested Node version and reproduce the preview failure there.

## Teaching and explanation recommendations

Keep the physical context → visual intuition → mathematics → implementation → hardware reality sequence. Existing exercises and core checkpoints are valuable. Extend them consistently rather than replacing them.

For each core lesson, state prerequisites, two or three observable outcomes, and the artifact the learner should produce. The research introduction already models this well with explicit prerequisites and distinctions between predictions, teaching examples, and observations.

Recommended lesson sequence:

1. Predict the result before moving a slider.
2. Change one variable and record what happened.
3. Explain the result with a diagram and equation.
4. Follow a complete worked example.
5. Solve a similar task with one step omitted.
6. Diagnose a new failure without the scaffold.
7. Answer a short retrieval question in a later lesson.

Interleaving worked examples with problems, spacing practice, and using retrieval are supported by the [IES practice guide](https://ies.ed.gov/ncee/wwc/practiceguide/1). Their effectiveness in this particular curriculum should still be tested with learners.

Add a few transfer tasks: tune a changed load without copying gains; diagnose a time-unit error from logs; choose whether delay, bias, or random noise explains a trace; explain when a calibrated model fails outside its measured range.

Distinguish “read,” “practiced,” and “demonstrated” progress. Keep completion self-reported and optional; a stored green check is not evidence of mastery. Offer progress export/import before considering accounts.

Separate reading time from expected lab time. The PID page says approximately 14 minutes to read; tuning and producing telemetry will take a different amount of time. Estimate lab durations from a pilot, not word counts.

Review categorical language. Examples include the nested-loop explanation and blanket statements about derivative filtering or inevitable oscillation. State plant assumptions, input/output units, and the limits of an analogy. Preserve the existing useful clarification that PDFL is community terminology and that arm gravity compensation varies with angle.

## Resources and practical usefulness

The references page already contains strong community guides, official documentation, textbooks, papers, videos, and team code. More links alone would add little value.

For each important resource, add: why to read it, the exact section, assumed background, version/commit, and which lesson claim it supports. Pin team-code examples and framework internals to immutable commits. Mark draft documentation as draft: the current Fire Control citation uses a PR-preview documentation URL, which should not silently become a stable API authority.

Useful resource improvements:

- Add a foundational control reference such as Åström and Murray's *Feedback Systems*, using its publisher/author access route; the [author's second-edition page](https://www.cds.caltech.edu/~murray/FBS/Second_Edition.html) describes its scope and points to the current site.
- Map the existing [Modern Robotics resource](https://modernrobotics.northwestern.edu/nu-gm-book-resource/foundations-of-robot-motion/) to specific frame, kinematics, and Jacobian lessons instead of leaving students at a general landing page.
- Pair the PID/arm lesson with [WPILib's arm-tuning walkthrough](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-vertical-arm.html), explaining which concepts transfer and which APIs are FRC-specific.
- Publish a small, documented real telemetry dataset for system identification, filtering, and control evaluation. Include units, sampling times, hardware configuration, provenance, and expected plots. Keep synthetic and measured data clearly labeled.
- Explain what “audited manuscript” means: reviewed scope, reviewer role, date, and unresolved limitations. Do not let that label imply peer review or independently replicated results.

The project is particularly useful for an intermediate FTC student debugging and extending autonomy. Beginners need a shorter starting route; advanced readers need stronger numerical and source reproducibility. The explicit decision to use an external localization stack is sensible: make that dependency visible in the practical route and provide one complete adapter example.

The homepage should offer two clear routes: “Get one mechanism working” and “Study the theory.” The how-to page already contains suggested routes, while prominent homepage entry points favor the mathematics preface. Surface the existing practical route and reconcile the homepage's dependency-order promise with Module 2's explicitly difficulty-based ordering.

## UI direction

Keep the restrained typography, consistent dark experiment panels, clear code presentation, and real simulation on the homepage. The visual identity fits a technical textbook.

Prioritize navigation and experiment usability over decoration. Repair TOCs; provide persistent local section context; add Pause/Step, readable parameter units, exact numeric entry for important tuning values, named presets, and concise text outcomes. Preserve existing keyboard waypoint controls in Pure Pursuit and the keyboard altitude control in the drone.

Make simulator results available as text or a downloadable table; an image label describes the scene but does not communicate the changing curve. Announce challenge completion once, without sending high-frequency telemetry into live regions. Use plot line styles as well as color.

The mobile PID abstract occupies much of the first screen. A shorter summary followed by “what you will build” would get readers to the experiment sooner. Keep the full conceptual detail in the lesson itself.

## Suggested implementation order

| Batch | Work | Completion evidence |
| --- | --- | --- |
| 1: Correctness and access | PID explanation, TOC, fullscreen, reduced-motion controls | Reviewed lesson text and browser regression checks |
| 2: Reproducible experiments | Kalman extraction, separate noise controls, documented clocks/seeds | Domain tests plus repeatable demo scenarios |
| 3: Deployment confidence | Complete Java examples, compilation, shared fixtures | Clean example build and documented hardware trial |
| 4: Learner outcomes | Practical route, explicit outcomes, transfer tasks, real logs | Student can produce and explain the intended artifact |
| 5: UI and maintenance | Mobile fixes, route budgets, source metadata, progress resilience | Responsive checks, measured route costs, malformed-storage tests |

Pilot the improved practical route with a small group of students. Ask them to tune one mechanism, explain a disturbance response, and diagnose an unfamiliar trace without prompting. Record where they get stuck and whether they can repeat the reasoning later. That evidence will show which additions improve usefulness more reliably than adding further advanced topics.
