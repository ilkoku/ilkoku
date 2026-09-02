import Image from "next/image";
import "@/app/landing-history-now-card-v3.css";

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

export function HistoryNowCardV3() {
  return (
    <section className="history-now-card-v3" aria-label="2026, şimdi sıra sende">
      <div className="history-now-card-v3__surface" aria-hidden="true" />

      <div className="history-now-card-v3__text-layer">
        <header className="history-now-card-v3__header">
          <p>2026 – ŞİMDİ SIRA SENDE.</p>
          <h3>
            Bugünün ilk cümlesi,
            <br />
            yarının kitabı olabilir.
          </h3>
        </header>

        <ul className="history-now-card-v3__copy-grid">
          {journeyItems.map((item) => (
            <li key={item.text}>{item.text}</li>
          ))}
        </ul>

        <div className="history-now-card-v3__closing">
          <p className="history-now-card-v3__question">Seninki neden sıradaki hikâye olmasın?</p>
          <p className="history-now-card-v3__tagline">Her şey bir “ilk” ile başlar.</p>
          <strong>İlkOku.</strong>
        </div>
      </div>

      <div className="history-now-card-v3__icon-layer" aria-hidden="true">
        {journeyItems.map((item) => (
          <div className="history-now-card-v3__icon-cell" key={item.image}>
            <Image src={item.image} alt="" width={220} height={220} unoptimized />
          </div>
        ))}
      </div>

      <div className="history-now-card-v3__seal-layer" aria-hidden="true" />
    </section>
  );
}
