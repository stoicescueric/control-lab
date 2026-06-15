/* Coloured callout boxes used throughout the lessons.
   <Callout type="tip|idea|math|warn|note" title="...">body</Callout> */

const TONES = {
  tip: "bg-green/10 border-green/30",
  idea: "bg-amber/10 border-amber/30",
  math: "bg-brand/10 border-brand/30",
  warn: "bg-rose/10 border-rose/30",
  note: "bg-surface-2 border-line",
};

const ICONS = { tip: "✅", idea: "💡", math: "🧮", warn: "⚠️", note: "📌" };

export function Callout({ type = "note", icon, title, children }) {
  return (
    <div
      className={`my-6 flex gap-3.5 rounded-[10px] border p-4 text-ink [&_p]:my-2 [&>div>:last-child]:mb-0 ${TONES[type] || TONES.note}`}
    >
      <span className="shrink-0 text-2xl leading-tight">{icon || ICONS[type]}</span>
      <div>
        {title && <strong className="text-ink">{title} </strong>}
        {children}
      </div>
    </div>
  );
}

/* A purple "analogy" aside (ported from .analogy). */
export function Analogy({ children }) {
  return (
    <div className="my-5 rounded-r-[10px] border-l-4 border-violet bg-gradient-to-r from-violet/10 to-transparent px-[18px] py-3.5 text-ink [&>:last-child]:mb-0">
      {children}
    </div>
  );
}

export default Callout;
