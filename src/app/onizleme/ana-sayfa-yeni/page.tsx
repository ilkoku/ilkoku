import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { authContent } from "@/content";
import { logoutAction } from "@/features/auth/actions";
import { getRoleNavigation } from "@/features/auth/destination";
import { getCurrentProfile } from "@/features/auth/profile";
import { getPublishedHomepageState } from "@/lib/cms-homepage-store";
import { safeCmsInternalHref } from "@/lib/cms-links";
import { getPublishedRoleCardsState } from "@/lib/cms-role-card-store";
import { cmsRoleMeta, roleCardsFromPayload } from "@/lib/cms-role-cards";

import History670 from "./history-670";
import "./preview.css";

export const metadata: Metadata = {
  title: "Ana Sayfa Yeniden Tasarım Çalışması | İlkOku",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

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

  const paths: Record<IconName, ReactNode> = {
    writer: <><path d="M4 20h4l10.4-10.4a2.2 2.2 0 0 0-3.1-3.1L4.9 16.9 4 20Z" /><path d="m13.8 8 3.1 3.1" /></>,
    reader: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5Z" /><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z" /></>,
    editor: <><path d="M4 20h4l10.2-10.2a2.1 2.1 0 1 0-3-3L5 17l-1 3Z" /><path d="M13.8 8.2l3 3" /><path d="M4 4h7" /></>,
    publisher: <><path d="M3 21h18" /><path d="M5 21V9l7-5 7 5v12" /><path d="M9 21v-6h6v6" /></>,
    account: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    create: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M18 8v6M15 11h6" /></>,
    book: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5Z" /><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z" /></>,
    message: <><path d="M21 15a4 4 0 0 1-4 4H9l-5 3v-7a4 4 0 0 1-1-2.6V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" /><path d="M8 9h8M8 13h5" /></>,
    feedback: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    shield: <><path d="M12 3 20 6v6c0 4.8-3.2 7.4-8 9-4.8-1.6-8-4.2-8-9V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    trend: <><path d="M4 19V9M10 19V5M16 19v-7M3 19h18" /><path d="m5 12 5-4 4 2 6-6" /><path d="M16 4h4v4" /></>,
    bolt: <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" />,
  };

  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" {...common}>{paths[name]}</svg>;
}

const defaultRoles = [
  { key: "writer", title: "Yazar", description: "Eserini bölüm bölüm oluştur, okur geri bildirimiyle geliştir ve profesyonel incelemeye taşı.", cta: "Yazar Ol", highlights: ["Bölüm bazlı yayın", "Eser Pasaportu"], position: 1 },
  { key: "reader", title: "Okuyucu", description: "Yeni eserler keşfet, okumaya devam et, favorilerini oluştur ve yazara görüşünü ilet.", cta: "Okuyucu Ol", highlights: ["Yeni eser keşfi", "Bölüm yorumları"], position: 2 },
  { key: "editor", title: "Editör", description: "Eserleri bağımsız biçimde incele, profesyonel rapor hazırla ve yazara yol göster.", cta: "Editör Başvurusu", highlights: ["Bağımsız inceleme", "Profesyonel rapor"], position: 3 },
  { key: "publisher", title: "Yayınevi", description: "Görünür eserleri ve yazarları keşfet, ilgilendiğin çalışmaları takip alanında topla.", cta: "Yayınevi Başvurusu", highlights: ["Eser ve yazar keşfi", "Kurumsal takip"], position: 4 },
] as const;

