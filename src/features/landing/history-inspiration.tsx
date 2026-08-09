type HistoryPiece = "writer" | "editor" | "publisher" | "film" | "filmNote" | "desk" | "seal";

const sourceImage = "/landing/history/history-journey-final.webp";

function HistoryPiece({ kind, className = "" }: { kind: HistoryPiece; className?: string }) {
  const common = {
    className: `landing-history-sprite landing-history-sprite--${kind} ${className}`.trim(),
    "aria-hidden": true,
    focusable: "false" as const,
    preserveAspectRatio: "xMidYMid meet",
  };

  if (kind === "writer") {
    return (
      <svg {...common} viewBox="72 224 338 520">
        <defs>
          <clipPath id="history-writer-card-clip">
            <polygon points="82,246 382,228 397,714 382,735 86,728 77,698 79,273" />
          </clipPath>
        </defs>
        <image href={sourceImage} x="0" y="0" width="1492" height="1054" clipPath="url(#history-writer-card-clip)" />
      </svg>
    );
  }

  if (kind === "editor") {
    return (
      <svg {...common} viewBox="305 316 320 560">
        <defs>
          <clipPath id="history-editor-card-clip">
            <polygon points="341,329 602,351 606,835 590,865 326,855 315,829 323,356" />
          </clipPath>
        </defs>
        <image href={sourceImage} x="0" y="0" width="1492" height="1054" clipPath="url(#history-editor-card-clip)" />
      </svg>
    );
  }

  if (kind === "publisher") {
    return (
      <svg {...common} viewBox="574 214 448 664">
        <defs>
          <clipPath id="history-publisher-card-clip">
            <polygon points="596,231 989,221 1008,839 994,864 604,865 589,843 591,250" />
          </clipPath>
        </defs>
        <image href={sourceImage} x="0" y="0" width="1492" height="1054" clipPath="url(#history-publisher-card-clip)" />
      </svg>
    );
  }

  if (kind === "film") {
    return (
      <svg {...common} viewBox="969 176 493 322">
        <defs>
          <clipPath id="history-film-clip">
            <polygon points="986,214 1432,184 1448,447 1001,487" />
          </clipPath>
        </defs>
        <image href={sourceImage} x="0" y="0" width="1492" height="1054" clipPath="url(#history-film-clip)" />
      </svg>
    );
  }

  if (kind === "filmNote") {
    return (
      <svg {...common} viewBox="1023 421 376 205">
        <defs>
          <clipPath id="history-film-note-clip">
            <polygon points="1033,431 1385,420 1392,605 1374,619 1040,616 1028,599" />
          </clipPath>
        </defs>
        <image href={sourceImage} x="0" y="0" width="1492" height="1054" clipPath="url(#history-film-note-clip)" />
      </svg>
    );
  }

  if (kind === "desk") {
    return (
      <svg {...common} viewBox="0 718 725 336">
        <defs>
          <clipPath id="history-desk-clip">
            <polygon points="0,724 151,757 222,806 337,834 470,894 611,955 724,1015 724,1054 0,1054" />
          </clipPath>
        </defs>
        <image href={sourceImage} x="0" y="0" width="1492" height="1054" clipPath="url(#history-desk-clip)" />
      </svg>
    );
  }

  return (
    <svg {...common} viewBox="1286 616 105 111">
      <defs>
        <clipPath id="history-seal-clip">
          <ellipse cx="1337" cy="674" rx="45" ry="47" />
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
        .landing-history {
          background: #f8f6ff !important;
          border-block: 0 !important;
        }

        .landing-history-sprite {
          display: block !important;
          width: 100% !important;
          height: auto !important;
          margin: 0 !important;
          background: none !important;
          filter: none !important;
          aspect-ratio: auto !important;
        }

        .landing-history-card,
        .landing-history-cinema__note {
          min-height: 0 !important;
          overflow: visible !important;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          clip-path: none !important;
        }

        .landing-history-card::before,
        .landing-history-cinema__note::before {
          display: none !important;
        }

        .landing-history-card__visual,
        .landing-history-card__visual--writer,
        .landing-history-card__visual--editor,
        .landing-history-card__visual--publisher {
          margin: 0 !important;
          padding: 0 !important;
        }

        .landing-history-card__copy {
          display: none !important;
        }

        .landing-history-card--publisher .landing-history-card__copy {
          display: none !important;
        }

        .landing-history-cinema__note {
          width: 73% !important;
          margin: -0.72rem 0 0 8.5% !important;
          padding: 0 !important;
          transform: rotate(1deg) !important;
        }

        .landing-history-now__seal {
          width: 4.25rem !important;
          height: auto !important;
        }

        .landing-history__desk {
          width: 48% !important;
          left: -2.8% !important;
          bottom: -1.2% !important;
        }

        @media (max-width: 860px) {
          .landing-history-card__copy {
            display: none !important;
          }

          .landing-history__desk {
            display: none !important;
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
          <HistoryPiece kind="desk" className="landing-history__desk" />

          <article className="landing-history-card landing-history-card--writer" aria-label="MÖ 23. yüzyıl — Enheduanna">
            <div className="landing-history-card__visual landing-history-card__visual--writer">
              <HistoryPiece kind="writer" />
            </div>
          </article>

          <article className="landing-history-card landing-history-card--editor" aria-label="MÖ 3. yüzyıl — Zenodotos">
            <div className="landing-history-card__visual landing-history-card__visual--editor">
              <HistoryPiece kind="editor" />
            </div>
          </article>

          <article className="landing-history-card landing-history-card--publisher" aria-label="1534 — Cambridge University Press">
            <div className="landing-history-card__visual landing-history-card__visual--publisher">
              <HistoryPiece kind="publisher" />
            </div>
          </article>

          <article className="landing-history-cinema" aria-label="1895 — Hikâye perdeye çıktı">
            <div className="landing-history-cinema__visual">
              <HistoryPiece kind="film" />
            </div>
            <div className="landing-history-cinema__note">
              <HistoryPiece kind="filmNote" />
            </div>
          </article>

          <article className="landing-history-now">
            <HistoryPiece kind="seal" className="landing-history-now__seal" />
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
