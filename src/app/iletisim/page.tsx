import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { PublicTrustFooter } from "@/components/content/PublicTrustFooter";
import { authContent } from "@/content";
import { logoutAction } from "@/features/auth/actions";
import { getRoleNavigation } from "@/features/auth/destination";
import { getCurrentProfile } from "@/features/auth/profile";
import "../landing.css";
import "./contact.css";
import "../nasil-calisir/public-trust-footer.css";

const title = "İletişim | İlkOku";
const description = "İlkOku hakkında genel sorularınız, talepleriniz ve platform iletişimi için bize ulaşın.";
const socialImage = "/opengraph-image";
const baseUrl = "https://ilkoku.com";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/iletisim" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/iletisim",
    title,
    description,
    images: [{ url: socialImage, alt: "İlkOku İletişim" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [socialImage],
  },
};

type ContactIconName = "message" | "help" | "copyright" | "shield" | "account";

function ContactIcon({ name }: { name: ContactIconName }) {
  const paths = {
    message: <><path d="M21 15a4 4 0 0 1-4 4H9l-5 3v-7a4 4 0 0 1-1-2.6V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" /><path d="M8 9h8M8 13h5" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.4 2.4 0 1 1 3.5 2.15c-.85.45-1.3.95-1.3 1.85M12 17h.01" /></>,
    copyright: <><circle cx="12" cy="12" r="9" /><path d="M15.5 9.5a4 4 0 1 0 0 5" /></>,
    shield: <><path d="M12 3 20 6v6c0 4.8-3.2 7.4-8 9-4.8-1.6-8-4.2-8-9V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    account: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
  } as const;

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
      {paths[name]}
    </svg>
  );
}

