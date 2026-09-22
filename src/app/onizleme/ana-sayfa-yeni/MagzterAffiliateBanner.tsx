"use client";

import { useEffect, useState } from "react";

import "./affiliate-banner.css";

const DESKTOP_CREATIVE = {
  href: "https://www.dpbolvw.net/click-101886825-13992555",
  src: "https://www.ftjcfx.com/image-101886825-13992555",
  width: 728,
  height: 90,
  alt: "Magzter dergi ve gazete okuma kampanyası",
};

const MOBILE_CREATIVE = {
  href: "https://www.jdoqocy.com/click-101886825-13992112",
  src: "https://www.awltovhc.com/image-101886825-13992112",
  width: 300,
  height: 250,
  alt: "Magzter dergi ve gazete okuma kampanyası",
};

export default function MagzterAffiliateBanner() {
  const [mobile, setMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => setMobile(media.matches);

    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  const creative = mobile === null ? null : mobile ? MOBILE_CREATIVE : DESKTOP_CREATIVE;

  return (
    <section className="nx-affiliate" aria-labelledby="nx-affiliate-title">
      <div className="nx-shell">
        <div className="nx-affiliate__panel">
          <header className="nx-affiliate__heading">
            <div>
              <p className="nx-affiliate__eyebrow">Okurlar için</p>
              <h2 id="nx-affiliate-title">Daha fazlasını keşfet</h2>
              <p>Dergi, gazete ve premium içerikleri Magzter üzerinden keşfedin.</p>
            </div>
            <span className="nx-affiliate__disclosure">İş ortağı bağlantısı</span>
          </header>

          <div
            className="nx-affiliate__creative"
            aria-busy={creative === null ? "true" : undefined}
          >
            {creative ? (
              <a
                href={creative.href}
                target="_top"
                rel="sponsored nofollow"
                aria-label="Magzter kampanyasını görüntüle"
              >
                {/* CJ kreatifleri kendi reklam sunucusundan teslim edilir; yalnız aktif viewport kreatifi render edilir. */}
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
