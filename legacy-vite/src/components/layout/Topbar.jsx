import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle.jsx";

/* Mobile-only top bar with a hamburger. Hidden on lg+ (sidebar is always shown). */
export function Topbar({ onMenu }) {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface px-[18px] py-3 lg:hidden">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        className="h-10 w-10 cursor-pointer rounded-[10px] border border-line bg-surface text-xl text-ink"
      >
        ☰
      </button>
      <Link to="/" className="font-extrabold text-ink no-underline">
        ⚙️ Control Lab
      </Link>
      <ThemeToggle className="ml-auto" />
    </div>
  );
}

export default Topbar;
