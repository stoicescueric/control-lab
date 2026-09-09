# Community launch review — 8 September 2026

**Recommendation: hold the broad community announcement for a focused release-hardening pass.** The deployed site is useful and technically substantial, and its automated build is healthy. The remaining work is mainly accuracy, reproducibility, access to experiments, and enforcement of the release process. This does not require a redesign or more curriculum breadth.

## Remediation progress — 9 September 2026

Work started on branch `codex/launch-hardening`, based on the deployed source tree:

- Corrected both RST explanations, including the zero-history step increments and the repeated-pole case.
- Preserved the initial clamping evidence in the moving-shot Java example.
- Replaced the undefined “audited manuscript” label with “technical manuscript” and disclosed the current limit on independent replay of the reported trials.
- Added the shared callout shrink constraint that caused the measured mobile overflow.
- Validated saved progress, challenge and last-visited data before use, with regression tests for malformed storage.
- Added `llms.txt`, a discoverable plain-text link, and `WebSite`/`Course` JSON-LD with canonical subject, audience, author and license information.
- Updated every fixable advisory in the installed graph. The audit fell from 44 affected entries (36 high, 7 moderate, 1 low) to one underlying high-severity dependency: `image-size@2.0.2`. npm reports 18 high entries because that one package propagates through Docusaurus packages. No patched `image-size` release exists as of this check.
- Re-ran the complete verification pipeline: 182 tests in 23 files, production build, content and architecture rules, lint, formatting, types, static security checks and size budgets all pass.

The launch hold remains because the public supplementary experiment archive, a compiled FTC example path, equivalent reduced-motion controls in the remaining live demos, enforced GitHub branch rules, and release/smoke-test evidence are still open. The repository can merge this hardening batch while those independent items continue.

## Scope and version reconciliation

The working checkout is `de0fa1b`, with an existing untracked `src/lib/domain/calibrationStrategy.test 2.ts`. Its cached `origin/main` is `093c571`. GitHub's deployed `main` is `ff3aab5cecc0d4c94ab7dba699af96fd366acd8d`.

The locally available `053e838` commit has exactly the deployed merge's tree, `5e0475ac6f9df1c22739c1dfb7f7a802be808f7b`. I extracted and checked that tree in an isolated temporary repository. Findings below apply to that deployed tree unless explicitly marked local-only. I did not change the checkout, dependencies, GitHub settings, or deployed site.

This was a broad audit with targeted deep inspection, not independent certification of every derivation or a hardware trial. The current tree has 53 MDX pages, 45 simulation TSX files, and 92 JavaCode blocks. These are file/component counts, not verified learning outcomes. Inspection concentrated on foundations, PID/feedforward/system identification, filtering/Kalman, path following, LQR/RST, the launcher elective, shared UI, numerical infrastructure, CI, security, and community documentation.

## Verification evidence

