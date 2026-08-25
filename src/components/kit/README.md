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
- `JavaCode`: every algorithm block. Scoped to the method that is the lesson --
  no constructors, no hardware wiring, nothing a reader can paste into a robot.
- `Exercise` / `Solution`: the derivation a reader should do by hand, with an
  optional collapsible answer. Prompts live here, never in code comments.
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
