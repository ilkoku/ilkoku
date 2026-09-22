/* eslint-disable @next/next/no-img-element */

import { getHomepageAfterRolesAdvertising } from "@/lib/cms-advertising";

import styles from "./HomepageAffiliateBanner.module.css";

export async function HomepageAffiliateBanner() {
  const config = await getHomepageAfterRolesAdvertising();
  if (!config?.active) return null;

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
          target="_blank"
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
          target="_blank"
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
