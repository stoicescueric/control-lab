import type {ReactNode} from 'react';

/* Lesson callout boxes for non-standard aside types. Prefer native Docusaurus
   admonitions for :::tip and :::warning blocks; this component covers inline
   idea/math/note asides while keeping the same restrained visual language. */

type Tone = 'tip' | 'idea' | 'math' | 'warn' | 'note';

const TONES: Record<Tone, string> = {
  tip: 'bg-green/10 border-green/30',
  idea: 'bg-amber/10 border-amber/30',
  math: 'bg-brand/10 border-brand/30',
  warn: 'bg-rose/10 border-rose/30',
  note: 'bg-surface-2 border-line',
};

const LABELS: Record<Tone, string> = {
  tip: 'Tip',
  idea: 'Idea',
  math: 'Math',
  warn: 'Warn',
  note: 'Note',
};

interface CalloutProps {
  type?: Tone;
  icon?: string;
  title?: string;
  children?: ReactNode;
}

export function Callout({type = 'note', icon, title, children}: CalloutProps) {
  return (
    <div
      className={`cl-callout my-6 flex items-start gap-3.5 rounded-[8px] border p-4 text-ink [&_p]:my-2 [&>div>:last-child]:mb-0 ${TONES[type] ?? TONES.note}`}>
      <span className="mt-0.5 shrink-0 rounded-[5px] border border-current/20 px-2 py-0.5 font-mono text-[0.68rem] font-bold uppercase leading-tight text-ink-soft">
        {icon ?? LABELS[type]}
      </span>
      <div>
        {title && <strong className="text-ink">{title} </strong>}
        {children}
      </div>
    </div>
  );
}

export function Analogy({children}: {children?: ReactNode}) {
  return (
    <div className="cl-callout my-5 border-l-4 border-brand bg-brand/10 px-[18px] py-3.5 text-ink [&>:last-child]:mb-0">
      {children}
    </div>
  );
}

export default Callout;
