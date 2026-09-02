import type { Metadata } from "next";

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

const items = [
  { art: "reader", text: <>Bir okur onu ilk kez<br />keşfedebilir.</> },
  { art: "editor", text: <>Bir editör onu<br />geliştirebilir.</> },
  { art: "publisher", text: <>Bir yayınevi ona<br />inanabilir.</> },
  { art: "journey", text: <>Ve bir gün o hikâye<br />başladığından çok daha<br />uzağa gidebilir.</> },
] as const;

export default function History2026PreviewPage() {
  return (
    <main className="history-preview">
      <section className="history-card" aria-label="2026 şimdi sıra sende kart önizlemesi">
        <span className="history-card__corner history-card__corner--tl" aria-hidden="true" />
        <span className="history-card__corner history-card__corner--tr" aria-hidden="true" />
        <span className="history-card__corner history-card__corner--bl" aria-hidden="true" />
        <span className="history-card__corner history-card__corner--br" aria-hidden="true" />

        <header className="history-card__headline">
          <p>2026 – ŞİMDİ SIRA SENDE.</p>
          <h1>Bugünün ilk cümlesi,<br />yarının kitabı olabilir.</h1>
        </header>

        <div className="history-card__seal" aria-hidden="true" />

        <div className="history-card__journey">
          {items.map((item) => (
            <article className="history-card__journey-item" key={item.art}>
              <span className={`history-card__art history-card__art--${item.art}`} aria-hidden="true" />
              <p>{item.text}</p>
            </article>
          ))}
        </div>

        <div className="history-card__rule" aria-hidden="true"><span /></div>

        <footer className="history-card__closing">
          <p className="history-card__question">Seninki neden sıradaki hikâye olmasın?</p>
          <p className="history-card__tagline">Her şey bir “ilk” ile başlar.</p>
          <strong>İlkOku.</strong>
          <span className="history-card__flourish" aria-hidden="true">⌁ ───────── ◇ ───────── ⌁</span>
        </footer>
      </section>
    </main>
  );
}
