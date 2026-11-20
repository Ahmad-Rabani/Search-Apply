import { Link, Outlet } from "react-router-dom";
import { SiteFooter } from "./SiteFooter";

export function PublicLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-teal-900/10 bg-[#f5faf8]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
          <Link
            to="/"
            className="font-display text-[1.35rem] tracking-tight text-teal-950"
          >
            Search&Apply
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              to="/guides/ats-cv"
              className="hidden rounded-lg px-3 py-1.5 text-teal-950/65 hover:bg-white/70 sm:inline"
            >
              Guides
            </Link>
            <Link to="/contact" className="rounded-lg px-3 py-1.5 text-teal-950/65 hover:bg-white/70">
              Contact
            </Link>
            <Link to="/auth" className="saa-btn saa-btn-primary py-1.5">
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <Outlet />
        <SiteFooter />
      </main>
    </div>
  );
}
