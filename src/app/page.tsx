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

const roles = [
  {
    key: "writer",
    title: "Yazar",
    description: "Hikâyelerini yaz, geliştir ve yayınevlerine ulaştır.",
    icon: "✦",
    cta: "Yazar Ol",
    className: "landing-role--writer",
  },
  {
    key: "reader",
    title: "Okuyucu",
    description: "Yeni eserler keşfet, oku ve favorilerini oluştur.",
    icon: "▤",
    cta: "Okuyucu Ol",
    className: "landing-role--reader",
  },
  {
    key: "editor",
    title: "Editör",
    description: "Yazarlara profesyonel ve yapıcı geri bildirim ver.",
    icon: "✎",
    cta: "Editör Başvurusu",
    className: "landing-role--editor",
  },
  {
    key: "publisher",
    title: "Yayınevi",
    description: "Yeni yazarları keşfet ve başvuruları yönet.",
    icon: "⌂",
    cta: "Yayınevi Başvurusu",
    className: "landing-role--publisher",
  },
] as const;

const benefits = [
  ["◈", "Güvenli Platform", "Kişisel verilerin ve eserlerin güvende."],
  [
    "◌",
    "Editör Geri Bildirimi",
    "Uzman editörlerden yapıcı ve detaylı geri bildirim.",
  ],
  [
    "▥",
    "Yayınevleriyle Bağlantı",
    "Eserlerini doğrudan yayınevlerine ulaştır.",
  ],
  ["↗", "Yazma Takibi", "İlerlemeni takip et, hedeflerine ulaş."],
  [
    "◎",
    "Okuyucu Topluluğu",
    "Okuyucularla etkileşime geç, fikirlerini paylaş.",
  ],
  ["ϟ", "Tek Platform", "Yaz, geliştir, paylaş ve yayınlan."],
] as const;

const stats = [
  ["2.847+", "Yazar"],
  ["18.592+", "Okuyucu"],
  ["412+", "Editör"],
  ["78+", "Yayınevi"],
  ["6.215+", "Eser"],
  ["34.760+", "Yorum"],
] as const;

