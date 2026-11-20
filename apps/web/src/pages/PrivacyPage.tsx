import { CONTACT_EMAIL } from "../ads/config";

export function PrivacyPage() {
  return (
    <article className="prose-saa saa-card mx-auto max-w-3xl p-6 md:p-8">
      <h1 className="font-display text-3xl text-teal-950">Privacy Policy</h1>
      <p className="mt-2 text-sm text-teal-950/55">Last updated: November 20, 2026</p>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-teal-950/80">
        <p>
          Search&Apply (“we”, “our”, “the Service”) helps you discover jobs, tailor
          resumes, and track applications. This policy explains what we collect and
          how we use it.
        </p>

        <h2 className="font-display text-xl text-teal-950">Information we collect</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Account data: email, name, password (stored hashed)</li>
          <li>Profile / CV content you upload or enter (skills, experience, projects)</li>
          <li>Application tracker notes and job interactions</li>
          <li>Technical data: IP, browser type, and basic usage logs for security</li>
        </ul>

        <h2 className="font-display text-xl text-teal-950">How we use information</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>To operate job search, CV matching, apply assist, agent, and interview prep</li>
          <li>To improve relevance scoring and product reliability</li>
          <li>To send optional email alerts if you enable SMTP notifications</li>
          <li>To show advertising (e.g. Google AdSense) on public pages when enabled</li>
        </ul>

        <h2 className="font-display text-xl text-teal-950">AI processing</h2>
        <p>
          CV tailoring and interview prep send relevant profile and job-description
          text to our configured AI provider (for example Google Gemini or Anthropic)
          to generate outputs. Do not put secrets in your profile that you do not want
          processed by those providers.
        </p>

        <h2 className="font-display text-xl text-teal-950">Cookies & ads</h2>
        <p>
          We may use cookies for authentication and, if AdSense is enabled, Google and
          partners may use cookies or similar tech to serve personalized or
          non-personalized ads based on your settings and applicable law. You can
          manage ad personalization via Google’s ad settings.
        </p>

        <h2 className="font-display text-xl text-teal-950">Data sharing</h2>
        <p>
          We do not sell your personal CV data. We share data with infrastructure and
          AI providers only as needed to run the Service, and with advertising partners
          when ads are active on the site.
        </p>

        <h2 className="font-display text-xl text-teal-950">Retention & deletion</h2>
        <p>
          We retain account and profile data while your account is active. Contact us
          to request deletion of your account and associated data.
        </p>

        <h2 className="font-display text-xl text-teal-950">Contact</h2>
        <p>
          Privacy questions:{" "}
          <a className="text-teal-800 underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </article>
  );
}
