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
  | "feedback";

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
  };

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" {...common}>
      {paths[name]}
    </svg>
  );
}

const navLinks = [
  { href: "#hakkimizda", label: "Hakkımızda" },
  { href: "#nasil-calisir", label: "Nasıl Çalışır?" },
  { href: "/yayinevleri", label: "Yayınevleri", internal: true },
  { href: "#iletisim", label: "İletişim" },
] as const;

const roles = [
  { key: "writer", title: "Yazar", description: "Hikâyelerini yaz, geliştir ve yayınevlerine ulaştır.", icon: "writer", cta: "Yazar Ol", className: "landing-role--writer" },
  { key: "reader", title: "Okuyucu", description: "Yeni eserler keşfet, oku ve favorilerini oluştur.", icon: "reader", cta: "Okuyucu Ol", className: "landing-role--reader" },
  { key: "editor", title: "Editör", description: "Yazarlara profesyonel ve yapıcı geri bildirim ver.", icon: "editor", cta: "Editör Başvurusu", className: "landing-role--editor" },
  { key: "publisher", title: "Yayınevi", description: "Yeni yazarları keşfet ve başvuruları yönet.", icon: "publisher", cta: "Yayınevi Başvurusu", className: "landing-role--publisher" },
] as const;

const benefits = [
  { icon: "book", title: "Eserlerini Tek Yerde Yönet", description: "Eserlerini oluştur, düzenle ve arşivle." },
  { icon: "writer", title: "Yazmaya Devam Et", description: "Bölümlerini yaz ve taslaklarını kaydet." },
  { icon: "message", title: "Editörlerle İletişim Kur", description: "Eserin için editör değerlendirmesi talep et." },
  { icon: "publisher", title: "Yayınevlerine Başvur", description: "Eserini yayınevlerinin incelemesine sun." },
  { icon: "feedback", title: "Geri Bildirimlerini Takip Et", description: "Eserlerine gelen geri bildirimleri görüntüle." },
] as const;

function NavigationLinks() {
  return navLinks.map((item) =>
    item.internal ? (
      <Link href={item.href} key={item.href}>{item.label}</Link>
    ) : (
      <a href={item.href} key={item.href}>{item.label}</a>
    ),
  );
}

