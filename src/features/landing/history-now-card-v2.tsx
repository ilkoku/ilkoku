import Image from "next/image";
import "@/app/landing-history-now-card-v2.css";

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

export function HistoryNowCardV2() {
  return (
    <section className="history-now-card-v2" aria-label="2026, şimdi sıra sende">
      <span className="history-now-card-v2__seal" aria-hidden="true">
        <span />
      </span>

      <header className="history-now-card-v2__header">
        <p>2026 – ŞİMDİ SIRA SENDE.</p>
        <h3>
          Bugünün ilk cümlesi,
          <br />
          yarının kitabı olabilir.
        </h3>
      </header>

      <ul className="history-now-card-v2__journey">
        {journeyItems.map((item) => (
          <li key={item.text}>
            <Image
              src={item.image}
              alt=""
              width={180}
              height={180}
              aria-hidden="true"
              unoptimized
            />
            <span>{item.text}</span>
          </li>
        ))}
      </ul>

      <div className="history-now-card-v2__closing">
        <p className="history-now-card-v2__question">Seninki neden sıradaki hikâye olmasın?</p>
        <p className="history-now-card-v2__tagline">Her şey bir “ilk” ile başlar.</p>
        <strong>İlkOku.</strong>
      </div>
    </section>
  );
}
