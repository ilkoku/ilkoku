import Image from "next/image";

type JourneyIconName = "book" | "edit" | "publisher" | "spark";

function JourneyIcon({ name }: { name: JourneyIconName }) {
  const paths: Record<JourneyIconName, React.ReactNode> = {
    book: (
      <>
        <path d="M3.5 5.5A3.5 3.5 0 0 1 7 2h4v17H7a3.5 3.5 0 0 0-3.5 3V5.5Z" />
        <path d="M20.5 5.5A3.5 3.5 0 0 0 17 2h-4v17h4a3.5 3.5 0 0 1 3.5 3V5.5Z" />
      </>
    ),
    edit: (
      <>
        <path d="m4 20 4-.8L19 8.2a2.1 2.1 0 0 0-3-3L5 16.2 4 20Z" />
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
    spark: (
      <>
        <path d="m21 3-8.5 18-2.2-7.3L3 11.5 21 3Z" />
        <path d="m10.3 13.7 4.8-4.8" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

const journeyLines = [
  { icon: "book", text: "Bir okur onu ilk kez keşfedebilir." },
  { icon: "edit", text: "Bir editör onu geliştirebilir." },
  { icon: "publisher", text: "Bir yayınevi ona inanabilir." },
  { icon: "spark", text: "Ve bir gün o hikâye başladığından çok daha uzağa gidebilir." },
] as const;

export function HistoryInspiration() {
  return (
    <section className="landing-history" id="hikayenin-yolculugu" aria-labelledby="history-heading">
      <figure className="landing-history__stage">
        <Image
          className="landing-history__base"
          src="/landing/history/history-journey-master.png"
          alt="Enheduanna'dan günümüze yazının ve yayıncılığın yolculuğunu anlatan tarih kolajı"
          width={1672}
          height={941}
          sizes="(max-width: 1672px) 100vw, 1672px"
          unoptimized
        />

        <div className="landing-history__header-mask" aria-hidden="true" />
        <header className="landing-history__header">
          <p className="landing-history__eyebrow">HİKÂYENİN YOLCULUĞU</p>
          <h2 id="history-heading">
            Her şey bir <span>“ilk”</span> ile başlar.
          </h2>
          <p className="landing-history__description">
            Binlerce yıldır birileri ilk cümleyi yazıyor. Birileri ona yeniden bakıyor.
            <br />
            Birileri ona inanıyor. Ve bazı hikâyeler başladıkları yerden çok daha uzağa gidiyor.
          </p>
        </header>

        <div className="landing-history__now-wipe landing-history__now-wipe--intro" aria-hidden="true" />
        <div className="landing-history__now-wipe landing-history__now-wipe--journey" aria-hidden="true" />
        <div className="landing-history__now-wipe landing-history__now-wipe--closing" aria-hidden="true" />

        <div className="landing-history__now" aria-label="2026, şimdi sıra sende">
          <div className="landing-history__now-intro">
            <p className="landing-history__now-year">2026 – ŞİMDİ SIRA SENDE.</p>
            <h3>Bugünün ilk cümlesi,<br />yarının kitabı olabilir.</h3>
          </div>

          <ul className="landing-history__now-journey">
            {journeyLines.map((item) => (
              <li key={item.icon}>
                <JourneyIcon name={item.icon} />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>

          <p className="landing-history__now-question">Seninki neden sıradaki hikâye olmasın?</p>

          <div className="landing-history__now-signature">
            <p>Her şey bir “ilk” ile başlar.</p>
            <strong>İlkOku.</strong>
          </div>
        </div>
      </figure>
    </section>
  );
}
