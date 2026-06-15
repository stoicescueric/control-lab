import { NavLink } from "react-router-dom";
import { LESSONS, GROUPS } from "../../lessons/registry.js";
import ThemeToggle from "./ThemeToggle.jsx";

const linkBase =
  "flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[0.94rem] font-medium no-underline";

function navClass({ isActive }) {
  return isActive
    ? `${linkBase} bg-gradient-to-br from-brand/15 to-violet/10 font-semibold text-brand-dk`
    : `${linkBase} text-ink-soft hover:bg-surface-2 hover:text-ink`;
}

export function Sidebar({ open }) {
  return (
    <aside
      className={`fixed top-0 z-50 h-screen w-[280px] shrink-0 overflow-y-auto border-r border-line bg-surface px-4 pb-10 pt-5 transition-transform duration-200 lg:sticky lg:translate-x-0 lg:shadow-none ${
        open ? "translate-x-0 shadow-pop" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center gap-2.5 px-2.5 pb-4 pt-1.5 text-[1.05rem] font-extrabold tracking-tight">
        <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-gradient-to-br from-brand to-violet text-[18px] text-white shadow-[0_4px_12px_rgba(79,108,247,0.4)]">
          ⚙️
        </span>
        <NavLink to="/" className="text-ink no-underline">
          Control&nbsp;Lab
        </NavLink>
        <ThemeToggle className="ml-auto" />
      </div>

      <NavLink to="/" end className={navClass}>
        <span className="w-[22px] shrink-0 text-center text-[1.05rem]">🏠</span> Home
      </NavLink>

      {GROUPS.map((group) => (
        <div key={group}>
          <div className="mx-3 mb-1.5 mt-[18px] text-[0.72rem] font-bold uppercase tracking-[0.09em] text-ink-faint">
            {group}
          </div>
          {LESSONS.filter((l) => l.group === group).map((l) => (
            <NavLink key={l.id} to={`/lessons/${l.id}`} className={navClass}>
              <span className="w-[22px] shrink-0 text-center text-[1.05rem]">{l.icon}</span>
              {l.title}
            </NavLink>
          ))}
        </div>
      ))}
    </aside>
  );
}

export default Sidebar;
