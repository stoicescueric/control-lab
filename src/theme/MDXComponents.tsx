/* Global MDX components — the Docusaurus equivalent of the Vite mdx-components.jsx.

   Anything exported here is usable as a bare tag in any .mdx lesson WITHOUT an
   import (e.g. just write <Callout> or <Problem>). Lesson-specific simulations
   (a Drone canvas, etc.) are still imported at the top of their own .mdx.

   We spread the original theme components first so Docusaurus's defaults (code
   blocks, admonitions, headings, links) keep working, then add our kit. */

import MDXComponents from '@theme-original/MDXComponents';
import {Abstract} from '@site/src/components/kit/Abstract';
import {Problem, Theory, Deploy} from '@site/src/components/kit/Steps';
import {Callout, Analogy} from '@site/src/components/kit/Callout';
import {Formula, Blue, Teal, Amber, Rose, Faint} from '@site/src/components/kit/Formula';
import {JavaCode} from '@site/src/components/kit/JavaCode';
import {
  Demo,
  Stage,
  Controls,
  Buttons,
  Button,
  Readout,
  Legend,
  DemoCanvas,
} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

export default {
  ...MDXComponents,
  // academic TL;DR that opens each lesson
  Abstract,
  // the strict 3-step lesson layout
  Problem,
  Theory,
  Deploy,
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
};
