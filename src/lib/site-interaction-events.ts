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

type PendingEvent = { event: PublicInteractionEvent; attributes: Record<string, string> };
const pending: PendingEvent[] = [];
let readyListenerRegistered = false;

function sendToGa4(event: PublicInteractionEvent, attributes: Record<string, string>) {
  window.gtag?.("event", event, { ...attributes, send_to: ILKOKU_GA4_ID });
}

function flushPendingEvents() {
  if (!publicAnalyticsConsentGranted()) {
    pending.splice(0);
    return;
  }
  const state = document.documentElement.dataset;
  if (state.ilkokuAnalyticsEventTag !== "loaded" && state.ilkokuAnalyticsGa4 !== "loaded") return;
  for (const item of pending.splice(0)) sendToGa4(item.event, item.attributes);
}

function registerReadyListener() {
  if (readyListenerRegistered) return;
  readyListenerRegistered = true;
  window.addEventListener("ilkoku:analytics-event-tag-ready", flushPendingEvents);
  window.addEventListener("ilkoku:consent-changed", () => {
    if (!publicAnalyticsConsentGranted()) pending.splice(0);
  });
}

export function emitPublicInteraction(
  event: PublicInteractionEvent,
  attributes: Record<string, string> = {},
) {
  if (!publicAnalyticsConsentGranted() || typeof window.gtag !== "function") return false;

  const payload = permittedPayload(event, attributes);
  if (!payload) return false;
  const state = document.documentElement.dataset;
  if (state.ilkokuAnalyticsEventTag === "loaded" ||
      state.ilkokuAnalyticsGa4 === "loaded") {
    sendToGa4(event, payload);
    return true;
  }
  if (state.ilkokuAnalyticsEventTag === "loading" ||
      state.ilkokuAnalyticsEventTag === "consent-pending") {
    // Buffer only category-only events while the consent-approved Google
    // event runtime initializes. No identifiers, storage or network calls.
    registerReadyListener();
    if (pending.length < 20) pending.push({ event, attributes: payload });
    return true;
  }
  return false;
}
