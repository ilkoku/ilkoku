import type { CSSProperties } from "react";
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

type Step = {
  part: number;
  index: string;
  image: string;
  alt: string;
  text: string;
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

function mediaStyle(src: string, fallback: string): CSSProperties {
  const safe = safeHistoryImageSrc(src, fallback).replaceAll('"', "%22");
  return {
    backgroundImage: `linear-gradient(180deg, rgba(40, 25, 67, 0.02), rgba(40, 25, 67, 0.18)), url("${safe}")`,
  };
}

function periodMark(period: string) {
  return period.split(" – ")[0] || period;
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
      image: v.card1Image,
      alt: v.card1Alt,
    },
    {
      period: v.card2Period,
      title: v.card2Title,
      lead: v.card2Lead,
      body: v.card2Body,
      image: v.card2Image,
      alt: v.card2Alt,
    },
    {
      period: v.card3Period,
      title: v.card3Title,
      lead: v.card3Lead,
      body: v.card3Body,
      image: v.card3Image,
      alt: v.card3Alt,
    },
    {
      period: v.card4Period,
      title: v.card4Title,
      lead: v.card4Lead,
      body: v.card4Body,
      image: v.card4Image,
      alt: v.card4Alt,
    },
  ];

  const steps: Step[] = [
    {
      part: 8,
      index: "01",
      image: v.step1Image,
      alt: v.step1Alt,
      text: v.step1Text,
    },
    {
      part: 9,
      index: "02",
      image: v.step2Image,
      alt: v.step2Alt,
      text: v.step2Text,
    },
    {
      part: 10,
      index: "03",
      image: v.step3Image,
      alt: v.step3Alt,
      text: v.step3Text,
    },
    {
      part: 11,
      index: "04",
      image: v.step4Image,
      alt: v.step4Alt,
      text: v.step4Text,
    },
  ];

  const futureStyle = v.cardBackgroundImage
    ? mediaStyle(v.cardBackgroundImage, "")
    : undefined;

  return (
    <main className="history-gallery-preview" style={{ backgroundColor: v.backgroundColor }}>
      <section className="history-gallery" data-history-part="1" aria-label="History galeri canlı önizleme">
        <header className="history-gallery__intro" data-history-part="2">
          <p className="history-gallery__eyebrow">{v.introEyebrow}</p>
          <h1>{titleWithAccent(v.introTitle)}</h1>
          <div className="history-gallery__intro-copy">
            <p>{v.introDescription1}</p>
            <p>{v.introDescription2}</p>
          </div>
        </header>

        <div className="history-gallery__rail" data-history-part="3">
          {eras.map((era, index) => {
            const fallback = historyDefaults[`card${index + 1}Image`];
            return (
              <article className="history-gallery__era" key={`${era.period}-${era.title}`}>
                <figure
                  className="history-gallery__era-media"
                  style={mediaStyle(era.image, fallback)}
                  role="img"
                  aria-label={era.alt}
                >
                  <span className="history-gallery__era-mark" aria-hidden="true">{periodMark(era.period)}</span>
                  <span className="history-gallery__era-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                </figure>
                <div className="history-gallery__era-copy">
                  <p className="history-gallery__period">{era.period}</p>
                  <h2>{era.title}</h2>
                  <p className="history-gallery__lead">{era.lead}</p>
                  <p className="history-gallery__body">{era.body}</p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="history-gallery__bridge">
          <figure
            className="history-gallery__decor"
            data-history-part="4"
            style={mediaStyle(v.leftDecorImage, historyDefaults.leftDecorImage)}
            role="img"
            aria-label={v.leftDecorAlt}
          >
            <span className="history-gallery__decor-line history-gallery__decor-line--one" aria-hidden="true" />
            <span className="history-gallery__decor-line history-gallery__decor-line--two" aria-hidden="true" />
          </figure>

          {v.cardVisible !== "0" ? (
            <section
              className="history-gallery__future"
              data-history-part="5"
              style={futureStyle}
              aria-label="2026 şimdi sıra sende"
            >
              <div className="history-gallery__future-head">
                <div>
                  <p className="history-gallery__future-eyebrow" data-history-part="6">{v.cardEyebrow}</p>
                  <h2 data-history-part="7">
                    <span>{v.cardTitleLine1}</span>
                    <span>{v.cardTitleLine2}</span>
                  </h2>
                </div>
                {v.sealVisible !== "0" ? (
                  <figure
                    className="history-gallery__seal"
                    data-history-part="15"
                    style={mediaStyle(v.sealImage, historyDefaults.sealImage)}
                    role="img"
                    aria-label={v.sealAlt}
                  />
                ) : null}
              </div>

              <div className="history-gallery__steps">
                {steps.map((step, index) => {
                  const fallback = historyDefaults[`step${index + 1}Image`];
                  return (
                    <article className="history-gallery__step" data-history-part={step.part} key={step.part}>
                      <span className="history-gallery__step-index" aria-hidden="true">{step.index}</span>
                      <figure
                        style={mediaStyle(step.image, fallback)}
                        role="img"
                        aria-label={step.alt}
                      >
                        <span aria-hidden="true">{step.index}</span>
                      </figure>
                      <p>{step.text}</p>
                    </article>
                  );
                })}
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
