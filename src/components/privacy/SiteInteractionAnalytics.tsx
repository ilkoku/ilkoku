"use client";

import { useEffect } from "react";
import { emitPublicInteraction, publicAnalyticsConsentGranted } from "@/lib/site-interaction-events";

const CONTACT_MARKER_KEY = "ilkoku:analytics:contact-submit-pending:v1";
const CONTACT_MARKER_MAX_AGE_MS = 10 * 60 * 1000;

type ContactChannel = "email" | "phone" | "whatsapp" | "linkedin";

function contactChannel(anchor: HTMLAnchorElement): ContactChannel | null {
  let destination: URL;
  try {
    destination = new URL(anchor.href, window.location.origin);
  } catch {
    return null;
  }

  if (destination.protocol === "mailto:") return "email";
  if (destination.protocol === "tel:") return "phone";
  if (destination.protocol !== "https:") return null;

  const host = destination.hostname.toLowerCase();
  if (host === "wa.me" || host === "api.whatsapp.com" || host === "web.whatsapp.com" ||
      host === "whatsapp.com" || host === "www.whatsapp.com") return "whatsapp";
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "linkedin";
  return null;
}

function ctaPlacement(anchor: HTMLAnchorElement) {
  if (anchor.closest('[data-site-analytics-cta="cms"]')) return "cms";
  if (anchor.closest(".landing-hero__actions")) return "home_hero";
  if (anchor.closest(".landing-header__actions")) return "home_header";
  if (anchor.closest(".landing-cta")) return "home_join";
  if (anchor.closest(".contact-route-card__links")) return "contact_quick_links";
  if (anchor.closest(".contact-direct-card")) return "contact_direct";
  return null;
}

function clearPendingContact() {
  try {
    window.sessionStorage.removeItem(CONTACT_MARKER_KEY);
  } catch {
    // Private browsing may prohibit session storage.
  }
}

function markPendingContact() {
  if (!publicAnalyticsConsentGranted()) {
    clearPendingContact();
    return;
  }
  try {
    window.sessionStorage.setItem(CONTACT_MARKER_KEY, String(Date.now()));
  } catch {
    // Never fall back to persisting a name, email or message.
  }
}

function hasFreshPendingContact() {
  try {
    const raw = window.sessionStorage.getItem(CONTACT_MARKER_KEY);
    if (!raw || !/^[0-9]{13}$/.test(raw)) return false;
    const elapsed = Date.now() - Number(raw);
    if (elapsed < 0 || elapsed > CONTACT_MARKER_MAX_AGE_MS) {
      clearPendingContact();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function tryRecordContactSuccess() {
  if (window.location.pathname !== "/iletisim") return;
  const status = new URLSearchParams(window.location.search).get("durum");
  if (status === "eksik" || status === "hata") {
    clearPendingContact();
    return;
  }
  if (status !== "alindi" || !hasFreshPendingContact()) return;

  // A success is counted only after a real form submit and server redirect.
  // The marker is consumed exactly once, after an analytics provider is ready.
  if (emitPublicInteraction("site_form_success", { form: "public_contact" })) {
    clearPendingContact();
  }
}

export function SiteInteractionAnalytics() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const node = event.target;
      if (!(node instanceof Element)) return;
      const anchor = node.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const channel = contactChannel(anchor);
      if (channel) {
        emitPublicInteraction("site_contact_click", { channel });
        return;
      }

      const placement = ctaPlacement(anchor);
      if (placement) emitPublicInteraction("site_cta_click", { placement });
    }

    function onSubmit(event: Event) {
      if (event.defaultPrevented) return;
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.getAttribute("action") !== "/api/site-contact" ||
          form.method.toLowerCase() !== "post" || !form.checkValidity()) return;
      markPendingContact();
    }

    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    const retries = [300, 800, 1600, 3000, 5000, 8000].map((delay) =>
      window.setTimeout(tryRecordContactSuccess, delay));
    const onConsentChanged = () => tryRecordContactSuccess();
    window.addEventListener("ilkoku:consent-changed", onConsentChanged);
    tryRecordContactSuccess();

    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
      window.removeEventListener("ilkoku:consent-changed", onConsentChanged);
      retries.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return null;
}
