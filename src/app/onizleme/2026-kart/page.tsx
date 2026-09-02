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
    key: "reader",
    image: "/landing/history/preview/reader.svg",
    alt: "Açık kitap ve büyüteç illüstrasyonu",
    lines: ["Bir okur onu ilk kez", "keşfedebilir."],
  },
  {
    key: "editor",
    image: "/landing/history/preview/editor.svg",
    alt: "Mürekkep, tüy kalem ve açık kitap illüstrasyonu",
    lines: ["Bir editör onu", "geliştirebilir."],
  },
  {
    key: "publisher",
    image: "/landing/history/preview/publisher.svg",
    alt: "Mühürlü mektup illüstrasyonu",
    lines: ["Bir yayınevi ona", "inanabilir."],
  },
  {
    key: "journey",
    image: "/landing/history/preview/journey.svg",
    alt: "Uzağa uzanan yol ve dağ illüstrasyonu",
    lines: ["Ve bir gün o hikâye", "başladığından çok daha", "uzağa gidebilir."],
  },
] as const;

export default function History2026PreviewPage() {
  return (
    <main className="history-2026-preview">
      <section className="history-2026-card" aria-label="2026 şimdi sıra sende kart önizlemesi">
        <div className="history-2026-card__frame" aria-hidden="true">
          <span className="history-2026-card__corner history-2026-card__corner--tl" />
          <span className="history-2026-card__corner history-2026-card__corner--tr" />
          <span className="history-2026-card__corner history-2026-card__corner--bl" />
          <span className="history-2026-card__corner history-2026-card__corner--br" />
        </div>

        <header className="history-2026-card__headline">
          <p className="history-2026-card__eyebrow">2026 – ŞİMDİ SIRA SENDE.</p>
          <h1>
            Bugünün ilk cümlesi,
            <br />
            yarının kitabı olabilir.
          </h1>
        </header>

        <div className="history-2026-card__seal" aria-label="İlkOku mührü">
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
            <article className={`history-2026-card__step history-2026-card__step--${step.key}`} key={step.key}>
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
          <p className="history-2026-card__question">Seninki neden sıradaki hikâye olmasın?</p>
          <p className="history-2026-card__tagline">Her şey bir “ilk” ile başlar.</p>
          <strong className="history-2026-card__brand">İlkOku.</strong>
          <span className="history-2026-card__flourish" aria-hidden="true">⌁ ───────── ◇ ───────── ⌁</span>
        </footer>
      </section>
    </main>
  );
}
