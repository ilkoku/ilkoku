function EnheduannaArtifact() {
  const glyphs = [
    [55, 48, 10, 18], [74, 41, 8, 22], [90, 53, 9, 17], [225, 47, 9, 19], [242, 58, 8, 18],
    [50, 83, 8, 18], [68, 92, 10, 17], [246, 91, 9, 17], [56, 126, 9, 18], [77, 140, 10, 16],
    [232, 132, 8, 18], [247, 149, 10, 16], [96, 34, 7, 17], [211, 36, 7, 17],
  ];

  return (
    <svg viewBox="0 0 320 235" className="landing-history-art" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="enheduanna-relief" cx="38%" cy="30%" r="76%">
          <stop offset="0" stopColor="#d7aa63" />
          <stop offset="0.45" stopColor="#a9682f" />
          <stop offset="1" stopColor="#5d321b" />
        </radialGradient>
        <filter id="enheduanna-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#4c2e1b" floodOpacity=".35" />
        </filter>
      </defs>
      <g filter="url(#enheduanna-shadow)">
        <circle cx="160" cy="112" r="87" fill="url(#enheduanna-relief)" stroke="#4e2b19" strokeWidth="7" />
        <circle cx="160" cy="112" r="72" fill="none" stroke="#6f4427" strokeWidth="2.5" opacity=".9" />
        <circle cx="160" cy="112" r="61" fill="#9a5e2b" opacity=".28" />
        <g fill="#422519" opacity=".92">
          {glyphs.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} rx="1" />)}
        </g>
        <g fill="#3f2418">
          <path d="M143 69h34l-6-13h-22l-6 13Z" />
          <circle cx="160" cy="79" r="14" />
          <path d="M145 98h30l9 62h-48l9-62Z" />
          <path d="m146 109-30 35 9 8 25-28m24-15 31 29-8 9-27-24" />
          <path d="M136 160h48l-7 13h-34l-7-13Z" />
        </g>
        <path d="M129 176c22 8 42 8 63 0" fill="none" stroke="#d8ae6a" strokeWidth="2" opacity=".34" />
      </g>
    </svg>
  );
}

function PapyrusArtifact() {
  const rows = [66, 84, 103, 122, 141, 160, 179, 198];
  return (
    <svg viewBox="0 0 300 300" className="landing-history-art" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="papyrus-sheet" x1="0" x2="1">
          <stop offset="0" stopColor="#b97831" />
          <stop offset=".14" stopColor="#d6a252" />
          <stop offset=".54" stopColor="#e5bd73" />
          <stop offset="1" stopColor="#bd7e38" />
        </linearGradient>
      </defs>
      <path d="M37 25 257 41l-9 220-23-6-19 11-31-5-26 8-28-11-31 6-25-12-27 3 9-46-8-31 10-48-6-38 11-67Z" fill="url(#papyrus-sheet)" stroke="#875525" strokeWidth="3" />
      <path d="M58 45c40 8 79 5 116 8 29 2 46 7 62 10M52 230c51 8 114 7 178 11" stroke="#8c5a2b" strokeWidth="1.5" opacity=".45" fill="none" />
      <g stroke="#6a411f" strokeWidth="2.4" opacity=".88" strokeLinecap="round">
        {rows.map((y, i) => (
          <g key={y}>
            <path d={`M61 ${y}h20m8 0h12m8 0h28m10 0h11m8 0h22m8 0h22`} />
            <path d={`M68 ${y + 7}h13m7 0h24m8 0h18m9 0h30m9 0h21`} opacity={i % 2 ? .78 : .9} />
          </g>
        ))}
      </g>
      <g stroke="#7f552a" strokeWidth="1.1" opacity=".26">
        <path d="M82 44 65 244M119 48 105 252M157 50l-11 205M196 53l-8 202M225 56l-6 195" />
      </g>
    </svg>
  );
}

