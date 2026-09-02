import type { Metadata } from "next";
import Image from "next/image";

import "./preview.css";

export const metadata: Metadata = {
  title: "2026 Kart Önizleme | İlkOku",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

const steps = [
  {
    part: 8,
    key: "reader",
    image: "/landing/history/preview/reader.svg",
    alt: "Açık kitap ve büyüteç illüstrasyonu",
    lines: ["Bir okur onu ilk kez", "keşfedebilir."],
  },
  {
    part: 9,
    key: "editor",
    image: "/landing/history/preview/editor.svg",
    alt: "Mürekkep, tüy kalem ve açık kitap illüstrasyonu",
    lines: ["Bir editör onu", "geliştirebilir."],
  },
  {
    part: 10,
    key: "publisher",
    image: "/landing/history/preview/publisher.svg",
    alt: "Mühürlü mektup illüstrasyonu",
    lines: ["Bir yayınevi ona", "inanabilir."],
  },
  {
    part: 11,
    key: "journey",
    image: "/landing/history/preview/journey.svg",
    alt: "Uzağa uzanan yol ve dağ illüstrasyonu",
    lines: ["Ve bir gün o hikâye", "başladığından çok daha", "uzağa gidebilir."],
  },
] as const;

export default function History2026PreviewPage() {
  return (
    <main className="history-2026-preview">
      <section
        className="history-2026-card"
        data-history-puzzle="5-15"
        data-part="5"
        aria-label="2026 şimdi sıra sende kart önizlemesi"
      >
        <div className="history-2026-card__frame" aria-hidden="true">
          <span className="history-2026-card__corner history-2026-card__corner--tl" />
          <span className="history-2026-card__corner history-2026-card__corner--tr" />
          <span className="history-2026-card__corner history-2026-card__corner--bl" />
          <span className="history-2026-card__corner history-2026-card__corner--br" />
        </div>

        <header className="history-2026-card__headline">
          <p className="history-2026-card__eyebrow" data-part="6">2026 – ŞİMDİ SIRA SENDE.</p>
          <h1 data-part="7">
            Bugünün ilk cümlesi,
            <br />
            yarının kitabı olabilir.
          </h1>
        </header>

        <div className="history-2026-card__seal" data-part="15" aria-label="İlkOku mührü">
          <Image
            src="/landing/history/preview/seal.svg"
            alt="İlkOku mor mühür"
            width={260}
            height={230}
            priority
            unoptimized
          />
        </div>

        <div className="history-2026-card__steps">
          {steps.map((step) => (
            <article
              className={`history-2026-card__step history-2026-card__step--${step.key}`}
              data-part={step.part}
              key={step.key}
            >
              <div className="history-2026-card__art">
                <Image src={step.image} alt={step.alt} width={310} height={183} priority unoptimized />
              </div>
              <p>
                {step.lines.map((line, index) => (
                  <span key={line}>
                    {line}
                    {index < step.lines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </p>
            </article>
          ))}
        </div>

        <div className="history-2026-card__rule" aria-hidden="true">
          <span className="history-2026-card__rule-line" />
          <span className="history-2026-card__rule-diamond">◆</span>
        </div>

        <footer className="history-2026-card__closing">
          <p className="history-2026-card__question" data-part="12">Seninki neden sıradaki hikâye olmasın?</p>
          <p className="history-2026-card__tagline" data-part="13">Her şey bir “ilk” ile başlar.</p>
          <strong className="history-2026-card__brand" data-part="14">İlkOku.</strong>
          <span className="history-2026-card__flourish" aria-hidden="true">⌁ ───────── ◇ ───────── ⌁</span>
        </footer>
      </section>
    </main>
  );
}
