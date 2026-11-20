import { PLATFORM_KEYS, getPlatformMeta } from "./platforms";

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
  /** empty selection means all platforms */
  emptyMeansAll?: boolean;
  label?: string;
  dense?: boolean;
};

export function PlatformFilter({
  selected,
  onChange,
  emptyMeansAll = true,
  label = "Platforms",
  dense = false,
}: Props) {
  const allSelected = selected.length === 0 && emptyMeansAll;

  function toggle(source: string) {
    if (selected.includes(source)) {
      onChange(selected.filter((s) => s !== source));
      return;
    }
    onChange([...selected, source]);
  }

  return (
    <div className={dense ? "" : "space-y-2"}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-950/45">
          {label}
        </p>
        <button
          type="button"
          onClick={() => onChange([])}
          className={`text-xs font-semibold transition ${
            allSelected ? "text-teal-800" : "text-teal-950/45 hover:text-teal-800"
          }`}
        >
          All platforms
        </button>
      </div>

      <div className={`grid gap-2 ${dense ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"}`}>
        {PLATFORM_KEYS.map((source) => {
          const meta = getPlatformMeta(source);
          const active = allSelected || selected.includes(source);
          return (
            <button
              key={source}
              type="button"
              onClick={() => toggle(source)}
              className={`group relative flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                active
                  ? "border-teal-700/35 bg-white shadow-sm"
                  : "border-teal-900/10 bg-teal-950/[0.02] opacity-55 hover:opacity-90"
              }`}
            >
              <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                style={{ backgroundColor: meta.bg, color: meta.color }}
              >
                {meta.icon}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-teal-950">
                  {meta.label}
                </span>
                {!dense && (
                  <span className="block truncate text-[11px] text-teal-950/45">
                    {meta.hint}
                  </span>
                )}
              </span>
              <span
                className={`ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  active ? "bg-teal-800 text-white" : "bg-teal-900/10 text-teal-950/30"
                }`}
              >
                {active ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-teal-950/45">
        {allSelected
          ? "Showing every connected board"
          : `Filtered: ${selected.map((s) => getPlatformMeta(s).label).join(", ")}`}
      </p>
    </div>
  );
}
