import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import "./landing.css";

export const metadata: Metadata = {
  title: "İlkOku | İlk cümle, ilk okurun, ilk adımın.",
  description:
    "Yazarları, okuyucuları, editörleri ve yayınevlerini aynı platformda buluşturan dijital edebiyat ekosistemi.",
  openGraph: {
    title: "İlkOku | İlk cümle, ilk okurun, ilk adımın.",
    description:
      "Yazarları, okuyucuları, editörleri ve yayınevlerini aynı platformda buluşturan dijital edebiyat ekosistemi.",
    type: "website",
    locale: "tr_TR",
  },
  twitter: {
    card: "summary_large_image",
    title: "İlkOku | İlk cümle, ilk okurun, ilk adımın.",
    description:
      "Yazarları, okuyucuları, editörleri ve yayınevlerini aynı platformda buluşturan dijital edebiyat ekosistemi.",
  },
};

type IconName =
  | "writer"
  | "reader"
  | "editor"
  | "publisher"
  | "account"
  | "create"
  | "book"
  | "message"
  | "feedback"
  | "shield"
  | "trend"
  | "bolt";

function LandingIcon({ name }: { name: IconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  const paths: Record<IconName, React.ReactNode> = {
    writer: (
      <>
        <path d="M4 20h4l10.4-10.4a2.2 2.2 0 0 0-3.1-3.1L4.9 16.9 4 20Z" />
        <path d="m13.8 8 3.1 3.1" />
      </>
    ),
    reader: (
      <>
        <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5Z" />
        <path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z" />
      </>
    ),
    editor: (
      <>
        <path d="M4 20h4l10.2-10.2a2.1 2.1 0 1 0-3-3L5 17l-1 3Z" />
        <path d="M13.8 8.2l3 3" />
        <path d="M4 4h7" />
      </>
    ),
    publisher: (
      <>
        <path d="M3 21h18" />
        <path d="M5 21V9l7-5 7 5v12" />
        <path d="M9 21v-6h6v6" />
      </>
    ),
    account: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </>
    ),
    create: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
        <path d="M18 8v6M15 11h6" />
      </>
    ),
    book: (
      <>
        <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5Z" />
        <path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z" />
      </>
    ),
    message: (
      <>
        <path d="M21 15a4 4 0 0 1-4 4H9l-5 3v-7a4 4 0 0 1-1-2.6V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
        <path d="M8 9h8M8 13h5" />
      </>
    ),
    feedback: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 20 6v6c0 4.8-3.2 7.4-8 9-4.8-1.6-8-4.2-8-9V6l8-3Z" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </>
    ),
    trend: (
      <>
        <path d="M4 19V9M10 19V5M16 19v-7M3 19h18" />
        <path d="m5 12 5-4 4 2 6-6" />
        <path d="M16 4h4v4" />
      </>
    ),
    bolt: <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" />,
  };

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" {...common}>
      {paths[name]}
    </svg>
  );
}

const roles = [
  { key: "writer", title: "Yazar", description: "Hikâyelerini yaz, geliştir ve yayınevlerine ulaştır.", icon: "writer", cta: "Yazar Ol", className: "landing-role--writer" },
  { key: "reader", title: "Okuyucu", description: "Yeni eserler keşfet, oku ve favorilerini oluştur.", icon: "reader", cta: "Okuyucu Ol", className: "landing-role--reader" },
  { key: "editor", title: "Editör", description: "Yazarlara profesyonel ve yapıcı geri bildirim ver.", icon: "editor", cta: "Editör Başvurusu", className: "landing-role--editor" },
  { key: "publisher", title: "Yayınevi", description: "Yeni yazarları keşfet ve başvuruları yönet.", icon: "publisher", cta: "Yayınevi Başvurusu", className: "landing-role--publisher" },
] as const;

