import { useEffect, useRef, useState } from "react";

const STATUS_META: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  saved: {
    label: "Saved",
    bg: "bg-stone-100",
    text: "text-stone-800",
    dot: "bg-stone-500",
  },
  tailored: {
    label: "Tailored",
    bg: "bg-teal-50",
    text: "text-teal-900",
    dot: "bg-teal-600",
  },
  applied: {
    label: "Applied",
    bg: "bg-amber-50",
    text: "text-amber-950",
    dot: "bg-amber-600",
  },
  interview: {
    label: "Interview",
    bg: "bg-sky-50",
    text: "text-sky-950",
    dot: "bg-sky-600",
  },
  offer: {
    label: "Offer",
    bg: "bg-emerald-50",
    text: "text-emerald-950",
    dot: "bg-emerald-600",
  },
  rejected: {
    label: "Rejected",
    bg: "bg-rose-50",
    text: "text-rose-900",
    dot: "bg-rose-500",
  },
};

type StatusSelectProps = {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function StatusSelect({
  value,
  options,
  onChange,
  disabled,
}: StatusSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = STATUS_META[value] || STATUS_META.saved;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-w-[132px] items-center justify-between gap-2 rounded-xl border border-teal-900/12 px-3 py-2 text-sm font-semibold shadow-sm transition hover:border-teal-800/25 disabled:opacity-50 ${current.bg} ${current.text}`}
      >
        <span className="inline-flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${current.dot}`} />
          {current.label}
        </span>
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 opacity-60 transition ${open ? "rotate-180" : ""}`}
          fill="currentColor"
          aria-hidden
        >
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-30 mt-1.5 min-w-[168px] overflow-hidden rounded-xl border border-teal-900/10 bg-white py-1 shadow-xl"
        >
          {options.map((opt) => {
            const meta = STATUS_META[opt] || STATUS_META.saved;
            const active = opt === value;
            return (
              <li key={opt} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium transition ${
                    active
                      ? "bg-teal-50 text-teal-950"
                      : "text-teal-950/80 hover:bg-teal-950/[0.04]"
                  }`}
                  onClick={() => {
                    setOpen(false);
                    if (opt !== value) onChange(opt);
                  }}
                >
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  <span className="flex-1">{meta.label}</span>
                  {active && (
                    <svg
                      viewBox="0 0 20 20"
                      className="h-4 w-4 text-teal-700"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4L8.5 12l6.8-6.7a1 1 0 0 1 1.4 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
