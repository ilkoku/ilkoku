/**
 * Privacy-safe, consent-gated public interaction events.
 * Only fixed categorical parameters are allowed by callers. Never supply
 * addresses, user-entered values, URLs or arbitrary link text.
 */
export type PublicInteractionEvent =
  | "site_cta_click"
  | "site_contact_click"
  | "site_form_success"
  | "site_share_click";

type AnalyticsDataItem = unknown[] | Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: AnalyticsDataItem[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function publicAnalyticsConsentGranted() {
  if (typeof document === "undefined") return false;
  const state = document.documentElement.dataset.ilkokuAnalyticsConsent;
  return state === "granted" || state === "not-required";
}

export function emitPublicInteraction(
  event: PublicInteractionEvent,
  attributes: Record<string, string> = {},
) {
  if (!publicAnalyticsConsentGranted()) return false;

  const root = document.documentElement.dataset;
  const state = root.ilkokuAnalyticsGtm;
  const payload = { event, ...attributes };
  // GTM handles queued dataLayer events after it finishes loading. Never
  // deliver through GTM and direct gtag in the same interaction.
  if (
    (state === "loading" || state === "loaded" ||
      state === "fallback-loading" || state === "present") &&
    window.dataLayer
  ) {
    window.dataLayer.push(payload);
    return true;
  }

  if (root.ilkokuAnalyticsGa4 === "loaded" && typeof window.gtag === "function") {
    window.gtag("event", event, attributes);
    return true;
  }

  return false;
}