const benefits = [
  { icon: "shield", title: "Güvenli Platform", description: "Kişisel verilerin ve eserlerin güvende.", className: "landing-benefit-v2--purple" },
  { icon: "message", title: "Editör Geri Bildirimi", description: "Uzman editörlerden yapıcı ve detaylı geri bildirim al.", className: "landing-benefit-v2--blue" },
  { icon: "publisher", title: "Yayınevleriyle Bağlantı", description: "Eserlerini doğrudan yayınevlerine ulaştır.", className: "landing-benefit-v2--orange" },
  { icon: "trend", title: "Yazma Takibi", description: "İlerlemeni takip et, hedeflerine ulaş.", className: "landing-benefit-v2--green" },
  { icon: "create", title: "Okuyucu Topluluğu", description: "Okuyucularla etkileşime geç, fikirlerini paylaş.", className: "landing-benefit-v2--blue" },
  { icon: "bolt", title: "Tek Platform", description: "Yaz, geliştir, paylaş ve yayınlan.", className: "landing-benefit-v2--purple" },
] as const;

const stats = [
  { icon: "account", value: "2.847+", label: "Yazar" },
  { icon: "create", value: "18.592+", label: "Okuyucu" },
  { icon: "editor", value: "412+", label: "Editör" },
  { icon: "publisher", value: "78+", label: "Yayınevi" },
  { icon: "book", value: "6.215+", label: "Eser" },
  { icon: "message", value: "34.760+", label: "Yorum" },
] as const;

