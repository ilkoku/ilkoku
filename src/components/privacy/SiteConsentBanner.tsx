"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SiteConsentSettings } from "@/lib/site-consent-settings";
import styles from "./SiteConsentBanner.module.css";

type ConsentChoice = {
  version: 1;
  analytics: boolean;
  marketing: boolean;
  savedAt: number;
  expiresAt: number;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const STORAGE_KEY = "ilkoku:consent:v1";

function readChoice(): ConsentChoice | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentChoice>;
    if (
      parsed.version !== 1 ||
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.marketing !== "boolean" ||
      typeof parsed.savedAt !== "number" ||
      typeof parsed.expiresAt !== "number"
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as ConsentChoice;
  } catch {
    return null;
  }
}

function updateConsentMode(settings: SiteConsentSettings, choice: ConsentChoice) {
  if (!settings.consentModeEnabled || typeof window.gtag !== "function") return;

  window.gtag("consent", "update", {
    analytics_storage: settings.analyticsEnabled && choice.analytics ? "granted" : "denied",
    ad_storage: settings.marketingEnabled && choice.marketing ? "granted" : "denied",
    ad_user_data: settings.marketingEnabled && choice.marketing ? "granted" : "denied",
    ad_personalization: settings.marketingEnabled && choice.marketing ? "granted" : "denied",
  });
}

function deniedChoice(retentionDays: number): ConsentChoice {
  const now = Date.now();
  return {
    version: 1,
    analytics: false,
    marketing: false,
    savedAt: now,
    expiresAt: now + retentionDays * 24 * 60 * 60 * 1000,
  };
}

function dispatchChoice(choice: ConsentChoice) {
  window.dispatchEvent(new CustomEvent("ilkoku:consent-changed", { detail: choice }));
}

export function SiteConsentBanner() {
  const [settings, setSettings] = useState<SiteConsentSettings | null>(null);
  const [visible, setVisible] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/site-consent", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { settings?: SiteConsentSettings } | null) => {
        if (!payload?.settings?.bannerEnabled) return;
        const nextSettings = payload.settings;
        setSettings(nextSettings);

        const existing = readChoice();
        if (existing) {
          updateConsentMode(nextSettings, existing);
          dispatchChoice(existing);
          return;
        }

        updateConsentMode(nextSettings, deniedChoice(nextSettings.retentionDays));
        setVisible(true);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  if (!settings || !visible) return null;

  function saveChoice(nextAnalytics: boolean, nextMarketing: boolean) {
    const activeSettings = settings;
    if (!activeSettings) return;

    const now = Date.now();
    const choice: ConsentChoice = {
      version: 1,
      analytics: activeSettings.analyticsEnabled && nextAnalytics,
      marketing: activeSettings.marketingEnabled && nextMarketing,
      savedAt: now,
      expiresAt: now + activeSettings.retentionDays * 24 * 60 * 60 * 1000,
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
    } catch {
      // Consent still applies for the current page even if storage is unavailable.
    }

    updateConsentMode(activeSettings, choice);
    dispatchChoice(choice);
    setVisible(false);
  }

  return (
    <aside className={styles.shell} aria-label="Çerez tercihleri">
      <div className={styles.card}>
        <div className={styles.copy}>
          <strong>Gizlilik ve çerez tercihleri</strong>
          <p>
            İlkOku, sitenin çalışması için gerekli teknik saklamayı kullanır. Analitik ve pazarlama kategorileri yalnız izin verirseniz etkinleşir. {" "}
            <Link href={settings.policyPath}>Gizlilik ve çerez bilgileri</Link>
          </p>
        </div>

        {detailsOpen ? (
          <div className={styles.categories}>
            <div className={styles.categoryRow}>
              <span><strong>Zorunlu</strong><small>Oturum, güvenlik ve temel site işlevleri.</small></span>
              <span className={styles.required}>Her zaman açık</span>
            </div>
            {settings.analyticsEnabled ? (
              <label className={styles.categoryRow}>
                <span><strong>Analitik</strong><small>Site kullanımını ölçmeye yardımcı olur.</small></span>
                <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
              </label>
            ) : null}
            {settings.marketingEnabled ? (
              <label className={styles.categoryRow}>
                <span><strong>Pazarlama</strong><small>Reklam ve kişiselleştirme sinyallerini yönetir.</small></span>
                <input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} />
              </label>
            ) : null}
          </div>
        ) : null}

        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={() => setDetailsOpen((value) => !value)}>
            {detailsOpen ? "Ayarları kapat" : "Ayarlar"}
          </button>
          {settings.rejectAllEnabled ? (
            <button type="button" className={styles.secondary} onClick={() => saveChoice(false, false)}>Tümünü reddet</button>
          ) : null}
          {detailsOpen ? (
            <button type="button" className={styles.primary} onClick={() => saveChoice(analytics, marketing)}>Seçimlerimi kaydet</button>
          ) : null}
          <button type="button" className={styles.primary} onClick={() => saveChoice(true, true)}>Tümünü kabul et</button>
        </div>
      </div>
    </aside>
  );
}
