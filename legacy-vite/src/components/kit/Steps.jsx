/* The strict 3-step lesson layout.

   Every lesson follows the same engineering progression, so each step is a
   labelled, numbered section:

     <Problem title="...">  the real hardware limitation
     <Theory  title="...">  the maths, contextualised for a robot
     <Deploy  title="...">  the optimised, deployable code

   Used as bare tags in MDX (provided via the MDX provider). */

const STEPS = {
  problem: { n: "01", label: "The Physical Problem", color: "var(--color-rose)" },
  theory: { n: "02", label: "The Mathematical Solution", color: "var(--color-brand)" },
  deploy: { n: "03", label: "Deployed Implementation", color: "var(--color-teal)" },
};

function Step({ kind, title, children }) {
  const s = STEPS[kind] || STEPS.problem;
  return (
    <section className="mt-10 border-t border-line pt-8 first:mt-2 first:border-0 first:pt-0">
      <div className="not-prose mb-1 flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-extrabold text-white"
          style={{ background: s.color }}
        >
          {s.n}
        </span>
        <span
          className="text-[0.72rem] font-bold uppercase tracking-[0.14em]"
          style={{ color: s.color }}
        >
          {s.label}
        </span>
      </div>
      {title && <h2 className="!mb-3 !mt-2">{title}</h2>}
      {children}
    </section>
  );
}

export const Problem = (props) => <Step kind="problem" {...props} />;
export const Theory = (props) => <Step kind="theory" {...props} />;
export const Deploy = (props) => <Step kind="deploy" {...props} />;
