import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import "./landing.css";

export const metadata: Metadata = {
  title: "İlkOku | İlk cümle, ilk okurun, ilk adımın.",
  description:
    "Yazarları, okuyucuları, editörleri ve yayınevlerini aynı platformda buluşturan dijital edebiyat platformu.",
};

const roles = [
  {
    key: "writer",
    title: "Yazar",
    description: "Hikâyelerini yaz, geliştir ve doğru insanlarla buluştur.",
    icon: "✍",
    tone: "violet",
  },
  {
    key: "reader",
    title: "Okuyucu",
    description: "Yeni eserler keşfet, oku ve yapıcı geri bildirim paylaş.",
    icon: "◫",
    tone: "blue",
  },
  {
    key: "editor",
    title: "Editör",
    description: "Yazarlara profesyonel ve yol gösterici geri bildirim ver.",
    icon: "▤",
    tone: "green",
  },
  {
    key: "publisher",
    title: "Yayınevi",
    description: "Yeni yazarları keşfet ve başvuru süreçlerini yönet.",
    icon: "⌂",
    tone: "orange",
  },
] as const;

const steps = [
  ["1", "◎", "Rolünü seç", "Sana en uygun rolü seçerek İlkOku’ya katıl."],
  ["2", "+", "Hesabını oluştur", "Hızlı ve kolay bir şekilde ücretsiz hesabını oluştur."],
  ["3", "✎", "Üret veya keşfet", "Eserini geliştir, geri bildirim al ya da yeni metinler keşfet."],
] as const;

const benefits = [
  ["♢", "Güvenli platform", "Kişisel verilerin ve eserlerin güvenli altyapıda saklanır."],
  ["◌", "Editör geri bildirimi", "Metnini geliştiren yapıcı ve anlaşılır geri bildirimler al."],
  ["⌂", "Yayınevi bağlantısı", "Eserini uygun olduğunda yayınevleriyle buluştur."],
  ["↗", "Yazma takibi", "İlerlemeni takip et, taslaklarını düzenli biçimde yönet."],
  ["◎", "Okuyucu topluluğu", "Okurlarla etkileşime geç, fikirlerini paylaş."],
  ["ϟ", "Tek platform", "Yaz, geliştir, paylaş ve yayın yolculuğunu yönet."],
] as const;

const earlyAccess = [
  ["✦", "Erken erişim", "Platformu ilk kullanan topluluğun parçası ol."],
  ["✍", "Yeni eserler", "Yeni metinler ve yaratıcı fikirler ekleniyor."],
  ["◌", "Editör ağı", "Editörlerin katılımıyla geri bildirim ağı büyüyor."],
  ["⌂", "Yayınevi görüşmeleri", "Yayıncılık ekosistemiyle bağlantılar kuruluyor."],
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
            <a href="#roller">Roller</a>
            <a href="#iletisim">İletişim</a>
          </nav>

          <div className="landing-header__actions">
            <Link className="landing-button landing-button--ghost" href="/giris">
              Giriş Yap
            </Link>
            <Link className="landing-button landing-button--primary" href="/kayit">
              Kayıt Ol
            </Link>
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
              buluşturan güvenli dijital edebiyat ekosistemi.
            </p>
            <div className="landing-hero__actions">
              <Link className="landing-button landing-button--primary landing-button--large" href="/kayit?rol=writer">
                Yazmaya Başla <span aria-hidden="true">→</span>
              </Link>
              <a className="landing-button landing-button--soft landing-button--large" href="#roller">
                <span className="landing-play" aria-hidden="true">▶</span>
                Platformu Keşfet
              </a>
            </div>
          </div>

          <div className="landing-hero__visual">
            <Image
              src="/landing/ilkoku-hero.webp"
              alt="Bir yazarın açık kitap ve defterlerle çalıştığı mor tonlu illüstrasyon"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 58vw"
            />
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--roles" id="roller">
        <div className="landing-container">
          <div className="landing-section-heading">
            <h2>İlkOku’ya nasıl katılmak istiyorsun?</h2>
            <span aria-hidden="true" />
          </div>

          <div className="landing-role-grid">
            {roles.map((role) => (
              <Link
                className={`landing-role landing-role--${role.tone}`}
                href={`/kayit?rol=${role.key}`}
                key={role.key}
              >
                <span className="landing-role__icon" aria-hidden="true">{role.icon}</span>
                <h3>{role.title}</h3>
                <p>{role.description}</p>
                <strong>Devam Et <span aria-hidden="true">→</span></strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--steps" id="nasil-calisir">
        <div className="landing-container">
          <div className="landing-section-heading">
            <h2>Nasıl Çalışır?</h2>
            <span aria-hidden="true" />
          </div>

          <div className="landing-steps">
            {steps.map(([number, icon, title, description], index) => (
              <div className="landing-step-wrap" key={number}>
                <article className="landing-step">
                  <span className="landing-step__number">{number}</span>
                  <span className="landing-step__icon" aria-hidden="true">{icon}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
                {index < steps.length - 1 ? <span className="landing-step__arrow" aria-hidden="true">⟶</span> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--benefits">
        <div className="landing-container">
          <div className="landing-section-heading">
            <h2>Neden İlkOku?</h2>
            <span aria-hidden="true" />
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

          <div className="landing-early-access" aria-label="Platform durumu">
            {earlyAccess.map(([icon, title, description]) => (
              <article key={title}>
                <span aria-hidden="true">{icon}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-container">
          <div className="landing-cta__inner">
            <div>
              <h2>İyi metinler, doğru insanlarla buluştuğunda değer kazanır.</h2>
              <p>İlkOku, edebiyatı seven herkes için adil, şeffaf ve ilham verici bir dijital ekosistem sunar.</p>
            </div>
            <Link className="landing-button landing-button--white landing-button--large" href="/kayit">
              Hemen Katıl <span aria-hidden="true">→</span>
            </Link>
            <div className="landing-cta__art" aria-hidden="true">
              <span>✦</span><span>❧</span><span>✦</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer" id="iletisim">
        <div className="landing-container landing-footer__grid">
          <div>
            <Link className="landing-logo landing-logo--footer" href="/">
              <Image src={logo} alt="İlkOku" />
            </Link>
            <p>İlk cümle, ilk okurun, <strong>ilk adımın.</strong></p>
          </div>
          <div>
            <h3>Platform</h3>
            <a href="#hakkimizda">Hakkımızda</a>
            <a href="#nasil-calisir">Nasıl Çalışır?</a>
            <Link href="/yayinevleri">Yayınevleri</Link>
            <Link href="/editorler">Editörler</Link>
          </div>
          <div>
            <h3>Destek</h3>
            <a href="mailto:destek@ilkoku.com">Yardım Merkezi</a>
            <a href="mailto:destek@ilkoku.com">Sıkça Sorulan Sorular</a>
            <a href="mailto:destek@ilkoku.com">Bize Ulaşın</a>
          </div>
          <div>
            <h3>Yasal</h3>
            <span>KVKK</span>
            <span>Çerez Politikası</span>
            <span>Kullanım Şartları</span>
            <span>Gizlilik Politikası</span>
          </div>
          <div>
            <h3>Bizi Takip Edin</h3>
            <div className="landing-socials" aria-label="Sosyal medya bağlantıları">
              <span>◎</span><span>𝕏</span><span>in</span><span>▶</span>
            </div>
          </div>
        </div>
        <p className="landing-footer__copyright">© 2026 İlkOku. Tüm hakları saklıdır.</p>
      </footer>
    </main>
  );
}
