import type { Metadata } from "next";

import { cmsLocaleNamespace, normalizeCmsLocale } from "@/lib/cms-locales";
import { historyDefaults, mergeHistoryContent, safeHistoryImageSrc } from "@/lib/history-content";
import { prisma } from "@/lib/prisma";

import "./preview.css";

export const metadata: Metadata = {
  title: "History Galeri Önizleme | İlkOku",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

type Row = { valueJson: string };

type EraCard = {
  period: string;
  title: string;
  lead: string;
  body: string;
  image: string;
  alt: string;
};

async function loadHistory(locale: "tr" | "en") {
  try {
    const namespace = cmsLocaleNamespace("homepage", locale);
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT valueJson FROM SiteContent
      WHERE namespace = ${namespace} AND contentKey = 'history' AND status = 'published'
      LIMIT 1
    `;

    if (!rows[0]?.valueJson) return { ...historyDefaults };
    return mergeHistoryContent(JSON.parse(rows[0].valueJson) as Record<string, unknown>);
  } catch {
    return { ...historyDefaults };
  }
}

function titleWithAccent(title: string) {
  const candidates = ["“ilk”", '"ilk"', "ilk"];
  const token = candidates.find((candidate) => title.includes(candidate));
  if (!token) return title;
  const [before, after] = title.split(token);
  return <>{before}<em>{token}</em>{after}</>;
}

export default async function HistoryGalleryPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ dil?: string }>;
}) {
  const params = await searchParams;
  const locale = normalizeCmsLocale(params.dil);
  const v = await loadHistory(locale);

  const eras: EraCard[] = [
    {
      period: v.card1Period,
      title: v.card1Title,
      lead: v.card1Lead,
      body: v.card1Body,
      image: safeHistoryImageSrc(v.card1Image, historyDefaults.card1Image),
      alt: v.card1Alt,
    },
    {
      period: v.card2Period,
      title: v.card2Title,
      lead: v.card2Lead,
      body: v.card2Body,
      image: safeHistoryImageSrc(v.card2Image, historyDefaults.card2Image),
      alt: v.card2Alt,
    },
    {
      period: v.card3Period,
      title: v.card3Title,
      lead: v.card3Lead,
      body: v.card3Body,
      image: safeHistoryImageSrc(v.card3Image, historyDefaults.card3Image),
      alt: v.card3Alt,
    },
    {
      period: v.card4Period,
      title: v.card4Title,
      lead: v.card4Lead,
      body: v.card4Body,
      image: safeHistoryImageSrc(v.card4Image, historyDefaults.card4Image),
      alt: v.card4Alt,
    },
  ];

  const steps = [
    {
      part: 8,
      index: "01",
      image: safeHistoryImageSrc(v.step1Image, historyDefaults.step1Image),
      alt: v.step1Alt,
      text: v.step1Text,
    },
    {
      part: 9,
      index: "02",
      image: safeHistoryImageSrc(v.step2Image, historyDefaults.step2Image),
      alt: v.step2Alt,
      text: v.step2Text,
    },
    {
      part: 10,
      index: "03",
      image: safeHistoryImageSrc(v.step3Image, historyDefaults.step3Image),
      alt: v.step3Alt,
      text: v.step3Text,
    },
    {
      part: 11,
      index: "04",
      image: safeHistoryImageSrc(v.step4Image, historyDefaults.step4Image),
      alt: v.step4Alt,
      text: v.step4Text,
    },
  ];

  return (
    <main className="history-gallery-preview" style={{ backgroundColor: v.backgroundColor }}>
      <section className="history-gallery" data-history-part="1" aria-label="History galeri canlı önizleme">
        <header className="history-gallery__intro" data-history-part="2">
          <div className="history-gallery__intro-copy">
            <p className="history-gallery__eyebrow">{v.introEyebrow}</p>
            <h1>{titleWithAccent(v.introTitle)}</h1>
          </div>
          <div className="history-gallery__intro-note">
            <span aria-hidden="true">01 — 04</span>
            <p>{v.introDescription1}</p>
            <p>{v.introDescription2}</p>
          </div>
        </header>

        <div className="history-gallery__rail" data-history-part="3">
          {eras.map((era, index) => (
            <article className="history-gallery__era" key={`${era.period}-${era.title}`}>
              <figure className="history-gallery__era-media">
                <img src={era.image} alt={era.alt} />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </figure>
              <div className="history-gallery__era-copy">
                <p className="history-gallery__period">{era.period}</p>
                <h2>{era.title}</h2>
                <div className="history-gallery__divider" aria-hidden="true"><span /></div>
                <p className="history-gallery__lead">{era.lead}</p>
                <p className="history-gallery__body">{era.body}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="history-gallery__bridge">
          <figure className="history-gallery__decor" data-history-part="4">
            <img
              src={safeHistoryImageSrc(v.leftDecorImage, historyDefaults.leftDecorImage)}
              alt={v.leftDecorAlt}
            />
            <figcaption>Geçmişte kalan her iz, yeni bir cümlenin zeminidir.</figcaption>
          </figure>

          {v.cardVisible !== "0" ? (
            <section className="history-gallery__future" data-history-part="5" aria-label="2026 şimdi sıra sende">
              <div className="history-gallery__future-head">
                <div>
                  <p data-history-part="6">{v.cardEyebrow}</p>
                  <h2 data-history-part="7">
                    <span>{v.cardTitleLine1}</span>
                    <span>{v.cardTitleLine2}</span>
                  </h2>
                </div>
                {v.sealVisible !== "0" ? (
                  <figure className="history-gallery__seal" data-history-part="15">
                    <img
                      src={safeHistoryImageSrc(v.sealImage, historyDefaults.sealImage)}
                      alt={v.sealAlt}
                    />
                  </figure>
                ) : null}
              </div>

              <div className="history-gallery__steps">
                {steps.map((step) => (
                  <article className="history-gallery__step" data-history-part={step.part} key={step.part}>
                    <span className="history-gallery__step-index">{step.index}</span>
                    <figure><img src={step.image} alt={step.alt} /></figure>
                    <p>{step.text}</p>
                  </article>
                ))}
              </div>

              <footer className="history-gallery__future-footer">
                <div>
                  <p className="history-gallery__question" data-history-part="12">{v.closingQuestion}</p>
                  <p className="history-gallery__tagline" data-history-part="13">{v.bottomSlogan}</p>
                </div>
                <strong data-history-part="14">{v.brandText}</strong>
              </footer>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
