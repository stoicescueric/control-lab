# Contributing to Control Lab

Control Lab is a technical curriculum, not a content dump. Contributions should make FTC control theory easier to understand, verify, and deploy on a real robot.

This guide explains the standards for lesson writing, interactive demos, Java examples, design, and pull requests.

## How Contributions Are Accepted

All published changes go through a pull request and require maintainer approval.
The repository's `CODEOWNERS` file automatically requests `@stoicescueric`.
The one-time maintainer setup activates a `main`-branch ruleset so that
code-owner approval is required before merge. See
[GOVERNANCE.md](GOVERNANCE.md) for the decision and merge policy.

For a substantive new lesson or simulation:

1. Open a
   [lesson proposal](https://github.com/stoicescueric/control-lab/issues/new?template=lesson-proposal.yml).
2. Wait for the maintainer to confirm or refine the scope.
3. Fork the repository and create a focused branch.
4. Scaffold the lesson with `npm run new:lesson -- --help`, or copy
   [the lesson template](templates/lesson.mdx) into the accepted module.
5. Implement, verify, and open a pull request linked to the proposal.
6. Address CI and review feedback. The maintainer gives final approval and
   merges accepted work.

Small corrections, citations, and focused accessibility fixes may go directly
to a pull request without a proposal issue.

## Using an AI Assistant

AI-assisted contributions are welcome. The project publishes one canonical,
tool-neutral repository guide in [AGENTS.md](AGENTS.md). If an assistant does
not load that file automatically, explicitly ask it to read the file before it
plans or edits.

Use [AI_WORKFLOW.md](AI_WORKFLOW.md) for ready-to-paste prompts that separate:

1. proposal and evidence gathering;
2. focused implementation;
3. independent mathematical and engineering review.

The human contributor remains responsible for the result. Verify sources
yourself, read the generated diff, run the checks, and disclose assistance in
the pull request. An AI response is not a source or an approval.

## Before You Start

Set up the project:

```bash
npm ci --ignore-scripts
npm start
```

Preview the site at:

```text
http://localhost:3000/control-lab/
```

Before opening a pull request, run:

```bash
npm run verify
```

These are the same verification gates used by CI and deployment.

Read [ARCHITECTURE.md](ARCHITECTURE.md) before adding a new component or shared
library. It explains the dependency direction and includes recipes for lessons,
simulations, mathematical models, and browser integrations.

## Contribution Priorities

Good contributions usually fall into one of these categories:

- A new lesson that fills a curriculum gap.
- A clearer derivation, diagram, or variable explanation in an existing lesson.
- A live demo that makes a mathematical idea easier to see.
- A more realistic FTC Java implementation.
- A citation, reference, or correction for a hardware/software claim.
- Accessibility, responsiveness, or visual consistency improvements.

Avoid changes that only add decoration, marketing copy, or visual novelty.

## Lesson Authoring Standard

Every substantive `.mdx` lesson should follow this teaching sequence:

1. Metadata and abstract.
2. Real FTC or engineering context.
3. Visual intuition before math.
4. Theoretical rigor.
5. Engineering implementation.
6. Hardware reality.

### 1. Metadata and Abstract

Start with frontmatter:

```mdx
---
title: Your Lesson Title
description: One sentence that explains the lesson for search and link previews.
sidebar_position: 3
tags: [control, ftc, example]
---
```

Then add a concise abstract:

```mdx
<Abstract>
This lesson explains the concept in two academically clear sentences. It should tell the reader what the idea is and why it matters on a robot.
</Abstract>
```

### 2. Real Engineering Context

Open from a concrete problem:

- A lift overshoots under load.
- A drivetrain arcs when battery voltage sags.
- A heading estimate drifts after repeated turns.
- A path follower cuts the inside of a spline.
- A camera measurement is nonlinear and needs an EKF.

Do not write generic hooks like "math is important" unless the lesson is explicitly introductory.

### 3. Visual Intuition

Put a diagram, SVG, canvas simulation, or React widget before the formal derivation. The reader should be able to see the behavior first.

Good demos expose the essential parameter:

- Filter gain.
- Motor load.
- Lookahead distance.
- Process vs measurement noise.
- Cross-track gain.
- Battery voltage.

### 4. Theoretical Rigor

Use KaTeX math:

```mdx
$$
u = k_S\operatorname{sgn}(v) + k_V v + k_A a
$$
```

Explain every non-obvious variable immediately near the equation. For example:

- `$u$` is the motor command or requested voltage fraction.
- `$k_S$` is the static-friction compensation term.
- `$v$` is mechanism velocity.
- `$a$` is mechanism acceleration.

Do not leave readers to infer symbols from context when the equation introduces a new model.

Use punctuation deliberately. In lists and references, write `**Term:** explanation` rather than
using an em dash as a default separator. Reserve em dashes for genuine interruptions in a sentence;
the content check enforces a generous upper bound so one punctuation habit cannot dominate the prose.

### 5. Engineering Implementation

Java examples should look like code a strong FTC team would actually maintain:

- Use meaningful class and method names.
- Prefer interfaces or small records when they clarify boundaries.
- Include Javadoc for public concepts.
- Avoid blocking `sleep()` in loop-driven examples.
- Show telemetry for quantities a driver or tuner would inspect.
- Use explicit units in variable names or comments.
- Keep snippets focused enough to teach one idea.

Example style:

```java
/**
 * Computes a voltage-normalized feedforward command for a mechanism.
 */
public final class SimpleMotorFeedforward {
    private final double kS;
    private final double kV;
    private final double kA;

    public SimpleMotorFeedforward(double kS, double kV, double kA) {
        this.kS = kS;
        this.kV = kV;
        this.kA = kA;
    }

    public double calculate(double velocity, double acceleration, double batteryVoltage) {
        double volts = kS * Math.signum(velocity) + kV * velocity + kA * acceleration;
        return volts / batteryVoltage;
    }
}
```

### 6. Hardware Reality

Use Docusaurus admonitions for constraints that change behavior on a real robot:

```mdx
:::warning
Derivative estimates amplify encoder jitter. Filter velocity before using it as a control signal.
:::

:::tip
Log measured loop time before tuning gains. A controller tuned at 20 ms can behave differently at 45 ms.
:::
```

Do not invent exact hardware facts. If you do not know a device-specific value, either cite a source or phrase the claim qualitatively.

## Interactive Component Rules

Put reusable demos in:

```text
src/components/simulations/<domain>/
```

Use `.tsx` and keep the component standalone.

Rules:

- Type props, state, event handlers, and helper return values.
- Keep `window`, `document`, canvas contexts, and animation loops inside `useEffect` or event handlers.
- Clean up `requestAnimationFrame`, event listeners, and timers.
- Avoid hydration mismatches.
- Make controls keyboard-accessible where practical.
- Provide `aria-label` for SVG/canvas demos when meaningful.
- Keep colors readable in both themes.
- Use shared kit components where possible:
  - `Demo`
  - `Controls`
  - `Button`
  - `Slider`
  - `Readout`
  - `Legend`

Do not add a visual if it does not teach a specific model, parameter, or failure mode.

Reusable equations and physical models belong in `src/lib/domain/`, with tests
next to the model. Canvas and plotting infrastructure belongs in
`src/lib/visualization/`; browser storage, analytics, and consent belong in
`src/lib/platform/`.

## Security and Privacy

MDX can import and execute React code, so lesson pull requests require the same review standard as
application code.

- Never commit credentials, private keys, `.env` files, private telemetry, or student data.
- Keep package changes intentional and commit the regenerated `package-lock.json`.
- Do not add install scripts or dependencies for small utilities without a clear justification.
- Use click-to-load, sandboxed components for third-party media instead of raw iframes.
- Require HTTPS for external resources and use `rel="noopener noreferrer"` with raw
  `target="_blank"` links.
- Keep browser storage limited to non-sensitive preferences and lesson progress.
- Do not enable trusted KaTeX commands or introduce HTML parser sinks.

Report suspected vulnerabilities privately through the process in [SECURITY.md](SECURITY.md), not in
a public issue.

## Design Rules

The visual direction is "serious technical documentation":

- Use restrained color.
- Keep border radii and spacing consistent.
- Avoid decorative gradients, excessive shadows, hover-lift cards, and emoji UI.
- Avoid "hacker" or "gamer" motifs.
- Use charts, plots, field diagrams, mechanism diagrams, and live simulations instead of generic art.
- Keep text readable on mobile and desktop.
- Check dark mode.

If a component creates horizontal scrolling on mobile, fix it before opening the PR.

## Citations and Sources

Claims about algorithms, papers, libraries, and FTC hardware should be traceable.

Use primary or authoritative sources where possible:

- Official FTC, REV, goBILDA, WPILib, Docusaurus, library, or paper documentation.
- Known FTC community references such as Game Manual 0, CTRL ALT FTC, Road Runner papers, FTCLib/SolversLib docs, Pedro Pathing docs, or cited team repositories.

When citing a paper, include enough information for a reader to find it:

- title
- authors
- year
- DOI or stable URL when available

Do not copy long passages from a source. Summarize and cite.

## File Organization

Lessons:

```text
docs/<module>/<lesson>.mdx
```

Module metadata:

```text
docs/<module>/_category_.json
```

Interactive demos:

```text
src/components/simulations/<domain>/<DemoName>.tsx
```

Reusable lesson UI:

```text
src/components/kit/
```

Static images:

```text
static/img/
```

Shared code:

```text
src/lib/domain/          pure mathematics and physical models
src/lib/visualization/   canvas and plotting infrastructure
src/lib/platform/        browser and site integration
```

Import a simulation directly from its subject area:

```mdx
import PurePursuit from '@site/src/components/simulations/path-following/PurePursuit';
```

Do not create a single simulation barrel. Direct imports keep ownership clear
and avoid coupling unrelated page bundles.

Use relative `.mdx` links inside docs when linking between lessons:

```mdx
[Pure Pursuit](../path-following/pure-pursuit.mdx)
```

This keeps Docusaurus broken-link checking useful.

## Pull Request Checklist

Before submitting:

- Typechecking, tests, the production build, security checks, and the size budget pass.
- Architecture and content checks pass.
- New lessons have frontmatter, tags, and an abstract.
- New formulas define their variables.
- Java snippets are formatted and include Javadoc where useful.
- Interactive demos are SSR-safe and clean up event listeners.
- Links are not placeholders.
- Images have useful captions or context.
- The page works in dark mode.
- Mobile layout does not overflow.
- Sources are cited for nontrivial claims.
- Tool-assisted work states what was generated and what the contributor verified.

## Commit Style

Keep each commit focused on one coherent change and use a message that describes the result:

```text
Add motor model lesson and torque-speed demo
Refine EKF AprilTag Jacobian explanation
Fix dark-mode admonition contrast
```

Avoid vague messages like:

```text
update
fix stuff
changes
```

Tool-assisted changes are welcome, but they still require engineering review. In the pull request,
state which parts were assisted or generated, which sources were checked, and which commands or manual
tests you used to validate the result. Do not mix bulk generated content with unrelated formatting or
configuration changes.

## What Not To Contribute

Please avoid:

- Uncited exact hardware claims.
- Large generated text dumps.
- Decorative components that do not support learning.
- Huge rewrites mixed with unrelated style changes.
- New dependencies for small utilities that can be written locally.
- Code snippets that teach blocking or fragile FTC patterns.

## License

By contributing, you agree that your contribution is released under the repository's MIT License.
