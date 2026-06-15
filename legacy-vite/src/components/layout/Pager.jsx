import { Link } from "react-router-dom";
import { LESSONS, lessonIndex } from "../../lessons/registry.js";

const cardCls =
  "flex-1 rounded-xl border border-line bg-surface px-[18px] py-4 no-underline text-ink hover:border-[#cfd8ee] hover:shadow-card";
const dirCls = "text-[0.76rem] font-bold uppercase tracking-[0.05em] text-ink-faint";

/* Previous / next navigation, built from the lesson order in the registry. */
export function Pager({ id }) {
  const idx = lessonIndex(id);
  if (idx === -1) return null;
  const prev = idx > 0 ? LESSONS[idx - 1] : null;
  const next = idx < LESSONS.length - 1 ? LESSONS[idx + 1] : null;

  return (
    <nav className="mt-14 flex justify-between gap-3.5">
      {prev ? (
        <Link to={`/lessons/${prev.id}`} className={cardCls}>
          <div className={dirCls}>← Previous</div>
          <div className="font-semibold">
            {prev.icon} {prev.title}
          </div>
        </Link>
      ) : (
        <span className={`${cardCls} pointer-events-none opacity-40`}>
          <div className={dirCls}>← Previous</div>
          <div className="font-semibold">Start</div>
        </span>
      )}

      {next ? (
        <Link to={`/lessons/${next.id}`} className={`${cardCls} text-right`}>
          <div className={dirCls}>Next →</div>
          <div className="font-semibold">
            {next.icon} {next.title}
          </div>
        </Link>
      ) : (
        <Link to="/" className={`${cardCls} text-right`}>
          <div className={dirCls}>Done →</div>
          <div className="font-semibold">🏠 Back home</div>
        </Link>
      )}
    </nav>
  );
}

export default Pager;
