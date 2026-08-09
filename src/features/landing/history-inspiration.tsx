type HistorySprite = "enheduanna" | "papyrus" | "cambridge" | "film" | "desk" | "seal";

function Sprite({ kind, className = "" }: { kind: HistorySprite; className?: string }) {
  return <span className={`landing-history-sprite landing-history-sprite--${kind} ${className}`.trim()} aria-hidden="true" />;
}

export function HistoryInspiration() {
  return (
    <section className="landing-history" id="hikayenin-yolculugu" aria-labelledby="history-heading">
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
