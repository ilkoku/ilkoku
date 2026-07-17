import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import "./landing.css";

export const metadata: Metadata = {
  title: "İlkOku | İlk cümle, ilk okurun, ilk adımın.",
  description:
    "Yazarları, okuyucuları, editörleri ve yayınevlerini aynı platformda buluşturan dijital edebiyat ekosistemi.",
};

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

const icons = {
  user: (
    <Icon>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </Icon>
  ),
  writer: (
    <Icon>
      <path d="m15 5 4 4M13 7 4.5 15.5 3 21l5.5-1.5L17 11" />
      <path d="m14 6 2-2a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2l-2 2" />
    </Icon>
  ),
  reader: (
    <Icon>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </Icon>
  ),
  editor: (
    <Icon>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      <path d="m14 6 3 3" />
    </Icon>
  ),
  publisher: (
    <Icon>
      <path d="M3 21h18M6 21V5l6-3 6 3v16" />
      <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01" />
    </Icon>
  ),
  shield: (
    <Icon>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  ),
  message: (
    <Icon>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
      <path d="M8 9h8M8 13h5" />
    </Icon>
  ),
  trend: (
    <Icon>
      <path d="m3 17 6-6 4 4 8-8M15 7h6v6" />
    </Icon>
  ),
  users: (
    <Icon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  ),
  layers: (
    <Icon>
      <path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5" />
    </Icon>
  ),
  arrow: (
    <Icon>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  ),
};

const roles = [
  ["writer", "Yazar", "Hikâyelerini yaz, geliştir ve yayınevlerine ulaştır.", "Yazar Ol", icons.writer],
  ["reader", "Okuyucu", "Yeni eserler keşfet, oku ve favorilerini oluştur.", "Okuyucu Ol", icons.reader],
  ["editor", "Editör", "Yazarlara profesyonel ve yapıcı geri bildirim ver.", "Editör Başvurusu", icons.editor],
  ["publisher", "Yayınevi", "Yeni yazarları keşfet ve başvuruları yönet.", "Yayınevi Başvurusu", icons.publisher],
] as const;

const benefits = [
  [icons.shield, "Güvenli Platform", "Kişisel verilerin ve eserlerin güvende."],
  [icons.message, "Editör Geri Bildirimi", "Uzman editörlerden yapıcı ve detaylı geri bildirim."],
  [icons.publisher, "Yayınevleriyle Bağlantı", "Eserlerini doğrudan yayınevlerine ulaştır."],
  [icons.trend, "Yazma Takibi", "İlerlemeni takip et, hedeflerine ulaş."],
  [icons.users, "Okuyucu Topluluğu", "Okuyucularla etkileşime geç ve fikirlerini paylaş."],
  [icons.layers, "Tek Platform", "Yaz, geliştir, paylaş ve yayınlan."],
] as const;