export default function HomePage() {
  return (
    <main className="landing-page">
      <style>{`
        .landing-header__inner { grid-template-columns:11.25rem minmax(0,1fr) auto; }
        .landing-header__kicker { justify-self:center; min-width:clamp(14rem,28vw,24rem); justify-content:center; padding:.7rem clamp(1.25rem,3vw,2.5rem); font-size:clamp(.68rem,.8vw,.78rem); letter-spacing:.17em; white-space:nowrap; }
        .landing-why-v2 { padding-block:clamp(3.75rem,6vw,5.75rem); border-block:1px solid rgba(78,60,151,.08); background:linear-gradient(180deg,#faf9ff 0%,#f5f2ff 100%); }
        .landing-why-v2 .landing-section-heading { margin-bottom:2.5rem; }
        .landing-why-v2 .landing-section-heading h2::after { content:"✦"; display:block; margin:.55rem auto 0; color:var(--landing-primary); font-family:var(--landing-font-sans); font-size:.85rem; letter-spacing:.7rem; }
        .landing-benefits-v2 { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:.75rem; }
        .landing-benefit-v2 { min-height:15.25rem; display:flex; flex-direction:column; align-items:center; padding:1.75rem 1rem; border:1px solid rgba(70,54,134,.12); border-radius:1rem; text-align:center; background:rgba(255,255,255,.82); box-shadow:0 .75rem 2rem rgba(45,31,103,.055); }
        .landing-benefit-v2__icon { width:4.4rem; height:4.4rem; display:grid; place-items:center; margin-bottom:1.25rem; border-radius:50%; color:var(--benefit-accent,#6847e8); background:var(--benefit-soft,#eee9ff); }
        .landing-benefit-v2__icon svg { width:2.35rem; height:2.35rem; }
        .landing-benefit-v2--purple { --benefit-accent:#5b35dd; --benefit-soft:#eee9ff; }
        .landing-benefit-v2--blue { --benefit-accent:#1768df; --benefit-soft:#e9f2ff; }
        .landing-benefit-v2--orange { --benefit-accent:#e77b16; --benefit-soft:#fff0df; }
        .landing-benefit-v2--green { --benefit-accent:#169d7a; --benefit-soft:#e4f7f1; }
        .landing-benefit-v2 h3 { margin:0 0 .7rem; color:var(--landing-night); font-size:.88rem; line-height:1.35; }
        .landing-benefit-v2 p { margin:0; color:var(--landing-muted); font-size:.73rem; line-height:1.65; }
        .landing-stats-v2 { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); margin-top:1.5rem; overflow:hidden; border:1px solid rgba(104,71,232,.2); border-radius:1rem; background:rgba(255,255,255,.72); box-shadow:inset 0 1px 0 rgba(255,255,255,.9); }
        .landing-stat-v2 { min-height:6.25rem; display:flex; align-items:center; justify-content:center; gap:.8rem; padding:1rem; border-right:1px solid rgba(104,71,232,.14); }
        .landing-stat-v2:last-child { border-right:0; }
        .landing-stat-v2__icon { width:2.65rem; height:2.65rem; flex:0 0 auto; display:grid; place-items:center; border-radius:50%; color:var(--landing-primary-strong); background:#f0ecff; }
        .landing-stat-v2__icon svg { width:1.45rem; height:1.45rem; }
        .landing-stat-v2 strong { display:block; color:var(--landing-primary-strong); font-size:1.35rem; line-height:1.1; }
        .landing-stat-v2 span { display:block; margin-top:.25rem; color:var(--landing-night-soft); font-size:.75rem; }
        .landing-footer { position:relative; isolation:isolate; overflow:hidden; border-top:0; color:#fff; background:radial-gradient(circle at 78% 20%,rgba(155,126,255,.5),transparent 19rem),radial-gradient(circle at 12% 110%,rgba(116,80,240,.38),transparent 22rem),linear-gradient(135deg,#0f0e2d 0%,#28205e 54%,#4e32b5 100%); }
        .landing-footer::before { content:""; position:absolute; z-index:-1; top:-9rem; right:8%; width:22rem; aspect-ratio:1; border:1px solid rgba(255,255,255,.09); border-radius:50%; box-shadow:0 0 0 2rem rgba(255,255,255,.025),0 0 0 5rem rgba(255,255,255,.018); }
        .landing-footer h3,.landing-footer__grid>div:first-child p strong { color:#fff; }
        .landing-footer__grid>div:first-child p,.landing-footer__grid>div>a { color:#dedaf4; }
        .landing-footer__grid>div>a:hover { color:#fff; }
        .landing-footer__copyright { border-top-color:rgba(255,255,255,.14); color:#c9c4e5; }
        @media (max-width:64rem) { .landing-benefits-v2 { grid-template-columns:repeat(3,1fr); } .landing-stats-v2 { grid-template-columns:repeat(3,1fr); } .landing-stat-v2:nth-child(3) { border-right:0; } .landing-stat-v2:nth-child(-n+3) { border-bottom:1px solid rgba(104,71,232,.14); } }
        @media (max-width:48rem) { .landing-header__inner { grid-template-columns:1fr auto; } .landing-header__kicker { grid-row:2; grid-column:1/-1; width:100%; min-width:0; margin:0 0 .75rem; } .landing-benefits-v2 { grid-template-columns:repeat(2,1fr); } .landing-stats-v2 { grid-template-columns:repeat(2,1fr); } .landing-stat-v2 { border-bottom:1px solid rgba(104,71,232,.14); } .landing-stat-v2:nth-child(3) { border-right:1px solid rgba(104,71,232,.14); } .landing-stat-v2:nth-child(even) { border-right:0; } .landing-stat-v2:nth-last-child(-n+2) { border-bottom:0; } }
        @media (max-width:34rem) { .landing-benefits-v2 { grid-template-columns:1fr; } .landing-benefit-v2 { min-height:auto; } }
      `}</style>

      <svg className="landing-brand-filter" aria-hidden="true" focusable="false">
        <filter id="landing-brand-filter" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0 0 0 0 .408 0 0 0 0 .278 0 0 0 0 .91 1.35 1.35 1.35 0 -2.6" />
        </filter>
      </svg>

      <header className="landing-header">
        <div className="landing-container landing-header__inner">
          <Link className="landing-logo" href="/" aria-label="İlkOku ana sayfa">
            <Image src={logo} alt="İlkOku" priority sizes="(max-width: 480px) 136px, (max-width: 768px) 144px, (max-width: 1024px) 172px, 180px" />
          </Link>
          <span className="landing-kicker landing-header__kicker">Dijital edebiyat platformu</span>
          <div className="landing-header__tools">
            <details className="landing-account">
              <summary aria-label="Hesap menüsünü aç"><LandingIcon name="account" /></summary>
              <div className="landing-account__menu"><Link href="/giris">Giriş Yap</Link><a href="#roller">Üye Ol</a></div>
            </details>
          </div>
        </div>
      </header>

      <section className="landing-hero" id="hakkimizda">
        <div className="landing-container landing-hero__grid">
          <div className="landing-hero__content">
            <h1>İlk cümle,<br />ilk okurun,<br /><span>ilk adımın.</span></h1>
            <p>Yazarları, editörleri, okuyucuları ve yayınevlerini aynı platformda buluşturan dijital edebiyat ekosistemi.</p>
            <div className="landing-hero__actions"><a className="landing-button landing-button--primary landing-button--large" href="#roller">Rolünü Seç <span aria-hidden="true">→</span></a><a className="landing-button landing-button--soft landing-button--large" href="#neden-ilkoku">Platformu Keşfet</a></div>
          </div>
          <div className="landing-hero__visual"><Image src="/landing/ilkoku-hero.webp" alt="Bir yazarın açık kitap ve defterlerle çalıştığı mor tonlu illüstrasyon" fill priority sizes="(max-width: 768px) 100vw, 54vw" /></div>
        </div>
      </section>

      <section className="landing-section landing-section--roles" id="roller">
        <div className="landing-container">
          <div className="landing-section-heading"><span className="landing-section-heading__eyebrow">Topluluğa katıl</span><h2>İlkOku’ya nasıl katılmak istiyorsun?</h2><p>Rolünü seç; kayıt akışını sana uygun şekilde başlatalım.</p></div>
          <div className="landing-role-grid">{roles.map((role) => (<Link aria-label={`${role.title} olarak kayıt ol`} className={`landing-role ${role.className}`} href={`/kayit?rol=${role.key}`} key={role.key}><span className="landing-role__label">{role.title} rolü</span><span className="landing-role__icon" aria-hidden="true"><LandingIcon name={role.icon} /></span><h3>{role.title}</h3><p>{role.description}</p><strong>{role.cta} <span aria-hidden="true">→</span></strong></Link>))}</div>
        </div>
      </section>

      <section className="landing-why-v2" id="neden-ilkoku">
        <div className="landing-container">
          <div className="landing-section-heading"><span className="landing-section-heading__eyebrow">Her şey tek yerde</span><h2>Neden İlkOku?</h2></div>
          <div className="landing-benefits-v2">{benefits.map((benefit) => (<article className={`landing-benefit-v2 ${benefit.className}`} key={benefit.title}><span className="landing-benefit-v2__icon"><LandingIcon name={benefit.icon} /></span><h3>{benefit.title}</h3><p>{benefit.description}</p></article>))}</div>
          <div className="landing-stats-v2" aria-label="İlkOku platform istatistikleri">{stats.map((stat) => (<div className="landing-stat-v2" key={stat.label}><span className="landing-stat-v2__icon"><LandingIcon name={stat.icon} /></span><div><strong>{stat.value}</strong><span>{stat.label}</span></div></div>))}</div>
        </div>
      </section>

      <footer className="landing-footer" id="iletisim"><div className="landing-container landing-footer__grid"><div><Link className="landing-logo landing-logo--footer" href="/" aria-label="İlkOku ana sayfa"><Image src={logo} alt="İlkOku" sizes="(max-width: 480px) 128px, 156px" /></Link><p>İlk cümle, ilk okurun, <strong>ilk adımın.</strong></p></div><div><h3>Platform</h3><a href="#hakkimizda">Hakkımızda</a><a href="#neden-ilkoku">Neden İlkOku?</a><Link href="/yayinevleri">Yayınevleri</Link><Link href="/editorler">Editörler</Link></div><div><h3>Hesap</h3><Link href="/giris">Giriş Yap</Link><a href="#roller">Üye Ol</a><Link href="/sifremi-unuttum">Şifremi Unuttum</Link></div><div><h3>Destek</h3><a href="mailto:destek@ilkoku.com">Yardım Merkezi</a></div></div><p className="landing-footer__copyright">© {new Date().getFullYear()} İlkOku. Tüm hakları saklıdır.</p></footer>
    </main>
  );
}
