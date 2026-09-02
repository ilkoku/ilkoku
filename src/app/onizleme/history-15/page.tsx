import type { Metadata } from "next";
import { cmsLocaleNamespace, normalizeCmsLocale } from "@/lib/cms-locales";
import { historyDefaults, mergeHistoryContent, safeHistoryImageSrc } from "@/lib/history-content";
import { prisma } from "@/lib/prisma";
import "./preview.css";

export const metadata: Metadata = {
  title: "History 15 Parça Önizleme | İlkOku",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

type Row = { valueJson: string };

type HistoryCard = {
  period: string;
  title: string;
  lead: string;
  body: string;
  image: string;
  alt: string;
  side: "left" | "right";
  key: string;
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
    const raw = JSON.parse(rows[0].valueJson) as Record<string, unknown>;
    return mergeHistoryContent(raw);
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

export default async function History15PreviewPage({ searchParams }: { searchParams: Promise<{ dil?: string }> }) {
  const params = await searchParams;
  const locale = normalizeCmsLocale(params.dil);
  const v = await loadHistory(locale);

  const cards: HistoryCard[] = [
    { key: "enheduanna", period: v.card1Period, title: v.card1Title, lead: v.card1Lead, body: v.card1Body, image: safeHistoryImageSrc(v.card1Image, historyDefaults.card1Image), alt: v.card1Alt, side: "left" },
    { key: "zenodotos", period: v.card2Period, title: v.card2Title, lead: v.card2Lead, body: v.card2Body, image: safeHistoryImageSrc(v.card2Image, historyDefaults.card2Image), alt: v.card2Alt, side: "left" },
    { key: "cambridge", period: v.card3Period, title: v.card3Title, lead: v.card3Lead, body: v.card3Body, image: safeHistoryImageSrc(v.card3Image, historyDefaults.card3Image), alt: v.card3Alt, side: "right" },
    { key: "train", period: v.card4Period, title: v.card4Title, lead: v.card4Lead, body: v.card4Body, image: safeHistoryImageSrc(v.card4Image, historyDefaults.card4Image), alt: v.card4Alt, side: "right" },
  ];

  const steps = [
    { part: 8, image: safeHistoryImageSrc(v.step1Image, historyDefaults.step1Image), alt: v.step1Alt, text: v.step1Text },
    { part: 9, image: safeHistoryImageSrc(v.step2Image, historyDefaults.step2Image), alt: v.step2Alt, text: v.step2Text },
    { part: 10, image: safeHistoryImageSrc(v.step3Image, historyDefaults.step3Image), alt: v.step3Alt, text: v.step3Text },
    { part: 11, image: safeHistoryImageSrc(v.step4Image, historyDefaults.step4Image), alt: v.step4Alt, text: v.step4Text },
  ];

  const cardStyle = v.cardBackgroundImage
    ? { backgroundImage: `url(${safeHistoryImageSrc(v.cardBackgroundImage, "")})` }
    : undefined;

  return (
    <main className="history15-preview" style={{ backgroundColor: v.backgroundColor }}>
      <section className="history15" data-history-part="1" aria-label="History 15 parçalı canlı önizleme">
        <header className="history15__intro" data-history-part="2">
          <p className="history15__eyebrow"><span />{v.introEyebrow}<span /></p>
          <h1>{titleWithAccent(v.introTitle)}</h1>
          <p>{v.introDescription1}</p>
          <p>{v.introDescription2}</p>
        </header>

        <div className="history15__cards" data-history-part="3">
          {cards.map((card) => (
            <article className={`history15-era history15-era--${card.key}`} key={card.key}>
              {card.side === "left" ? <figure className="history15-era__visual"><img src={card.image} alt={card.alt} /></figure> : null}
              <div className="history15-era__copy">
                <p className="history15-era__period">{card.period}</p>
                <h2>{card.title}</h2>
                <span className="history15-era__ornament" aria-hidden="true">— ✦ —</span>
                <p className="history15-era__lead">{card.lead}</p>
                <p className="history15-era__body">{card.body}</p>
              </div>
              {card.side === "right" ? <figure className="history15-era__visual"><img src={card.image} alt={card.alt} /></figure> : null}
            </article>
          ))}
        </div>

        <div className="history15__lower">
          <figure className="history15__decor" data-history-part="4">
            <img src={safeHistoryImageSrc(v.leftDecorImage, historyDefaults.leftDecorImage)} alt={v.leftDecorAlt} />
          </figure>

          {v.cardVisible !== "0" ? (
            <section className="history15-card" data-history-part="5" style={cardStyle} aria-label="2026 şimdi sıra sende">
              <span className="history15-card__corner history15-card__corner--tl" aria-hidden="true" />
              <span className="history15-card__corner history15-card__corner--tr" aria-hidden="true" />
              <span className="history15-card__corner history15-card__corner--bl" aria-hidden="true" />
              <span className="history15-card__corner history15-card__corner--br" aria-hidden="true" />

              <p className="history15-card__eyebrow" data-history-part="6">{v.cardEyebrow}</p>
              <h2 data-history-part="7"><span>{v.cardTitleLine1}</span><span>{v.cardTitleLine2}</span></h2>

              <div className="history15-card__steps">
                {steps.map((step) => (
                  <article className="history15-card__step" data-history-part={step.part} key={step.part}>
                    <div className="history15-card__art"><img src={step.image} alt={step.alt} /></div>
                    <p>{step.text}</p>
                  </article>
                ))}
              </div>

              <div className="history15-card__rule" aria-hidden="true"><span /></div>
              <p className="history15-card__question" data-history-part="12">{v.closingQuestion}</p>
              <p className="history15-card__tagline" data-history-part="13">{v.bottomSlogan}</p>
              <strong className="history15-card__brand" data-history-part="14">{v.brandText}</strong>
              {v.sealVisible !== "0" ? (
                <div className="history15-card__seal" data-history-part="15"><img src={safeHistoryImageSrc(v.sealImage, historyDefaults.sealImage)} alt={v.sealAlt} /></div>
              ) : null}
              <span className="history15-card__flourish" aria-hidden="true">⌁ ───────── ◇ ───────── ⌁</span>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
