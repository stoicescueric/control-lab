# Repository Checks

The scripts in this directory are deterministic checks used both locally and in
GitHub Actions:

- `architecture-check.mjs`: validates directory domains and dependency
  direction.
- `content-check.mjs`: validates lesson metadata, placeholders, public language,
  and embed conventions.
- `security-check.mjs`: validates immutable Actions, lockfile origins, dangerous
  browser sinks, and the built site's external-resource policy.
- `bundle-size.mjs`: enforces the production artifact budget.

Run the complete sequence with:

```bash
npm run verify
```

Checks should report actionable repository paths and must not mutate source
files.
