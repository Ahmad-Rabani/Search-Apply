import { useState, type FormEvent } from "react";
import { CONTACT_EMAIL } from "../ads/config";

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Search&Apply contact from ${name || "user"}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1.2fr_0.8fr]">
      <article className="saa-card p-6 md:p-8">
        <h1 className="font-display text-3xl text-teal-950">Contact us</h1>
        <p className="mt-2 text-sm text-teal-950/65">
          Questions about the product, privacy, or AdSense / partnership inquiries —
          send a note and we’ll get back when we can.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-teal-950">Name</span>
            <input
              className="mt-1 w-full rounded-xl border border-teal-900/15 bg-white px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-teal-950">Email</span>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-teal-900/15 bg-white px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-teal-950">Message</span>
            <textarea
              className="mt-1 min-h-[140px] w-full rounded-xl border border-teal-900/15 bg-white px-3 py-2"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="saa-btn saa-btn-primary">
            Open email app
          </button>
          {sent && (
            <p className="text-sm text-teal-800">
              If your mail app did not open, write us at {CONTACT_EMAIL}.
            </p>
          )}
        </form>
      </article>

      <aside className="saa-card h-fit p-6">
        <h2 className="font-semibold text-teal-950">Direct email</h2>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-2 block text-sm text-teal-800 underline"
        >
          {CONTACT_EMAIL}
        </a>
        <p className="mt-4 text-sm text-teal-950/60">
          For AdSense review crawlers and users: this page is public and does not
          require login.
        </p>
      </aside>
    </div>
  );
}
