"use client";

import { useEffect } from "react";
import type { SiteAnalyticsSettings } from "@/lib/site-analytics-settings";

type ConsentChoice = {
  version: 1;
  analytics: boolean;
  marketing: boolean;
  savedAt: number;
  expiresAt: number;
};

type DataLayerItem = unknown[] | Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: DataLayerItem[];
    gtag?: (...args: unknown[]) => void;
  }
}

const CONSENT_STORAGE_KEY = "ilkoku:consent:v1";
const GTM_SCRIPT_ID = "ilkoku-gtm-script";
const GA4_SCRIPT_ID = "ilkoku-ga4-script";

function readAnalyticsConsent() {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<ConsentChoice>;
    return (
      parsed.version === 1 &&
      parsed.analytics === true &&
      typeof parsed.expiresAt === "number" &&
      parsed.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

function ensureDataLayer() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer?.push(args));
}

function loadGtm(id: string) {
  if (!id || document.getElementById(GTM_SCRIPT_ID)) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.id = GTM_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

function loadGa4(id: string, debugMode: boolean) {
  if (!id || document.getElementById(GA4_SCRIPT_ID)) return;
  ensureDataLayer();
  const script = document.createElement("script");
  script.id = GA4_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  script.onload = () => {
    ensureDataLayer();
    window.gtag?.("js", new Date());
    window.gtag?.("config", id, debugMode ? { debug_mode: true } : {});
  };
  document.head.appendChild(script);
}

function applyConsent(granted: boolean) {
  ensureDataLayer();
  window.gtag?.("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
  });
}

function activate(settings: SiteAnalyticsSettings) {
  if (!settings.enabled) return;
  applyConsent(true);
  if (settings.gtmEnabled && settings.gtmId) loadGtm(settings.gtmId);
  if (settings.ga4Enabled && settings.ga4MeasurementId) loadGa4(settings.ga4MeasurementId, settings.debugMode);
}

export function SiteAnalyticsLoader() {
  useEffect(() => {
    let active = true;
    let settings: SiteAnalyticsSettings | null = null;

    function onConsentChanged(event: Event) {
      if (!settings) return;
      const detail = (event as CustomEvent<ConsentChoice>).detail;
      const granted = Boolean(detail?.analytics);
      applyConsent(granted);
      if (granted) activate(settings);
    }

    window.addEventListener("ilkoku:consent-changed", onConsentChanged as EventListener);

    fetch("/api/site-analytics", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { settings?: SiteAnalyticsSettings } | null) => {
        if (!active || !payload?.settings) return;
        settings = payload.settings;
        if (!settings.enabled) return;

        ensureDataLayer();
        if (settings.consentRequired) {
          const granted = readAnalyticsConsent();
          applyConsent(granted);
          if (granted) activate(settings);
          return;
        }

        activate(settings);
      })
      .catch(() => undefined);

    return () => {
      active = false;
      window.removeEventListener("ilkoku:consent-changed", onConsentChanged as EventListener);
    };
  }, []);

  return null;
}
