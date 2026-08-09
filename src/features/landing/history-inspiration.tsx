type HistoryArt = "writer" | "editor" | "publisher" | "film" | "desk" | "seal";
type BenefitIcon = "reader" | "editor" | "publisher" | "journey";

const sourceImage = "/landing/history/history-journey-final.webp";

function HistoricalArt({ kind, className = "" }: { kind: HistoryArt; className?: string }) {
  const common = {
    className: `landing-history-era__image landing-history-era__image--${kind} ${className}`.trim(),
    "aria-hidden": true,
    focusable: "false" as const,
    preserveAspectRatio: "xMidYMid meet",
  };

  if (kind === "writer") {
    return (
      <svg {...common} viewBox="100 250 240 250">
        <defs><clipPath id="history-writer-art"><ellipse cx="216" cy="378" rx="104" ry="114" /></clipPath></defs>
        <image href={sourceImage} x="0" y="0" width="1492" height="1054" clipPath="url(#history-writer-art)" />
      </svg>
    );
  }

  if (kind === "editor") {
    return (
      <svg {...common} viewBox="350 335 265 310">
        <defs><clipPath id="history-editor-art"><polygon points="381,349 582,366 579,584 566,610 540,603 511,618 478,606 447,615 414,600 382,605 390,565 379,523 387,474 379,430" /></clipPath></defs>
        <image href={sourceImage} x="0" y="0" width="1492" height="1054" clipPath="url(#history-editor-art)" />
      </svg>
    );
  }

  if (kind === "publisher") {
    return (
      <svg {...common} viewBox="590 220 410 400">
        <defs><clipPath id="history-publisher-art"><polygon points="598,236 986,226 991,574 970,597 611,603 596,578" /></clipPath></defs>
        <image href={sourceImage} x="0" y="0" width="1492" height="1054" clipPath="url(#history-publisher-art)" />
      </svg>
    );
  }

  if (kind === "film") {
    return (
      <svg {...common} viewBox="970 175 490 320">
        <defs><clipPath id="history-film-art"><polygon points="987,214 1431,184 1449,449 1000,488" /></clipPath></defs>
        <image href={sourceImage} x="0" y="0" width="1492" height="1054" clipPath="url(#history-film-art)" />
      </svg>
    );
  }

  if (kind === "desk") {
    return (
      <svg {...common} viewBox="0 718 725 336">
        <defs><clipPath id="history-desk-art"><polygon points="0,724 151,757 222,806 337,834 470,894 611,955 724,1015 724,1054 0,1054" /></clipPath></defs>
        <image href={sourceImage} x="0" y="0" width="1492" height="1054" clipPath="url(#history-desk-art)" />
      </svg>
    );
  }

  return (
    <svg {...common} viewBox="1286 616 105 111">
      <defs><clipPath id="history-seal-art"><ellipse cx="1337" cy="674" rx="45" ry="47" /></clipPath></defs>
      <image href={sourceImage} x="0" y="0" width="1492" height="1054" clipPath="url(#history-seal-art)" />
    </svg>
  );
}

function JourneyIcon({ kind }: { kind: BenefitIcon }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (kind === "reader") return <svg {...common}><path d="M3.5 5.5A3.5 3.5 0 0 1 7 2h4v17H7a3.5 3.5 0 0 0-3.5 3V5.5Z" /><path d="M20.5 5.5A3.5 3.5 0 0 0 17 2h-4v17h4a3.5 3.5 0 0 1 3.5 3V5.5Z" /></svg>;
  if (kind === "editor") return <svg {...common}><path d="M4 20h4l10.2-10.2a2.1 2.1 0 1 0-3-3L5 17l-1 3Z" /><path d="m13.8 8.2 3 3" /></svg>;
  if (kind === "publisher") return <svg {...common}><path d="M3 21h18" /><path d="M5 21V9l7-5 7 5v12" /><path d="M9 21v-6h6v6" /></svg>;
  return <svg {...common}><path d="m3 11 18-8-8 18-2.3-7.7L3 11Z" /><path d="m10.7 13.3 4.7-4.7" /></svg>;
}

