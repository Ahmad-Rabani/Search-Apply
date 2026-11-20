import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT, adsEnabled } from "../ads/config";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSlotProps = {
  slot?: string;
  format?: "auto" | "horizontal" | "rectangle" | "vertical";
  className?: string;
  /** Shown in UI / for your own tracking — not sent to Google */
  label?: string;
};

let scriptLoading: Promise<void> | null = null;

function loadAdSenseScript() {
  if (!adsEnabled) return Promise.resolve();
  if (document.querySelector('script[data-saa-adsense="1"]')) {
    return Promise.resolve();
  }
  if (scriptLoading) return scriptLoading;

  scriptLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    s.crossOrigin = "anonymous";
    s.dataset.saaAdsense = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("AdSense script failed to load"));
    document.head.appendChild(s);
  });

  return scriptLoading;
}

/**
 * Google AdSense unit. Without VITE_ADSENSE_CLIENT it shows a dashed placeholder
 * so you can design layout before approval.
 */
export function AdSlot({
  slot,
  format = "auto",
  className = "",
  label = "Ad",
}: AdSlotProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!adsEnabled || !slot) return;
    let cancelled = false;

    void loadAdSenseScript()
      .then(() => {
        if (cancelled || pushed.current) return;
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          pushed.current = true;
        } catch {
          // AdSense may throw on hot reload / duplicate push
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [slot]);

  if (!adsEnabled || !slot) {
    return (
      <div
        className={`flex min-h-[90px] items-center justify-center rounded-xl border border-dashed border-teal-900/20 bg-teal-950/[0.03] px-3 py-4 text-center text-xs text-teal-950/45 ${className}`}
        aria-hidden
      >
        Ad placeholder · {label}
        <span className="ml-1 hidden sm:inline">
          (set VITE_ADSENSE_CLIENT + slot after approval)
        </span>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
