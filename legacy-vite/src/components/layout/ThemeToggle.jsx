import { useEffect, useState } from "react";

/* Light/dark toggle. The initial class is set by an inline script in index.html
   (before paint); this keeps React in sync and persists the choice. */
export default function ThemeToggle({ className = "" }) {
  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch (e) {
      /* ignore */
    }
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark((v) => !v)}
      aria-label="Toggle dark mode"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-line bg-surface text-base text-ink hover:bg-surface-2 ${className}`}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