export default function HomePage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <div className="landing-container landing-header__inner">
          <Link className="landing-logo" href="/" aria-label="İlkOku ana sayfa">
            <Image src={logo} alt="İlkOku" priority />
          </Link>

          <nav className="landing-nav" aria-label="Ana menü">
            <a href="#hakkimizda">Hakkımızda</a>
            <a href="#nasil-calisir">Nasıl Çalışır?</a>
            <Link href="/yayinevleri">Yayınevleri</Link>
            <a href="#iletisim">İletişim</a>
          </nav>

          <details className="landing-account">
            <summary aria-label="Hesap menüsünü aç">{icons.user}</summary>
            <div className="landing-account__menu">
              <p>Hesabın</p>
              <Link href="/giris">Giriş Yap</Link>
              <a href="#roller">Üye Ol</a>
            </div>
          </details>
        </div>
      </header>

      <section className="landing-hero" id="hakkimizda">
        <div className="landing-container landing-hero__grid">
          <div className="landing-hero__content">
            <span className="landing-kicker">Dijital edebiyat platformu</span>
            <h1>İlk cümle,<br />ilk okurun,<br /><span>ilk adımın.</span></h1>
            <p>Yazarları, editörleri, okuyucuları ve yayınevlerini aynı platformda buluşturan dijital edebiyat ekosistemi.</p>
            <div className="landing-hero__actions">
              <a className="landing-button landing-button--primary landing-button--large" href="#roller">
                Rolünü Seç {icons.arrow}
              </a>
              <a className="landing-button landing-button--soft landing-button--large" href="#nasil-calisir">
                Platformu Keşfet
              </a>
            </div>
          </div>

          <div className="landing-hero__visual" aria-hidden="true">
            <div className="landing-sun" />
            <div className="landing-mountain landing-mountain--back" />
            <div className="landing-mountain landing-mountain--front" />
            <div className="landing-book">
              <div className="landing-book__page landing-book__page--left"><span /><span /><span /><span /><span /></div>
              <div className="landing-book__page landing-book__page--right"><span /><span /><span /><span /><span /></div>
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
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--roles" id="roller">
        <div className="landing-container">
          <div className="landing-section-heading">
            <h2>İlkOku’ya nasıl katılmak istiyorsun?</h2>
            <p>Rolünü seç; üyelik akışını sana göre başlatalım.</p>
            <span />
          </div>
          <div className="landing-role-grid">
            {roles.map(([key, title, description, action, icon]) => (
              <Link className={`landing-role landing-role--${key}`} href={`/kayit?rol=${key}`} key={key}>
                <span className="landing-role__icon">{icon}</span>
                <h3>{title}</h3>
                <p>{description}</p>
                <strong>{action} {icons.arrow}</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" id="nasil-calisir">
        <div className="landing-container">
          <div className="landing-section-heading"><h2>Nasıl Çalışır?</h2><span /></div>
          <div className="landing-steps">
            <article><span className="landing-step__number">1</span><span className="landing-step__icon">{icons.users}</span><h3>Rolünü Seç</h3><p>Sana en uygun rolü seçerek İlkOku’ya katıl.</p></article>
            <span className="landing-step__arrow" aria-hidden="true">→</span>
            <article><span className="landing-step__number">2</span><span className="landing-step__icon">{icons.user}</span><h3>Hesabını Oluştur</h3><p>Seçtiğin role uygun üyelik adımını tamamla.</p></article>
            <span className="landing-step__arrow" aria-hidden="true">→</span>
            <article><span className="landing-step__number">3</span><span className="landing-step__icon">{icons.reader}</span><h3>Üretmeye veya Keşfetmeye Başla</h3><p>Eserlerini paylaş, geri bildirim al veya yeni eserler keşfet.</p></article>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--benefits">
        <div className="landing-container">
          <div className="landing-section-heading"><h2>Neden İlkOku?</h2><span /></div>
          <div className="landing-benefits">
            {benefits.map(([icon, title, description]) => (
              <article key={title}><span>{icon}</span><h3>{title}</h3><p>{description}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-container">
          <div className="landing-cta__inner">
            <div><h2>İyi metinler, doğru insanlarla buluştuğunda değer kazanır.</h2><p>İlkOku, edebiyatı seven herkes için adil, şeffaf ve ilham verici bir dijital ekosistem sunar.</p></div>
            <a className="landing-button landing-button--white landing-button--large" href="#roller">Rolünü Seç {icons.arrow}</a>
            <div className="landing-cta__book" aria-hidden="true">❧</div>
          </div>
        </div>
      </section>

      <footer className="landing-footer" id="iletisim">
        <div className="landing-container landing-footer__grid">
          <div><Link className="landing-logo landing-logo--footer" href="/"><Image src={logo} alt="İlkOku" /></Link><p>İlk cümle, ilk okurun, <strong>ilk adımın.</strong></p></div>
          <div><h3>Platform</h3><a href="#hakkimizda">Hakkımızda</a><a href="#nasil-calisir">Nasıl Çalışır?</a><Link href="/yayinevleri">Yayınevleri</Link><Link href="/editorler">Editörler</Link></div>
          <div><h3>Destek</h3><a href="mailto:destek@ilkoku.com">Yardım Merkezi</a><a href="mailto:destek@ilkoku.com">Sıkça Sorulan Sorular</a><span>Kullanım Şartları</span><span>Gizlilik Politikası</span></div>
          <div><h3>Yasal</h3><span>KVKK</span><span>Çerez Politikası</span><span>Telif Hakkı Politikası</span></div>
        </div>
        <p className="landing-footer__copyright">© 2026 İlkOku. Tüm hakları saklıdır.</p>
      </footer>
    </main>
  );
}
