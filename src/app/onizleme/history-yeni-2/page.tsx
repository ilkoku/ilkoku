import type { CSSProperties, Metadata } from "next";

import { cmsLocaleNamespace, normalizeCmsLocale } from "@/lib/cms-locales";
import { historyDefaults, mergeHistoryContent, safeHistoryImageSrc } from "@/lib/history-content";
import { prisma } from "@/lib/prisma";

import "./preview.css";

export const metadata: Metadata = {
  title: "History Yeni 2 Önizleme | İlkOku",
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
  fallback: string;
};

type JourneyStep = {
  part: number;
  label: string;
  image: string;
  fallback: string;
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

function layeredBackground(primary: string, fallback: string): CSSProperties {
  const preferred = safeHistoryImageSrc(primary, fallback);
  const images = preferred === fallback
    ? [`url("${fallback}")`]
    : [`url("${preferred}")`, `url("${fallback}")`];

  return {
    backgroundImage: images.join(", "),
  };
}

export default async function HistoryYeni2Page({
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
      fallback: historyDefaults.card1Image,
    },
    {
      period: v.card2Period,
      title: v.card2Title,
      lead: v.card2Lead,
      body: v.card2Body,
      image: v.card2Image,
      fallback: historyDefaults.card2Image,
    },
    {
      period: v.card3Period,
      title: v.card3Title,
      lead: v.card3Lead,
      body: v.card3Body,
      image: v.card3Image,
      fallback: historyDefaults.card3Image,
    },
    {
      period: v.card4Period,
      title: v.card4Title,
      lead: v.card4Lead,
      body: v.card4Body,
      image: v.card4Image,
      fallback: historyDefaults.card4Image,
    },
  ];

  const steps: JourneyStep[] = [
    {
      part: 8,
      label: "01",
      image: v.step1Image,
      fallback: "/icons/roles/reader-role-v2.webp",
      text: v.step1Text,
    },
    {
      part: 9,
      label: "02",
      image: v.step2Image,
      fallback: "/icons/roles/editor-role-v2.webp",
      text: v.step2Text,
    },
    {
      part: 10,
      label: "03",
      image: v.step3Image,
      fallback: "/icons/roles/publisher-embedded.svg",
      text: v.step3Text,
    },
    {
      part: 11,
      label: "04",
      image: v.step4Image,
      fallback: "/icons/roles/writer-embedded.svg",
      text: v.step4Text,
    },
  ];

  const futureStyle = v.cardBackgroundImage
    ? layeredBackground(v.cardBackgroundImage, "")
    : undefined;

  return (
    <main className="history-v2-preview" style={{ backgroundColor: v.backgroundColor }}>
      <section className="history-v2" data-history-part="1" aria-label="History yeni tasarım canlı önizleme">
        <header className="history-v2__intro" data-history-part="2">
          <p className="history-v2__eyebrow">{v.introEyebrow}</p>
          <h1>{titleWithAccent(v.introTitle)}</h1>
          <div className="history-v2__intro-copy">
            <p>{v.introDescription1}</p>
            <p>{v.introDescription2}</p>
          </div>
        </header>

        <div className="history-v2__eras" data-history-part="3">
          {eras.map((era, index) => (
            <article className="history-v2__era" key={`${era.period}-${era.title}`}>
              <div
                className="history-v2__era-media"
                style={layeredBackground(era.image, era.fallback)}
                aria-hidden="true"
              >
                <span className="history-v2__era-year">{era.period.split("–")[0].trim()}</span>
                <span className="history-v2__era-index">0{index + 1}</span>
              </div>
              <div className="history-v2__era-copy">
                <p className="history-v2__era-period">{era.period}</p>
                <h2>{era.title}</h2>
                <p className="history-v2__era-lead">{era.lead}</p>
                <p className="history-v2__era-body">{era.body}</p>
              </div>
            </article>
          ))}
        </div>

        <figure
          className="history-v2__decor"
          data-history-part="4"
          style={layeredBackground(v.leftDecorImage, historyDefaults.leftDecorImage)}
          role="img"
          aria-label={v.leftDecorAlt}
        >
          <span aria-hidden="true" />
        </figure>

        {v.cardVisible !== "0" ? (
          <section
            className="history-v2__future"
            data-history-part="5"
            style={futureStyle}
            aria-label="2026 şimdi sıra sende"
          >
            <header className="history-v2__future-head">
              <div>
                <p className="history-v2__future-eyebrow" data-history-part="6">{v.cardEyebrow}</p>
                <h2 data-history-part="7">
                  <span>{v.cardTitleLine1}</span>
                  <span>{v.cardTitleLine2}</span>
                </h2>
              </div>

              {v.sealVisible !== "0" ? (
                <div
                  className="history-v2__seal"
                  data-history-part="15"
                  style={layeredBackground(v.sealImage, historyDefaults.sealImage)}
                  role="img"
                  aria-label={v.sealAlt}
                />
              ) : null}
            </header>

            <div className="history-v2__steps">
              {steps.map((step) => (
                <article className="history-v2__step" data-history-part={step.part} key={step.part}>
                  <span className="history-v2__step-label">{step.label}</span>
                  <div
                    className="history-v2__step-art"
                    style={layeredBackground(step.image, step.fallback)}
                    aria-hidden="true"
                  />
                  <p>{step.text}</p>
                </article>
              ))}
            </div>

            <footer className="history-v2__footer">
              <div>
                <p className="history-v2__question" data-history-part="12">{v.closingQuestion}</p>
                <p className="history-v2__tagline" data-history-part="13">{v.bottomSlogan}</p>
              </div>
              <strong data-history-part="14">{v.brandText}</strong>
            </footer>
          </section>
        ) : null}
      </section>
    </main>
  );
}