function CambridgeArtifact() {
  return (
    <svg viewBox="0 0 430 430" className="landing-history-art" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="cambridge-paper" x1="0" x2="1">
          <stop offset="0" stopColor="#e4c98f" />
          <stop offset=".5" stopColor="#f0dfb9" />
          <stop offset="1" stopColor="#d8b779" />
        </linearGradient>
      </defs>
      <rect x="43" y="28" width="334" height="342" rx="7" fill="url(#cambridge-paper)" stroke="#a97d44" strokeWidth="3" />
      <rect x="53" y="38" width="314" height="322" rx="4" fill="none" stroke="#b88d54" strokeWidth="1.5" opacity=".7" />
      <text x="210" y="76" textAnchor="middle" fill="#59452f" fontFamily="Georgia, serif" fontSize="13" letterSpacing="2.3">{"TO THE KING'S MOST"}</text>
      <text x="210" y="95" textAnchor="middle" fill="#59452f" fontFamily="Georgia, serif" fontSize="13" letterSpacing="2.3">EXCELLENT MAJESTIE.</text>
      <rect x="86" y="121" width="73" height="88" fill="#6f593a" />
      <text x="123" y="180" textAnchor="middle" fill="#eadbb8" fontFamily="Georgia, serif" fontSize="54">T</text>
      <text x="177" y="137" fill="#463629" fontFamily="Georgia, serif" fontSize="14" fontWeight="700">The Affignes of</text>
      <text x="177" y="156" fill="#463629" fontFamily="Georgia, serif" fontSize="12">John Skelton, Knight;</text>
      <g stroke="#66513a" strokeWidth="2.4" opacity=".78" strokeLinecap="round">
        <path d="M177 177h138M177 191h116M89 228h226M89 243h218M89 258h226M89 273h198M89 288h218" />
      </g>
      <text x="210" y="327" textAnchor="middle" fill="#59432d" fontFamily="Georgia, serif" fontSize="18" letterSpacing="5">1534</text>
      <circle cx="317" cy="337" r="44" fill="#7a321d" stroke="#4d2317" strokeWidth="5" />
      <circle cx="317" cy="337" r="28" fill="none" stroke="#bd7249" strokeWidth="2" opacity=".75" />
      <path d="M307 321h20v31h-20zM297 331h40M302 345h30" stroke="#d08c63" strokeWidth="2.1" fill="none" opacity=".68" />
      <path d="m342 355 39 22m-58-2 22 31" stroke="#704026" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

function FilmArtifact() {
  return (
    <svg viewBox="0 0 500 230" className="landing-history-art" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="film-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e8e3d8" />
          <stop offset="1" stopColor="#a9a49a" />
        </linearGradient>
      </defs>
      <rect x="7" y="7" width="486" height="216" rx="9" fill="#151416" />
      <g fill="#eee9df">
        {Array.from({ length: 14 }).map((_, i) => <rect key={`ft-${i}`} x={20 + i * 34} y="18" width="18" height="10" rx="1.5" />)}
        {Array.from({ length: 14 }).map((_, i) => <rect key={`fb-${i}`} x={20 + i * 34} y="202" width="18" height="10" rx="1.5" />)}
      </g>
      <rect x="24" y="40" width="452" height="150" fill="url(#film-sky)" />
      <path d="M24 126c72-38 132-49 187-39 42 7 79 25 121 39 43 14 88 16 144 12v52H24v-64Z" fill="#77736e" />
      <path d="M24 86c65-37 123-47 174-40 59 9 113 42 171 58 33 9 68 11 107 7v25c-77 0-126-12-178-30-51-18-95-25-145-17-44 8-83 21-129 44V86Z" fill="#aaa59c" opacity=".86" />
      <g fill="#1d1c1d">
        <rect x="86" y="111" width="122" height="42" rx="3" />
        <rect x="118" y="78" width="54" height="38" rx="2" />
        <rect x="175" y="91" width="40" height="62" rx="3" />
        <rect x="71" y="131" width="31" height="22" />
        <circle cx="112" cy="159" r="19" /><circle cx="183" cy="159" r="19" />
        <circle cx="223" cy="156" r="13" />
        <rect x="205" y="104" width="9" height="28" />
        <path d="M210 101c7-14 7-28 2-43 18 11 23 26 14 45Z" opacity=".5" />
      </g>
      <path d="M49 174h382M52 183h375" stroke="#383638" strokeWidth="3" opacity=".75" />
      <g fill="#444142">
        <circle cx="360" cy="118" r="8" /><rect x="356" y="126" width="8" height="27" rx="2" />
        <circle cx="396" cy="121" r="7" /><rect x="393" y="128" width="7" height="25" rx="2" />
      </g>
      <text x="421" y="35" fill="#d2aa60" fontFamily="Georgia, serif" fontSize="11" letterSpacing="3">1895</text>
    </svg>
  );
}

function DeskProps() {
  return (
    <svg viewBox="0 0 560 260" className="landing-history-props" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="book-cover" x1="0" x2="1">
          <stop offset="0" stopColor="#2f211a" />
          <stop offset="1" stopColor="#513828" />
        </linearGradient>
      </defs>
      <path d="M12 58 156 18l58 177-146 39Z" fill="url(#book-cover)" />
      <path d="M23 68 145 35l48 147-122 33Z" fill="none" stroke="#b58b55" strokeWidth="2" opacity=".48" />
      <path d="M44 84 135 60" stroke="#c7a167" strokeWidth="3" opacity=".65" />
      <rect x="176" y="126" width="83" height="94" rx="12" fill="#151212" />
      <rect x="193" y="106" width="50" height="30" rx="8" fill="#2a2220" />
      <ellipse cx="217" cy="128" rx="41" ry="11" fill="#080707" opacity=".76" />
      <path d="M247 214 486 143" stroke="#3b291f" strokeWidth="14" strokeLinecap="round" />
      <path d="m477 146 67-23-52 42Z" fill="#a67339" />
      <path d="M237 214 484 147" stroke="#c09a69" strokeWidth="2" opacity=".62" />
      <path d="M2 233c100-18 180-18 263-6 88 12 178 11 295-17v50H2v-27Z" fill="#d7b27e" opacity=".32" />
      <path d="M14 233c94-12 190-5 282 5" stroke="#8d6f4e" strokeWidth="1.2" opacity=".42" />
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
        .landing-history::before,
        .landing-history__collage::before,
        .landing-history__quill,
        .landing-history__script {
          display: none !important;
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
