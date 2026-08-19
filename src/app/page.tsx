import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { authContent } from "@/content";
import { logoutAction } from "@/features/auth/actions";
import { getRoleNavigation } from "@/features/auth/destination";
import { getCurrentProfile } from "@/features/auth/profile";
import { HistoryInspiration } from "@/features/landing/history-inspiration";
import { getPublishedHomepageState } from "@/lib/cms-homepage-store";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { safeCmsInternalHref } from "@/lib/cms-links";
import { getPublishedRoleCardsState } from "@/lib/cms-role-card-store";
import { cmsRoleMeta, roleCardsFromPayload } from "@/lib/cms-role-cards";
import "./landing.css";
import "./landing-v2.css";
import "./landing-history.css";

const homeTitle = "İlkOku | İlk cümle, ilk okurun, ilk adımın.";
const homeDescription = "Yazarları, okuyucuları, editörleri ve yayınevlerini aynı platformda buluşturan dijital edebiyat ekosistemi.";
const homeSocialImage = "/landing/ilkoku-hero.webp";

export async function generateMetadata(): Promise<Metadata> {
  const englishEnabled = await isCmsLocaleEnabled("en");
  return {
    title: homeTitle,
    description: homeDescription,
    alternates: {
      canonical: "https://ilkoku.com/",
      languages: {
        "tr-TR": "https://ilkoku.com/",
        ...(englishEnabled ? { en: "https://ilkoku.com/en" } : {}),
        "x-default": "https://ilkoku.com/",
      },
    },
    openGraph: {
      title: homeTitle,
      description: homeDescription,
      type: "website",
      locale: "tr_TR",
      url: "https://ilkoku.com/",
      images: [{ url: homeSocialImage, alt: "İlkOku dijital edebiyat platformu" }],
    },
    twitter: {
      card: "summary_large_image",
      title: homeTitle,
      description: homeDescription,
      images: [homeSocialImage],
    },
  };
}

export const dynamic = "force-dynamic";

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

function HeroTitle({ title }: { title: string }) {
  const lines = title.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) return <>{lines[0] || title}</>;
  return <>{lines.map((line, index) => <Fragment key={`${index}-${line}`}>{index > 0 ? <br /> : null}{index === lines.length - 1 ? <span>{line}</span> : line}</Fragment>)}</>;
}

function FooterSlogan({ value }: { value: string }) {
  const emphasis = "ilk adımın.";
  if (value.toLocaleLowerCase("tr-TR").endsWith(emphasis)) {
    return <>{value.slice(0, value.length - emphasis.length)}<strong>{value.slice(value.length - emphasis.length)}</strong></>;
  }
  return <>{value}</>;
}

const roles = [
  {
    key: "writer",
    title: "Yazar",
    description: "Eserini bölüm bölüm oluştur, okur geri bildirimiyle geliştir ve profesyonel incelemeye taşı.",
    icon: "writer",
    cta: "Yazar Ol",
    className: "landing-role--writer",
    highlights: ["Bölüm bazlı yayın", "Eser Pasaportu"],
  },
  {
    key: "reader",
    title: "Okuyucu",
    description: "Yeni eserler keşfet, okumaya devam et, favorilerini oluştur ve yazara görüşünü ilet.",
    icon: "reader",
    cta: "Okuyucu Ol",
    className: "landing-role--reader",
    highlights: ["Yeni eser keşfi", "Bölüm yorumları"],
  },
  {
    key: "editor",
    title: "Editör",
    description: "Eserleri bağımsız biçimde incele, profesyonel rapor hazırla ve yazara yol göster.",
    icon: "editor",
    cta: "Editör Başvurusu",
    className: "landing-role--editor",
    highlights: ["Bağımsız inceleme", "Profesyonel rapor"],
  },
  {
    key: "publisher",
    title: "Yayınevi",
    description: "Görünür eserleri ve yazarları keşfet, ilgilendiğin çalışmaları takip alanında topla.",
    icon: "publisher",
    cta: "Yayınevi Başvurusu",
    className: "landing-role--publisher",
    highlights: ["Eser ve yazar keşfi", "Kurumsal takip"],
  },
] as const;

