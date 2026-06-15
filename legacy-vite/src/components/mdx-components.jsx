/* Components made available to every .mdx lesson.

   Anything listed here can be used as a bare tag inside a lesson WITHOUT an
   import (e.g. just write <Callout> or <Demo>). Lesson-specific simulations
   (like a Drone canvas) are still imported at the top of their own .mdx.

   We also remap fenced code (```java) to our dark, syntax-highlighted block. */

import { Demo, Stage, Controls, Buttons, Button, Readout, Legend, DemoCanvas } from "./kit/Demo.jsx";
import { Slider } from "./kit/Slider.jsx";
import { Callout, Analogy } from "./kit/Callout.jsx";
import { Formula, Blue, Teal, Amber, Rose, Faint } from "./kit/Formula.jsx";
import { JavaCode, Pre, Code } from "./kit/JavaCode.jsx";
import { Problem, Theory, Deploy } from "./kit/Steps.jsx";

export const mdxComponents = {
  // markdown element overrides
  pre: Pre,
  code: Code,
  // the strict 3-step lesson layout
  Problem,
  Theory,
  Deploy,
  // interactive demo kit
  Demo,
  Stage,
  Controls,
  Buttons,
  Button,
  Readout,
  Legend,
  DemoCanvas,
  Slider,
  // prose helpers
  Callout,
  Analogy,
  Formula,
  Blue,
  Teal,
  Amber,
  Rose,
  Faint,
  JavaCode,
};

export default mdxComponents;
