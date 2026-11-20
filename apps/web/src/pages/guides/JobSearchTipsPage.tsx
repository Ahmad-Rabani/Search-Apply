import { Link } from "react-router-dom";
import { ADSENSE_SLOT_INFEED, ADSENSE_SLOT_SIDEBAR } from "../../ads/config";
import { AdSlot } from "../../components/AdSlot";

export function JobSearchTipsPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <article className="saa-card p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800/70">
          Guide
        </p>
        <h1 className="font-display mt-2 text-3xl text-teal-950">
          Job search tips for remote software roles
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-teal-950/70">
          Remote hiring is competitive. A focused weekly system beats random scrolling
          across ten tabs.
        </p>

        <AdSlot
          className="my-6"
          slot={ADSENSE_SLOT_INFEED}
          format="rectangle"
          label="In-article"
        />

        <div className="space-y-5 text-sm leading-relaxed text-teal-950/80">
          <h2 className="font-display text-xl text-teal-950">Pick boards that fit you</h2>
          <p>
            RemoteOK, Remotive, Himalayas, We Work Remotely, Jobicy, and similar boards
            publish tech-friendly remote roles. Filter by stack and seniority instead of
            applying to every “Senior Data Engineer” when your profile is frontend.
          </p>

          <h2 className="font-display text-xl text-teal-950">Score before you apply</h2>
          <p>
            If the JD’s core stack barely overlaps yours, either skip or update your
            profile with real skills first. A tailored CV cannot invent production years
            with Spark or Kubernetes overnight.
          </p>

          <h2 className="font-display text-xl text-teal-950">Batch your applications</h2>
          <p>
            Block time: sync jobs → shortlist 5 → match CV → PDF → apply → mark tracker.
            Consistency beats weekend binge applications.
          </p>

          <h2 className="font-display text-xl text-teal-950">Prepare for the interview early</h2>
          <p>
            Save the JD and your tailored CV. Draft stories for the technologies you
            emphasized. Search&Apply’s interview prep can draft likely questions from
            that same posting.
          </p>
        </div>

        <Link to="/auth" className="saa-btn saa-btn-primary mt-8">
          Open Search&Apply
        </Link>
      </article>

      <aside className="space-y-4">
        <AdSlot slot={ADSENSE_SLOT_SIDEBAR} format="vertical" label="Sidebar" />
        <div className="saa-card p-4 text-sm text-teal-950/70">
          <p className="font-semibold text-teal-950">Related</p>
          <Link to="/guides/ats-cv" className="mt-2 block text-teal-800 underline">
            ATS CV guide
          </Link>
        </div>
      </aside>
    </div>
  );
}
