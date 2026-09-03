/* eslint-disable @next/next/no-img-element */
import { cmsLocaleNamespace } from "@/lib/cms-locales";
import { historyDefaults, mergeHistoryContent, safeHistoryImageSrc } from "@/lib/history-content";
import { prisma } from "@/lib/prisma";

type HistoryRow = { valueJson: string };

const historyIllustrations = [
  {
    src: "/onizleme/ana-sayfa-yeni/history-art/enheduanna",
    alt: "Enheduanna, çivi yazılı kil tabletler ve Mezopotamya yazı kültürünü betimleyen illüstrasyon",
  },
  {
    src: "/onizleme/ana-sayfa-yeni/history-art/zenodotos",
    alt: "Zenodotos'un antik metinleri karşılaştırıp düzenlemesini betimleyen papirüs illüstrasyonu",
  },
  {
    src: "/onizleme/ana-sayfa-yeni/history-art/cambridge",
    alt: "Cambridge University Press, eski kitaplar ve matbaa kültürünü betimleyen illüstrasyon",
  },
  {
    src: "/onizleme/ana-sayfa-yeni/history-art/cinema",
    alt: "Erken dönem sinemayı, film şeridini ve hareketli görüntünün doğuşunu betimleyen illüstrasyon",
  },
] as const;

const history2026Roles = [
  {
    className: "nx-now__role--writer",
    src: "/icons/roles/writer-embedded.svg",
    alt: "İlkOku yazar illüstrasyonu",
  },
  {
    className: "nx-now__role--reader",
    src: "/icons/roles/reader-role-v2.webp",
    alt: "İlkOku okuyucu illüstrasyonu",
  },
  {
    className: "nx-now__role--editor",
    src: "/icons/roles/editor-role-v2.webp",
    alt: "İlkOku editör illüstrasyonu",
  },
  {
    className: "nx-now__role--publisher",
    src: "/icons/roles/publisher-embedded.svg",
    alt: "İlkOku yayınevi illüstrasyonu",
  },
] as const;

function migrateLegacyHistoryContent(content: Record<string, string>) {
  const next = { ...content };
  if (next.card1Period === "MÖ 23. YÜZYIL – YAZI") next.card1Period = "MÖ 23. YÜZYIL – YAZ";
  if (next.card2Period === "MÖ 3. YÜZYIL – ÇALIŞTIR") next.card2Period = "MÖ 3. YÜZYIL – DÜZENLE";
  if (next.card3Period === "1534 – İNAN") next.card3Period = "1534 – YAYINLA";
  if (next.card4Period === "1895 – HAYATA GEÇİR.") next.card4Period = "1896 – PERDEYE TAŞI";
  if (next.card1Image === "/landing/history/reference-15/enheduanna.webp") next.card1Image = historyDefaults.card1Image;
  if (next.card2Image === "/landing/history/reference-15/zenodotos.webp") next.card2Image = historyDefaults.card2Image;
  if (next.card3Image === "/landing/history/reference-15/cambridge.webp") next.card3Image = historyDefaults.card3Image;
  if (next.card4Image === "/landing/history/reference-15/train.webp") next.card4Image = historyDefaults.card4Image;
  return next;
}

async function getHistory() {
  try {
    const namespace = cmsLocaleNamespace("homepage", "tr");
    const rows = await prisma.$queryRaw<HistoryRow[]>`
      SELECT valueJson FROM SiteContent
      WHERE namespace = ${namespace}
        AND contentKey = 'history'
        AND status = 'published'
      LIMIT 1
    `;
    if (!rows[0]?.valueJson) return { ...historyDefaults };
    const raw = JSON.parse(rows[0].valueJson) as Record<string, unknown>;
    return migrateLegacyHistoryContent(mergeHistoryContent(raw));
  } catch {
    return { ...historyDefaults };
  }
}

export default async function History670() {
  const history = await getHistory();

  const historyCards = [1, 2, 3, 4].map((index) => ({
    period: history[`card${index}Period`],
    title: history[`card${index}Title`],
    lead: history[`card${index}Lead`],
    body: history[`card${index}Body`],
    image: historyIllustrations[index - 1].src,
    alt: historyIllustrations[index - 1].alt,
  }));

  const historySteps = [
    {
      image: "/icons/roles/reader-role-v2.webp",
      alt: "İlkOku okuyucu illüstrasyonu",
      text: history.step1Text,
    },
    {
      image: "/icons/roles/editor-role-v2.webp",
      alt: "İlkOku editör illüstrasyonu",
      text: history.step2Text,
    },
    {
      image: "/icons/roles/publisher-embedded.svg",
      alt: "İlkOku yayınevi illüstrasyonu",
      text: history.step3Text,
    },
    {
      image: "/landing/history/reference-15/journey.svg",
      alt: "İlkOku eser yolculuğu illüstrasyonu",
      text: history.step4Text,
    },
  ] as const;

  return (
    <section className="nx-history" id="hikayenin-yolculugu" style={{ backgroundColor: history.backgroundColor || historyDefaults.backgroundColor }}>
      <div className="nx-shell">
        <header className="nx-history__intro">
          <div>
            <p className="nx-eyebrow nx-eyebrow--violet">{history.introEyebrow}</p>
            <h2>{history.introTitle}</h2>
          </div>
          <p>{history.introDescription1}<br />{history.introDescription2}</p>
        </header>

        <div className="nx-history__eras">
          {historyCards.map((card) => (
            <article className="nx-era" key={`${card.period}-${card.title}`}>
              <div className="nx-era__image">
                <img src={card.image} alt={card.alt} />
              </div>
              <div className="nx-era__content">
                <small>{card.period}</small>
                <h3>{card.title}</h3>
                <p><strong>{card.lead}</strong></p>
                <p>{card.body}</p>
              </div>
            </article>
          ))}
        </div>

        {history.cardVisible !== "0" ? (
          <section className="nx-now" aria-label="2026 şimdi sıra sende">
            <div className="nx-now__visual" aria-label="İlkOku'da bir eserin 2026 yolculuğu">
              <div className="nx-now__illustration" aria-hidden="true">
                <span className="nx-now__orbit nx-now__orbit--outer" />
                <span className="nx-now__orbit nx-now__orbit--inner" />
                <img className="nx-now__journey" src="/landing/history/reference-15/journey.svg" alt="" />
                {history2026Roles.map((role) => (
                  <span className={`nx-now__role ${role.className}`} key={role.className}>
                    <img src={role.src} alt="" />
                  </span>
                ))}
              </div>
            </div>
            <div className="nx-now__story">
              <div className="nx-now__headline">
                <p>{history.cardEyebrow}</p>
                <h3>{history.cardTitleLine1}<br />{history.cardTitleLine2}</h3>
              </div>
              <div className="nx-now__steps">
                {historySteps.map((step, index) => (
                  <div className="nx-now__step" key={`${index}-${step.text}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <img src={step.image} alt={step.alt} />
                    <p>{step.text}</p>
                  </div>
                ))}
              </div>
              <div className="nx-now__closing">
                <div>
                  <p>{history.closingQuestion}</p>
                  <strong>{history.bottomSlogan}</strong>
                  <b>{history.brandText}</b>
                </div>
                {history.sealVisible !== "0" ? <img src={safeHistoryImageSrc(history.sealImage, historyDefaults.sealImage)} alt={history.sealAlt} /> : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
