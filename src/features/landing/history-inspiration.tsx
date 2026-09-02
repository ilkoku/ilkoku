import Image from "next/image";
import {
  historyFlag,
  historyValue,
  safeHistoryAsset,
  safeHistoryColor,
} from "@/features/landing/history-content";
import { getPublishedHomepageState } from "@/lib/cms-homepage-store";

const historyCards = [1, 2, 3, 4] as const;
const nowSteps = [1, 2, 3, 4] as const;

type HistoryCardIndex = (typeof historyCards)[number];
type NowStepIndex = (typeof nowSteps)[number];

function cardKey(index: HistoryCardIndex, suffix: "Era" | "Title" | "Body" | "Note" | "Image" | "ImageAlt") {
  return `card${index}${suffix}` as const;
}

function stepKey(index: NowStepIndex, suffix: "Image" | "Text") {
  return `nowStep${index}${suffix}` as const;
}

export async function HistoryInspiration() {
  const homepageState = await getPublishedHomepageState("tr");
  const content = homepageState.state === "valid" ? homepageState.content.history : undefined;
  const nowVisible = historyFlag(content, "nowVisible");
  const sealVisible = historyFlag(content, "nowSealVisible");
  const nowBackground = content?.nowBackground?.trim().startsWith("/") ? content.nowBackground.trim() : "";

  return (
    <section
      className="landing-history"
      id="hikayenin-yolculugu"
      aria-labelledby="history-heading"
      style={{ backgroundColor: safeHistoryColor(content) }}
    >
      <div className="landing-history__stage">
        <header className="landing-history__header">
          <p className="landing-history__eyebrow">{historyValue(content, "headerEyebrow")}</p>
          <h2 id="history-heading">
            {historyValue(content, "headerTitleBefore")} {" "}
            <span>{historyValue(content, "headerTitleEmphasis")}</span>{" "}
            {historyValue(content, "headerTitleAfter")}
          </h2>
          <p className="landing-history__description">
            {historyValue(content, "headerDescriptionLine1")}
            <br />
            {historyValue(content, "headerDescriptionLine2")}
          </p>
        </header>

        <div className="landing-history__cards" aria-label="Hikâyenin tarihsel yolculuğu">
          {historyCards.map((index) => {
            const imageKey = cardKey(index, "Image");
            return (
              <article className={`landing-history-card landing-history-card--${index}`} key={index}>
                <div className="landing-history-card__copy">
                  <p className="landing-history-card__era">{historyValue(content, cardKey(index, "Era"))}</p>
                  <h3>{historyValue(content, cardKey(index, "Title"))}</h3>
                  <span className="landing-history-card__ornament" aria-hidden="true">✦</span>
                  <p className="landing-history-card__body">{historyValue(content, cardKey(index, "Body"))}</p>
                  <p className="landing-history-card__note">{historyValue(content, cardKey(index, "Note"))}</p>
                </div>
                <div className="landing-history-card__art">
                  <Image
                    src={safeHistoryAsset(content, imageKey)}
                    alt={historyValue(content, cardKey(index, "ImageAlt"))}
                    width={420}
                    height={520}
                    sizes="(max-width: 760px) 72vw, 24vw"
                    unoptimized
                  />
                </div>
              </article>
            );
          })}
        </div>

        <div className="landing-history__finale">
          <div className="landing-history__left-visual">
            <Image
              src={safeHistoryAsset(content, "leftVisual")}
              alt={historyValue(content, "leftVisualAlt")}
              width={815}
              height={444}
              sizes="(max-width: 760px) 100vw, 49vw"
              unoptimized
            />
          </div>

          {nowVisible ? (
            <section
              className="landing-history-now"
              aria-label="2026, şimdi sıra sende"
              style={nowBackground ? { backgroundImage: `url(${nowBackground})` } : undefined}
            >
              <header className="landing-history-now__intro">
                <p>{historyValue(content, "nowEyebrow")}</p>
                <h3>
                  {historyValue(content, "nowTitleLine1")}
                  <br />
                  {historyValue(content, "nowTitleLine2")}
                </h3>
              </header>

              <div className="landing-history-now__steps">
                {nowSteps.map((index) => (
                  <div className="landing-history-now__step" key={index}>
                    <Image
                      src={safeHistoryAsset(content, stepKey(index, "Image"))}
                      alt=""
                      width={190}
                      height={150}
                      unoptimized
                    />
                    <p>{historyValue(content, stepKey(index, "Text"))}</p>
                  </div>
                ))}
              </div>

              <div className="landing-history-now__closing">
                <p className="landing-history-now__question">{historyValue(content, "nowQuestion")}</p>
                <p className="landing-history-now__tagline">{historyValue(content, "nowTagline")}</p>
                <strong>{historyValue(content, "nowBrand")}</strong>
              </div>

              {sealVisible ? (
                <Image
                  className="landing-history-now__seal"
                  src={safeHistoryAsset(content, "nowSealImage")}
                  alt={historyValue(content, "nowSealAlt")}
                  width={240}
                  height={240}
                  unoptimized
                />
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
