function EnheduannaArtifact() {
  return (
    <svg viewBox="0 0 320 235" className="landing-history-art" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="enheduanna-bronze" cx="40%" cy="34%" r="72%">
          <stop offset="0" stopColor="#d7b26f" />
          <stop offset="0.58" stopColor="#a66c31" />
          <stop offset="1" stopColor="#6a3b1d" />
        </radialGradient>
      </defs>
      <circle cx="160" cy="112" r="82" fill="url(#enheduanna-bronze)" stroke="#4f2b19" strokeWidth="6" />
      <circle cx="160" cy="112" r="68" fill="none" stroke="#5f351d" strokeWidth="2" opacity=".7" />
      <g fill="#4f2d1c" opacity=".9">
        <rect x="91" y="54" width="9" height="18" rx="1" /><rect x="106" y="47" width="7" height="20" rx="1" /><rect x="120" y="58" width="8" height="16" rx="1" />
        <rect x="203" y="52" width="8" height="18" rx="1" /><rect x="218" y="61" width="7" height="16" rx="1" /><rect x="193" y="72" width="9" height="15" rx="1" />
        <rect x="83" y="91" width="9" height="18" rx="1" /><rect x="97" y="82" width="8" height="17" rx="1" /><rect x="223" y="92" width="9" height="17" rx="1" />
        <rect x="88" y="129" width="8" height="16" rx="1" /><rect x="103" y="141" width="10" height="15" rx="1" /><rect x="208" y="137" width="8" height="17" rx="1" />
      </g>
      <g fill="#3f2418">
        <circle cx="160" cy="78" r="14" />
        <path d="M145 96h30l11 66h-52l11-66Zm-2 16-27 34 10 7 24-26m27-17 27 31-9 8-25-25" />
        <path d="M139 73h42l-9-17h-24l-9 17Z" />
      </g>
    </svg>
  );
}

function PapyrusArtifact() {
  return (
    <svg viewBox="0 0 300 300" className="landing-history-art" aria-hidden="true" focusable="false">
      <path d="M34 25 254 40l-11 222-220-13 13-57-9-43 11-55-4-69Z" fill="#c49348" />
      <path d="M43 35 245 48l-9 205-203-12 11-51-8-39 10-52-3-64Z" fill="#d7ae68" opacity=".95" />
      <g stroke="#64431e" strokeWidth="2.7" opacity=".88" strokeLinecap="round">
        <path d="M61 72h92m14 3h48M57 91h74m13 2h78M54 111h55m18 2h84M60 130h83m17 3h56M53 151h69m16 2h76M60 171h45m14 2h99M57 191h82m19 2h49M53 212h63m16 2h78" />
      </g>
      <g stroke="#8a642f" strokeWidth="1.2" opacity=".35">
        <path d="M73 48 58 239M111 50 97 241M151 53l-12 191M192 56l-10 190M225 60l-9 186" />
      </g>
    </svg>
  );
}

