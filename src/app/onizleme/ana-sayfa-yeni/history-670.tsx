/* eslint-disable @next/next/no-img-element */
import { cmsLocaleNamespace } from "@/lib/cms-locales";
import { historyDefaults, mergeHistoryContent, safeHistoryImageSrc } from "@/lib/history-content";
import { prisma } from "@/lib/prisma";

import { enheduannaImagePart1 } from "./enheduanna-image-part1";
import { enheduannaImagePart2 } from "./enheduanna-image-part2";
import { enheduannaImagePart3 } from "./enheduanna-image-part3";
import { enheduannaImagePart4 } from "./enheduanna-image-part4";

type HistoryRow = { valueJson: string };

const uploadedEnheduannaImage = `data:image/jpeg;base64,${enheduannaImagePart1}${enheduannaImagePart2}${enheduannaImagePart3}${enheduannaImagePart4}`;

const realHistoryPhotos = [
  {
    src: uploadedEnheduannaImage,
    alt: "Enheduanna kartı için yüklenen çivi yazılı tablet ve parşömen görseli",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/b/b4/Papyrus_Oxyrhynchus_1389_-_Bridwell_Papyrus_5_-_Homer%2C_Iliad_-_recto.jpg",
    alt: "Homeros'un İlyada metnini taşıyan gerçek antik Oxyrhynchus papirüsünün fotoğrafı",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/View_of_the_Pitt_Building_from_Trumpington_Street_-_geograph.org.uk_-_7017859.jpg?width=1600",
    alt: "Cambridge University Press Pitt Building binasının Trumpington Street'ten gerçek fotoğrafı",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/b/b7/Lumi%C3%A8re_brothers.jpg",
    alt: "Auguste ve Louis Lumière kardeşlerin yaklaşık 1895 tarihli gerçek arşiv fotoğrafı",
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
    image: realHistoryPhotos[index - 1].src,
    alt: realHistoryPhotos[index - 1].alt,
  }));

  const historySteps = [1, 2, 3, 4].map((index) => ({
    image: safeHistoryImageSrc(history[`step${index}Image`], historyDefaults[`step${index}Image`]),
    alt: history[`step${index}Alt`],
    text: history[`step${index}Text`],
  }));

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
          {historyCards.map((card, index) => (
            <article className="nx-era" key={`${card.period}-${card.title}`}>
              <div className="nx-era__image">
                <img src={card.image} alt={card.alt} />
                <span>{String(index + 1).padStart(2, "0")}</span>
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
            <div className="nx-now__visual">
              <img src={safeHistoryImageSrc(history.leftDecorImage, historyDefaults.leftDecorImage)} alt={history.leftDecorAlt} />
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
