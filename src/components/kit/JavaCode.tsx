import type {ReactNode} from 'react';
import CodeBlock from '@theme/CodeBlock';

/* Syntax-highlighted Java for the FTC/FRC examples.

   Built on Docusaurus's native CodeBlock (Prism), so it inherits the site code
   theme, the copy button, and line-highlighting — with an optional league badge
   and caption on top.

     <JavaCode league="FTC" label="Road Runner">{`...java...`}</JavaCode>

   Plain fenced ```java blocks in MDX are highlighted natively by Docusaurus and
   need no component. */

type League = 'FTC' | 'FRC';

const BADGE: Record<League, string> = {
  FTC: 'bg-teal/15 text-[#0c8174] dark:text-teal',
  FRC: 'bg-rose/15 text-[#c41f57] dark:text-rose',
};

interface JavaCodeProps {
  children?: ReactNode;
  code?: string;
  language?: string;
  league?: League;
  label?: string;
}

export function JavaCode({children, code, language = 'java', league, label}: JavaCodeProps) {
  const src = (code ?? (typeof children === 'string' ? children : '')).trim();
  return (
    <div className="cl-javacode my-[18px]">
      {(league || label) && (
        <div className="not-prose mb-1.5 flex items-center gap-2 text-[0.74rem] font-bold uppercase tracking-wide text-ink-faint">
          {league && (
            <span className={`rounded-full px-2 py-0.5 text-[0.68rem] ${BADGE[league] ?? ''}`}>
              {league}
            </span>
          )}
          {label}
        </div>
      )}
      <CodeBlock language={language}>{src}</CodeBlock>
    </div>
  );
}

export default JavaCode;
