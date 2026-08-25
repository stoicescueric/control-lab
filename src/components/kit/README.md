# Lesson Component Kit

The kit is the shared visual and pedagogical vocabulary used across lessons and
simulations. It must stay independent of any one robotics topic.

## Contents

- `Abstract`: two-sentence lesson summary.
- `Callout` and `Analogy`: focused explanatory notes.
- `Challenge`: progress-aware interactive challenge status.
- `Demo`: shared layout primitives for stages, controls, buttons, readouts, and
  legends.
- `Difficulty`: lesson difficulty metadata.
- `EquationLegend`: definitions for variables introduced by an equation.
- `Formula`: styled inline formula emphasis.
- `Pseudocode`: language-neutral algorithm sketches. The default for anything a
  reader is meant to implement themselves.
- `JavaCode`: literal FTC/FRC Java. Reserved for anti-patterns being criticized
  and bare SDK surface, where there is nothing for the reader to derive.
- `Slider`: accessible numeric control.
- `Steps`: neutral titled lesson sections.
- `VideoEmbed`: consent-aware, click-to-load external video.
- `*Illustrations`: reusable subject diagrams that are broad enough to appear in
  multiple lessons.

Components used broadly in MDX are registered in
`src/theme/MDXComponents.tsx`. A lesson-specific simulation should not be
registered globally; import it directly in the lesson instead.

Keep kit APIs small, typed, accessible, theme-aware, and free of
subject-specific equations.
