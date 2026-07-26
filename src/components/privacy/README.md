# Privacy Components

This directory owns the user interface for optional analytics consent.

- `CookieConsent.tsx` controls the consent prompt and loads analytics only after
  permission is granted.
- `PrivacyControls.tsx` lets a visitor review or change the stored choice.
- `CookieConsent.module.css` contains styles scoped to the banner.

Consent parsing and analytics loading live in `src/lib/platform/` so UI and
policy logic can be tested separately. Changes here must stay SSR-safe and must
not make an analytics request before consent.
