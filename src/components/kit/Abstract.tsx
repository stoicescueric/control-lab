import type {ReactNode} from 'react';

/* The academic TL;DR that opens every lesson (step 1 of the page anatomy).

   Two sentences, placed immediately under the H1: what the concept is, and what
   the page will do with it. Registered globally in src/theme/MDXComponents.tsx,
   so lessons use it as a bare tag:

     <Abstract>
     A DC motor converts voltage into motion... This lesson derives...
     </Abstract> */

export function Abstract({children}: {children?: ReactNode}) {
  return (
    <aside
      className="cl-abstract not-prose my-6 rounded-xl border border-line border-l-4 border-l-brand bg-surface-2 p-5"
      aria-label="Abstract">
      <div className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-brand-dk">Abstract</div>
      <div className="text-[0.97rem] leading-relaxed text-ink-soft [&>:last-child]:mb-0">{children}</div>
    </aside>
  );
}

export default Abstract;
