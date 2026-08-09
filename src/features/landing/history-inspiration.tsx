type HistorySprite = "enheduanna" | "papyrus" | "cambridge" | "film" | "desk" | "seal";

const sourceImage = "/landing/history/history-journey-final.webp";

function Sprite({ kind, className = "" }: { kind: HistorySprite; className?: string }) {
  const common = {
    className: `landing-history-sprite landing-history-sprite--${kind} ${className}`.trim(),
    "aria-hidden": true,
    focusable: "false" as const,
    style: { backgroundImage: "none", aspectRatio: "auto" },
  };

  if (kind === "enheduanna") {
    return (
      <svg {...common} viewBox="100 250 240 250">
        <defs>
          <clipPath id="history-enheduanna-clip">
            <ellipse cx="216" cy="378" rx="104" ry="114" />
          </clipPath>
        </defs>
        <image href={sourceImage} x="0" y="0" width="1492" height="1054" clipPath="url(#history-enheduanna-clip)" />
      </svg>
    );
  }

  if (kind === "papyrus") {
    return (
      <svg {...common} viewBox="350 335 265 310">
        <defs>
          <clipPath id="history-papyrus-clip">
            <polygon points="381,349 582,366 579,584 566,610 540,603 511,618 478,606 447,615 414,600 382,605 390,565 379,523 387,474 379,430" />
          </clipPath>
        </defs>
        <image href={sourceImage} x="0" y="0" width="1492" height="1054" clipPath="url(#history-papyrus-clip)" />
      </svg>
    );
  }

  if (kind === "cambridge") {
    return (
      <svg {...common} viewBox="585 225 420 395">
        <defs>
          <clipPath id="history-cambridge-clip">
            <polygon points="598,236 986,226 991,574 970,597 611,603 596,578" />
          </clipPath>
        </defs>
        <image href={sourceImage} x="0" y="0" width="1492" height="1054" clipPath="url(#history-cambridge-clip)" />
      </svg>
    );
  }

  if (kind === "film") {
    return (
      <svg {...common} viewBox="970 175 490 320">
        <defs>
          <clipPath id="history-film-clip">
            <polygon points="987,214 1431,184 1449,449 1000,488" />
          </clipPath>
        </defs>
        <image href={sourceImage} x="0" y="0" width="1492" height="1054" clipPath="url(#history-film-clip)" />
      </svg>
    );
  }

  if (kind === "desk") {
    return (
      <svg {...common} viewBox="0 720 720 334">
        <defs>
          <clipPath id="history-desk-clip">
            <polygon points="0,724 150,758 220,807 338,836 470,895 610,955 720,1015 720,1054 0,1054" />
          </clipPath>
        </defs>
        <image href={sourceImage} x="0" y="0" width="1492" height="1054" clipPath="url(#history-desk-clip)" />
      </svg>
    );
  }

  return (
    <svg {...common} viewBox="1280 620 110 110">
      <defs>
        <clipPath id="history-seal-clip">
          <ellipse cx="1336" cy="676" rx="44" ry="46" />
        </clipPath>
      </defs>
      <image href={sourceImage} x="0" y="0" width="1492" height="1054" clipPath="url(#history-seal-clip)" />
    </svg>
  );
}

export function HistoryInspiration() {
  return (
    <section className="landing-history" id="hikayenin-yolculugu" aria-labelledby="history-heading">
      <style>{`
        .landing-history-sprite {
          background-image: none !important;
          background-color: transparent !important;
          background-size: auto !important;
          background-position: 0 0 !important;
          height: auto !important;
        }

        .landing-history-card--publisher {
          min-height: 38rem;
        }

        .landing-history__desk {
          width: 50%;
          left: -3.5%;
        }

        @media (max-width: 860px) {
          .landing-history-card--publisher {
            min-height: 0;
          }
        }
      `}</style>

      <div className="landing-container">
        <header className="landing-history__heading">
          <span className="landing-history__eyebrow">HİKÂYENİN YOLCULUĞU</span>
          <h2 id="history-heading">Her şey bir <em>“ilk”</em> ile başlar.</h2>
          <p>
            Binlerce yıldır birileri ilk cümleyi yazıyor. Birileri ona yeniden bakıyor.<br />
            Birileri ona inanıyor. Ve bazı hikâyeler başladıkları yerden çok daha uzağa gidiyor.
          </p>
        </header>

        <div className="landing-history__collage">
          <Sprite kind="desk" className="landing-history__desk" />

          <article className="landing-history-card landing-history-card--writer">
            <div className="landing-history-card__visual landing-history-card__visual--writer">
              <Sprite kind="enheduanna" />
            </div>
            <div className="landing-history-card__copy">
              <span>MÖ 23. YÜZYIL · YAZ</span>
              <h3>Enheduanna</h3>
              <strong>Bir yazar, adını eserinin yanında bıraktı.</strong>
              <p>Binlerce yıl geçti.<br />Adı hâlâ okunuyor.</p>
            </div>
          </article>

          <article className="landing-history-card landing-history-card--editor">
            <div className="landing-history-card__visual landing-history-card__visual--editor">
              <Sprite kind="papyrus" />
            </div>
            <div className="landing-history-card__copy">
              <span>MÖ 3. YÜZYIL · GELİŞTİR</span>
              <h3>Zenodotos</h3>
              <strong>Birisi yazılmış bir metne yeniden baktı.</strong>
              <p>Çünkü bazen bir eser, ikinci bir bakışla daha da güçlenir.</p>
            </div>
          </article>

          <article className="landing-history-card landing-history-card--publisher">
            <div className="landing-history-card__visual landing-history-card__visual--publisher">
              <Sprite kind="cambridge" />
            </div>
            <div className="landing-history-card__copy">
              <span>1534 · İNAN</span>
              <h3>Cambridge<br />University Press</h3>
              <strong>Bir eserin dünyaya ulaşması için birilerinin ona inanması gerekiyordu.</strong>
              <p>Yazarın yolculuğuna yayıncı da katıldı.</p>
            </div>
          </article>

          <article className="landing-history-cinema">
            <div className="landing-history-cinema__visual">
              <Sprite kind="film" />
            </div>
            <div className="landing-history-cinema__note">
              <span>1895 · HAYATA GEÇİR</span>
              <h3>Hikâye perdeye çıktı.</h3>
              <p>Hikâyeler artık yalnızca okunmuyordu, izlenmeye de başlandı.</p>
              <p>Bir eser, yaşadığı yerde kalmak zorunda değildi.</p>
            </div>
          </article>

          <article className="landing-history-now">
            <Sprite kind="seal" className="landing-history-now__seal" />
            <span className="landing-history-now__year">2026 · ŞİMDİ SIRA SENDE.</span>
            <h3>Bugünün ilk cümlesi,<br />yarının kitabı olabilir.</h3>
            <ul>
              <li>Bir okur onu ilk kez keşfedebilir.</li>
              <li>Bir editör onu geliştirebilir.</li>
              <li>Bir yayınevi ona inanabilir.</li>
              <li>Ve bir gün o hikâye başladığından çok daha uzağa gidebilir.</li>
            </ul>
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
