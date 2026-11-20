import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, getToken } from "../api/client";
import { toastFromError, toastSuccess } from "../lib/toast";
import type { Education, Experience, Preferences, Profile, Project } from "../types";

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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [p, pr] = await Promise.all([
          api<{ profile: Profile }>("/api/profile"),
          api<{ preferences: Preferences }>("/api/profile/preferences"),
        ]);
        setProfile({ ...emptyProfile, ...p.profile });
        setSkillsText((p.profile.skills || []).join(", "));
        setPrefs(pr.preferences);
        setRolesText((pr.preferences.roles || []).join(", "));
        setLocationsText((pr.preferences.locations || []).join(", "));
        setKeywordsText((pr.preferences.keywords || []).join(", "));
      } catch (err) {
        toastFromError(err, "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function uploadCv(file: File) {
    setUploading(true);
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

      setProfile({ ...emptyProfile, ...data.profile });
      setSkillsText((data.profile.skills || []).join(", "));
      if (data.preferences) {
        setPrefs(data.preferences);
        setRolesText((data.preferences.roles || []).join(", "));
        setLocationsText((data.preferences.locations || []).join(", "));
        setKeywordsText((data.preferences.keywords || []).join(", "));
      }
      toastSuccess("CV uploaded", "Review the fields below, then save.");
    } catch (err) {
      toastFromError(err, "CV upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
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

      toastSuccess("Profile saved", "Ready for matching and Agent mode.");
    } catch (err) {
      toastFromError(err, "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function updateExperience(index: number, patch: Partial<Experience>) {
    const next = [...(profile.experience || [])];
    next[index] = { ...next[index], ...patch };
    setProfile({ ...profile, experience: next });
  }

  function updateEducation(index: number, patch: Partial<Education>) {
    const next = [...(profile.education || [])];
    next[index] = { ...next[index], ...patch };
    setProfile({ ...profile, education: next });
  }

  function updateProject(index: number, patch: Partial<Project>) {
    const next = [...(profile.projects || [])];
    next[index] = { ...next[index], ...patch };
    setProfile({ ...profile, projects: next });
  }

  if (loading) return <p className="text-teal-950/55">Loading profile…</p>;

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800/70">
            Base CV
          </p>
          <h1 className="font-display text-3xl text-teal-950 md:text-4xl">Profile</h1>
          <p className="mt-1 max-w-xl text-sm text-teal-950/60">
            Upload once, review structured details, then every job match builds from this source of
            truth.
          </p>
        </div>
        <button type="submit" disabled={saving} className="saa-btn saa-btn-primary disabled:opacity-60">
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>

      <section className="saa-card overflow-hidden">
        <div className="border-b border-teal-900/8 bg-gradient-to-r from-teal-950 to-teal-800 px-5 py-4 text-white">
          <h2 className="font-display text-xl">Upload CV</h2>
          <p className="mt-1 text-sm text-teal-100/75">
            PDF, DOCX, or TXT — Gemini extracts your details automatically.
          </p>
        </div>
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md,application/pdf"
            disabled={uploading}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-teal-900"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadCv(file);
            }}
          />
          {uploading && <span className="text-sm font-medium text-teal-800">Parsing…</span>}
        </div>
      </section>

      <section className="saa-card p-5">
        <h2 className="font-display text-xl text-teal-950">Basics</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["fullName", "Full name"],
              ["headline", "Headline"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["location", "Location"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="mb-1 block font-medium text-teal-950/70">{label}</span>
              <input
                className="saa-input"
                value={profile[key]}
                onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="saa-card p-5">
        <h2 className="font-display text-xl text-teal-950">Links</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(
            [
              ["linkedin", "LinkedIn"],
              ["github", "GitHub"],
              ["website", "Website"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="mb-1 block font-medium text-teal-950/70">{label}</span>
              <input
                className="saa-input"
                value={profile[key]}
                onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="saa-card space-y-4 p-5">
        <h2 className="font-display text-xl text-teal-950">Summary & skills</h2>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-teal-950/70">Professional summary</span>
          <textarea
            rows={4}
            className="saa-input"
            value={profile.summary}
            onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-teal-950/70">Skills (comma separated)</span>
          <input
            className="saa-input"
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            placeholder="React, TypeScript, Node.js…"
          />
        </label>
        {skillsText && (
          <div className="flex flex-wrap gap-1.5">
            {skillsText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 24)
              .map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-teal-900/6 px-2.5 py-1 text-xs font-medium text-teal-900"
                >
                  {skill}
                </span>
              ))}
          </div>
        )}
      </section>

      <section className="saa-card space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-teal-950">Experience</h2>
          <button
            type="button"
            className="saa-btn saa-btn-secondary py-1.5 text-xs"
            onClick={() =>
              setProfile({
                ...profile,
                experience: [
                  ...(profile.experience || []),
                  {
                    title: "",
                    company: "",
                    location: "",
                    startDate: "",
                    endDate: "",
                    current: false,
                    bullets: [""],
                  },
                ],
              })
            }
          >
            + Add role
          </button>
        </div>
        {(profile.experience || []).length === 0 && (
          <p className="text-sm text-teal-950/50">No experience yet — upload a CV or add a role.</p>
        )}
        {(profile.experience || []).map((exp, index) => (
          <div key={index} className="space-y-3 rounded-xl border border-teal-900/10 bg-teal-950/[0.02] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="saa-input"
                placeholder="Title"
                value={exp.title || ""}
                onChange={(e) => updateExperience(index, { title: e.target.value })}
              />
              <input
                className="saa-input"
                placeholder="Company"
                value={exp.company || ""}
                onChange={(e) => updateExperience(index, { company: e.target.value })}
              />
              <input
                className="saa-input"
                placeholder="Location"
                value={exp.location || ""}
                onChange={(e) => updateExperience(index, { location: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="saa-input"
                  placeholder="Start"
                  value={exp.startDate || ""}
                  onChange={(e) => updateExperience(index, { startDate: e.target.value })}
                />
                <input
                  className="saa-input"
                  placeholder="End"
                  value={exp.endDate || ""}
                  disabled={exp.current}
                  onChange={(e) => updateExperience(index, { endDate: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={Boolean(exp.current)}
                onChange={(e) => updateExperience(index, { current: e.target.checked })}
                className="accent-teal-700"
              />
              Current role
            </label>
            <textarea
              rows={3}
              className="saa-input font-sans text-sm"
              placeholder="Bullets (one per line)"
              value={(exp.bullets || []).join("\n")}
              onChange={(e) =>
                updateExperience(index, {
                  bullets: e.target.value.split("\n").map((b) => b.trim()).filter(Boolean),
                })
              }
            />
            <button
              type="button"
              className="text-xs font-semibold text-red-700 hover:underline"
              onClick={() =>
                setProfile({
                  ...profile,
                  experience: (profile.experience || []).filter((_, i) => i !== index),
                })
              }
            >
              Remove role
            </button>
          </div>
        ))}
      </section>

      <section className="saa-card space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-teal-950">Education</h2>
          <button
            type="button"
            className="saa-btn saa-btn-secondary py-1.5 text-xs"
            onClick={() =>
              setProfile({
                ...profile,
                education: [
                  ...(profile.education || []),
                  { school: "", degree: "", field: "", startDate: "", endDate: "" },
                ],
              })
            }
          >
            + Add school
          </button>
        </div>
        {(profile.education || []).map((edu, index) => (
          <div key={index} className="grid gap-3 rounded-xl border border-teal-900/10 p-4 sm:grid-cols-2">
            <input
              className="saa-input"
              placeholder="School"
              value={edu.school || ""}
              onChange={(e) => updateEducation(index, { school: e.target.value })}
            />
            <input
              className="saa-input"
              placeholder="Degree"
              value={edu.degree || ""}
              onChange={(e) => updateEducation(index, { degree: e.target.value })}
            />
            <input
              className="saa-input"
              placeholder="Field"
              value={edu.field || ""}
              onChange={(e) => updateEducation(index, { field: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="saa-input"
                placeholder="Start"
                value={edu.startDate || ""}
                onChange={(e) => updateEducation(index, { startDate: e.target.value })}
              />
              <input
                className="saa-input"
                placeholder="End"
                value={edu.endDate || ""}
                onChange={(e) => updateEducation(index, { endDate: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="text-left text-xs font-semibold text-red-700 hover:underline sm:col-span-2"
              onClick={() =>
                setProfile({
                  ...profile,
                  education: (profile.education || []).filter((_, i) => i !== index),
                })
              }
            >
              Remove
            </button>
          </div>
        ))}
      </section>

      <section className="saa-card space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-teal-950">Projects</h2>
          <button
            type="button"
            className="saa-btn saa-btn-secondary py-1.5 text-xs"
            onClick={() =>
              setProfile({
                ...profile,
                projects: [
                  ...(profile.projects || []),
                  { name: "", url: "", description: "", tech: [] },
                ],
              })
            }
          >
            + Add project
          </button>
        </div>
        {(profile.projects || []).map((proj, index) => (
          <div key={index} className="space-y-3 rounded-xl border border-teal-900/10 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="saa-input"
                placeholder="Project name"
                value={proj.name || ""}
                onChange={(e) => updateProject(index, { name: e.target.value })}
              />
              <input
                className="saa-input"
                placeholder="URL"
                value={proj.url || ""}
                onChange={(e) => updateProject(index, { url: e.target.value })}
              />
            </div>
            <textarea
              rows={2}
              className="saa-input"
              placeholder="Description"
              value={proj.description || ""}
              onChange={(e) => updateProject(index, { description: e.target.value })}
            />
            <input
              className="saa-input"
              placeholder="Tech (comma separated)"
              value={(proj.tech || []).join(", ")}
              onChange={(e) =>
                updateProject(index, {
                  tech: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                })
              }
            />
            <button
              type="button"
              className="text-xs font-semibold text-red-700 hover:underline"
              onClick={() =>
                setProfile({
                  ...profile,
                  projects: (profile.projects || []).filter((_, i) => i !== index),
                })
              }
            >
              Remove project
            </button>
          </div>
        ))}
      </section>

      <section className="saa-card space-y-4 p-5">
        <h2 className="font-display text-xl text-teal-950">Job preferences</h2>
        <p className="text-sm text-teal-950/55">
          Used for feed ranking and Agent mode matching.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-teal-950/70">Target roles</span>
            <input className="saa-input" value={rolesText} onChange={(e) => setRolesText(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-teal-950/70">Locations</span>
            <input
              className="saa-input"
              value={locationsText}
              onChange={(e) => setLocationsText(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-teal-950/70">Keywords</span>
            <input
              className="saa-input"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-teal-950/70">Min salary</span>
            <input
              type="number"
              className="saa-input"
              value={prefs.minSalary}
              onChange={(e) => setPrefs({ ...prefs, minSalary: Number(e.target.value) || 0 })}
            />
          </label>
          <div className="block text-sm">
            <span className="mb-1 block font-medium text-teal-950/70">Work type</span>
            <label className="saa-input flex h-[42px] cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={prefs.remoteOnly}
                onChange={(e) => setPrefs({ ...prefs, remoteOnly: e.target.checked })}
                className="h-4 w-4 accent-teal-700"
              />
              <span className="font-medium text-teal-950">Remote only</span>
            </label>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="saa-btn saa-btn-primary disabled:opacity-60">
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
