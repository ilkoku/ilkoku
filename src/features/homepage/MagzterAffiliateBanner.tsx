"use client";

import { useEffect, useState } from "react";
import type { HomepageAffiliateDisplay } from "@/lib/affiliate-placement";

import "./affiliate-banner.css";

type Props = {
  placement: HomepageAffiliateDisplay;
};

export default function MagzterAffiliateBanner({ placement }: Props) {
  const [mobile, setMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => setMobile(media.matches);

    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  const creative = mobile === null ? null : mobile ? placement.mobile : placement.desktop;

  return (
    <section className="nx-affiliate" aria-labelledby="nx-affiliate-title">
      <div className="nx-shell">
        <div className="nx-affiliate__panel">
          <div className="nx-affiliate__copy">
            <p className="nx-affiliate__eyebrow">Okurlar için</p>
            <h2 id="nx-affiliate-title">{placement.headline}</h2>
            <a
              className="nx-affiliate__copy-link"
              href={placement.text.href}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
            >
              {placement.text.text}
            </a>
            {placement.text.trackingPixelSrc ? (
              <>
                {/* Affiliate metin kreatifine ait 1×1 takip pikseli. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="nx-affiliate__tracking-pixel"
                  src={placement.text.trackingPixelSrc}
                  width="1"
                  height="1"
                  alt=""
                  aria-hidden="true"
                />
              </>
            ) : null}
            <span className="nx-affiliate__disclosure">İş ortağı bağlantısı</span>
          </div>

          <div
            className="nx-affiliate__creative"
            aria-busy={creative === null ? "true" : undefined}
          >
            {creative ? (
              <a
                href={creative.href}
                target="_blank"
                rel="sponsored nofollow noopener noreferrer"
                aria-label="İş ortağı kampanyasını görüntüle"
              >
                {/* Yalnız aktif viewport kreatifi render edilir. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={creative.src}
                  width={creative.width}
                  height={creative.height}
                  alt={creative.alt}
                />
              </a>
            ) : (
              <span className="nx-affiliate__placeholder" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
