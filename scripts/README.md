# Repository Checks

The scripts in this directory are deterministic checks used both locally and in
GitHub Actions:

- `architecture-check.mjs`: validates directory domains and dependency
  direction.
- `content-check.mjs`: validates lesson metadata, placeholders, public language,
  and embed conventions.
- `contributor-check.mjs`: keeps governance, AI guidance, ownership, proposal,
  pull request, and lesson-template files connected and complete.
- `scaffold-lesson.mjs`: creates a safely named lesson shell in an existing
  module from `templates/lesson.mdx`; generated placeholders must be completed
  before verification passes.
- `security-check.mjs`: validates immutable Actions, lockfile origins, dangerous
  browser sinks, and the built site's external-resource policy.
- `bundle-size.mjs`: leaves headroom for curriculum HTML while enforcing
  tighter aggregate and per-file budgets on JavaScript, CSS, and other assets.

Run the complete sequence with:

```bash
npm run verify
```

Checks should report actionable repository paths and must not mutate source
files.
