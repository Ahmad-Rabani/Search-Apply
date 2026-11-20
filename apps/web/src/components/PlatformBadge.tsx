const PLATFORMS: Record<
  string,
  { label: string; bg: string; color: string; icon: string }
> = {
  remoteok: {
    label: "RemoteOK",
    bg: "#111111",
    color: "#FFCD1A",
    icon: "R",
  },
  remotive: {
    label: "Remotive",
    bg: "#5B4BDB",
    color: "#FFFFFF",
    icon: "Rv",
  },
  arbeitnow: {
    label: "Arbeitnow",
    bg: "#2563EB",
    color: "#FFFFFF",
    icon: "A",
  },
  jobicy: {
    label: "Jobicy",
    bg: "#0F9D58",
    color: "#FFFFFF",
    icon: "J",
  },
  adzuna: {
    label: "Adzuna",
    bg: "#7AC143",
    color: "#163300",
    icon: "Az",
  },
  indeed: {
    label: "Indeed",
    bg: "#2557A7",
    color: "#FFFFFF",
    icon: "in",
  },
  linkedin: {
    label: "LinkedIn",
    bg: "#0A66C2",
    color: "#FFFFFF",
    icon: "in",
  },
  themuse: {
    label: "The Muse",
    bg: "#E85D4C",
    color: "#FFFFFF",
    icon: "M",
  },
};

export function getPlatformMeta(source?: string) {
  const key = (source || "").toLowerCase();
  return (
    PLATFORMS[key] || {
      label: source || "Job board",
      bg: "#334155",
      color: "#F8FAFC",
      icon: "•",
    }
  );
}

export function PlatformBadge({
  source,
  size = "md",
}: {
  source?: string;
  size?: "sm" | "md";
}) {
  const meta = getPlatformMeta(source);
  const pad = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-semibold tracking-wide ${pad}`}
      style={{ backgroundColor: meta.bg, color: meta.color }}
      title={`Posted on ${meta.label}`}
    >
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-[4px] text-[9px] font-bold"
        style={{ backgroundColor: "rgba(255,255,255,0.18)", color: meta.color }}
      >
        {meta.icon}
      </span>
      {meta.label}
    </span>
  );
}
