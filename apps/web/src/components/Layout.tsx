import { NavLink, Outlet } from "react-router-dom";
import { ADSENSE_SLOT_HEADER } from "../ads/config";
import { useAuth } from "../auth/AuthContext";
import { AdSlot } from "./AdSlot";
import { NotificationBell } from "./NotificationBell";
import { SiteFooter } from "./SiteFooter";

const links = [
  { to: "/dashboard", label: "Home" },
  { to: "/jobs", label: "Jobs" },
  { to: "/tracker", label: "Tracker" },
  { to: "/agent", label: "Agent" },
  { to: "/profile", label: "Profile" },
];

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-teal-900/10 bg-[#f5faf8]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
          <div className="flex items-center gap-7">
            <NavLink
              to="/dashboard"
              className="font-display text-[1.35rem] tracking-tight text-teal-950"
            >
              Search&Apply
            </NavLink>
            <nav className="hidden items-center gap-1 md:flex">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-teal-900 text-white shadow-sm"
                        : "text-teal-950/65 hover:bg-white/70 hover:text-teal-950"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 text-sm sm:gap-3">
            <NotificationBell />
            <span className="hidden max-w-[160px] truncate text-teal-950/55 xl:inline">
              {user?.email}
            </span>
            <button type="button" onClick={logout} className="saa-btn saa-btn-ghost py-1.5">
              Log out
            </button>
          </div>
        </div>
        <nav className="grid grid-cols-5 gap-1 border-t border-teal-900/5 px-2 py-2 md:hidden">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-lg px-1 py-1.5 text-center text-xs font-semibold ${
                  isActive ? "bg-teal-900 text-white" : "text-teal-950/65"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-7 md:py-9">
        <div className="mb-5">
          <AdSlot slot={ADSENSE_SLOT_HEADER} format="horizontal" label="Header banner" />
        </div>
        <Outlet />
        <SiteFooter />
      </main>
    </div>
  );
}
