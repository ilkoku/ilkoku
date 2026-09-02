import Image from "next/image";
import "@/app/landing-history-now-card-v3.css";

const journeyItems = [
  {
    illustration: "reader",
    text: "Bir okur onu ilk kez keşfedebilir.",
  },
  {
    illustration: "editor",
    text: "Bir editör onu geliştirebilir.",
  },
  {
    illustration: "publisher",
    text: "Bir yayınevi ona inanabilir.",
  },
  {
    illustration: "journey",
    text: "Ve bir gün o hikâye başladığından çok daha uzağa gidebilir.",
  },
] as const;

type JourneyIllustrationName = (typeof journeyItems)[number]["illustration"];

function JourneyIllustration({ name }: { name: JourneyIllustrationName }) {
  const illustration = {
    reader: (
      <>
        <path d="M3.8 5.3A3.7 3.7 0 0 1 7.5 2H11v17H7.5a3.7 3.7 0 0 0-3.7 3V5.3Z" />
        <path d="M20.2 5.3A3.7 3.7 0 0 0 16.5 2H13v17h3.5a3.7 3.7 0 0 1 3.7 3V5.3Z" />
      </>
    ),
    editor: (
      <>
        <path d="m4 20 4.1-.9L19 8.2a2.1 2.1 0 0 0-3-3L5 16.2 4 20Z" />
        <path d="m14.5 6.7 2.8 2.8" />
      </>
    ),
    publisher: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0M13 15.2A4.8 4.8 0 0 1 21 19" />
      </>
    ),
    journey: (
      <>
        <path d="m21 3-8.5 18-2.2-7.3L3 11.5 21 3Z" />
        <path d="m10.3 13.7 4.8-4.8" />
      </>
    ),
  } satisfies Record<JourneyIllustrationName, React.ReactNode>;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {illustration[name]}
    </svg>
  );
}

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
          <div className="history-now-card-v3__icon-cell" key={item.illustration}>
            <JourneyIllustration name={item.illustration} />
          </div>
        ))}
      </div>

      <div className="history-now-card-v3__seal-layer" aria-hidden="true">
        <Image
          src="/landing/history/layers/ilkoku-seal-v3.svg"
          alt=""
          width={240}
          height={240}
          unoptimized
        />
      </div>
    </section>
  );
}
