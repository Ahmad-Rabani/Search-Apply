import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, getToken } from "../api/client";
import type { Preferences, Profile } from "../types";

const emptyProfile: Profile = {
  fullName: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  github: "",
  website: "",
  summary: "",
  skills: [],
  experience: [],
  education: [],
  projects: [],
};

function applyProfileToState(
  p: Profile,
  setProfile: (p: Profile) => void,
  setSkillsText: (s: string) => void
) {
  setProfile({ ...emptyProfile, ...p });
  setSkillsText((p.skills || []).join(", "));
}

export function ProfilePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [skillsText, setSkillsText] = useState("");
  const [prefs, setPrefs] = useState<Preferences>({
    roles: [],
    locations: [],
    remoteOnly: true,
    minSalary: 0,
    keywords: [],
  });
  const [rolesText, setRolesText] = useState("");
  const [locationsText, setLocationsText] = useState("");
  const [keywordsText, setKeywordsText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [p, pr] = await Promise.all([
          api<{ profile: Profile }>("/api/profile"),
          api<{ preferences: Preferences }>("/api/profile/preferences"),
        ]);
        applyProfileToState(p.profile, setProfile, setSkillsText);
        setPrefs(pr.preferences);
        setRolesText((pr.preferences.roles || []).join(", "));
        setLocationsText((pr.preferences.locations || []).join(", "));
        setKeywordsText((pr.preferences.keywords || []).join(", "));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function uploadCv(file: File) {
    setUploading(true);
    setMessage("");
    setError("");
    try {
      const form = new FormData();
      form.append("cv", file);
      const res = await fetch("/api/profile/upload-cv", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      applyProfileToState(data.profile, setProfile, setSkillsText);
      if (data.preferences) {
        setPrefs(data.preferences);
        setRolesText((data.preferences.roles || []).join(", "));
        setLocationsText((data.preferences.locations || []).join(", "));
        setKeywordsText((data.preferences.keywords || []).join(", "));
      }
      setMessage(
        data.message ||
          "CV parsed. Review the fields below, tweak if needed, then Save profile."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "CV upload failed — try PDF again, or paste as TXT"
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      const skills = skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ ...profile, skills }),
      });

      await api("/api/profile/preferences", {
        method: "PUT",
        body: JSON.stringify({
          ...prefs,
          roles: rolesText.split(",").map((s) => s.trim()).filter(Boolean),
          locations: locationsText.split(",").map((s) => s.trim()).filter(Boolean),
          keywords: keywordsText.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });

      setMessage("Profile saved — ready for job matching.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  if (loading) return <p className="text-teal-950/60">Loading profile…</p>;

  return (
    <form onSubmit={save} className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-teal-950">Base profile</h1>
        <p className="mt-1 text-teal-950/65">
          Upload your CV once — details fill automatically. Then for each job we tailor a matching
          version before you apply.
        </p>
      </div>

      <section className="rounded-2xl border border-teal-800/20 bg-gradient-to-br from-teal-900/[0.06] to-white/80 p-5">
        <h2 className="font-display text-xl text-teal-950">1. Upload CV</h2>
        <p className="mt-1 text-sm text-teal-950/65">
          PDF, DOCX, or TXT. AI extracts name, skills, experience, education, and projects.
          Requires <code className="text-xs">GEMINI_API_KEY</code> in API env.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="block w-full max-w-md text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-teal-900"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadCv(file);
            }}
          />
          {uploading && (
            <span className="text-sm font-medium text-teal-800">Parsing CV…</span>
          )}
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-teal-900/10 bg-white/80 p-5 sm:grid-cols-2">
        <h2 className="font-display text-xl sm:col-span-2">2. Review / edit details</h2>
        {(
          [
            ["fullName", "Full name"],
            ["headline", "Headline"],
            ["email", "Email"],
            ["phone", "Phone"],
            ["location", "Location"],
            ["linkedin", "LinkedIn URL"],
            ["github", "GitHub URL"],
            ["website", "Website"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm">
            <span className="mb-1 block font-medium">{label}</span>
            <input
              className="w-full rounded-lg border border-teal-900/15 px-3 py-2 outline-none focus:border-teal-700"
              value={profile[key]}
              onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
            />
          </label>
        ))}

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">Summary</span>
          <textarea
            rows={4}
            className="w-full rounded-lg border border-teal-900/15 px-3 py-2 outline-none focus:border-teal-700"
            value={profile.summary}
            onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
          />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">Skills (comma separated)</span>
          <input
            className="w-full rounded-lg border border-teal-900/15 px-3 py-2 outline-none focus:border-teal-700"
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
          />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">Experience (JSON array)</span>
          <textarea
            rows={8}
            className="w-full rounded-lg border border-teal-900/15 px-3 py-2 font-mono text-xs outline-none focus:border-teal-700"
            value={JSON.stringify(profile.experience || [], null, 2)}
            onChange={(e) => {
              try {
                setProfile({ ...profile, experience: JSON.parse(e.target.value) });
              } catch {
                /* keep typing */
              }
            }}
          />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">Education (JSON array)</span>
          <textarea
            rows={5}
            className="w-full rounded-lg border border-teal-900/15 px-3 py-2 font-mono text-xs outline-none focus:border-teal-700"
            value={JSON.stringify(profile.education || [], null, 2)}
            onChange={(e) => {
              try {
                setProfile({ ...profile, education: JSON.parse(e.target.value) });
              } catch {
                /* keep typing */
              }
            }}
          />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">Projects (JSON array)</span>
          <textarea
            rows={5}
            className="w-full rounded-lg border border-teal-900/15 px-3 py-2 font-mono text-xs outline-none focus:border-teal-700"
            value={JSON.stringify(profile.projects || [], null, 2)}
            onChange={(e) => {
              try {
                setProfile({ ...profile, projects: JSON.parse(e.target.value) });
              } catch {
                /* keep typing */
              }
            }}
          />
        </label>
      </section>

      <section className="grid gap-4 rounded-2xl border border-teal-900/10 bg-white/80 p-5 sm:grid-cols-2">
        <h2 className="font-display text-xl sm:col-span-2">3. Job preferences</h2>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">Target roles</span>
          <input
            className="w-full rounded-lg border border-teal-900/15 px-3 py-2 outline-none focus:border-teal-700"
            value={rolesText}
            onChange={(e) => setRolesText(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Locations</span>
          <input
            className="w-full rounded-lg border border-teal-900/15 px-3 py-2 outline-none focus:border-teal-700"
            value={locationsText}
            onChange={(e) => setLocationsText(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Keywords</span>
          <input
            className="w-full rounded-lg border border-teal-900/15 px-3 py-2 outline-none focus:border-teal-700"
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Min salary</span>
          <input
            type="number"
            className="w-full rounded-lg border border-teal-900/15 px-3 py-2 outline-none focus:border-teal-700"
            value={prefs.minSalary}
            onChange={(e) => setPrefs({ ...prefs, minSalary: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={prefs.remoteOnly}
            onChange={(e) => setPrefs({ ...prefs, remoteOnly: e.target.checked })}
          />
          Remote only
        </label>
      </section>

      {message && <p className="text-sm text-teal-800">{message}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        className="rounded-lg bg-teal-800 px-5 py-2.5 font-semibold text-white hover:bg-teal-900"
      >
        Save profile
      </button>
    </form>
  );
}
