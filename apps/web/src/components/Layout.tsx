import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const links = [
  { to: "/jobs", label: "Jobs" },
  { to: "/tracker", label: "Tracker" },
  { to: "/profile", label: "Profile" },
];

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-teal-900/10 bg-[#f7fbfa]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-8">
            <NavLink to="/jobs" className="font-display text-xl tracking-tight text-teal-900">
              Search&Apply
            </NavLink>
            <nav className="hidden items-center gap-1 sm:flex">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-teal-800 text-white"
                        : "text-teal-950/70 hover:bg-teal-900/5"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-teal-950/60 sm:inline">{user?.email}</span>
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-teal-900/15 px-3 py-1.5 font-medium text-teal-950/80 hover:bg-white"
            >
              Log out
            </button>
          </div>
        </div>
        <nav className="flex gap-1 border-t border-teal-900/5 px-4 py-2 sm:hidden">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex-1 rounded-md px-2 py-1.5 text-center text-sm font-medium ${
                  isActive ? "bg-teal-800 text-white" : "text-teal-950/70"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
