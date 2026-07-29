# Maintainer Setup

Repository files define ownership and CI, but GitHub must be configured once to
enforce maintainer approval. Complete this checklist after the workflow files
reach `main`.

## Protect `main`

In the repository, open **Settings → Rules → Rulesets → New branch ruleset**.
GitHub documents the current interface in
[Creating rulesets for a repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository).

Use:

- **Name:** `Protect main`
- **Enforcement:** Active
- **Target:** the default branch
- **Bypass:** none for normal work; keep any emergency bypass explicit

Enable:

- Restrict deletions
- Block force pushes
- Require a pull request before merging
  - Required approvals: `1`
  - Dismiss stale pull request approvals when new commits are pushed
  - Require review from Code Owners
  - Require approval of the most recent reviewable push
  - Require conversation resolution before merging
- Require status checks to pass before merging
  - `build`
  - `dependency-review`
  - `Analyze JavaScript and TypeScript`

The status checks appear in the selector after each workflow has run at least
once. GitHub's
[ruleset rule reference](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
explains the review and status-check options.

## Why Both Files and Settings Are Needed

`.github/CODEOWNERS` requests `@stoicescueric` on every pull request. The
ruleset's **Require review from Code Owners** option turns that request into a
merge requirement. GitHub describes this relationship in
[About code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners).

## Verify the Rule

After saving the active ruleset:

1. Open a draft pull request from a test branch.
2. Mark it ready for review and confirm the code owner is requested.
3. Confirm merge is blocked before approval.
4. Confirm merge remains blocked while a required check fails or is pending.
5. Approve from the maintainer account and confirm the merge gate clears only
   after all checks pass.
6. Close the test pull request without merging.

Repeat this check whenever ownership, required workflow job names, or the
default branch changes.