const historyCards = [
  { key: "writer", art: "writer" as const, date: "MÖ 23. YÜZYIL · YAZ", title: "Enheduanna", strong: "Bir yazar, adını eserinin yanında bıraktı.", body: <>Binlerce yıl geçti.<br />Adı hâlâ okunuyor.</> },
  { key: "editor", art: "editor" as const, date: "MÖ 3. YÜZYIL · GELİŞTİR", title: "Zenodotos", strong: "Birisi yazılmış bir metne yeniden baktı.", body: <>Çünkü bazen bir eser,<br />ikinci bir bakışla daha da güçlenir.</> },
  { key: "publisher", art: "publisher" as const, date: "1534 · İNAN", title: <>Cambridge<br />University Press</>, strong: "Bir eserin dünyaya ulaşması için birilerinin ona inanması gerekiyordu.", body: <>Yazarın yolculuğuna yayıncı da katıldı.</> },
  { key: "film", art: "film" as const, date: "1895 · HAYATA GEÇİR", title: "Hikâye perdeye çıktı.", strong: "Hikâyeler artık yalnızca okunmuyordu, izlenmeye de başlandı.", body: <>Bir eser, yaşadığı yerde kalmak zorunda değildi.</> },
] as const;

const benefits = [
  { icon: "reader" as const, text: "Bir okur onu ilk kez keşfedebilir." },
  { icon: "editor" as const, text: "Bir editör onu geliştirebilir." },
  { icon: "publisher" as const, text: "Bir yayınevi ona inanabilir." },
  { icon: "journey" as const, text: "Ve bir gün o hikâye başladığından çok daha uzağa gidebilir." },
] as const;

export function HistoryInspiration() {
  return (
    <section className="landing-history" id="hikayenin-yolculugu" aria-labelledby="history-heading">
      <div className="landing-container landing-history__container">
        <header className="landing-history__heading">
          <span className="landing-history__eyebrow">HİKÂYENİN YOLCULUĞU</span>
          <h2 id="history-heading">Her şey bir <em>“ilk”</em> ile başlar.</h2>
          <p>
            Binlerce yıldır birileri ilk cümleyi yazıyor. Birileri ona yeniden bakıyor.<br />
            Birileri ona inanıyor. Ve bazı hikâyeler başladıkları yerden çok daha uzağa gidiyor.
          </p>
        </header>

        <div className="landing-history__timeline">
          {historyCards.map((card) => (
            <article key={card.key} className={`landing-history-era landing-history-era--${card.key}`}>
              <div className="landing-history-era__art"><HistoricalArt kind={card.art} /></div>
              <div className="landing-history-era__copy">
                <span className="landing-history-era__date">{card.date}</span>
                <h3>{card.title}</h3>
                <span className="landing-history-era__rule" aria-hidden="true" />
                <strong>{card.strong}</strong>
                <p>{card.body}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="landing-history__closing-stage">
          <div className="landing-history__desk" aria-hidden="true"><HistoricalArt kind="desk" /></div>

          <article className="landing-history-now">
            <HistoricalArt kind="seal" className="landing-history-now__seal" />
            <span className="landing-history-now__year">2026 · ŞİMDİ SIRA SENDE.</span>
            <h3>Bugünün ilk cümlesi,<br />yarının kitabı olabilir.</h3>

            <div className="landing-history-now__benefits">
              {benefits.map((benefit) => (
                <div key={benefit.icon} className="landing-history-now__benefit">
                  <JourneyIcon kind={benefit.icon} />
                  <p>{benefit.text}</p>
                </div>
              ))}
            </div>

            <strong className="landing-history-now__question">Seninki neden sıradaki hikâye olmasın?</strong>
            <div className="landing-history-now__closing">
              <span>Her şey bir “ilk” ile başlar.</span>
              <b>İlkOku.</b>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
