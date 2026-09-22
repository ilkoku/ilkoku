"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";

import type { AdvertisingSlotConfig } from "@/lib/cms-advertising";

import styles from "./HomepageAffiliateBanner.module.css";

type ConsentChoice = {
  version: 1;
  marketing: boolean;
  expiresAt: number;
};

type ConsentSettings = {
  bannerEnabled: boolean;
  marketingEnabled: boolean;
};

const STORAGE_KEY = "ilkoku:consent:v1";

function hasMarketingConsent() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<ConsentChoice>;
    return parsed.version === 1
      && parsed.marketing === true
      && typeof parsed.expiresAt === "number"
      && parsed.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function HomepageAffiliateBannerClient({ config }: { config: AdvertisingSlotConfig }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    let marketingFeatureEnabled = false;

    function refreshFromConsent() {
      if (!active || !marketingFeatureEnabled) return;
      setAllowed(hasMarketingConsent());
    }

    function onConsentChanged(event: Event) {
      const detail = (event as CustomEvent<Partial<ConsentChoice>>).detail;
      if (!active || !marketingFeatureEnabled) return;
      setAllowed(
        detail?.version === 1
        && detail.marketing === true
        && typeof detail.expiresAt === "number"
        && detail.expiresAt > Date.now(),
      );
    }

    window.addEventListener("ilkoku:consent-changed", onConsentChanged as EventListener);

    fetch("/api/site-consent", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { settings?: ConsentSettings } | null) => {
        if (!active || !payload?.settings) return;
        marketingFeatureEnabled = payload.settings.bannerEnabled && payload.settings.marketingEnabled;
        setAllowed(marketingFeatureEnabled && hasMarketingConsent());
      })
      .catch(() => {
        if (active) setAllowed(false);
      });

    return () => {
      active = false;
      window.removeEventListener("ilkoku:consent-changed", onConsentChanged as EventListener);
    };
  }, []);

  if (!allowed) return null;

  return (
    <section className={styles.section} aria-label="İş ortağı reklamı">
      <div className={styles.shell}>
        <div className={styles.copy}>
          <p>{config.heading}</p>
          <span>{config.description}</span>
        </div>

        <a
          className={[styles.creative, styles.desktop].join(" ")}
          href={config.desktop.href}
          target="_top"
          rel="sponsored noopener noreferrer"
          aria-label={config.advertiser + " iş ortağı bağlantısı"}
        >
          <img
            src={config.desktop.imageSrc}
            width={config.desktop.width}
            height={config.desktop.height}
            alt={config.advertiser + " reklamı"}
            loading="lazy"
          />
        </a>

        <a
          className={[styles.creative, styles.mobile].join(" ")}
          href={config.mobile.href}
          target="_top"
          rel="sponsored noopener noreferrer"
          aria-label={config.advertiser + " iş ortağı bağlantısı"}
        >
          <img
            src={config.mobile.imageSrc}
            width={config.mobile.width}
            height={config.mobile.height}
            alt={config.advertiser + " reklamı"}
            loading="lazy"
          />
        </a>

        <small>{config.disclosure}</small>
      </div>
    </section>
  );
}
