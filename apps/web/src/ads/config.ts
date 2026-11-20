/** Set these in apps/web/.env after AdSense approval */
export const ADSENSE_CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT || "").trim();
export const ADSENSE_SLOT_HEADER = (import.meta.env.VITE_ADSENSE_SLOT_HEADER || "").trim();
export const ADSENSE_SLOT_INFEED = (import.meta.env.VITE_ADSENSE_SLOT_INFEED || "").trim();
export const ADSENSE_SLOT_SIDEBAR = (import.meta.env.VITE_ADSENSE_SLOT_SIDEBAR || "").trim();
export const ADSENSE_SLOT_FOOTER = (import.meta.env.VITE_ADSENSE_SLOT_FOOTER || "").trim();

export const adsEnabled = Boolean(ADSENSE_CLIENT);

export const CONTACT_EMAIL =
  (import.meta.env.VITE_CONTACT_EMAIL || "support@searchandapply.app").trim();
