import type { Metadata } from "next";
import { cmsLocaleNamespace, normalizeCmsLocale } from "@/lib/cms-locales";
import { historyDefaults, mergeHistoryContent, safeHistoryImageSrc } from "@/lib/history-content";
import { prisma } from "@/lib/prisma";
import "./preview.css";

export const metadata: Metadata = {
  title: "Yeni History Önizleme | İlkOku",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

type Row = { valueJson: string };

type Milestone = {
  index: string;
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

export default async function NewHistoryPreviewPage({ searchParams }: { searchParams: Promise<{ dil?: string }> }) {
  const params = await searchParams;
  const locale = normalizeCmsLocale(params.dil);
  const v = await loadHistory(locale);

  const milestones: Milestone[] = [
    { index: "I", period: v.card1Period, title: v.card1Title, lead: v.card1Lead, body: v.card1Body, image: safeHistoryImageSrc(v.card1Image, historyDefaults.card1Image), alt: v.card1Alt },
    { index: "II", period: v.card2Period, title: v.card2Title, lead: v.card2Lead, body: v.card2Body, image: safeHistoryImageSrc(v.card2Image, historyDefaults.card2Image), alt: v.card2Alt },
    { index: "III", period: v.card3Period, title: v.card3Title, lead: v.card3Lead, body: v.card3Body, image: safeHistoryImageSrc(v.card3Image, historyDefaults.card3Image), alt: v.card3Alt },
    { index: "IV", period: v.card4Period, title: v.card4Title, lead: v.card4Lead, body: v.card4Body, image: safeHistoryImageSrc(v.card4Image, historyDefaults.card4Image), alt: v.card4Alt },
  ];

  const steps = [
    { no: "01", part: 8, image: safeHistoryImageSrc(v.step1Image, historyDefaults.step1Image), alt: v.step1Alt, text: v.step1Text },
    { no: "02", part: 9, image: safeHistoryImageSrc(v.step2Image, historyDefaults.step2Image), alt: v.step2Alt, text: v.step2Text },
    { no: "03", part: 10, image: safeHistoryImageSrc(v.step3Image, historyDefaults.step3Image), alt: v.step3Alt, text: v.step3Text },
    { no: "04", part: 11, image: safeHistoryImageSrc(v.step4Image, historyDefaults.step4Image), alt: v.step4Alt, text: v.step4Text },
  ];

  const cardStyle = v.cardBackgroundImage
    ? { backgroundImage: `linear-gradient(rgba(255,252,246,.95), rgba(255,252,246,.95)), url(${safeHistoryImageSrc(v.cardBackgroundImage, "")})` }
    : undefined;

  return (
    <main className="history-new-preview" style={{ backgroundColor: v.backgroundColor }}>
      <section className="history-new" data-history-part="1" aria-label="Yeni History tasarım önizlemesi">
        <header className="history-new__intro" data-history-part="2">
          <div className="history-new__kicker"><span>✦</span>{v.introEyebrow}<span>✦</span></div>
          <h1>{titleWithAccent(v.introTitle)}</h1>
          <div className="history-new__intro-copy">
            <p>{v.introDescription1}</p>
            <p>{v.introDescription2}</p>
          </div>
        </header>

        <section className="history-new__chronicle" data-history-part="3" aria-label="Tarih yolculuğu">
          <div className="history-new__spine" aria-hidden="true"><span /></div>
          {milestones.map((item, idx) => (
            <article className={`history-new__milestone history-new__milestone--${idx % 2 === 0 ? "left" : "right"}`} key={item.index}>
              <div className="history-new__milestone-index" aria-hidden="true">{item.index}</div>
              <figure className="history-new__milestone-media">
                <img src={item.image} alt={item.alt} />
                <span className="history-new__media-frame" aria-hidden="true" />
              </figure>
              <div className="history-new__milestone-copy">
                <p className="history-new__period">{item.period}</p>
                <h2>{item.title}</h2>
                <p className="history-new__lead">{item.lead}</p>
                <p className="history-new__body">{item.body}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="history-new__present" aria-label="Bugünden sonraki sayfa">
          <figure className="history-new__decor" data-history-part="4">
            <img src={safeHistoryImageSrc(v.leftDecorImage, historyDefaults.leftDecorImage)} alt={v.leftDecorAlt} />
            <figcaption>
              <span>BUGÜN</span>
              <strong>Hikâyenin yazıldığı yer artık senin masan.</strong>
            </figcaption>
          </figure>

          {v.cardVisible !== "0" ? (
            <section className="history-new__next" data-history-part="5" style={cardStyle} aria-label="2026 şimdi sıra sende">
              <div className="history-new__next-head">
                <p className="history-new__next-eyebrow" data-history-part="6">{v.cardEyebrow}</p>
                <h2 data-history-part="7"><span>{v.cardTitleLine1}</span><span>{v.cardTitleLine2}</span></h2>
                {v.sealVisible !== "0" ? (
                  <div className="history-new__seal" data-history-part="15">
                    <img src={safeHistoryImageSrc(v.sealImage, historyDefaults.sealImage)} alt={v.sealAlt} />
                  </div>
                ) : null}
              </div>

              <div className="history-new__steps">
                {steps.map((step) => (
                  <article className="history-new__step" data-history-part={step.part} key={step.no}>
                    <div className="history-new__step-no">{step.no}</div>
                    <div className="history-new__step-icon"><img src={step.image} alt={step.alt} /></div>
                    <p>{step.text}</p>
                  </article>
                ))}
              </div>

              <footer className="history-new__next-footer">
                <p className="history-new__question" data-history-part="12">{v.closingQuestion}</p>
                <div className="history-new__signature">
                  <p data-history-part="13">{v.bottomSlogan}</p>
                  <strong data-history-part="14">{v.brandText}</strong>
                </div>
              </footer>
            </section>
          ) : null}
        </section>
      </section>
    </main>
  );
}
