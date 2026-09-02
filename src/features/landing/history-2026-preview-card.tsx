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
    <section className="history-2026-stack" aria-label="2026, şimdi sıra sende">
      <div className="history-2026-layer history-2026-layer--paper" data-layer="paper" aria-hidden="true" />

      <div className="history-2026-layer history-2026-layer--frame" data-layer="frame" aria-hidden="true">
        <span className="history-2026-frame__outer" />
        <span className="history-2026-frame__inner" />
        <span className="history-2026-frame__corner history-2026-frame__corner--tl" />
        <span className="history-2026-frame__corner history-2026-frame__corner--tr" />
        <span className="history-2026-frame__corner history-2026-frame__corner--bl" />
        <span className="history-2026-frame__corner history-2026-frame__corner--br" />
      </div>

      <header className="history-2026-layer history-2026-layer--headline" data-layer="headline">
        <p>2026 – ŞİMDİ SIRA SENDE.</p>
        <h1>
          Bugünün ilk cümlesi,
          <br />
          yarının kitabı olabilir.
        </h1>
      </header>

      <div className="history-2026-layer history-2026-layer--illustrations" data-layer="illustrations" aria-hidden="true">
        {journeyItems.map((item) => (
          <div className="history-2026-illustration" key={item.image}>
            <Image src={item.image} alt="" width={320} height={240} unoptimized />
          </div>
        ))}
      </div>

      <ul className="history-2026-layer history-2026-layer--captions" data-layer="captions">
        {journeyItems.map((item) => (
          <li key={item.text}>{item.text}</li>
        ))}
      </ul>

      <div className="history-2026-layer history-2026-layer--dividers" data-layer="dividers" aria-hidden="true">
        <span className="history-2026-divider history-2026-divider--1" />
        <span className="history-2026-divider history-2026-divider--2" />
        <span className="history-2026-divider history-2026-divider--3" />
        <span className="history-2026-rule" />
        <span className="history-2026-diamond">◆</span>
      </div>

      <div className="history-2026-layer history-2026-layer--closing" data-layer="closing">
        <p className="history-2026-closing__question">Seninki neden sıradaki hikâye olmasın?</p>
        <p className="history-2026-closing__tagline">Her şey bir “ilk” ile başlar.</p>
        <strong>İlkOku.</strong>
        <span className="history-2026-closing__flourish" aria-hidden="true">⌁ ───────── ◇ ───────── ⌁</span>
      </div>

      <div className="history-2026-layer history-2026-layer--seal" data-layer="seal" aria-hidden="true">
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