export default function HomePage() {
  return (
    <main className="landing-page">
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

          <nav className="landing-nav" aria-label="Ana menü"><NavigationLinks /></nav>

          <div className="landing-header__tools">
            <details className="landing-account">
              <summary aria-label="Hesap menüsünü aç"><LandingIcon name="account" /></summary>
              <div className="landing-account__menu">
                <Link href="/giris">Giriş Yap</Link>
                <a href="#roller">Üye Ol</a>
              </div>
            </details>

            <details className="landing-mobile-menu">
              <summary aria-label="Mobil menüyü aç">
                <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>
              </summary>
              <nav aria-label="Mobil menü">
                <NavigationLinks />
                <Link href="/giris">Giriş Yap</Link>
                <a href="#roller">Üye Ol</a>
              </nav>
            </details>
          </div>
        </div>
      </header>

      <section className="landing-hero" id="hakkimizda">
        <div className="landing-container landing-hero__grid">
          <div className="landing-hero__content">
            <span className="landing-kicker">Dijital edebiyat platformu</span>
            <h1>İlk cümle,<br />ilk okurun,<br /><span>ilk adımın.</span></h1>
            <p>Yazarları, editörleri, okuyucuları ve yayınevlerini aynı platformda buluşturan dijital edebiyat ekosistemi.</p>
            <div className="landing-hero__actions">
              <a className="landing-button landing-button--primary landing-button--large" href="#roller">Rolünü Seç <span aria-hidden="true">→</span></a>
              <a className="landing-button landing-button--soft landing-button--large" href="#nasil-calisir">Platformu Keşfet</a>
            </div>
          </div>
          <div className="landing-hero__visual">
            <Image src="/landing/ilkoku-hero.webp" alt="Bir yazarın açık kitap ve defterlerle çalıştığı mor tonlu illüstrasyon" fill priority sizes="(max-width: 768px) 100vw, 54vw" />
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--roles" id="roller">
        <div className="landing-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow">Topluluğa katıl</span>
            <h2>İlkOku’ya nasıl katılmak istiyorsun?</h2>
            <p>Rolünü seç; kayıt akışını sana uygun şekilde başlatalım.</p>
          </div>
          <div className="landing-role-grid">
            {roles.map((role) => (
              <Link aria-label={`${role.title} olarak kayıt ol`} className={`landing-role ${role.className}`} href={`/kayit?rol=${role.key}`} key={role.key}>
                <span className="landing-role__label">{role.title} rolü</span>
                <span className="landing-role__icon" aria-hidden="true"><LandingIcon name={role.icon} /></span>
                <h3>{role.title}</h3>
                <p>{role.description}</p>
                <strong>{role.cta} <span aria-hidden="true">→</span></strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" id="nasil-calisir">
        <div className="landing-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow">Üç kolay adım</span>
            <h2>Nasıl Çalışır?</h2>
          </div>
          <div className="landing-steps">
            <article><span className="landing-step__number">1</span><span className="landing-step__icon" aria-hidden="true"><LandingIcon name="account" /></span><h3>Rolünü Seç</h3><p>Sana en uygun rolü seçerek İlkOku’ya katıl.</p></article>
            <span className="landing-step__arrow" aria-hidden="true">⟶</span>
            <article><span className="landing-step__number">2</span><span className="landing-step__icon" aria-hidden="true"><LandingIcon name="create" /></span><h3>Hesabını Oluştur</h3><p>Hızlı ve kolay bir şekilde hesabını oluştur.</p></article>
            <span className="landing-step__arrow" aria-hidden="true">⟶</span>
            <article><span className="landing-step__number">3</span><span className="landing-step__icon" aria-hidden="true"><LandingIcon name="book" /></span><h3>Yazmaya veya Keşfetmeye Başla</h3><p>Eserlerini paylaş, geri bildirim al veya yeni eserler keşfet.</p></article>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--benefits">
        <div className="landing-container landing-benefits-layout">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow">Her şey tek yerde</span>
            <h2>Neden İlkOku?</h2>
          </div>
          <div className="landing-benefits">
            {benefits.map((benefit) => (
              <article key={benefit.title}>
                <span aria-hidden="true"><LandingIcon name={benefit.icon} /></span>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="landing-container">
          <ul className="landing-trust-strip" aria-label="İlkOku ürün özellikleri">
            <li>Yazar, okuyucu, editör ve yayınevi rolleri</li><li>Tek platformda içerik ve geri bildirim</li><li>Rol bazlı kayıt akışı</li><li>Eser ve keşif odaklı yapı</li>
          </ul>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-container">
          <div className="landing-cta__inner">
            <div><h2>İlk cümleni yazmaya hazır mısın?</h2><p>Rolünü seç, hesabını oluştur ve İlkOku topluluğuna katıl.</p></div>
            <a className="landing-button landing-button--white landing-button--large" href="#roller">Hemen Katıl <span aria-hidden="true">→</span></a>
            <div className="landing-cta__book" aria-hidden="true"><LandingIcon name="book" /></div>
          </div>
        </div>
      </section>

      <footer className="landing-footer" id="iletisim">
        <div className="landing-container landing-footer__grid">
          <div>
            <Link className="landing-logo landing-logo--footer" href="/" aria-label="İlkOku ana sayfa"><Image src={logo} alt="İlkOku" sizes="(max-width: 480px) 128px, 156px" /></Link>
            <p>İlk cümle, ilk okurun, <strong>ilk adımın.</strong></p>
          </div>
          <div><h3>Platform</h3><a href="#hakkimizda">Hakkımızda</a><a href="#nasil-calisir">Nasıl Çalışır?</a><Link href="/yayinevleri">Yayınevleri</Link><Link href="/editorler">Editörler</Link></div>
          <div><h3>Hesap</h3><Link href="/giris">Giriş Yap</Link><a href="#roller">Üye Ol</a><Link href="/sifremi-unuttum">Şifremi Unuttum</Link></div>
          <div><h3>Destek</h3><a href="mailto:destek@ilkoku.com">Yardım Merkezi</a></div>
        </div>
        <p className="landing-footer__copyright">© {new Date().getFullYear()} İlkOku. Tüm hakları saklıdır.</p>
      </footer>
    </main>
  );
}