const benefits = [
  { title: "Kayıtlı Eser Süreci", description: "Yazım oturumları, revizyonlar ve sürüm geçmişi eser süreci boyunca kayıt altında tutulur." },
  { title: "Yetkili Erişim", description: "Eserler, platformdaki rol ve erişim kuralları kapsamında ilgili kullanıcılara gösterilir." },
  { title: "Profesyonel Editör İncelemesi", description: "Yazarlar eserleri için profesyonel editör değerlendirmesi talep edebilir." },
  { title: "Okur Geri Bildirimi", description: "Bölüm yorumları ve okur görüşleri, yazarın çalışma alanında düzenli biçimde toplanır." },
  { title: "Yayınevi Keşfi", description: "Yayınevi hesapları, görünür eserleri ve yazarları platform içinde keşfedebilir." },
  { title: "Eser Pasaportu", description: "Eserin yazım geçmişi, inceleme durumu ve doğrulama bilgileri tek yerde görüntülenir." },
] as const;

const statIcons: IconName[] = ["account", "create", "editor", "publisher", "book", "message"];

export default async function HomepageRedesignWorkspacePage() {
  const [profile, roleCardState, homepageState] = await Promise.all([
    getCurrentProfile(),
    getPublishedRoleCardsState("tr"),
    getPublishedHomepageState("tr"),
  ]);

  const navigation = profile ? await getRoleNavigation(profile) : null;
  const pendingRole = navigation?.pendingRequest?.requestedRole ?? (profile?.role === "editor_pending" ? "editor" : null);
  const homepage = homepageState.state === "valid" ? homepageState.content : {};
  const hero = homepage.hero;
  const roleSection = homepage.roles;
  const passport = homepage.passport;
  const why = homepage.why;
  const footer = homepage.footer;

  const heroTitle = hero?.title || "İlk cümle,\nilk okurun,\nilk adımın.";
  const heroLines = heroTitle.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const primaryHref = safeCmsInternalHref(hero?.primaryCtaHref) || "/kayit?rol=writer";
  const secondaryHref = safeCmsInternalHref(hero?.secondaryCtaHref) || "/eserler";
  const passportHref = safeCmsInternalHref(passport?.ctaHref) || "#roller";

  const cmsRoleCards = roleCardState.state === "valid" ? roleCardsFromPayload("tr", roleCardState.payload) : null;
  const visibleRoles = cmsRoleCards
    ? cmsRoleCards.filter((card) => card.visible).map((card) => ({
        key: card.key,
        title: card.title,
        description: card.description,
        cta: card.ctaLabel,
        highlights: [card.highlight1, card.highlight2],
        position: card.position,
        href: cmsRoleMeta[card.key].fixedHref,
      }))
    : defaultRoles.map((role) => ({ ...role, href: cmsRoleMeta[role.key].fixedHref }));

  const stats = statIcons.flatMap((icon, index) => {
    const value = why?.[`stat${index + 1}Value`]?.trim();
    const label = why?.[`stat${index + 1}Label`]?.trim();
    return value && label ? [{ icon, value, label }] : [];
  });

  return (
    <main className="nx-home">
      <header className="nx-header">
        <div className="nx-shell nx-header__inner">
          <Link href="/onizleme/ana-sayfa-yeni" className="nx-logo" aria-label="İlkOku yeni ana sayfa önizlemesi"><Image src={logo} alt="İlkOku" priority sizes="180px" /></Link>
          <span className="nx-header__label">Dijital edebiyat platformu</span>
          <details className="nx-account">
            <summary aria-label="Hesap menüsü"><LandingIcon name="account" /></summary>
            <div className="nx-account__menu">
              {profile && navigation ? <>
                <div className="nx-account__identity"><strong>{profile.fullName}</strong><span>Aktif rol: {authContent.roles[profile.role]}</span>{navigation.hasPendingRequest ? <small>{pendingRole ? `${authContent.roles[pendingRole]} başvurunuz inceleniyor` : "Başvurunuz inceleniyor"}</small> : null}</div>
                <Link href="/hesabim">Hesabım</Link><Link href={navigation.workspaceHref}>{navigation.hasPendingRequest ? "Mevcut çalışma alanına dön" : "Çalışma Alanım"}</Link><form action={logoutAction}><button type="submit">Çıkış Yap</button></form>
              </> : <><Link href="/giris">Giriş Yap</Link><a href="#roller">Üye Ol</a></>}
            </div>
          </details>
        </div>
      </header>

      <section className="nx-hero" id="hakkimizda">
        <div className="nx-shell nx-hero__layout">
          <div className="nx-hero__copy">
            <p className="nx-eyebrow"><LandingIcon name="book" /> Yazardan yayınevine tek bir edebiyat ekosistemi</p>
            <h1>{heroLines.length > 0 ? heroLines.map((line, index) => <span key={`${index}-${line}`}>{line}</span>) : <span>{heroTitle}</span>}</h1>
            <p className="nx-hero__description">{hero?.description || "Eserini yaz, okurlarla geliştir, profesyonel editör incelemesine taşı ve yayınevleri tarafından keşfedil."}</p>
            <div className="nx-hero__actions"><Link href={primaryHref} className="nx-action nx-action--light">{hero?.primaryCtaLabel || "Eserini Yazmaya Başla"}<span aria-hidden="true">→</span></Link><Link href={secondaryHref} className="nx-action nx-action--line">{hero?.secondaryCtaLabel || "Eserleri Keşfet"}</Link></div>
          </div>
          <div className="nx-hero__art" aria-label="İlkOku ana görseli"><Image src="/landing/ilkoku-hero-user-final.webp" alt="Bir yazarın açık kitap ve defterlerle çalıştığı mor tonlu illüstrasyon" fill priority sizes="(max-width: 900px) 100vw, 48vw" /><div className="nx-hero__art-frame" aria-hidden="true" /></div>
        </div>
        <div className="nx-shell nx-hero__proof" aria-label="İlkOku temel özellikleri"><span><LandingIcon name="shield" /> Sürüm geçmişi</span><span><LandingIcon name="editor" /> Editör incelemesi</span><span><LandingIcon name="publisher" /> Yayınevi keşfi</span></div>
      </section>

      <History670 />

      <section className="nx-roles" id="roller">
        <div className="nx-shell">
          <header className="nx-section-heading nx-section-heading--inverse"><p className="nx-eyebrow">{roleSection?.eyebrow || "Topluluğa katıl"}</p><h2>{roleSection?.title || "İlkOku’ya nasıl katılmak istiyorsun?"}</h2><p>{roleSection?.description || "Rolünü seç; kayıt akışını sana uygun şekilde başlatalım."}</p></header>
          <div className="nx-role-grid">{visibleRoles.map((role) => <Link href={role.href} className={`nx-role nx-role--${role.key}`} key={role.key} aria-label={`${role.title} olarak kayıt ol`}><div className="nx-role__top"><span className="nx-role__number">{String(role.position).padStart(2, "0")}</span><span className={`nx-role__icon nx-role__icon--${role.key}`} aria-hidden="true" /></div><h3>{role.title}</h3><p>{role.description}</p><div className="nx-role__highlights">{role.highlights.map((highlight) => <small key={highlight}>{highlight}</small>)}</div><strong>{role.cta}<span aria-hidden="true">→</span></strong></Link>)}</div>
        </div>
      </section>

      <section className="nx-passport" id="eser-pasaportu">
        <div className="nx-shell nx-passport__layout">
          <div className="nx-passport__copy"><p className="nx-eyebrow nx-eyebrow--violet">{passport?.eyebrow || "Eserin dijital izi"}</p><h2>{passport?.title || "Bir eserin yalnızca sonucunu değil, oluşum sürecini de görün."}</h2><p>{passport?.description || "Eser Pasaportu; yazım oturumlarını, revizyonları, sürüm geçmişini ve profesyonel inceleme durumunu tek bir kayıt altında birleştirir."}</p><ul><li><span>✓</span>Platform üzerinde oluşan yazım ve revizyon geçmişi</li><li><span>✓</span>Bölüm ve sürüm hareketlerinin düzenli kaydı</li><li><span>✓</span>Profesyonel editör inceleme durumu</li><li><span>✓</span>Yayınevi keşif ve takip görünürlüğü</li></ul><Link href={passportHref} className="nx-action nx-action--dark">{passport?.ctaLabel || "Rolünü Seç"}<span aria-hidden="true">→</span></Link></div>
          <div className="nx-passport__stage" aria-label="Örnek Eser Pasaportu görünümü"><div className="nx-passport-card"><div className="nx-passport-card__head"><div><small>Örnek görünüm</small><strong>Eser Pasaportu</strong></div><span><LandingIcon name="shield" /></span></div><div className="nx-passport-card__status"><span>Süreç kaydı</span><strong>Aktif</strong></div><div className="nx-passport-card__numbers"><div><strong>41</strong><span>Yazım oturumu</span></div><div><strong>19</strong><span>Revizyon</span></div><div><strong>7</strong><span>Sürüm</span></div></div><div className="nx-passport-card__timeline"><span><i /><b>Platform üzerinde yazıldı</b><small>Kayıtlı süreç</small></span><span><i /><b>Profesyonel inceleme</b><small>Tamamlandı</small></span><span><i /><b>Yayınevi görünürlüğü</b><small>Keşfe açık</small></span></div></div></div>
        </div>
      </section>

      <section className="nx-why" id="neden-ilkoku">
        <div className="nx-shell"><header className="nx-section-heading"><p className="nx-eyebrow nx-eyebrow--violet">{why?.eyebrow || "Güven, kayıt ve keşif"}</p><h2>{why?.title || "Neden İlkOku?"}</h2></header><div className="nx-benefit-grid">{benefits.map((benefit, index) => <article className={`nx-benefit nx-benefit--${index + 1}`} key={benefit.title}><span className="nx-benefit__icon" aria-hidden="true" /><h3>{benefit.title}</h3><p>{benefit.description}</p></article>)}</div>{stats.length > 0 ? <div className="nx-stats" aria-label="İlkOku platform istatistikleri">{stats.map((stat, index) => <div className={`nx-stat nx-stat--${index + 1}`} key={`${stat.label}-${stat.icon}`}><span className="nx-stat__icon" aria-hidden="true" /><strong>{stat.value}</strong><small>{stat.label}</small></div>)}</div> : null}</div>
      </section>

      <footer className="nx-footer" id="iletisim">
        <div className="nx-shell nx-footer__grid"><div className="nx-footer__brand"><Link href="/" className="nx-footer__logo"><Image src={logo} alt="İlkOku" sizes="160px" /></Link><p>{footer?.slogan || "İlk cümle, ilk okurun, ilk adımın."}</p></div><div><h3>Platform</h3><Link href="/hakkimizda">Hakkımızda</Link><Link href="/eserler">Eserler</Link><Link href="/yazarlar">Yazarlar</Link><Link href="/turler">Türler</Link><a href="#eser-pasaportu">Eser Pasaportu</a><a href="#neden-ilkoku">Neden İlkOku?</a><Link href="/editorler">Editörler</Link></div><div><h3>Hesap</h3>{profile && navigation ? <><Link href="/hesabim">Hesabım</Link><Link href={navigation.workspaceHref}>Çalışma Alanım</Link><form action={logoutAction}><button type="submit">Çıkış Yap</button></form></> : <><Link href="/giris">Giriş Yap</Link><a href="#roller">Üye Ol</a><Link href="/sifremi-unuttum">Şifremi Unuttum</Link></>}</div><div><h3>Destek</h3><Link href="/iletisim">İletişim</Link><Link href="/yardim">Yardım Merkezi</Link><Link href="/rehber">Yazarlık Rehberi</Link></div></div><div className="nx-shell nx-footer__bottom">{footer?.copyright || `© ${new Date().getFullYear()} İlkOku. Tüm hakları saklıdır.`}</div>
      </footer>
    </main>
  );
}
