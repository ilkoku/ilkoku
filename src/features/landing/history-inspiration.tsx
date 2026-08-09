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
    <svg className="landing-history-art" viewBox="0 0 320 220" aria-hidden="true" focusable="false">
      <path d="M45 18h224l7 181-231 3-5-44 7-41-6-38 4-61Z" fill="#e0c99e" />
      <path d="M60 35h193v143H60Z" fill="#f0dfbd" opacity=".78" />
      <path d="M102 53h112M83 70h151M78 82h162M86 94h147M76 106h166M92 118h136M79 130h159M88 142h137" stroke="#66533d" strokeWidth="4" strokeLinecap="round" opacity=".7" />
      <path d="M104 39h105" stroke="#66533d" strokeWidth="3" opacity=".55" />
      <circle cx="220" cy="169" r="28" fill="#70402f" stroke="#4e2b22" strokeWidth="4" />
      <circle cx="220" cy="169" r="18" fill="none" stroke="#aa765c" strokeWidth="2" opacity=".72" />
      <path d="m210 190-20 29m39-28 20 26" stroke="#6d4938" strokeWidth="6" strokeLinecap="round" />
      <text x="151" y="166" textAnchor="middle" fill="#63503b" fontSize="18" fontFamily="Georgia, serif" letterSpacing="4">1534</text>
    </svg>
  );
}

function FilmArtifact() {
  return (
    <svg className="landing-history-art" viewBox="0 0 320 220" aria-hidden="true" focusable="false">
      <rect x="18" y="25" width="284" height="170" rx="5" fill="#211f22" />
      <g fill="#eee8dc">
        {Array.from({ length: 9 }).map((_, index) => <rect key={`top-${index}`} x={30 + index * 31} y="33" width="17" height="10" rx="2" />)}
        {Array.from({ length: 9 }).map((_, index) => <rect key={`bottom-${index}`} x={30 + index * 31} y="177" width="17" height="10" rx="2" />)}
      </g>
      <rect x="35" y="52" width="250" height="116" fill="#d8d4ca" />
      <path d="M36 142c48-25 90-34 131-27 38 7 76 20 118 15v38H35l1-26Z" fill="#8e8c86" />
      <path d="M36 116c35-31 74-47 113-48 37-1 79 17 136 51v17c-57-15-109-17-151-7-34 8-65 20-98 36v-49Z" fill="#b7b4ab" />
      <path d="M61 135h130" stroke="#4d4b49" strokeWidth="5" />
      <path d="m80 126 52-24 48 5 35 27H80Z" fill="#4e4c4a" />
      <circle cx="112" cy="137" r="13" fill="#252426" />
      <circle cx="187" cy="137" r="13" fill="#252426" />
      <path d="M229 93v56m18-43v43m17-30v30" stroke="#4e4c4a" strokeWidth="7" strokeLinecap="round" />
      <circle cx="229" cy="81" r="9" fill="#4e4c4a" />
      <circle cx="247" cy="95" r="8" fill="#4e4c4a" />
      <circle cx="264" cy="108" r="8" fill="#4e4c4a" />
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
              <strong>Hikâyeler artık yalnızca okunmuyordu.</strong>
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
