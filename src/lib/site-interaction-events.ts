/**
 * Consent-gated public analytics.
 * Only finite, non-identifying event parameters are accepted.
 * An explicit send_to routes each event to the already loaded Google tag
 * without a GTM custom-event trigger or a second GA4 installation.
 */
import { ILKOKU_GA4_ID } from "@/lib/site-analytics-settings";

export type PublicInteractionEvent =
  | "site_cta_click"
  | "site_contact_click"
  | "site_form_success"
  | "site_share_click";

const ALLOWED_ATTRIBUTES: Record<PublicInteractionEvent, Readonly<Record<string, readonly string[]>>> = {
  site_cta_click: {
    placement: ["cms", "home_hero", "home_role", "home_passport", "home_header",
      "home_join", "trust_hero", "trust_cta", "contact_quick_links", "contact_direct"],
  },
  site_contact_click: { channel: ["email", "phone", "whatsapp", "linkedin"] },
  site_form_success: { form: ["public_contact"] },
  site_share_click: { channel: ["whatsapp"], placement: ["work_share"] },
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function publicAnalyticsConsentGranted() {
  if (typeof document === "undefined") return false;
  const state = document.documentElement.dataset.ilkokuAnalyticsConsent;
  return state === "granted" || state === "not-required";
}

function permittedPayload(event: PublicInteractionEvent, attributes: Record<string, string>) {
  if (!Object.hasOwn(ALLOWED_ATTRIBUTES, event)) return null;
  const rules = ALLOWED_ATTRIBUTES[event];
  const entries = Object.entries(attributes);
  // Reject unknown keys and values rather than ever collecting link text,
  // a visitor email, a form field, or an arbitrary URL.
  if (entries.length !== Object.keys(rules).length) return null;
  for (const [key, value] of entries) {
    if (!Object.hasOwn(rules, key) || !rules[key].includes(value)) return null;
  }
  return attributes;
}

export function emitPublicInteraction(
  event: PublicInteractionEvent,
  attributes: Record<string, string> = {},
) {
  if (!publicAnalyticsConsentGranted() || typeof window.gtag !== "function") return false;

  const payload = permittedPayload(event, attributes);
  if (!payload) return false;
  const state = document.documentElement.dataset;
  const gtmReady = ["loading", "loaded", "fallback-loading", "present"]
    .includes(state.ilkokuAnalyticsGtm || "");
  const ga4Ready = state.ilkokuAnalyticsGa4 === "loaded";
  if (!gtmReady && !ga4Ready) return false;

  // The existing GTM container already delivers page_view to this GA4 stream.
  // gtag('event') with explicit send_to uses that Google tag directly,
  // never pushes a duplicate GTM custom-event object, and never adds an
  // independent gtag.js script or config page_view call.
  window.gtag("event", event, { ...payload, send_to: ILKOKU_GA4_ID });
  return true;
}
