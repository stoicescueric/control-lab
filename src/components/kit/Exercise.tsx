import type {ReactNode} from 'react';

/* Pencil-and-paper exercise block with a collapsible solution.

   The lesson standard asks readers to compute an answer themselves before
   reading on. Keep the worked answer inside <Solution> so it stays hidden
   until the reader commits to an attempt. */

export function Exercise({title, children}: {title?: string; children?: ReactNode}) {
  return (
    <div className="cl-callout my-6 rounded-[8px] border border-brand/30 bg-brand/5 p-4 text-ink [&_p]:my-2 [&>:last-child]:mb-0">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="shrink-0 rounded-[5px] border border-current/20 px-2 py-0.5 font-mono text-[0.68rem] font-bold uppercase leading-tight text-ink-soft">
          Exercise
        </span>
        {title && <strong className="text-ink">{title}</strong>}
      </div>
      {children}
    </div>
  );
}

export function Solution({children}: {children?: ReactNode}) {
  return (
    <details className="mt-3 rounded-[6px] border border-line bg-surface-2 px-3.5 py-2.5 [&_p]:my-2 [&>div>:last-child]:mb-0">
      <summary className="cursor-pointer select-none font-mono text-[0.72rem] font-bold uppercase text-ink-soft">
        Show solution
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}

export default Exercise;
