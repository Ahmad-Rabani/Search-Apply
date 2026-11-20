export const PLATFORM_KEYS = [
  "remoteok",
  "remotive",
  "arbeitnow",
  "jobicy",
  "adzuna",
] as const;

export type PlatformKey = (typeof PLATFORM_KEYS)[number];

export const PLATFORM_META: Record<
  string,
  { label: string; bg: string; color: string; icon: string; hint: string }
> = {
  remoteok: {
    label: "RemoteOK",
    bg: "#111111",
    color: "#FFCD1A",
    icon: "R",
    hint: "Remote tech roles",
  },
  remotive: {
    label: "Remotive",
    bg: "#5B4BDB",
    color: "#FFFFFF",
    icon: "Rv",
    hint: "Curated remote jobs",
  },
  arbeitnow: {
    label: "Arbeitnow",
    bg: "#2563EB",
    color: "#FFFFFF",
    icon: "A",
    hint: "EU + remote board",
  },
  jobicy: {
    label: "Jobicy",
    bg: "#0F9D58",
    color: "#FFFFFF",
    icon: "J",
    hint: "Remote careers",
  },
  adzuna: {
    label: "Adzuna",
    bg: "#7AC143",
    color: "#163300",
    icon: "Az",
    hint: "Indeed-like aggregate",
  },
  indeed: {
    label: "Indeed",
    bg: "#2557A7",
    color: "#FFFFFF",
    icon: "in",
    hint: "Indeed listings",
  },
  linkedin: {
    label: "LinkedIn",
    bg: "#0A66C2",
    color: "#FFFFFF",
    icon: "in",
    hint: "LinkedIn jobs",
  },
};

export function getPlatformMeta(source?: string) {
  const key = (source || "").toLowerCase();
  return (
    PLATFORM_META[key] || {
      label: source || "Job board",
      bg: "#334155",
      color: "#F8FAFC",
      icon: "•",
      hint: "Other source",
    }
  );
}