| Check | Result |
| --- | --- |
| Full `npm run verify`, deployed source tree | Pass: architecture, content, contributor rules, lint, formatting, TypeScript, tests, build, static security, size |
| Unit tests, deployed source tree | 180 passed across 22 files |
| Working checkout `npm run verify` | Fails TypeScript because the untracked duplicate test imports an absent module |
| Working checkout excluding that duplicate | TypeScript and 154 tests pass; production build passes |
| Fresh older-checkout HTML audit | 222 generated pages; zero missing internal targets/anchors and zero KaTeX error elements |
| External references in older checkout | 69 URLs returned HTTP 200; YouTube, DOI and Desmos excluded; HTTP success does not prove semantic correctness |
| Live deployment | [Latest deploy succeeded](https://github.com/stoicescueric/control-lab/actions/runs/34242551722); CodeQL also succeeded |
| Latest merged PR CI | [Dependency review failed while build passed](https://github.com/stoicescueric/control-lab/actions/runs/34242508417); failure cause not established from step status alone |
| Dependency advisory audit | 37 affected packages: 34 high, 3 moderate, zero critical; includes transitive/metavulnerability counts |
| Browser checks | Homepage/PID rendered, local search returned Kalman results, live fullscreen focus containment worked, PID pause/step controls present and exercised; no captured errors in these checks |
| Responsive check | Live PID page has 453 px document width at a 390 px viewport; callout content extends to approximately x=453 |
| Supplied DebugBear Lighthouse run | FCP 1.0 s; LCP 2.0 s; Speed Index 1.1 s; CLS 0; Total Blocking Time 250 ms |

The fresh deployed-tree build totals 25.38 MB uncompressed, including 6.96 MB scripts/styles, 2.98 MB search index, and 5.53 MB papers. Largest main JS: 546.5 KB uncompressed. These are whole-site/file sizes, not first-load transfer sizes. Existing size budgets pass; papers are at 92% of their budget.

The supplied DebugBear screenshot adds one synthetic Lighthouse sample for the homepage. Initial rendering is healthy in that run: FCP is 1.0 s, LCP is 2.0 s, Speed Index is 1.1 s, and CLS is 0. Interactivity is the weaker dimension: Total Blocking Time is 250 ms. The report also flags 3.7 s of main-thread work, six long tasks, approximately 52 KiB of unused JavaScript, render-blocking requests with an estimated 140 ms opportunity, cache lifetime savings estimated at 292 KiB, forced reflow, a network dependency chain, and images without explicit width and height. The screenshot does not show the overall Lighthouse score, test profile, network/CPU settings, request details, or repeated-run variance, so it supports prioritization rather than a release pass/fail judgment.

The ordinary preview command exhausted the heap under local Node 26.7.0. A static preview worked. Treat this as a reproducible local tooling observation, not proof that the browser application leaks memory. CI uses a different Node version.

## Material quality — highest priority

### 1. Correct two mathematical claims in RST — before announcement

The [RST lesson](https://github.com/stoicescueric/control-lab/blob/ff3aab5cecc0d4c94ab7dba699af96fd366acd8d/docs/control-theory/rst-pole-placement.mdx#L200) says a step response from rest cannot reveal the difference between scalar and polynomial T. That is false for the zero-history linear systems just derived. For a unit step, their first output increments are `(1-p1)(1-p2)` and `1-p1`. With the lesson's 20 ms, 0.08 s and 0.4 s values, these are approximately **0.01079 versus 0.22120**. Equal steady-state gain does not imply equal step responses. The code's initialization of previous reference to the first requested reference must be distinguished from a true zero-history step.

The [end exercise](https://github.com/stoicescueric/control-lab/blob/ff3aab5cecc0d4c94ab7dba699af96fd366acd8d/docs/control-theory/rst-pole-placement.mdx#L379) also implies that equal poles cause T to cancel the only pole. If `p1=p2=p`, the denominator is `(1-p q^-1)^2`; cancelling one factor leaves **one stable pole**, rather than removing both. Reframe the question around the actual tradeoff in disturbance response.

Acceptance: correct the prose and exercise, state initial conditions, and compare actual recurrence outputs against the derived step response. Existing 19 RST tests pass despite these teaching errors.

### 2. Complete the research reproducibility trail — before announcement

The bundled launcher paper's page 18, Section 11, refers to a supplementary archive supplied with a submission and says a DOI will be inserted after deposit, before resubmission. That is an unfinished publication instruction in the public artifact. The elective provides the paper, a simulator repository, and pinned firmware, but no direct public link to the described supplementary archive.

Publish a versioned archive containing the claimed scripts, aggregate data, results and checksum manifest, then link it directly from the paper and elective. A DOI is useful but not required: a stable public release is sufficient to remove the immediate access gap. If the archive remains private, say exactly which results readers can and cannot reproduce.

Also define **“audited manuscript”**: who reviewed what, when, and with what independence. The current label does not explain its assurance level. This finding is about traceability, not an allegation about the reported experiments.

The paper's sampled first page is legible. The elective's separation of simulated coverage, teaching arithmetic, physical entries and retained scores is a strong feature worth preserving.

### 3. Verify the Java learners are expected to use — release-quality gap

There are 92 rendered Java blocks, but the release checks compile TypeScript and run Vitest; they do not compile Java. The snippets often intentionally omit surrounding types, imports and fields. That is reasonable for exposition, but the promise of deployable engineering needs at least one complete, version-pinned FTC example path.

Create a small compilable example project for a primary mechanism/controller path, explicitly distinguish fragments from complete examples, and use shared numerical fixtures for important Java/TypeScript algorithms. Do not require every illustrative fragment to become a standalone application.

A concrete mismatch appears in the [moving-shot Java example](https://github.com/stoicescueric/control-lab/blob/ff3aab5cecc0d4c94ab7dba699af96fd366acd8d/docs/advanced-research/shoot-on-the-move.mdx#L163): the initial lookup uses `getClamped`, then initializes `clamped=false`. Subsequent lookups can all fall inside range even though the initial one was clamped. The TypeScript model preserves `initialLookupClamped`; the Java result loses this evidence. Initialize the flag from a structured initial lookup if it is intended to report any clamping.

### 4. Make Kalman experiments teach the stated tuning problem

`Kalman.tsx` uses the same R to generate measurement noise and configure the estimator, with an undocumented `sliderValue² / 3.5` conversion. It demonstrates matched noise, but cannot show the failure from an incorrectly assumed measurement covariance. Its model runs at 3.6 times wall-clock speed without labeling that acceleration.

Separate actual sensor standard deviation from assumed R, label the model clock, and provide repeatable seeded observations. Extract the covariance update into the tested domain layer. The matrix algebra inspected is not itself evidence of an incorrect filter; this is a mismatch between the learning objective and what the controls can demonstrate.

### 5. Improve source status and learner validation

The moving-shot lesson cites a WPILib **PR-preview documentation domain** as its main sequence. Identify it as draft material and pin its revision, or replace it with a verified canonical publication. Do not silently present a preview as the stable API/reference contract.

Keep the strong worked examples, local symbol explanations, physical caveats and predict–run–explain exercises. Improve the next layer with a short practical route, an explicit artifact at each checkpoint, and a transfer task using an unfamiliar trace or mechanism. Pilot that route with students before describing the curriculum as proven effective. No learner-outcome evidence was established by this audit.

## Code, accessibility and operational quality

### 6. Fix the remaining mobile callout overflow — before announcement

On the deployed PID page at 390 × 844, document scroll width is 453 px. The content child of **“How to actually find F and L”** extends to x≈452.8. This is visible HTML content, not merely a hidden MathML bounding box.

The shared [Callout component](https://github.com/stoicescueric/control-lab/blob/ff3aab5cecc0d4c94ab7dba699af96fd366acd8d/src/components/kit/Callout.tsx#L35) places an unrestricted content div beside a non-shrinking label in a flex row. Give the content an appropriate shrink/min-width rule and keep any necessary equation scrolling local. Verify 320, 390 and 768 px, both themes and enlarged text.

### 7. Extend accessible experiment controls beyond PID

The current release fixes PID with pause/step controls. Other time-dependent demos, including Kalman and RST, still use the default `useRaf` path: reduced motion passes dt=0, and they expose no equivalent run/step route. Their time-dependent learning activity becomes unavailable when that preference is enabled.

Reuse the PID approach: start paused, provide manual stepping and explicit run permission, and retain meaningful text results. This conclusion follows from source control flow; it was not an all-demo assistive-technology test.

### 8. Cover browser and storage behavior

The pure numerical layer, strict typing, cleanup patterns and separation between domain/platform/visualization code are good foundations. Add a small browser regression suite for actual release risks: mobile overflow, fullscreen focus, search navigation, progress toggling, consent withdrawal and representative demo controls. The current tests do not exercise browser behavior.

`progress.ts` accepts any truthy `completed` value after JSON parsing. A string-valued record can later throw on assignment in `toggleComplete`. Validate the small persisted schema and recover to defaults. This is a lower-priority resilience issue, not a demonstrated remote attack.

Full consent withdrawal/network behavior, all-browser compatibility, PWA installation/offline updates, field performance, screen-reader use and real-device performance remain unverified. A static CSP/source scan does not certify them.

### 9. Reduce homepage blocking work without delaying launch for cosmetic scores

The supplied Lighthouse run has good paint and layout-stability measurements, but 250 ms Total Blocking Time and 3.7 s main-thread work show useful room for improvement. Prioritize the six long tasks and forced reflow. Profile the homepage's running simulation, hydration, search initialization, PWA registration, and below-the-fold interactive imports. Preserve the immediately useful hero; lazy-load lesson demos that do not affect the first screen and give images intrinsic dimensions.

Treat the cache-lifetime warning carefully. GitHub Pages controls some response headers, and hashed assets already permit content-addressed caching in principle. Identify which requests account for the reported 292 KiB before changing hosting or service-worker behavior. Likewise, 52 KiB of estimated unused JavaScript alone does not justify a large architectural rewrite.

Acceptance: collect at least three mobile Lighthouse runs on the exact release revision with a documented profile, use the median, and inspect a performance trace for the long-task owners. Set a regression budget for LCP, CLS and TBT in addition to the existing uncompressed bundle budget. A reasonable first target is to keep the already healthy LCP/CLS while bringing median TBT below 200 ms.

## GitHub, dependencies and release management

### 10. Enforce the documented merge policy — before accepting community PRs

Public GitHub API inspection returned **no rulesets** and `main.protected=false`. `CODEOWNERS` and governance files exist, but required reviews/checks are not enforced. The latest merged PR has a failed dependency-review run even though its build and subsequent deploy succeeded.

Activate a main-branch rule requiring successful build, dependency review and CodeQL checks, PR review, conversation resolution, and protection from force pushes/deletion. Confirm the exact emitted check names. Resolve the failed dependency-review job before treating the current release as fully green.

There is one code owner. Requiring that person to approve their own authored PR cannot work as a normal review path. Define a second trusted reviewer or an explicit, documented maintainer exception; do not leave the documented workflow impossible to follow.

### 11. Triage current advisories and add a full dependency check — before announcement

The locked dependency graph reports **37 affected packages: 34 high and 3 moderate**. Counts include dependency propagation; they are not 37 distinct browser vulnerabilities. The site is statically hosted, and many affected paths are build/development tools. Reachability and exposure still need triage.

Examples include js-yaml, image-size, brace-expansion, fast-uri, nanoid, qs and undici. Several explicit overrides pin versions now covered by newer advisories. See the [js-yaml advisory](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) and [image-size advisory](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr).

Update supported compatible versions and the lockfile, then verify. Avoid an indiscriminate forced audit fix: npm's suggested remedies include broad dependency changes. Document any remaining non-reachable/admitted risks with an owner and review date.

`npm run security` checks workflow pins, lockfile origins/integrity, static embedding and dangerous sinks. It **does not query advisories**. Add a separate full-lockfile advisory gate and scheduled check; dependency review on changed PR dependencies is not the same assurance.

### Community setup already in place

- Public repository with description, homepage and robotics topics.
- MIT license, contributing guide, code of conduct, security policy, governance, ownership and issue/PR templates.
- Discussions enabled and private vulnerability reporting enabled.
- Dependabot active; six open items inspected were dependency PRs.
- Actions pinned to commits; restricted permissions; install scripts disabled; deployment authority separated into its own job.
- Fonts served locally and videos click-to-load; analytics loader checks consent before first load.

There are no published GitHub releases. Establish a named launch revision and release notes with known limitations, a rollback procedure, and a short smoke checklist. Keep an asset-license inventory for mirrored third-party papers/images; the motor image has an explicit attribution/license, but a repository MIT label alone is not a complete inventory of third-party terms.

## Already repaired in the deployed merge

Do not reopen these findings just because the older local checkout still exhibits them:

- Incorrect statement that Road Runner/Pedro pose estimators necessarily implement an EKF: replaced in the current Kalman lesson. The earlier assertion conflicts with [Pedro's documented localization methods](https://pedropathing.com/docs/pathing/tuning/localization).
- PID's claim that nested motor loops inevitably produce untunable oscillation: replaced with a distinction between mismatched command semantics and deliberate cascaded control.
- Major lesson headings missing from the generated table of contents: migrated to Markdown headings.
- Fullscreen modal semantics and focus containment: source updated and live Shift+Tab containment confirmed.
- PID reduced-motion access: pause/step controls added; remaining demos still need the broader pass described above.

## Release acceptance checklist

1. Correct the RST claims and give the paper's supplementary evidence a usable public destination.
2. Fix phone overflow and provide equivalent access to important time-dependent experiments.
3. Resolve/triage current advisories and the failed dependency-review job; enforce branch rules.
4. Supply one compiled FTC implementation path and check the Java/model boundary cases.
5. Re-run the full checks on the exact release commit; smoke-test desktop/mobile, search, PDF links, consent, progress and offline/update behavior; record three documented mobile Lighthouse runs and investigate the long tasks.
6. Publish a release with limitations, rollback instructions and a practical learner route; gather feedback from a small student pilot before broad promotion.

The best next investment is verification and clarity. Adding further advanced material would increase the review burden before closing the current launch gaps.