const benefits = [
  { icon: "shield", title: "Kayıtlı Eser Süreci", description: "Yazım oturumları, revizyonlar ve sürüm geçmişi eser süreci boyunca kayıt altında tutulur.", className: "landing-benefit-v2--purple" },
  { icon: "feedback", title: "Yetkili Erişim", description: "Eserler, platformdaki rol ve erişim kuralları kapsamında ilgili kullanıcılara gösterilir.", className: "landing-benefit-v2--blue" },
  { icon: "editor", title: "Profesyonel Editör İncelemesi", description: "Yazarlar eserleri için profesyonel editör değerlendirmesi talep edebilir.", className: "landing-benefit-v2--orange" },
  { icon: "message", title: "Okur Geri Bildirimi", description: "Bölüm yorumları ve okur görüşleri, yazarın çalışma alanında düzenli biçimde toplanır.", className: "landing-benefit-v2--green" },
  { icon: "publisher", title: "Yayınevi Keşfi", description: "Yayınevi hesapları, görünür eserleri ve yazarları platform içinde keşfedebilir.", className: "landing-benefit-v2--blue" },
  { icon: "book", title: "Eser Pasaportu", description: "Eserin yazım geçmişi, inceleme durumu ve doğrulama bilgileri tek yerde görüntülenir.", className: "landing-benefit-v2--purple" },
] as const;

const stats = [
  { icon: "account", value: "2.847+", label: "Yazar" },
  { icon: "create", value: "18.592+", label: "Okuyucu" },
  { icon: "editor", value: "412+", label: "Editör" },
  { icon: "publisher", value: "78+", label: "Yayınevi" },
  { icon: "book", value: "6.215+", label: "Eser" },
  { icon: "message", value: "34.760+", label: "Yorum" },
] as const;

