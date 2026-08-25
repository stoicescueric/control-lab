import CodeBlock from '@theme/CodeBlock';

/* Language-neutral algorithm sketches for the lessons.

   The curriculum deliberately does not hand out drop-in Java. A lesson shows
   what to compute and why; translating that into a working subsystem is the
   reader's job, and is where the learning happens. So the algorithmic blocks
   are structured English, not source:

     <Pseudocode label="Lookahead point">{`...`}</Pseudocode>

   House style, documented in CONTRIBUTING.md:
     - `<-` for assignment, never `=`
     - snake_case names matching the lesson's symbols; SCREAMING_CASE constants
     - no types, no braces, no semicolons; indentation carries structure
     - control flow in English ("for each segment A -> B:")
     - `#` comments carry units and the "look this up" hints

   Rendered through Docusaurus's CodeBlock with language="text", so it inherits
   the site code theme and the copy button but gets no keyword coloring — it is
   not code in any language, and should not look like it is.

   Real Java survives only in <JavaCode>, for the two cases where there is
   nothing to derive: an anti-pattern being criticized, and bare SDK API
   surface. */

interface PseudocodeProps {
  children?: string;
  code?: string;
  label?: string;
}

export function Pseudocode({children, code, label}: PseudocodeProps) {
  const src = (code ?? (typeof children === 'string' ? children : '')).trim();
  return (
    <div className="cl-pseudocode my-[18px]">
      <div className="not-prose mb-1.5 flex items-center gap-2 text-[0.74rem] font-bold uppercase tracking-wide text-ink-faint">
        <span className="rounded-[4px] bg-brand/15 px-2 py-0.5 text-[0.68rem] text-[#4a5bb8] dark:text-brand">
          Pseudocode
        </span>
        {label}
      </div>
      <CodeBlock language="text">{src}</CodeBlock>
    </div>
  );
}

export default Pseudocode;
