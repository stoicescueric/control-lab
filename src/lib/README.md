# Shared Libraries

Shared code is divided by runtime responsibility.

## `domain/`

Pure mathematics and physical models. This code must not depend on React,
Docusaurus, the DOM, browser storage, or analytics. Tests live beside the model.

Examples:

- angle wrapping and control helpers;
- linear algebra;
- projectile integration and interpolation.

## `visualization/`

Rendering infrastructure shared by simulations:

- device-pixel-ratio-aware canvas setup;
- animation and plotting hooks;
- traces and plot primitives.

This layer may use React, but it must not own curriculum prose or browser
storage.

## `platform/`

Site and browser integration:

- analytics loading;
- cookie consent;
- lesson progress storage;
- safe external video URL handling.

Code here must account for server-side rendering and unavailable browser APIs.
Privacy-sensitive behavior needs explicit tests and documentation.

## Dependency Direction

`domain` is the innermost layer. `visualization` and `platform` may stand beside
it, while React components compose them. Libraries never import from lessons,
pages, simulations, or Docusaurus theme overrides.
