import Link from "next/link";

function DiskArtifact() {
  return (
    <svg className="landing-history-art" viewBox="0 0 320 220" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="history-disk-bronze" cx="42%" cy="34%" r="70%">
          <stop offset="0" stopColor="#d1ae72" />
          <stop offset="0.58" stopColor="#a87b43" />
          <stop offset="1" stopColor="#72502e" />
        </radialGradient>
      </defs>
      <circle cx="128" cy="108" r="82" fill="url(#history-disk-bronze)" stroke="#64472b" strokeWidth="5" />
      <circle cx="128" cy="108" r="70" fill="none" stroke="#6f512f" strokeWidth="2" opacity=".68" />
      <g stroke="#63472b" strokeWidth="3" strokeLinecap="round" opacity=".82">
        <path d="M72 62l14 5-10 7m31-22 13 8-11 5m38-7 13 6-10 8m-71 24 12 6-11 6m32-13 13 7-10 7m35-12 13 7-11 6m-76 27 13 6-10 8m33-11 12 7-11 6m38-10 13 7-10 6m-73 27 12 6-10 7m32-12 13 7-10 6m36-10 12 6-10 7" />
      </g>
      <g fill="#5e432a" opacity=".9">
        <circle cx="126" cy="75" r="10" />
        <path d="M115 88h22l10 45h-40l8-45Zm-3 16-22 25 7 5 22-19m21-12 20 20-6 7-20-17" />
      </g>
      <path d="M210 45c29 18 48 47 52 78-9-8-22-14-36-17 4-24-2-44-16-61Z" fill="#d7bf92" opacity=".34" />
    </svg>
  );
}

function PapyrusArtifact() {
  return (
    <svg className="landing-history-art" viewBox="0 0 320 220" aria-hidden="true" focusable="false">
      <path d="M45 23 279 31l-8 165-231-10 8-48-7-28 9-39-5-48Z" fill="#c9a96f" />
      <path d="M53 30 270 38l-7 150-214-9 7-43-6-27 8-36-5-43Z" fill="#dbc18c" opacity=".92" />
      <g fill="#5b482f" opacity=".82">
        <rect x="76" y="59" width="128" height="5" rx="2" />
        <rect x="75" y="75" width="163" height="5" rx="2" />
        <rect x="72" y="91" width="145" height="5" rx="2" />
        <rect x="76" y="107" width="171" height="5" rx="2" />
        <rect x="70" y="123" width="119" height="5" rx="2" />
        <rect x="78" y="139" width="158" height="5" rx="2" />
        <rect x="71" y="155" width="137" height="5" rx="2" />
      </g>
      <g stroke="#8d6d42" strokeWidth="1.5" opacity=".35">
        <path d="M61 35v142m25-141v143m31-142v143m34-142v144m34-143v144m35-142v143m31-141v140" />
      </g>
    </svg>
  );
}

