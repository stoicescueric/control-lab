# Governance

Control Lab accepts community contributions through GitHub issues and pull
requests. The project uses a maintainer-led model so the curriculum remains
coherent and technically reliable.

## Roles

### Contributors

Anyone may:

- propose a lesson, simulation, correction, or improvement;
- discuss open proposals;
- submit a pull request from a fork or branch;
- review public changes and provide technical evidence.

Submitting a proposal does not reserve a topic, and submitting a pull request
does not guarantee acceptance.

### Maintainer

The maintainer:

- sets curriculum direction and repository policy;
- accepts, narrows, postpones, or declines proposals;
- reviews mathematical claims, sources, code, security, and presentation;
- requests changes when a contribution is not ready;
- gives the required approval and merges accepted pull requests;
- may close inactive or out-of-scope work with an explanation.

The current default code owner is `@stoicescueric`, as declared in
`.github/CODEOWNERS`.

## Decision Process

Substantive new lessons should follow this sequence:

1. A contributor opens a lesson proposal issue.
2. The maintainer confirms the scope or requests changes.
3. The contributor implements the accepted scope in a focused pull request.
4. Automated checks run, and the contributor resolves review findings.
5. The maintainer gives final approval and merges the pull request.

Small corrections may skip the proposal issue, but they still require a pull
request and maintainer approval.

Technical decisions are based on:

- correctness and quality of evidence;
- fit with the curriculum and existing notation;
- clarity for the intended robotics audience;
- maintainability, security, privacy, and accessibility;
- the cost of reviewing and maintaining the contribution.

AI-generated output does not count as independent evidence or review.

## Merge Policy

Changes belong on a pull request. The `main` branch should be protected by a
GitHub ruleset that:

- requires a pull request before merging;
- requires at least one approving review;
- requires review from Code Owners;
- dismisses stale approvals when new commits are pushed;
- requires the latest reviewable push to be approved;
- requires the `build`, `dependency-review`, and
  `Analyze JavaScript and TypeScript` checks to pass;
- blocks force pushes and branch deletion;
- applies to administrators unless an emergency bypass is deliberately used.

`CODEOWNERS` automatically requests the maintainer, while the ruleset makes
that approval mandatory. Repository files cannot activate this GitHub setting
on their own; the maintainer must complete the one-time
[maintainer setup](.github/MAINTAINER_SETUP.md) under repository rules.

## Attribution and License

Accepted contributors are visible on the public contributors page and in the
Git history. Contributions are released under the repository's MIT License, as
described in `CONTRIBUTING.md`.

## Changes to Governance

Governance changes use the same pull request process and require maintainer
approval. The maintainer may evolve this model as the contributor community
grows, including delegating ownership of modules to additional trusted
maintainers through `CODEOWNERS`.
