import type {ReactNode} from 'react';

/* Coloured callout boxes used throughout the lessons.

   For standard asides, prefer Docusaurus native admonitions (:::tip / :::warning).
   This component covers the extra flavours the lessons use (idea, math) and keeps
   the original palette where an admonition would feel too heavy.

   <Callout type="tip|idea|math|warn|note" title="...">body</Callout> */

type Tone = 'tip' | 'idea' | 'math' | 'warn' | 'note';

const TONES: Record<Tone, string> = {
  tip: 'bg-green/10 border-green/30',
  idea: 'bg-amber/10 border-amber/30',
  math: 'bg-brand/10 border-brand/30',
  warn: 'bg-rose/10 border-rose/30',
  note: 'bg-surface-2 border-line',
};

const ICONS: Record<Tone, string> = {tip: '✅', idea: '💡', math: '🧮', warn: '⚠️', note: '📌'};

interface CalloutProps {
  type?: Tone;
  icon?: string;
  title?: string;
  children?: ReactNode;
}

export function Callout({type = 'note', icon, title, children}: CalloutProps) {
  return (
    <div
      className={`cl-callout my-6 flex gap-3.5 rounded-[10px] border p-4 text-ink [&_p]:my-2 [&>div>:last-child]:mb-0 ${TONES[type] ?? TONES.note}`}>
      <span className="shrink-0 text-2xl leading-tight">{icon ?? ICONS[type]}</span>
      <div>
        {title && <strong className="text-ink">{title} </strong>}
        {children}
      </div>
    </div>
  );
}

/* A purple "analogy" aside. */
export function Analogy({children}: {children?: ReactNode}) {
  return (
    <div className="cl-callout my-5 rounded-r-[10px] border-l-4 border-violet bg-gradient-to-r from-violet/10 to-transparent px-[18px] py-3.5 text-ink [&>:last-child]:mb-0">
      {children}
    </div>
  );
}

export default Callout;
