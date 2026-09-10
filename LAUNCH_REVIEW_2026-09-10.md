# Final community launch check — 10 September 2026

**Decision: the local release candidate passes its automated checks; hold the broad community announcement until the release and repository gates below are closed.** The live site still serves the older `main` revision. This review did not publish changes or change GitHub settings.

## What was checked

The working candidate is `codex/launch-hardening`, based on `d44a471f38b26380cce1f908b4e1f853f820c663`, including the current uncommitted elective rewrite, homepage work, and fixes listed below. Public GitHub reports `main` at `ff3aab5cecc0d4c94ab7dba699af96fd366acd8d`.

Priority was material accuracy, then executable behavior and code, then release management, discovery, and presentation. This was a broad release review with targeted mathematical and source inspection, not a proof of every derivation, a hardware test, or an accessibility certification.

| Check | Final result |
| --- | --- |
| Clean lockfile install | `npm ci --ignore-scripts` passed using temporary Node 24.21.0; no global runtime changed |
| Complete local verification | `npm run verify` passed on Node 24.21.0 |
| Unit tests | 201 passed across 24 test files |
| Architecture, content, contribution, lint, formatting, TypeScript | All passed |
| Production build, static security, size budgets | All passed |
| Generated output | 250 HTML pages; 11,198 internal references checked; no missing local targets or anchors, malformed math elements, missing page descriptions, or missing canonical links in the audited indexable pages |
| Images in generated HTML | No missing alt attributes or explicit width/height attributes |
| Discovery | Sitemap and local `llms.txt` destinations resolve; homepage JSON-LD parses; custom 404 recovery works |
| External links | 168 distinct destinations checked: 159 returned 2xx initially; two dead Pedro links repaired and verified 200; timed-out Zenodo DOI succeeded on retry |
| Browser | Desktop homepage; phone-width homepage, PID and MPC; PID pause/step, fullscreen keyboard containment and Escape; MPC horizon change; search to Kalman; research calculation worker; custom 404 recovery |
| Production preview command | `npm run serve -- --host 127.0.0.1 --port 4183` serves extensionless lesson URLs successfully |
| Credential-pattern scan | No matching private-key, GitHub-token, or AWS-access-key patterns in scanned tracked files; this limited scan is not a replacement for secret scanning |
| Final paper | Bundled PDF exactly matches the supplied final PDF, SHA-256 `e397022469f14f914e206877eab055749a883fc4e76fe88f32b7b816d953bf12` |

Three external 404s are the GitHub **Edit this page** links for the new observers, MPC, and FTC-decision pages. They point to `main`, where those files do not exist yet. They should resolve after the release reaches `main`; recheck them then. Three other destinations returned 403 (the Savitzky–Golay DOI, Kalman DOI, and Medium torque-current article); these are unverified by the automated fetch, not established as broken references.

Fresh canonical lesson loads, search navigation, and the launcher worker produced no captured console errors in the final smoke-test tab. An earlier `.html` preview session recorded a recoverable hydration error while builds were changing; it did not reproduce on fresh canonical MPC/PID loads. Do not test a moving build directory as release evidence.

## Material and implementation corrections made