const quickLinks = [
  {
    href: "/yardim",
    icon: "help" as const,
    title: "Yardım Merkezi",
    description: "Platform kullanımı ve sık karşılaşılan sorular için önce yardım içeriklerine göz atın.",
  },
  {
    href: "/telif-bildirimi",
    icon: "copyright" as const,
    title: "Telif Bildirimi",
    description: "Telif ve hak sahipliği bildirimleri için doğrudan ilgili süreci kullanın.",
  },
  {
    href: "/topluluk-kurallari",
    icon: "shield" as const,
    title: "Topluluk Kuralları",
    description: "İçerik, davranış ve topluluk standartlarını inceleyin.",
  },
] as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  const [params, profile] = await Promise.all([searchParams, getCurrentProfile()]);
  const navigation = profile ? await getRoleNavigation(profile) : null;
  const pendingRole = navigation?.pendingRequest?.requestedRole
    ?? (profile?.role === "editor_pending" ? "editor" : null);
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "İletişim",
      description,
      inLanguage: "tr-TR",
      url: `${baseUrl}/iletisim`,
      isPartOf: {
        "@type": "WebSite",
        name: "İlkOku",
        url: baseUrl,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: `${baseUrl}/` },
        { "@type": "ListItem", position: 2, name: "İletişim", item: `${baseUrl}/iletisim` },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
      />

      <main className="landing-page contact-page">
        <header className="landing-header">
          <div className="landing-container landing-header__inner">
            <Link className="landing-logo" href="/" aria-label="İlkOku ana sayfa">
              <Image src={logo} alt="İlkOku" priority sizes="(max-width: 480px) 136px, (max-width: 768px) 144px, (max-width: 1024px) 172px, 180px" />
            </Link>
            <span className="landing-kicker landing-header__kicker">Dijital edebiyat platformu</span>
            <div className="landing-header__tools">
              <details className="landing-account">
                <summary aria-label={profile ? `${profile.fullName} hesap menüsünü aç` : "Hesap menüsünü aç"}>
                  <ContactIcon name="account" />
                </summary>
                <div className="landing-account__menu">
                  {profile && navigation ? (
                    <>
                      <div className="landing-account__identity">
                        <strong>{profile.fullName}</strong>
                        <span>Aktif rol: {authContent.roles[profile.role]}</span>
                        {navigation.hasPendingRequest ? (
                          <small>{pendingRole ? `${authContent.roles[pendingRole]} başvurunuz inceleniyor` : "Başvurunuz inceleniyor"}</small>
                        ) : null}
                      </div>
                      <Link href="/hesabim">Hesabım</Link>
                      <Link href={navigation.workspaceHref}>{navigation.hasPendingRequest ? "Mevcut çalışma alanına dön" : "Çalışma Alanım"}</Link>
                      <form action={logoutAction}><button className="landing-account__logout" type="submit">Çıkış Yap</button></form>
                    </>
                  ) : (
                    <>
                      <Link href="/giris">Giriş Yap</Link>
                      <Link href="/#roller">Üye Ol</Link>
                    </>
                  )}
                </div>
              </details>
            </div>
          </div>
        </header>

        <section className="contact-hero">
          <div className="contact-container contact-hero__grid">
            <div className="contact-hero__content">
              <span className="contact-eyebrow">İlkOku desteği</span>
              <h1>Bir sorunuz mu var? <span>Bize yazın.</span></h1>
              <p>
                Platform kullanımı, hesabınız, eser yolculuğu veya genel talepleriniz için mesajınızı iletin.
                Konuyu mümkün olduğunca açık yazmanız, talebinizin doğru şekilde değerlendirilmesini kolaylaştırır.
              </p>
              <div className="contact-hero__proof" aria-label="İletişim konuları">
                <span>Genel sorular</span>
                <span>Hesap &amp; platform</span>
                <span>İş birliği &amp; talepler</span>
              </div>
            </div>

            <aside className="contact-route-card" aria-label="Hızlı yönlendirme">
              <div className="contact-route-card__heading">
                <span className="contact-route-card__icon"><ContactIcon name="message" /></span>
                <div>
                  <small>Hızlı yönlendirme</small>
                  <h2>Belki cevabınız zaten burada.</h2>
                </div>
              </div>
              <div className="contact-route-card__links">
                {quickLinks.map((item) => (
                  <Link href={item.href} key={item.href}>
                    <span className="contact-route-card__link-icon"><ContactIcon name={item.icon} /></span>
                    <span><strong>{item.title}</strong><small>{item.description}</small></span>
                    <b aria-hidden="true">→</b>
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="contact-section">
          <div className="contact-container contact-section__grid">
            <div className="contact-section__intro">
              <span className="contact-eyebrow">Mesajınızı iletin</span>
              <h2>Doğru kişiye, doğru içerikle ulaşın.</h2>
              <p>
                Zorunlu alanları doldurun ve talebinizi tek mesajda mümkün olduğunca net anlatın.
                Teknik bir sorun bildiriyorsanız gördüğünüz hata veya ilgili sayfayı konu alanında belirtmeniz yardımcı olur.
              </p>
              <div className="contact-note">
                <ContactIcon name="shield" />
                <div>
                  <strong>Gizliliğinizi koruyun</strong>
                  <p>Şifre, ödeme bilgisi veya başka hassas kişisel verileri mesaj alanına yazmayın.</p>
                </div>
              </div>
            </div>

            <div className="contact-form-card">
              <div className="contact-form-card__head">
                <span>İletişim formu</span>
                <p>Yıldızlı alanlar zorunludur.</p>
              </div>

              {params.durum === "alindi" ? <p className="contact-alert contact-alert--success" role="status">Talebiniz alındı. Teşekkür ederiz.</p> : null}
              {params.durum === "eksik" ? <p className="contact-alert contact-alert--warning" role="alert">Lütfen zorunlu alanları kontrol edin.</p> : null}
              {params.durum === "hata" ? <p className="contact-alert contact-alert--error" role="alert">Talebiniz kaydedilemedi. Lütfen tekrar deneyin.</p> : null}

              <form action="/api/site-contact" method="post" className="contact-form">
                <label className="contact-field">
                  <span>Ad Soyad <b>*</b></span>
                  <input name="name" required maxLength={140} autoComplete="name" placeholder="Adınız ve soyadınız" />
                </label>
                <label className="contact-field">
                  <span>E-posta <b>*</b></span>
                  <input name="email" type="email" required maxLength={220} autoComplete="email" placeholder="ornek@eposta.com" />
                </label>
                <label className="contact-field contact-field--wide">
                  <span>Konu</span>
                  <input name="subject" maxLength={180} placeholder="Mesajınızın konusu" />
                </label>
                <label className="contact-field contact-field--wide">
                  <span>Mesaj <b>*</b></span>
                  <textarea name="message" required rows={7} maxLength={4000} placeholder="Size nasıl yardımcı olabiliriz?" />
                </label>
                <div className="contact-form__footer contact-field--wide">
                  <p>Göndererek mesajınızın talebinizi değerlendirmek amacıyla işlenmesini kabul etmiş olursunuz.</p>
                  <button type="submit">Mesajı gönder <span aria-hidden="true">→</span></button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      <PublicTrustFooter />
    </>
  );
}
