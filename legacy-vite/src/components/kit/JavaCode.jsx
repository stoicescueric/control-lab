/* Syntax-highlighted Java code blocks for the FTC/FRC examples.

   Two ways to use it:
   1. Explicit, with an optional league badge + caption:
        <JavaCode league="FTC" label="Road Runner">{`...java...`}</JavaCode>
   2. Plain fenced code in MDX — ```java blocks are auto-highlighted via the
      Pre/Code components wired into the MDX provider (see mdx-components.jsx). */

import { highlightJava } from "../../lib/highlight.js";

const SHELL =
  "cl-code overflow-x-auto rounded-xl border border-white/10 bg-panel px-[18px] py-4 font-mono text-[0.85rem] leading-[1.62] text-[#e8edf7]";

const BADGE = {
  FTC: "bg-teal/15 text-[#0c8174] dark:text-teal",
  FRC: "bg-rose/15 text-[#c41f57] dark:text-rose",
};

export function JavaCode({ children, code, league, label }) {
  const src = (code ?? (typeof children === "string" ? children : "")).trim();
  return (
    <div className="my-[18px]">
      {(league || label) && (
        <div className="mb-1.5 flex items-center gap-2 text-[0.74rem] font-bold uppercase tracking-wide text-ink-faint">
          {league && (
            <span className={`rounded-full px-2 py-0.5 text-[0.68rem] ${BADGE[league] || ""}`}>
              {league}
            </span>
          )}
          {label}
        </div>
      )}
      <pre className={SHELL}>
        <code dangerouslySetInnerHTML={{ __html: highlightJava(src) }} />
      </pre>
    </div>
  );
}

/* --- MDX fenced-code support: ```java … ``` --- */

export function Code({ className = "", children, ...rest }) {
  const lang = /language-(\w+)/.exec(className)?.[1];
  if (lang === "java") {
    return (
      <code
        className="cl-code"
        dangerouslySetInnerHTML={{ __html: highlightJava(String(children)) }}
      />
    );
  }
  return (
    <code className={className} {...rest}>
      {children}
    </code>
  );
}

export function Pre({ children, ...rest }) {
  return (
    <pre className={SHELL} {...rest}>
      {children}
    </pre>
  );
}

export default JavaCode;