function CharterArtifact() {
  return (
    <svg className="landing-history-art" viewBox="0 0 360 260" aria-hidden="true" focusable="false">
      <path d="M42 15h271l7 223-278 3-5-55 7-49-6-47 4-75Z" fill="#dfc79a" />
      <path d="M62 34h232v170H62Z" fill="#f0dfbd" opacity=".8" />
      <text x="178" y="57" textAnchor="middle" fill="#63503b" fontSize="10" fontFamily="Georgia, serif" letterSpacing="2.2">TO THE KING'S MOST EXCELLENT MAIESTIE.</text>
      <path d="M105 78h146M88 94h177M82 109h190M93 124h167M80 139h192M103 154h151M86 169h183" stroke="#66533d" strokeWidth="4" strokeLinecap="round" opacity=".7" />
      <text x="164" y="193" textAnchor="middle" fill="#63503b" fontSize="18" fontFamily="Georgia, serif" letterSpacing="4">1534</text>
      <circle cx="271" cy="200" r="31" fill="#70402f" stroke="#4e2b22" strokeWidth="4" />
      <circle cx="271" cy="200" r="19" fill="none" stroke="#aa765c" strokeWidth="2" opacity=".72" />
      <path d="m260 222-21 31m42-30 22 28" stroke="#6d4938" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function FilmArtifact() {
  return (
    <svg className="landing-history-art" viewBox="0 0 420 250" aria-hidden="true" focusable="false">
      <rect x="10" y="15" width="400" height="220" rx="5" fill="#211f22" />
      <g fill="#eee8dc">
        {Array.from({ length: 12 }).map((_, index) => <rect key={`top-${index}`} x={22 + index * 32} y="24" width="17" height="11" rx="2" />)}
        {Array.from({ length: 12 }).map((_, index) => <rect key={`bottom-${index}`} x={22 + index * 32} y="214" width="17" height="11" rx="2" />)}
      </g>
      <rect x="25" y="45" width="370" height="158" fill="#d8d4ca" />
      <path d="M25 171c59-31 111-43 162-35 45 7 95 29 208 22v45H25v-32Z" fill="#8e8c86" />
      <path d="M25 135c43-39 94-61 145-62 53-2 119 24 225 72v24c-85-24-155-25-211-11-52 13-100 31-159 45v-68Z" fill="#b7b4ab" />
      <path d="M70 163h150" stroke="#4d4b49" strokeWidth="6" />
      <path d="m92 153 58-31 55 6 40 35H92Z" fill="#4e4c4a" />
      <circle cx="132" cy="166" r="15" fill="#252426" />
      <circle cx="218" cy="166" r="15" fill="#252426" />
      <path d="M298 102v74m27-56v56m27-37v37" stroke="#4e4c4a" strokeWidth="8" strokeLinecap="round" />
      <circle cx="298" cy="88" r="10" fill="#4e4c4a" />
      <circle cx="325" cy="106" r="9" fill="#4e4c4a" />
      <circle cx="352" cy="126" r="9" fill="#4e4c4a" />
      <text x="334" y="37" fill="#d6b470" fontSize="12" fontFamily="Georgia, serif" letterSpacing="3">1895</text>
    </svg>
  );
}

function DeskProps() {
  return (
    <svg className="landing-history-props" viewBox="0 0 430 250" aria-hidden="true" focusable="false">
      <path d="M8 76 120 42l57 142-111 40Z" fill="#382a20" opacity=".94" />
      <path d="M17 84 111 55l47 119-93 33Z" fill="#514033" />
      <path d="M45 115 102 99" stroke="#b38b52" strokeWidth="4" opacity=".6" />
      <rect x="95" y="135" width="72" height="83" rx="12" fill="#151314" />
      <rect x="111" y="115" width="40" height="29" rx="8" fill="#282124" />
      <ellipse cx="131" cy="136" rx="35" ry="9" fill="#080808" opacity=".72" />
      <path d="M160 206 371 142" stroke="#3c2b20" strokeWidth="13" strokeLinecap="round" />
      <path d="m364 144 51-16-40 34Z" fill="#b18342" />
      <path d="m375 151 25-13" stroke="#6d4b28" strokeWidth="2" />
      <path d="M151 208 366 145" stroke="#9c6d37" strokeWidth="2" opacity=".7" />
    </svg>
  );
}

const roles = [
  { label: "Yazıyorsan", action: "ilk cümleni yaz.", href: "/kayit?rol=writer" },
  { label: "Okuyorsan", action: "ilk sen keşfet.", href: "/kesfet" },
  { label: "Editörsen", action: "ilk sen geliştir.", href: "/kayit?rol=editor" },
  { label: "Yayıncıysan", action: "ilk sen inan.", href: "/kayit?rol=publisher" },
] as const;

export function HistoryInspiration() {
  return (
    <section className="landing-history" id="hikayenin-yolculugu" aria-labelledby="history-heading">
      <div className="landing-container">
        <header className="landing-history__heading">
          <span className="landing-history__eyebrow">Hikâyenin yolculuğu</span>
          <h2 id="history-heading">Her şey bir <em>“ilk”</em> ile başlar.</h2>
          <p>Binlerce yıldır birileri ilk cümleyi yazıyor. Birileri ona yeniden bakıyor. Birileri ona inanıyor. Ve bazı hikâyeler başladıkları yerden çok daha uzağa gidiyor.</p>
        </header>

        <div className="landing-history__collage">
          <span className="landing-history__thread" aria-hidden="true" />
          <DeskProps />

          <article className="landing-history-card landing-history-card--writer">
            <div className="landing-history-card__visual"><DiskArtifact /></div>
            <div className="landing-history-card__copy">
              <span>MÖ 23. YÜZYIL · YAZ</span>
              <h3>Enheduanna</h3>
              <strong>Bir yazar, adını eserinin yanında bıraktı.</strong>
              <p>Binlerce yıl geçti. Adı hâlâ okunuyor.</p>
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
            <div className="landing-history-card__visual"><CharterArtifact /></div>
            <div className="landing-history-card__copy">
              <span>1534 · İNAN</span>
              <h3>Cambridge University Press</h3>
              <strong>Bir eserin dünyaya ulaşması için birilerinin ona inanması gerekiyordu.</strong>
              <p>Yazarın yolculuğuna yayıncı da katıldı.</p>
            </div>
          </article>

          <article className="landing-history-card landing-history-card--cinema">
            <div className="landing-history-card__visual"><FilmArtifact /></div>
            <div className="landing-history-card__copy">
              <span>1895 · HAYATA GEÇİR</span>
              <h3>Hikâye perdeye çıktı.</h3>
              <strong>Hikâyeler artık yalnızca okunmuyordu. İzlenmeye de başlandı.</strong>
              <p>Bir eser, başladığı yerde kalmak zorunda değildir.</p>
            </div>
          </article>

          <article className="landing-history-now">
            <span className="landing-history-now__year">2026 · ŞİMDİ SIRA SENDE.</span>
            <h3>Bugünün ilk cümlesi, yarının kitabı olabilir.</h3>
            <p>Bir okur onu ilk kez keşfedebilir. Bir editör onu geliştirebilir. Bir yayınevi ona inanabilir. Ve bir gün o hikâye başladığından çok daha uzağa gidebilir.</p>
            <div className="landing-history-now__roles" aria-label="İlkOku rol seçenekleri">
              {roles.map((role) => (
                <Link href={role.href} key={role.label}>
                  <span>{role.label}</span>
                  <strong>{role.action}</strong>
                </Link>
              ))}
            </div>
            <div className="landing-history-now__closing">
              <strong>Seninki neden sıradaki hikâye olmasın?</strong>
              <span>Her şey bir “ilk” ile başlar. <b>İlkOku.</b></span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
