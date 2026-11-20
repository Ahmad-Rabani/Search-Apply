import { Link } from "react-router-dom";
import { ADSENSE_SLOT_HEADER, ADSENSE_SLOT_INFEED } from "../ads/config";
import { AdSlot } from "../components/AdSlot";
import { useAuth } from "../auth/AuthContext";
import { Navigate } from "react-router-dom";

export function LandingPage() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-teal-900/10 bg-gradient-to-br from-teal-950 via-teal-900 to-teal-800 px-6 py-14 text-white md:px-12 md:py-20">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-teal-400/20 blur-3xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-100/70">
          AI job hunting agent
        </p>
        <h1 className="font-display mt-3 max-w-2xl text-4xl leading-tight md:text-5xl">
          Search&Apply
        </h1>
        <p className="mt-4 max-w-xl text-base text-teal-50/85 md:text-lg">
          Discover remote roles, generate an ATS-ready CV for each job description,
          assist your application, and track everything in one place.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/auth" className="saa-btn bg-white text-teal-950 hover:bg-teal-50">
            Get started free
          </Link>
          <Link
            to="/guides/ats-cv"
            className="saa-btn border border-white/25 bg-white/10 text-white hover:bg-white/15"
          >
            How ATS CVs work
          </Link>
        </div>
      </section>

      <AdSlot slot={ADSENSE_SLOT_HEADER} format="horizontal" label="Header banner" />

      <section className="grid gap-5 md:grid-cols-3">
        {[
          {
            title: "Multi-board discovery",
            body: "Pull jobs from RemoteOK, Remotive, Himalayas, We Work Remotely, and more — filter by platform and keywords.",
          },
          {
            title: "ATS CV per job",
            body: "Rewrite headline, summary, skills, and bullets to mirror the JD — without inventing experience you don’t have.",
          },
          {
            title: "Apply + track",
            body: "Download the matched PDF, use apply assist, mark status, and prep for interviews when you get the call.",
          },
        ].map((c) => (
          <article key={c.title} className="saa-card p-5">
            <h2 className="font-display text-xl text-teal-950">{c.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-teal-950/70">{c.body}</p>
          </article>
        ))}
      </section>

      <AdSlot slot={ADSENSE_SLOT_INFEED} format="rectangle" label="In-feed" />

      <section className="saa-card p-6 md:p-8">
        <h2 className="font-display text-2xl text-teal-950">Built for serious job search</h2>
        <ul className="mt-4 space-y-2 text-sm text-teal-950/75">
          <li>• Agent mode: scheduled daily hunts with your min score and platforms</li>
          <li>• Dashboard + alerts when runs finish</li>
          <li>• Interview prep from the same job you tailored for</li>
        </ul>
        <Link to="/auth" className="saa-btn saa-btn-primary mt-6">
          Create account
        </Link>
      </section>
    </div>
  );
}
