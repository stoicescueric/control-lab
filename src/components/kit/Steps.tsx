import type {ReactNode} from 'react';

/* Lesson section dividers.

   A lesson flows through the page-anatomy beats — the hook, the visual
   intuition, the theory, the implementation, the hardware reality — as plain,
   titled sections separated by a hairline rule. There are no numbered "act"
   labels; the section's own descriptive title carries it.

   Used as bare tags in MDX (registered in src/theme/MDXComponents.tsx). The
   three names are kept only as a light authoring convention for the usual
   why → math → code progression:

     <Problem>
       ## Descriptive title
       the hook + visual intuition
     </Problem>

   Theory and Deploy follow the same pattern for mathematical rigor and
   implementation/hardware reality. */

interface SectionProps {
  children?: ReactNode;
}

function Section({children}: SectionProps) {
  return (
    <section className="cl-step mt-12 border-t border-line pt-9 first:mt-2 first:border-0 first:pt-0">
      {children}
    </section>
  );
}

export const Problem = (props: SectionProps) => <Section {...props} />;
export const Theory = (props: SectionProps) => <Section {...props} />;
export const Deploy = (props: SectionProps) => <Section {...props} />;
