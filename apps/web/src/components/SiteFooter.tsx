import { Link } from "react-router-dom";
import { ADSENSE_SLOT_FOOTER } from "../ads/config";
import { AdSlot } from "./AdSlot";

const legal = [
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/contact", label: "Contact" },
  { to: "/guides/ats-cv", label: "ATS CV guide" },
  { to: "/guides/job-search", label: "Job search tips" },
];

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-teal-900/10 pt-6">
      <div className="mb-6">
        <AdSlot
          slot={ADSENSE_SLOT_FOOTER}
          format="horizontal"
          label="Footer banner"
        />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg text-teal-950">Search&Apply</p>
          <p className="mt-1 text-sm text-teal-950/55">
            AI job search, ATS CV matching, and apply tracking.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-teal-900/75">
          {legal.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-teal-950 hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="mt-5 text-xs text-teal-950/40">
        © {new Date().getFullYear()} Search&Apply. Job listings belong to their
        respective boards.
      </p>
    </footer>
  );
}
