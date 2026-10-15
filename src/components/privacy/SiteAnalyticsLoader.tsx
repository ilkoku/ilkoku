"use client";

import { useEffect } from "react";
import { ILKOKU_GA4_ID, type SiteAnalyticsSettings } from "@/lib/site-analytics-settings";

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
const GA4_DYNAMIC_SCRIPT_ID = "ilkoku-ga4-script";
const GA4_HEAD_SCRIPT_ID = "ilkoku-ga4-head-script";
const MANUAL_GTM_PATH = "/ilkgtm/";
const MANUAL_GTM_HEALTH_URL = "/ilkgtm/healthy";
let pendingGtmLoad: Promise<void> | null = null;

async function gtmScriptSource(id: string) {
  // This probe runs ONLY after the visitor has granted consent. Until the
  // manual Worker route is live/healthy, retain the known-working Google URL.
  const fallback = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 1800);
  try {
    const response = await fetch(MANUAL_GTM_HEALTH_URL, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "text/plain" },
    });
    if (response.ok && (await response.text()).trim() === "ok") {
      return `${MANUAL_GTM_PATH}?id=${encodeURIComponent(id)}`;
    }
  } catch {
    // Safe fallback when Worker has not been installed or is unhealthy.
  } finally {
    window.clearTimeout(timeout);
  }
  return fallback;
}


function setRuntimeState(key: "consent" | "gtm" | "ga4", value: string) {
  document.documentElement.dataset[`ilkokuAnalytics${key[0].toUpperCase()}${key.slice(1)}`] = value;
}

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

function setDefaultDeniedConsent() {
  ensureDataLayer();
  setRuntimeState("consent", "denied");
  window.gtag?.("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });
}

function updateAnalyticsConsent(granted: boolean) {
  ensureDataLayer();
  setRuntimeState("consent", granted ? "granted" : "denied");
  window.gtag?.("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
  });
}

function applyInitialConsent(settings: SiteAnalyticsSettings) {
  if (settings.consentRequired) {
    const headConfigPresent = Boolean(document.getElementById("ilkoku-ga4-head-config"));
    if (!headConfigPresent) setDefaultDeniedConsent();
    else setRuntimeState("consent", "denied");
    const granted = readAnalyticsConsent();
    updateAnalyticsConsent(granted);
    return granted;
  }

  setRuntimeState("consent", "not-required");
  updateAnalyticsConsent(true);
  return true;
}

function loadGtm(id: string, consentRequired: boolean) {
  if (!id) return;
  const existing = document.getElementById(GTM_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    setRuntimeState("gtm", existing.dataset.analyticsState || "present");
    return;
  }
  if (pendingGtmLoad) return;

  setRuntimeState("gtm", "loading");
  pendingGtmLoad = (async () => {
    const scriptSource = await gtmScriptSource(id);
    // Consent can be revoked while the health probe is in flight.
    if (consentRequired && !readAnalyticsConsent()) {
      setRuntimeState("gtm", "consent-pending");
      return;
    }
    if (document.getElementById(GTM_SCRIPT_ID)) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const script = document.createElement("script");
    script.id = GTM_SCRIPT_ID;
    script.async = true;
    script.dataset.analyticsState = "loading";
    script.src = scriptSource;
    script.onload = () => {
      script.dataset.analyticsState = "loaded";
      setRuntimeState("gtm", "loaded");
    };
    script.onerror = () => {
      script.dataset.analyticsState = "error";
      setRuntimeState("gtm", "error");
    };
    document.head.appendChild(script);
  })().catch(() => {
    setRuntimeState("gtm", "error");
  }).finally(() => {
    pendingGtmLoad = null;
  });
}

function reuseHeadGa4(id: string, debugMode: boolean) {
  if (id !== ILKOKU_GA4_ID) return false;
  const headScript = document.getElementById(GA4_HEAD_SCRIPT_ID) as HTMLScriptElement | null;
  if (!headScript || typeof window.gtag !== "function") return false;

  if (debugMode) {
    window.gtag("config", id, { debug_mode: true, send_page_view: false });
  }
  setRuntimeState("ga4", "loaded");
  return true;
}

function loadGa4(id: string, debugMode: boolean) {
  if (!id) return;
  if (reuseHeadGa4(id, debugMode)) return;

  const existing = document.getElementById(GA4_DYNAMIC_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    setRuntimeState("ga4", existing.dataset.analyticsState || "present");
    return;
  }

  ensureDataLayer();
  const script = document.createElement("script");
  script.id = GA4_DYNAMIC_SCRIPT_ID;
  script.async = true;
  script.dataset.analyticsState = "loading";
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  script.onload = () => {
    script.dataset.analyticsState = "loaded";
    setRuntimeState("ga4", "loaded");
    ensureDataLayer();
    window.gtag?.("js", new Date());
    window.gtag?.("config", id, debugMode ? { debug_mode: true } : {});
  };
  script.onerror = () => {
    script.dataset.analyticsState = "error";
    setRuntimeState("ga4", "error");
  };
  setRuntimeState("ga4", "loading");
  document.head.appendChild(script);
}

function loadProviders(settings: SiteAnalyticsSettings) {
  if (!settings.enabled) return;

  if (settings.gtmEnabled && settings.gtmId) loadGtm(settings.gtmId, settings.consentRequired);
  else setRuntimeState("gtm", "disabled");

  if (settings.ga4Enabled && settings.ga4MeasurementId) loadGa4(settings.ga4MeasurementId, settings.debugMode);
  else setRuntimeState("ga4", "disabled");
}

export function SiteAnalyticsLoader() {
  useEffect(() => {
    let active = true;
    let settings: SiteAnalyticsSettings | null = null;

    setRuntimeState("consent", "checking");
    setRuntimeState("gtm", "checking");
    setRuntimeState("ga4", "checking");

    function onConsentChanged(event: Event) {
      if (!settings) return;
      const detail = (event as CustomEvent<ConsentChoice>).detail;
      const granted = Boolean(detail?.analytics);
      updateAnalyticsConsent(granted);
      if (granted || !settings.consentRequired) {
        loadProviders(settings);
      } else {
        setRuntimeState("gtm", "consent-pending");
        setRuntimeState("ga4", "consent-pending");
      }
    }

    window.addEventListener("ilkoku:consent-changed", onConsentChanged as EventListener);

    fetch("/api/site-analytics", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { settings?: SiteAnalyticsSettings } | null) => {
        if (!active || !payload?.settings) return;
        settings = payload.settings;

        if (!settings.enabled) {
          setRuntimeState("consent", "disabled");
          setRuntimeState("gtm", "disabled");
          setRuntimeState("ga4", "disabled");
          return;
        }

        ensureDataLayer();
        const granted = applyInitialConsent(settings);
        if (granted) {
          loadProviders(settings);
        } else {
          setRuntimeState("gtm", "consent-pending");
          setRuntimeState("ga4", "consent-pending");
        }
      })
      .catch(() => {
        setRuntimeState("consent", "config-error");
        setRuntimeState("gtm", "config-error");
        setRuntimeState("ga4", "config-error");
      });

    return () => {
      active = false;
      window.removeEventListener("ilkoku:consent-changed", onConsentChanged as EventListener);
    };
  }, []);

  return null;
}
