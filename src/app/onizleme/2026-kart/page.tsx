import type { Metadata } from "next";
import Image from "next/image";

import "./preview.css";

export const metadata: Metadata = {
  title: "History 15 Parça Önizleme | İlkOku",
  robots: { index: false, follow: false, nocache: true },
};

const historyCards = [
  {
    key: "enheduanna",
    period: "MÖ 23. YÜZYIL – YAZI",
    title: "Enheduanna",
    lead: "Bir yazar, adını eserinin yanında bıraktı.",
    body: "Binlerce yıl geçti. Adı hâlâ okunuyor.",
    image: "/landing/history/puzzle-v2/enheduanna.webp",
    alt: "Enheduanna tarih kartı görseli",
    imageSide: "left",
  },
  {
    key: "zenodotos",
    period: "MÖ 3. YÜZYIL – ÇALIŞTIR",
    title: "Zenodotos",
    lead: "Birisi yazılmış bir metne yeniden baktı.",
    body: "Çünkü bazen bir eser, ikinci bir bakışla daha da güçlenir.",
    image: "/landing/history/puzzle-v2/zenodotos.webp",
    alt: "Zenodotos tarih kartı görseli",
    imageSide: "left",
  },
  {
    key: "cambridge",
    period: "1534 – İNAN",
    title: "Cambridge University Press",
    lead: "Bir eserin dünyaya ulaşması için birilerinin ona inanması gerekiyordu.",
    body: "Yazarın sözü, dünyanın yankısı oldu.",
    image: "/landing/history/puzzle-v2/cambridge.webp",
    alt: "Cambridge University Press tarih kartı görseli",
    imageSide: "right",
  },
  {
    key: "train",
    period: "1895 – HAYATA GEÇİR.",
    title: "Hikâye perdeye çıktı.",
    lead: "Hikâyeler artık yalnızca okunmuyordu, izlenmeye de başlandı.",
    body: "Bir eser, yaşadığı yerde kalmak zorunda değildi.",
    image: "/landing/history/puzzle-v2/train.webp",
    alt: "1895 tren ve erken sinema tarih kartı görseli",
    imageSide: "right",
  },
] as const;

const steps = [
  { part: 8, key: "reader", image: "/landing/history/puzzle-v2/2026-reader.svg", alt: "Açık kitap ve büyüteç", text: <>Bir okur onu ilk kez<br />keşfedebilir.</> },
  { part: 9, key: "editor", image: "/landing/history/puzzle-v2/2026-editor.svg", alt: "Mürekkep, tüy kalem ve açık kitap", text: <>Bir editör onu<br />geliştirebilir.</> },
  { part: 10, key: "publisher", image: "/landing/history/puzzle-v2/2026-publisher.svg", alt: "Mühürlü mektup", text: <>Bir yayınevi ona<br />inanabilir.</> },
  { part: 11, key: "journey", image: "/landing/history/puzzle-v2/2026-journey.svg", alt: "Uzağa uzanan yol", text: <>Ve bir gün o hikâye<br />başladığından çok daha<br />uzağa gidebilir.</> },
] as const;

export default function HistoryPuzzlePreviewPage() {
  return (
    <main className="history-preview-page">
      <section className="history-puzzle" data-history-part="1" aria-label="History 15 parçalı önizleme">
        <header className="history-intro" data-history-part="2">
          <p className="history-intro__eyebrow"><span />HİKÂYENİN YOLCULUĞU<span /></p>
          <h1>Her şey bir <em>“ilk”</em> ile başlar.</h1>
          <p>Binlerce yıldır birileri ilk cümleyi yazıyor. Birileri ona yeniden bakıyor.</p>
          <p>Birileri ona inanıyor. Ve bazı hikâyeler başladıkları yerden çok daha uzağa gidiyor.</p>
        </header>

        <div className="history-cards" data-history-part="3">
          {historyCards.map((card) => (
            <article className={`history-era-card history-era-card--${card.key}`} key={card.key}>
              {card.imageSide === "left" ? (
                <div className="history-era-card__visual"><Image src={card.image} alt={card.alt} fill sizes="22vw" priority /></div>
              ) : null}
              <div className="history-era-card__copy">
                <p className="history-era-card__period">{card.period}</p>
                <h2>{card.title}</h2>
                <span className="history-era-card__ornament" aria-hidden="true">— ✦ —</span>
                <p className="history-era-card__lead">{card.lead}</p>
                <p className="history-era-card__body">{card.body}</p>
              </div>
              {card.imageSide === "right" ? (
                <div className="history-era-card__visual"><Image src={card.image} alt={card.alt} fill sizes="22vw" priority /></div>
              ) : null}
            </article>
          ))}
        </div>

        <div className="history-lower">
          <figure className="history-left-decor" data-history-part="4">
            <Image src="/landing/history/puzzle-v2/left-decor.webp" alt="Kitap, mürekkep, kalem, kâğıt ve lavanta" fill sizes="40vw" priority />
          </figure>

          <section className="history-2026-card" data-history-part="5" aria-label="2026 şimdi sıra sende">
            <div className="history-2026-card__frame" aria-hidden="true" />
            <p className="history-2026-card__eyebrow" data-history-part="6">2026 – ŞİMDİ SIRA SENDE.</p>
            <h2 data-history-part="7">Bugünün ilk cümlesi,<br />yarının kitabı olabilir.</h2>

            <div className="history-2026-card__steps">
              {steps.map((step) => (
                <article className="history-2026-card__step" data-history-part={step.part} key={step.key}>
                  <div className="history-2026-card__step-art"><Image src={step.image} alt={step.alt} fill sizes="14vw" priority unoptimized /></div>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>

            <div className="history-2026-card__rule" aria-hidden="true"><span /></div>
            <p className="history-2026-card__question" data-history-part="12">Seninki neden sıradaki hikâye olmasın?</p>
            <p className="history-2026-card__tagline" data-history-part="13">Her şey bir “ilk” ile başlar.</p>
            <strong className="history-2026-card__brand" data-history-part="14">İlkOku.</strong>
            <div className="history-2026-card__seal" data-history-part="15">
              <Image src="/landing/history/puzzle-v2/2026-seal.svg" alt="İlkOku mor mühür" fill sizes="12vw" priority unoptimized />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