function CambridgeArtifact() {
  return (
    <svg viewBox="0 0 430 430" className="landing-history-art" aria-hidden="true" focusable="false">
      <rect x="45" y="30" width="330" height="340" rx="8" fill="#ecd9aa" stroke="#b88d54" strokeWidth="3" />
      <text x="210" y="78" textAnchor="middle" fill="#55412d" fontFamily="Georgia, serif" fontSize="13" letterSpacing="2.4">{"TO THE KING'S MOST"}</text>
      <text x="210" y="96" textAnchor="middle" fill="#55412d" fontFamily="Georgia, serif" fontSize="13" letterSpacing="2.4">EXCELLENT MAJESTIE.</text>
      <rect x="88" y="122" width="71" height="86" fill="#6b5639" opacity=".92" />
      <text x="123" y="180" textAnchor="middle" fill="#e8d7af" fontFamily="Georgia, serif" fontSize="53">T</text>
      <text x="178" y="135" fill="#4c3b2c" fontFamily="Georgia, serif" fontSize="14" fontWeight="700">The Affignes of</text>
      <text x="178" y="155" fill="#4c3b2c" fontFamily="Georgia, serif" fontSize="12">John Skelton, Knight;</text>
      <g stroke="#6c573d" strokeWidth="2.6" opacity=".76" strokeLinecap="round">
        <path d="M178 177h137M178 191h122M90 229h225M90 244h218M90 259h224M90 274h197M90 289h216" />
      </g>
      <text x="210" y="328" textAnchor="middle" fill="#59432d" fontFamily="Georgia, serif" fontSize="18" letterSpacing="5">1534</text>
      <circle cx="316" cy="338" r="44" fill="#7d351e" stroke="#512417" strokeWidth="5" />
      <circle cx="316" cy="338" r="28" fill="none" stroke="#b56d45" strokeWidth="2" opacity=".72" />
      <path d="M306 322h20v31h-20zM296 332h40M301 346h30" stroke="#d18c64" strokeWidth="2.2" fill="none" opacity=".65" />
      <path d="m341 356 39 21m-58-2 22 31" stroke="#6f3e24" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

function FilmArtifact() {
  return (
    <svg viewBox="0 0 500 230" className="landing-history-art" aria-hidden="true" focusable="false">
      <rect x="8" y="8" width="484" height="214" rx="8" fill="#181719" />
      <g fill="#eee9df">
        {Array.from({ length: 14 }).map((_, i) => <rect key={`ft-${i}`} x={20 + i * 34} y="18" width="18" height="10" rx="1.5" />)}
        {Array.from({ length: 14 }).map((_, i) => <rect key={`fb-${i}`} x={20 + i * 34} y="202" width="18" height="10" rx="1.5" />)}
      </g>
      <rect x="24" y="40" width="452" height="150" fill="#d9d6cf" />
      <path d="M24 142c77-43 148-58 218-45 62 11 118 42 234 45v48H24v-48Z" fill="#8e8b84" />
      <path d="M24 105c59-37 117-55 172-52 67 4 154 43 280 89v22c-102-20-184-17-251 2-62 18-118 20-201 24v-85Z" fill="#b6b2aa" />
      <g fill="#454341">
        <circle cx="355" cy="108" r="12" /><path d="M350 119h11v42h-11z" /><path d="m353 130-18 23m21-20 18 23" stroke="#454341" strokeWidth="7" strokeLinecap="round" />
        <circle cx="395" cy="118" r="11" /><path d="M390 129h11v36h-11z" />
        <circle cx="431" cy="127" r="10" /><path d="M426 137h10v31h-10z" />
      </g>
      <path d="M70 155h145l-22-35h-92l-31 35Z" fill="#444240" />
      <circle cx="106" cy="158" r="14" fill="#1c1b1c" /><circle cx="184" cy="158" r="14" fill="#1c1b1c" />
      <text x="422" y="35" fill="#d1a960" fontFamily="Georgia, serif" fontSize="11" letterSpacing="3">1895</text>
    </svg>
  );
}

function DeskProps() {
  return (
    <svg viewBox="0 0 520 250" className="landing-history-props" aria-hidden="true" focusable="false">
      <path d="M7 54 141 20l54 173-137 34Z" fill="#33261e" />
      <path d="M16 64 132 35l45 145-116 29Z" fill="#4b382c" />
      <path d="M36 83 125 61" stroke="#c79a59" strokeWidth="3" opacity=".55" />
      <rect x="153" y="122" width="78" height="92" rx="12" fill="#171313" />
      <rect x="168" y="104" width="48" height="28" rx="8" fill="#2b2220" />
      <ellipse cx="192" cy="124" rx="39" ry="10" fill="#080707" opacity=".72" />
      <path d="M217 206 455 138" stroke="#3a2a20" strokeWidth="14" strokeLinecap="round" />
      <path d="m447 141 60-18-48 36Z" fill="#a87338" />
      <path d="M205 207 452 142" stroke="#b3864f" strokeWidth="2" opacity=".7" />
      <path d="M0 229c91-16 164-17 240-7 83 11 166 10 280-15v43H0v-21Z" fill="#d8b27c" opacity=".32" />
      <path d="M9 228c88-12 177-5 265 5" stroke="#8d6f4e" strokeWidth="1.2" opacity=".42" />
    </svg>
  );
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
          <div className="landing-history__quill" aria-hidden="true" />
          <div className="landing-history__script" aria-hidden="true" />
          <DeskProps />

          <article className="landing-history-card landing-history-card--writer">
            <div className="landing-history-card__visual"><EnheduannaArtifact /></div>
            <div className="landing-history-card__copy">
              <span>MÖ 23. YÜZYIL · YAZ</span>
              <h3>Enheduanna</h3>
              <strong>Bir yazar, adını eserinin yanında bıraktı.</strong>
              <p>Binlerce yıl geçti.<br />Adı hâlâ okunuyor.</p>
            </div>
          </article>

          <article className="landing-history-card landing-history-card--editor">
            <div className="landing-history-card__visual"><PapyrusArtifact /></div>
            <div className="landing-history-card__copy">
              <span>MÖ 3. YÜZYIL · GELİŞTİR</span>
              <h3>Zenodotos</h3>
              <strong>Birisi yazılmış bir metne yeniden baktı.</strong>
              <p>Çünkü bazen bir eser, ikinci bir bakışla daha da güçlenir.</p>
            </div>
          </article>

          <article className="landing-history-card landing-history-card--publisher">
            <div className="landing-history-card__visual"><CambridgeArtifact /></div>
            <div className="landing-history-card__copy">
              <span>1534 · İNAN</span>
              <h3>Cambridge<br />University Press</h3>
              <strong>Bir eserin dünyaya ulaşması için birilerinin ona inanması gerekiyordu.</strong>
              <p>Yazarın yolculuğuna yayıncı da katıldı.</p>
            </div>
          </article>

          <article className="landing-history-cinema">
            <div className="landing-history-cinema__visual"><FilmArtifact /></div>
            <div className="landing-history-cinema__note">
              <span>1895 · HAYATA GEÇİR</span>
              <h3>Hikâye perdeye çıktı.</h3>
              <p>Hikâyeler artık yalnızca okunmuyordu, izlenmeye de başlandı.</p>
              <p>Bir eser, yaşadığı yerde kalmak zorunda değildi.</p>
            </div>
          </article>

          <article className="landing-history-now">
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
            <span className="landing-history-now__seal" aria-hidden="true">İO</span>
          </article>
        </div>
      </div>
    </section>
  );
}
