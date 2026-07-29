# AI-Assisted Lesson Workflow

Control Lab welcomes AI-assisted contributions. This guide makes that process
repeatable across different tools while keeping the contributor responsible for
accuracy.

The repository's canonical AI instructions are in [AGENTS.md](AGENTS.md). If
your assistant does not read that file automatically, begin every session with:

```text
Read AGENTS.md, CONTRIBUTING.md, ARCHITECTURE.md, docs/notation.mdx, the target
module index, and the closest existing lesson before proposing changes. Follow
those files as the source of truth. Do not edit yet; first summarize the lesson
objective, relevant conventions, reusable code, risks, and validation plan.
```

## Recommended Three-Pass Process

Do not ask an assistant to "write a full lesson" in one step. Separate planning,
implementation, and adversarial review so unsupported assumptions are easier to
catch.

### Pass 1: Proposal and evidence

Use this prompt to prepare a lesson proposal:

```text
I want to contribute a Control Lab lesson about <CONCEPT>.

Read the repository instructions and inspect the existing curriculum. Produce a
lesson proposal, not implementation. Include:
- the learning objective;
- the best module and prerequisite lessons;
- the concrete FTC or robotics failure that motivates it;
- the equations and assumptions that need to be derived;
- one visual or interactive teaching idea;
- the primary or authoritative sources that must be verified;
- likely mathematical, hardware, accessibility, and architecture risks;
- a small file-level implementation plan.

Clearly distinguish sourced facts, your inferences, and open questions. Do not
invent citations or constants.
```

Open a "Lesson or simulation proposal" issue with the result. For a substantial
new lesson, wait for maintainer feedback before implementation.

### Pass 2: Focused implementation

After the proposal is accepted, use:

```text
Implement the accepted lesson proposal at <ISSUE URL>.

Before editing, read AGENTS.md and the files it requires. Use
`npm run new:lesson -- --help` to scaffold the MDX shell, or start from
templates/lesson.mdx, and preserve the accepted scope. Reuse existing notation,
components, and domain logic. Put testable math outside React, add boundary and
failure-case tests, and keep prose, equations, code, and interactive behavior
consistent.

During the work, report assumptions and uncertain claims instead of hiding
them. Do not add dependencies, rewrite unrelated lessons, edit generated files,
or publish anything. Run the relevant checks and finish with npm run verify.
```

Keep the assistant's changes in a focused branch. Read the actual diff rather
than accepting a generated summary.

### Pass 3: Independent audit

Use a fresh AI session or a different tool when practical:

```text
Audit this Control Lab contribution as a skeptical controls engineer and
maintainer. Do not rewrite it yet.

Read AGENTS.md, inspect the diff, and report only actionable findings. Check:
- equation derivations, signs, units, frames, limits, and approximations;
- consistency among prose, Java/TypeScript, tests, and simulations;
- numerical stability and edge cases;
- unsupported hardware or algorithm claims;
- source quality and citation accuracy;
- repository architecture, security, privacy, accessibility, and mobile layout;
- missing tests or misleading visual labels.

Rank findings by severity and cite exact files and lines. A passing build is not
evidence that the mathematics is correct.
```

Resolve every valid finding, rerun `npm run verify`, and document what changed.

## Human Review Checklist

Before opening the pull request, the contributor should be able to answer:

- Can I explain every equation and approximation without the AI?
- Did I open and verify the cited sources?
- Do the units and sign conventions match `docs/notation.mdx`?
- Does the code implement the equation shown in the prose?
- Did I test a boundary or failure case?
- Did I view the page on a narrow screen and in both themes?
- Did I remove placeholders and unrelated generated changes?
- Did I disclose AI assistance honestly in the pull request?

## What AI Must Not Decide

AI tools do not decide whether a lesson belongs in the curriculum, whether a
source is acceptable without verification, or whether a pull request is safe
to merge. Those decisions remain with the human contributor and the project
maintainer.