export default function HomePage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <div className="landing-container landing-header__inner">
          <Link
            className="landing-logo"
            href="/"
            aria-label="İlkOku ana sayfa"
          >
            <Image src={logo} alt="İlkOku" priority />
          </Link>

          <nav className="landing-nav" aria-label="Ana menü">
            <a href="#hakkimizda">Hakkımızda</a>
            <a href="#nasil-calisir">Nasıl Çalışır?</a>
            <Link href="/yayinevleri">Yayınevleri</Link>
            <a href="#iletisim">İletişim</a>
          </nav>

          <div className="landing-header__tools">
            <details className="landing-account">
              <summary aria-label="Hesap menüsünü aç">
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="22"
                  viewBox="0 0 24 24"
                  width="22"
                >
                  <circle
                    cx="12"
                    cy="8"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M4.5 21a7.5 7.5 0 0 1 15 0"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </summary>

              <div className="landing-account__menu">
                <Link href="/giris">Giriş Yap</Link>
                <a href="#roller">Üye Ol</a>
              </div>
            </details>

            <details className="landing-mobile-menu">
              <summary aria-label="Mobil menüyü aç">
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="23"
                  viewBox="0 0 24 24"
                  width="23"
                >
                  <path
                    d="M4 6h16M4 12h16M4 18h16"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </summary>

              <nav aria-label="Mobil menü">
                <a href="#hakkimizda">Hakkımızda</a>
                <a href="#nasil-calisir">Nasıl Çalışır?</a>
                <Link href="/yayinevleri">Yayınevleri</Link>
                <a href="#iletisim">İletişim</a>
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

            <h1>
              İlk cümle,
              <br />
              ilk okurun,
              <br />
              <span>ilk adımın.</span>
            </h1>

            <p>
              Yazarları, editörleri, okuyucuları ve yayınevlerini aynı platformda
              buluşturan dijital edebiyat ekosistemi.
            </p>

            <div className="landing-hero__actions">
              <a
                className="landing-button landing-button--primary landing-button--large"
                href="#roller"
              >
                Rolünü Seç <span aria-hidden="true">→</span>
              </a>

              <a
                className="landing-button landing-button--soft landing-button--large"
                href="#nasil-calisir"
              >
                Platformu Keşfet
              </a>
            </div>
          </div>

          <div className="landing-hero__visual" aria-hidden="true">
            <div className="landing-sun" />
            <div className="landing-mountain landing-mountain--back" />
            <div className="landing-mountain landing-mountain--front" />

            <div className="landing-book">
              <div className="landing-book__page landing-book__page--left">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>

              <div className="landing-book__page landing-book__page--right">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>

              <div className="landing-feather">❧</div>
            </div>

            <div className="landing-writer">
              <div className="landing-writer__head" />
              <div className="landing-writer__body" />
              <div className="landing-writer__arm" />
              <div className="landing-writer__notebook" />
            </div>

            <span className="landing-star landing-star--one">✦</span>
            <span className="landing-star landing-star--two">✧</span>
            <span className="landing-bird landing-bird--one">⌁</span>
            <span className="landing-bird landing-bird--two">⌁</span>
          </div>
        </div>
      </section>

      <section
        className="landing-section landing-section--roles"
        id="roller"
      >
        <div className="landing-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow">
              Topluluğa katıl
            </span>

            <h2>İlkOku’ya nasıl katılmak istiyorsun?</h2>

            <p>
              Rolünü seç; kayıt akışını sana uygun şekilde başlatalım.
            </p>
          </div>

          <div className="landing-role-grid">
            {roles.map((role) => (
              <Link
                aria-label={`${role.title} olarak kayıt ol`}
                className={`landing-role ${role.className}`}
                href={`/kayit?rol=${role.key}`}
                key={role.key}
              >
                <span className="landing-role__icon" aria-hidden="true">
                  {role.icon}
                </span>

                <h3>{role.title}</h3>
                <p>{role.description}</p>

                <strong>
                  {role.cta} <span aria-hidden="true">→</span>
                </strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" id="nasil-calisir">
        <div className="landing-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow">
              Üç kolay adım
            </span>

            <h2>Nasıl Çalışır?</h2>
          </div>

          <div className="landing-steps">
            <article>
              <span className="landing-step__number">1</span>
              <span className="landing-step__icon" aria-hidden="true">
                ♙
              </span>
              <h3>Rolünü Seç</h3>
              <p>Sana en uygun rolü seçerek İlkOku’ya katıl.</p>
            </article>

            <span className="landing-step__arrow" aria-hidden="true">
              ⟶
            </span>

            <article>
              <span className="landing-step__number">2</span>
              <span className="landing-step__icon" aria-hidden="true">
                ♙+
              </span>
              <h3>Hesabını Oluştur</h3>
              <p>Hızlı ve kolay bir şekilde hesabını oluştur.</p>
            </article>

            <span className="landing-step__arrow" aria-hidden="true">
              ⟶
            </span>

            <article>
              <span className="landing-step__number">3</span>
              <span className="landing-step__icon" aria-hidden="true">
                ▤
              </span>
              <h3>Yazmaya veya Keşfetmeye Başla</h3>
              <p>
                Eserlerini paylaş, geri bildirim al veya yeni eserler keşfet.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--benefits">
        <div className="landing-container">
          <div className="landing-section-heading">
            <span className="landing-section-heading__eyebrow">
              Her şey tek yerde
            </span>

            <h2>Neden İlkOku?</h2>
          </div>

          <div className="landing-benefits">
            {benefits.map(([icon, title, description]) => (
              <article key={title}>
                <span aria-hidden="true">{icon}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>

          <div
            className="landing-stats"
            aria-label="Platform istatistikleri"
          >
            {stats.map(([value, label]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-container">
          <div className="landing-cta__inner">
            <div>
              <span className="landing-section-heading__eyebrow">
                Hikâyen burada başlıyor
              </span>

              <h2>İlk cümleni yazmaya hazır mısın?</h2>

              <p>
                Rolünü seç, hesabını oluştur ve İlkOku topluluğuna katıl.
              </p>
            </div>

            <a
              className="landing-button landing-button--white landing-button--large"
              href="#roller"
            >
              Hemen Katıl <span aria-hidden="true">→</span>
            </a>

            <div className="landing-cta__book" aria-hidden="true">
              ❧
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer" id="iletisim">
        <div className="landing-container landing-footer__grid">
          <div>
            <Link
              className="landing-logo landing-logo--footer"
              href="/"
              aria-label="İlkOku ana sayfa"
            >
              <Image src={logo} alt="İlkOku" />
            </Link>

            <p>
              İlk cümle, ilk okurun, <strong>ilk adımın.</strong>
            </p>
          </div>

          <div>
            <h3>Platform</h3>
            <a href="#hakkimizda">Hakkımızda</a>
            <a href="#nasil-calisir">Nasıl Çalışır?</a>
            <Link href="/yayinevleri">Yayınevleri</Link>
            <Link href="/editorler">Editörler</Link>
          </div>

          <div>
            <h3>Hesap</h3>
            <Link href="/giris">Giriş Yap</Link>
            <a href="#roller">Üye Ol</a>
            <Link href="/sifremi-unuttum">Şifremi Unuttum</Link>
          </div>

          <div>
            <h3>Destek</h3>
            <a href="mailto:destek@ilkoku.com">Yardım Merkezi</a>
            <span>Kullanım Şartları</span>
            <span>Gizlilik Politikası</span>
            <span>KVKK</span>
          </div>

          <div>
            <h3>Bizi Takip Edin</h3>

            <div className="landing-socials">
              <a href="#iletisim" aria-label="Instagram">
                ◎
              </a>
              <a href="#iletisim" aria-label="X">
                𝕏
              </a>
              <a href="#iletisim" aria-label="LinkedIn">
                in
              </a>
            </div>
          </div>
        </div>

        <p className="landing-footer__copyright">
          © {new Date().getFullYear()} İlkOku. Tüm hakları saklıdır.
        </p>
      </footer>
    </main>
  );
}
