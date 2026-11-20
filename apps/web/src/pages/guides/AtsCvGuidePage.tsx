import { Link } from "react-router-dom";
import { ADSENSE_SLOT_INFEED, ADSENSE_SLOT_SIDEBAR } from "../../ads/config";
import { AdSlot } from "../../components/AdSlot";

export function AtsCvGuidePage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <article className="saa-card p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800/70">
          Guide
        </p>
        <h1 className="font-display mt-2 text-3xl text-teal-950">
          How to make an ATS-friendly CV for each job
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-teal-950/70">
          Applicant Tracking Systems (ATS) scan resumes for keywords and structure
          before a human recruiter opens them. Tailoring one base CV per job
          description is one of the highest-leverage steps in modern job search.
        </p>

        <AdSlot
          className="my-6"
          slot={ADSENSE_SLOT_INFEED}
          format="rectangle"
          label="In-article"
        />

        <div className="space-y-5 text-sm leading-relaxed text-teal-950/80">
          <h2 className="font-display text-xl text-teal-950">1. Start from truth</h2>
          <p>
            Keep real employers, dates, and projects. Inventing tools you never used
            can pass a keyword filter and fail the interview. Mirror the employer’s
            language only where your experience supports it.
          </p>

          <h2 className="font-display text-xl text-teal-950">2. Pull required tech from the JD</h2>
          <p>
            Highlight technologies named in the posting. Put matching skills near the
            top of your skills section and weave a few into the professional summary
            and bullets.
          </p>

          <h2 className="font-display text-xl text-teal-950">3. Rewrite bullets for impact</h2>
          <p>
            Same role history — clearer outcomes. Prefer “Built X that achieved Y”
            over vague duties. Reorder bullets so the most JD-relevant wins come first.
          </p>

          <h2 className="font-display text-xl text-teal-950">4. Export a clean PDF</h2>
          <p>
            Simple headings, consistent dates, no text boxes that break parsers. In
            Search&Apply, Match CV → Download PDF gives you a role-specific file ready
            to upload on the apply form.
          </p>

          <h2 className="font-display text-xl text-teal-950">5. Track what you sent</h2>
          <p>
            Note which version you applied with and the job URL. When interviews start,
            use the same keywords you emphasized on that tailored CV.
          </p>
        </div>

        <Link to="/auth" className="saa-btn saa-btn-primary mt-8">
          Try Match CV on Search&Apply
        </Link>
      </article>

      <aside className="space-y-4">
        <AdSlot slot={ADSENSE_SLOT_SIDEBAR} format="vertical" label="Sidebar" />
        <div className="saa-card p-4 text-sm text-teal-950/70">
          <p className="font-semibold text-teal-950">Related</p>
          <Link to="/guides/job-search" className="mt-2 block text-teal-800 underline">
            Job search tips for remote roles
          </Link>
        </div>
      </aside>
    </div>
  );
}
