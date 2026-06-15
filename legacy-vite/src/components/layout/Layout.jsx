import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

/* App shell: a sticky sidebar beside the routed page. On small screens the
   sidebar slides in over a scrim. We close the menu and scroll to top whenever
   the route changes. */
export default function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      <Sidebar open={open} />
      {open && (
        <div
          className="fixed inset-0 z-40 bg-[#0f1626]/45 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <Outlet />
      </div>
    </div>
  );
}
