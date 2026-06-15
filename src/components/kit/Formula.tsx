import type {ReactNode} from 'react';

/* A dark monospace "formula" block for plain-text equations, plus tiny colour
   helpers so you can tint parts of the expression. For real typeset math, write
   LaTeX in the MDX ($…$ / $$…$$) — KaTeX renders it. */

export function Formula({children, className = ''}: {children?: ReactNode; className?: string}) {
  return (
    <div
      className={`cl-formula my-[18px] overflow-x-auto rounded-xl border border-white/10 bg-panel-2 px-5 py-4 font-mono text-[1rem] text-[#eaf0ff] ${className}`}>
      {children}
    </div>
  );
}

export const Blue = ({children}: {children?: ReactNode}) => <span className="text-[#93a7ff]">{children}</span>;
export const Teal = ({children}: {children?: ReactNode}) => <span className="text-[#5fe3d2]">{children}</span>;
export const Amber = ({children}: {children?: ReactNode}) => <span className="text-[#ffcc66]">{children}</span>;
export const Rose = ({children}: {children?: ReactNode}) => <span className="text-[#ff86ad]">{children}</span>;
export const Faint = ({children}: {children?: ReactNode}) => <span className="text-[#97a6c9]">{children}</span>;

export default Formula;