- **MPC limits and illustration:** check the initial state and interior turning points, not just sample endpoints. A state at 2 m moving outward at 0.2 m/s crosses the bound even when braking returns it to 2 m at the next sample. The plot now draws the constant-acceleration arcs; the lesson explains the dots, interval checks, finite-horizon limitation, and distinction from hardware safety.
- **Numerical model and regression:** stabilize the elevator position integral near zero damping and reject non-finite regression measurements/results. Ten new regression cases were added; nine failed before the fixes and all pass afterward. The observer final-error readout now refers to the same final time as its plot.
- **Teaching accuracy:** distinguish proportional-only steady error from integral feedback; remove an unsupported claim that LUT clamping bounds physical error; explain moving friction versus breakaway stiction, velocity-noise bias in least squares, and the limits of inferred applied voltage. Correct claims that Kalman filtering always beats averaging, only calibration can address bias, and every settled Kalman filter is a first-order low-pass filter. Explain the scalar zero-process-noise limit without claiming updates stop at a finite time.
- **Kalman illustration:** make the sensor slider a literal standard deviation with `R = σ²`, label the acceleration-variance input correctly, and explain the discrete process covariance and uncertainty bubble. The viewer changes actual sensor noise and assumed sensor noise together; the text now states that limitation.
- **Repository policy:** correct the maintainer instructions to require an eligible reviewer other than the PR author, and explain the single-code-owner deadlock before enabling mandatory owner approval.
- **Observer gravity convention:** the elevator predictor now uses clamped motor voltage minus gravity-hold voltage for its gravity-free linear matrices. The state-feedback and observer lessons explicitly distinguish this convention from an affine gravity term. Previously, a stationary elevator receiving holding voltage could be predicted to accelerate.
- **MPC exercise:** put the target above the current position while the elevator approaches the upper bound. Position-only P now actually requests upward motion, so the contrast with predictive braking is valid.
- **PID explanation:** qualify the ideal undamped spring analogy and remove the claim that derivative feedback guarantees near-zero velocity on the first arrival.
- **Pedro references:** replace two HTTP 404 links with current Pedro 3 and End Constraints documentation. Mark the 2.1.x braking comparison as historical instead of claiming it is what the library ships today.
- **Build verification:** exclude only the vendored `.github/skills/impeccable/` bundle from ESLint/Prettier. It caused 722 ESLint errors when scanned under the application rules. Application source and project scripts remain checked; the upstream bundle was not edited or certified.
- **Node runtime:** CI and deployment now read Node 24 from `.nvmrc`; package engine metadata and setup instructions agree. Node 20 is end-of-life according to the [official release schedule](https://nodejs.org/en/about/previous-releases).
- **Discovery and rendering:** repair the invalid `/docs` entry in `llms.txt`, add topic-page descriptions with narrow theme wrappers, add measured image dimensions/lazy loading to two lesson figures, and set navbar-logo dimensions.
- **Release guard:** unresolved Markdown links now fail the build instead of only warning.

The earlier elective rewrite remains in the candidate. It distinguishes the frozen season firmware from newer robot settings, simulated box coverage from physical entry rates, and entry from retained score. The browser reproduced the paper example's selected **5.250 m/s, 58.0°, 494/1767 = 28.0%** coverage. This verifies the displayed numerical example; it does not independently reproduce the physical trial record.

## Gates still open

| Priority | Finding | Required closure |
| --- | --- | --- |
| P1 | **The reviewed candidate is not the deployed revision.** New lessons and fixes remain local/uncommitted. | Commit the intended release files, run PR checks on that exact commit, merge, wait for Pages deployment, then repeat the canonical-route smoke test on the live site before announcing. |
| P1 | **`main` is unprotected.** Public API returned `protected: false` and an empty ruleset list. | Enable an active ruleset requiring PRs, appropriate independent review, and the actual build/dependency-review/CodeQL status checks; block force pushes and deletion. Verify enforcement on a PR. |
| P1 | **Unpatched build-tool advisories remain.** npm reports 18 high affected entries tracing to `image-size@2.0.2`, with two underlying parser denial-of-service advisories and no available fix. | Track upstream remediation. Until patched, document the build-only exposure, review contributed image inputs, retain bounded CI jobs, and explicitly resolve the risk before treating the dependency gate as clean. Do not suppress all high findings. |
| P2 | **Reduced-motion access remains incomplete in older demos.** For example, LowPass uses `useRaf` without an explicit run override or step control; reduced motion stops simulation time, leaving no way to conduct its time-based experiment. CommandScheduler uses its own autoplay loop. | Give affected experiments explicit Run/Pause/Step controls or an equivalent static result. Test the OS preference and user opt-in together. PID already provides a working pattern. |

The dependency advisories concern ICNS, JXL and HEIF image parsing in Node during the build. Docusaurus's MDX image transform calls `image-size/fromFile`; the deployed static site has no public image-upload endpoint. This narrows the exposure but does not make `npm audit` pass. Sources: [ICNS advisory](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr), [JXL/HEIF advisory](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq).

GitHub Discussions and private vulnerability reporting are **enabled**. CODEOWNERS, contribution instructions, issue/PR templates, Dependabot, immutable Action references, read-only PR permissions, and deployment job separation are present. The latest public deployment and CodeQL runs succeeded for the old `main`; the preceding PR's dependency-review job failed. Those historical successes do not validate this candidate.

Public evidence: [main branch](https://api.github.com/repos/stoicescueric/control-lab/branches/main), [rulesets](https://api.github.com/repos/stoicescueric/control-lab/rulesets), [private reporting](https://api.github.com/repos/stoicescueric/control-lab/private-vulnerability-reporting), [last deployment](https://github.com/stoicescueric/control-lab/actions/runs/34242551722), [previous failed PR CI](https://github.com/stoicescueric/control-lab/actions/runs/34242508417). Repository-setting instructions are in `.github/MAINTAINER_SETUP.md`; their presence alone is not enforcement.

## Performance and review limits

Final uncompressed output is **26.54 MB / 36 MB**. JavaScript/CSS is **7.27 MB / 8 MB**, search is **3.25 MB / 5 MB**, and PDFs are **5.53 MB / 6 MB**. These are whole-site build sizes, not initial page downloads. No budget was increased. The search index and script/style budget deserve attention before further curriculum expansion.

No fresh throttled Lighthouse series, screen-reader audit, hardware run, or student usability trial was performed. The supplied DebugBear sample remains historical evidence only; it cannot certify current field performance. Representative desktop and 390 px phone-width rendering passed, including the previously overflowing PID page. No claim is made that every breakpoint and every demo has been exercised.

The paper's supplementary physical experiment archive is not bundled publicly with the site. The lessons disclose that limitation. Java snippets are teaching methods/skeletons with project-specific dependencies; this run did not compile them against the FTC SDK or claim they are ready-to-paste OpModes.

Preserve the pre-existing untracked `src/lib/domain/calibrationStrategy.test 2.ts` and local tooling while preparing the release. Do not use an indiscriminate `git add .`: explicitly select intended source, theme, configuration, and documentation files. The duplicate test file is not part of the intended release.

## Release sequence

1. Resolve the open gates above and select the intended release files, including the new theme wrappers and `.nvmrc`.
2. On the frozen candidate, run `npm ci --ignore-scripts`, `npm run verify`, and `npm audit` with Node 24 LTS. Review advisories separately from the passing static security script.
3. Require successful PR checks for that exact commit. Confirm that GitHub actually enforces the required checks and reviews.
4. After deployment, test the homepage, PID, observers, MPC, the elective selector, search, consent controls, PDF, and a missing URL on the live canonical site. Confirm the three new edit links resolve.
5. Record the deployed commit and repeat performance measurements on the final asset URLs. Then announce the release to the community.
