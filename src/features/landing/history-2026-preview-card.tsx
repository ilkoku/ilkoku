import Image from "next/image";

import "@/app/onizleme/2026-kart/card.css";

const journeyItems = [
  {
    image: "/icons/roles/reader-role-v2.webp",
    text: "Bir okur onu ilk kez keşfedebilir.",
  },
  {
    image: "/icons/roles/editor-role-v2.webp",
    text: "Bir editör onu geliştirebilir.",
  },
  {
    image: "/icons/roles/publisher-embedded.svg",
    text: "Bir yayınevi ona inanabilir.",
  },
  {
    image: "/icons/roles/writer-embedded.svg",
    text: "Ve bir gün o hikâye başladığından çok daha uzağa gidebilir.",
  },
] as const;

export function History2026PreviewCard() {
  return (
    <section className="history-2026-preview-card" aria-label="2026, şimdi sıra sende">
      <div className="history-2026-preview-card__surface" aria-hidden="true" />

      <div className="history-2026-preview-card__text-layer">
        <header className="history-2026-preview-card__header">
          <p>2026 – ŞİMDİ SIRA SENDE.</p>
          <h1>
            Bugünün ilk cümlesi,
            <br />
            yarının kitabı olabilir.
          </h1>
        </header>

        <ul className="history-2026-preview-card__copy-grid">
          {journeyItems.map((item) => (
            <li key={item.text}>{item.text}</li>
          ))}
        </ul>

        <div className="history-2026-preview-card__closing">
          <p className="history-2026-preview-card__question">Seninki neden sıradaki hikâye olmasın?</p>
          <p className="history-2026-preview-card__tagline">Her şey bir “ilk” ile başlar.</p>
          <strong>İlkOku.</strong>
          <span className="history-2026-preview-card__flourish" aria-hidden="true" />
        </div>
      </div>

      <div className="history-2026-preview-card__illustration-layer" aria-hidden="true">
        {journeyItems.map((item) => (
          <div className="history-2026-preview-card__illustration-cell" key={item.image}>
            <Image src={item.image} alt="" width={320} height={240} unoptimized />
          </div>
        ))}
      </div>

      <div className="history-2026-preview-card__seal-layer" aria-hidden="true">
        <Image
          src="/landing/history/layers/ilkoku-seal-preview.svg"
          alt=""
          width={300}
          height={300}
          unoptimized
        />
      </div>
    </section>
  );
}
