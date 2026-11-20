import { getPlatformMeta } from "./platforms";

export function PlatformBadge({
  source,
  size = "md",
}: {
  source?: string;
  size?: "sm" | "md";
}) {
  const meta = getPlatformMeta(source);
  const pad = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  const iconBox = size === "sm" ? "h-3.5 w-3.5 text-[8px]" : "h-4 w-4 text-[9px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-semibold tracking-wide ${pad}`}
      style={{ backgroundColor: meta.bg, color: meta.color }}
      title={`Posted on ${meta.label}`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-[4px] font-bold ${iconBox}`}
        style={{ backgroundColor: "rgba(255,255,255,0.18)", color: meta.color }}
      >
        {meta.icon}
      </span>
      {meta.label}
    </span>
  );
}
