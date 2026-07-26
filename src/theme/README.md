# Docusaurus Theme Integration

This directory contains focused wrappers around Docusaurus behavior:

- `MDXComponents.tsx` registers the shared components available as bare tags in
  every lesson.
- `Root.tsx` wraps the application with the analytics-consent boundary.
- `DocItem/Footer/` extends the standard lesson footer with progress tracking.
- `DocSidebarItem/` extends sidebar links with completion state.

Keep overrides narrow and compose `@theme-original` components where possible.
Copying an entire upstream theme component makes framework upgrades harder to
review.
