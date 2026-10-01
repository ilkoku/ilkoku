import type { HomepageAffiliateDisplay } from "@/lib/affiliate-placement";

import "./affiliate-banner.css";

type Props = {
  placement: HomepageAffiliateDisplay;
};

const LOCAL_MAGZTER_CREATIVE = "/media/reader-offer-01.svg";

export default function MagzterAffiliateBanner({ placement }: Props) {
  return (
    <section className="nx-partner-offer" aria-labelledby="nx-partner-offer-title">
      <div className="nx-shell">
        <div className="nx-partner-offer__panel">
          <div className="nx-partner-offer__copy">
            <p className="nx-partner-offer__eyebrow">Okurlar için</p>
            <h2 id="nx-partner-offer-title">{placement.headline}</h2>
            <p className="nx-partner-offer__description">{placement.text.text}</p>
            <div className="nx-partner-offer__actions">
              <a
                className="nx-partner-offer__cta"
                href={placement.text.href}
                target="_blank"
                rel="sponsored nofollow noopener noreferrer"
              >
                Ücretsiz denemeyi incele
              </a>
              <span className="nx-partner-offer__disclosure">İş ortağı bağlantısı</span>
            </div>
          </div>

          <div className="nx-partner-offer__creative" aria-label="Magzter GOLD kampanyası">
            {/* Same-origin SVG is rendered directly so browser/privacy filters do not depend on Next image optimization. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOCAL_MAGZTER_CREATIVE}
              width="728"
              height="90"
              alt="Magzter GOLD dergi ve gazete okuma kampanyası"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