export default async function HomePage() {
  const [profile, roleCardState, homepageState] = await Promise.all([
    getCurrentProfile(),
    getPublishedRoleCardsState("tr"),
    getPublishedHomepageState("tr"),
  ]);
  const navigation = profile ? await getRoleNavigation(profile) : null;
  const pendingRole = navigation?.pendingRequest?.requestedRole
    ?? (profile?.role === "editor_pending" ? "editor" : null);
  const homepage = homepageState.state === "valid" ? homepageState.content : {};
  const hero = homepage.hero;
  const roleSection = homepage.roles;
  const passport = homepage.passport;
  const why = homepage.why;
  const footer = homepage.footer;
  const primaryHref = safeCmsInternalHref(hero?.primaryCtaHref) || "/kayit?rol=writer";
  const secondaryHref = safeCmsInternalHref(hero?.secondaryCtaHref) || "/kesfet";
  const passportHref = safeCmsInternalHref(passport?.ctaHref) || "#roller";
  const heroTitle = hero?.title || "İlk cümle,\nilk okurun,\nilk adımın.";
  const heroDescription = hero?.description || "Eserini yaz, okurlarla geliştir, profesyonel editör incelemesine taşı ve yayınevleri tarafından keşfedil.";
  const roleEyebrow = roleSection?.eyebrow || "Topluluğa katıl";
  const roleTitle = roleSection?.title || "İlkOku’ya nasıl katılmak istiyorsun?";
  const roleDescription = roleSection?.description || "Rolünü seç; kayıt akışını sana uygun şekilde başlatalım.";
  const passportEyebrow = passport?.eyebrow || "Eserin dijital izi";
  const passportTitle = passport?.title || "Bir eserin yalnızca sonucunu değil, oluşum sürecini de görün.";
  const passportDescription = passport?.description || "Eser Pasaportu; yazım oturumlarını, revizyonları, sürüm geçmişini ve profesyonel inceleme durumunu tek bir kayıt altında birleştirir.";
  const whyEyebrow = why?.eyebrow || "Güven, kayıt ve keşif";
  const whyTitle = why?.title || "Neden İlkOku?";
  const homepageStats = stats.map((stat, index) => ({
    ...stat,
    value: why?.[`stat${index + 1}Value`] || stat.value,
    label: why?.[`stat${index + 1}Label`] || stat.label,
  }));
  const footerSlogan = footer?.slogan || "İlk cümle, ilk okurun, ilk adımın.";
  const footerCopyright = footer?.copyright || `© ${new Date().getFullYear()} İlkOku. Tüm hakları saklıdır.`;
  const cmsRoleCards = roleCardState.state === "valid"
    ? roleCardsFromPayload("tr", roleCardState.payload)
    : null;
  const visibleRoles = cmsRoleCards
    ? cmsRoleCards
        .filter((card) => card.visible)
        .map((card) => ({
          key: card.key,
          title: card.title,
          description: card.description,
          icon: cmsRoleMeta[card.key].icon,
          cta: card.ctaLabel,
          className: cmsRoleMeta[card.key].className,
          highlights: [card.highlight1, card.highlight2],
          position: card.position,
          href: cmsRoleMeta[card.key].fixedHref,
        }))
    : roles.map((role, index) => ({
        ...role,
        position: index + 1,
        href: cmsRoleMeta[role.key].fixedHref,
      }));

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
              <summary aria-label={profile ? `${profile.fullName} hesap menüsünü aç` : "Hesap menüsünü aç"}><LandingIcon name="account" /></summary>
              <div className="landing-account__menu">
                {profile && navigation ? <>
                  <div className="landing-account__identity">
                    <strong>{profile.fullName}</strong>
                    <span>Aktif rol: {authContent.roles[profile.role]}</span>
                    {navigation.hasPendingRequest ? <small>{pendingRole ? `${authContent.roles[pendingRole]} başvurunuz inceleniyor` : "Başvurunuz inceleniyor"}</small> : null}
                  </div>
                  <Link href="/hesabim">Hesabım</Link>
                  <Link href={navigation.workspaceHref}>{navigation.hasPendingRequest ? "Mevcut çalışma alanına dön" : "Çalışma Alanım"}</Link>
                  <form action={logoutAction}><button className="landing-account__logout" type="submit">Çıkış Yap</button></form>
                </> : <><Link href="/giris">Giriş Yap</Link><a href="#roller">Üye Ol</a></>}
              </div>
            </details>
          </div>
        </div>
      </header>

      <section className="landing-hero" id="hakkimizda">
        <div className="landing-container landing-hero__grid">
          <div className="landing-hero__content">
            <span className="landing-hero__badge"><LandingIcon name="book" /> Yazardan yayınevine tek bir edebiyat ekosistemi</span>
            <h1><HeroTitle title={heroTitle} /></h1>
            <p>{heroDescription}</p>
            <div className="landing-hero__actions">
              <Link className="landing-button landing-button--primary landing-button--large" href={primaryHref}>{hero?.primaryCtaLabel || "Eserini Yazmaya Başla"} <span aria-hidden="true">→</span></Link>
              <Link className="landing-button landing-button--soft landing-button--large" href={secondaryHref}>{hero?.secondaryCtaLabel || "Eserleri Keşfet"}</Link>
            </div>
            <div className="landing-hero__proof" aria-label="İlkOku temel özellikleri">
              <span><LandingIcon name="shield" /> Sürüm geçmişi</span>
              <span><LandingIcon name="editor" /> Editör incelemesi</span>
              <span><LandingIcon name="publisher" /> Yayınevi keşfi</span>
            </div>
          </div>

          <div className="landing-hero__visual landing-hero-product">
            <Image src="/landing/ilkoku-hero.webp" alt="Bir yazarın açık kitap ve defterlerle çalıştığı mor tonlu illüstrasyon" fill priority sizes="(max-width: 768px) 100vw, 54vw" />
            <span className="landing-hero-product__veil" aria-hidden="true" />
            <div className="landing-product-card landing-product-card--passport">
              <span className="landing-product-card__eyebrow">Örnek eser kaydı</span>
              <div className="landing-product-card__title"><LandingIcon name="book" /><strong>Eser Pasaportu</strong></div>
              <div className="landing-product-card__metrics">
                <span><strong>41</strong> yazım oturumu</span>
                <span><strong>19</strong> revizyon</span>
              </div>
            </div>
            <div className="landing-product-card landing-product-card--review">
              <span className="landing-product-card__icon"><LandingIcon name="feedback" /></span>
              <div><small>Profesyonel inceleme</small><strong>Tamamlandı</strong></div>
            </div>
            <div className="landing-product-card landing-product-card--publisher">
              <span className="landing-product-card__icon"><LandingIcon name="publisher" /></span>
              <div><small>Yayınevi görünürlüğü</small><strong>Keşfe açık</strong></div>
            </div>
          </div>
        </div>
      </section>

      <HistoryInspiration />

      <section className="landing-section landing-section--roles" id="roller">
        <div className="landing-container">
          <div className="landing-section-heading"><span className="landing-section-heading__eyebrow">{roleEyebrow}</span><h2>{roleTitle}</h2><p>{roleDescription}</p></div>
          <div className="landing-role-grid landing-role-grid--v2">
            {visibleRoles.map((role) => (
              <Link aria-label={`${role.title} olarak kayıt ol`} className={`landing-role ${role.className}`} href={role.href} key={role.key}>
                <span className="landing-role__number">{String(role.position).padStart(2, "0")}</span>
                <span className="landing-role__label">{role.title} rolü</span>
                <span className="landing-role__icon" aria-hidden="true"><LandingIcon name={role.icon} /></span>
                <h3>{role.title}</h3>
                <p>{role.description}</p>
                <span className="landing-role__highlights">{role.highlights.map((highlight) => <small key={highlight}>{highlight}</small>)}</span>
                <strong>{role.cta} <span aria-hidden="true">→</span></strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-passport" id="eser-pasaportu">
        <div className="landing-container landing-passport__grid">
          <div className="landing-passport__content">
            <span className="landing-section-heading__eyebrow">{passportEyebrow}</span>
            <h2>{passportTitle}</h2>
            <p>{passportDescription}</p>
            <ul>
              <li><span>✓</span> Platform üzerinde oluşan yazım ve revizyon geçmişi</li>
              <li><span>✓</span> Bölüm ve sürüm hareketlerinin düzenli kaydı</li>
              <li><span>✓</span> Profesyonel editör inceleme durumu</li>
              <li><span>✓</span> Yayınevi keşif ve takip görünürlüğü</li>
            </ul>
            <Link className="landing-button landing-button--white landing-button--large" href={passportHref}>{passport?.ctaLabel || "Rolünü Seç"} <span aria-hidden="true">→</span></Link>
          </div>

          <div className="landing-passport-card" aria-label="Örnek Eser Pasaportu görünümü">
            <div className="landing-passport-card__header">
              <div><small>Örnek görünüm</small><strong>Eser Pasaportu</strong></div>
              <span><LandingIcon name="shield" /></span>
            </div>
            <div className="landing-passport-card__status"><span>Süreç kaydı</span><strong>Aktif</strong></div>
            <div className="landing-passport-card__numbers">
              <div><strong>41</strong><span>Yazım oturumu</span></div>
              <div><strong>19</strong><span>Revizyon</span></div>
              <div><strong>7</strong><span>Sürüm</span></div>
            </div>
            <div className="landing-passport-card__timeline">
              <span><i /><b>Platform üzerinde yazıldı</b><small>Kayıtlı süreç</small></span>
              <span><i /><b>Profesyonel inceleme</b><small>Tamamlandı</small></span>
              <span><i /><b>Yayınevi görünürlüğü</b><small>Keşfe açık</small></span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-why-v2" id="neden-ilkoku">
        <div className="landing-container">
          <div className="landing-section-heading"><span className="landing-section-heading__eyebrow">{whyEyebrow}</span><h2>{whyTitle}</h2></div>
          <div className="landing-benefits-v2">{benefits.map((benefit) => (<article className={`landing-benefit-v2 ${benefit.className}`} key={benefit.title}><span className="landing-benefit-v2__icon"><LandingIcon name={benefit.icon} /></span><h3>{benefit.title}</h3><p>{benefit.description}</p></article>))}</div>
          <div className="landing-stats-v2" aria-label="İlkOku platform istatistikleri">{homepageStats.map((stat) => (<div className="landing-stat-v2" key={`${stat.label}-${stat.icon}`}><span className="landing-stat-v2__icon"><LandingIcon name={stat.icon} /></span><div><strong>{stat.value}</strong><span>{stat.label}</span></div></div>))}</div>
        </div>
      </section>

      <footer className="landing-footer" id="iletisim"><div className="landing-container landing-footer__grid"><div><Link className="landing-logo landing-logo--footer" href="/" aria-label="İlkOku ana sayfa"><Image src={logo} alt="İlkOku" sizes="(max-width: 480px) 128px, 156px" /></Link><p><FooterSlogan value={footerSlogan} /></p></div><div><h3>Platform</h3><a href="#hakkimizda">Hakkımızda</a><a href="#eser-pasaportu">Eser Pasaportu</a><a href="#neden-ilkoku">Neden İlkOku?</a><Link href="/editorler">Editörler</Link></div><div><h3>Hesap</h3>{profile && navigation ? <><Link href="/hesabim">Hesabım</Link><Link href={navigation.workspaceHref}>Çalışma Alanım</Link><form action={logoutAction}><button className="landing-footer__logout" type="submit">Çıkış Yap</button></form></> : <><Link href="/giris">Giriş Yap</Link><a href="#roller">Üye Ol</a><Link href="/sifremi-unuttum">Şifremi Unuttum</Link></>}</div><div><h3>Destek</h3><a href="mailto:destek@ilkoku.com">Yardım Merkezi</a></div></div><p className="landing-footer__copyright"><span className="landing-footer__copyright-text">{footerCopyright}</span></p></footer>
    </main>
  );
}
