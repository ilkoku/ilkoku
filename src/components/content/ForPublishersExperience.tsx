import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { EditorialBody } from "@/components/content/PublicEditorialDocument";
import { getPublicTrustPageVisual } from "@/content/public-trust-page-visuals";

type Section = { body: string; title: string };
type PublisherIconName = "building" | "search" | "heart" | "share" | "passport" | "editor" | "team" | "contract" | "shield";

const knownSections = new Set([
  "Yayınevi çalışma alanına kurumsal üyelikle gir",
  "Public eser ve yazarları keşfet",
  "Beğeni, favori ve takibi kurumsal sinyal olarak kullan",
  "Eseri ekip içinde kontrollü biçimde paylaş",
  "Eser Pasaportu ile özel içeriği birbirinden ayır",
  "Tamamlanmış eser için İlkOku editör incelemesi iste",
  "Ekip üyelerini rol ve yetki sınırlarıyla yönet",
  "Sözleşme ve yayın planını keşiften ayrı tut",
  "Gizli ve yetkili içeriği görev amacıyla kullan",
  "İlkOku yayınevi için neyi garanti etmez",
  "Yayınevi olarak başla",
]);

function splitSections(body: string) {
  const intro: string[] = [];
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      if (current) sections.push({ ...current, body: current.body.trim() });
      current = { title: line.slice(3).trim(), body: "" };
    } else if (current) current.body += `${line}\n`;
    else intro.push(line);
  }

  if (current) sections.push({ ...current, body: current.body.trim() });
  return { intro: intro.join("\n").trim(), sections };
}

function formatUpdatedAt(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(date);
}

function PublisherIcon({ name }: { name: PublisherIconName }) {
  const paths = {
    building: <><path d="M4 21V7l8-4 8 4v14" /><path d="M8 21v-6h8v6M8 9h.01M12 9h.01M16 9h.01M8 12h.01M12 12h.01M16 12h.01" /></>,
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></>,
    heart: <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z" />,
    share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.3 10.9 7.4-4.8M8.3 13.1l7.4 4.8" /></>,
    passport: <><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M9 16h6" /></>,
    editor: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h5M8 16h7" /><path d="m15 15 1.5 1.5L20 13" /></>,
    team: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.3" /><path d="M3.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M15.3 14.8c3.1-.7 5.1.9 5.5 4.2" /></>,
    contract: <><path d="M6 3h9l3 3v15H6z" /><path d="M15 3v4h4M9 11h6M9 15h6M9 19h4" /></>,
    shield: <><path d="M12 3 4.5 6v5.5c0 4.6 3 7.7 7.5 9.5 4.5-1.8 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-5" /></>,
  } as const;

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">{paths[name]}</svg>;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <header className="how-section-heading"><span>{eyebrow}</span><h2>{title}</h2>{description ? <p>{description}</p> : null}</header>;
}

function PublisherFooter() {
  return (
    <footer className="publishers-footer" aria-label="İlkOku site alt bilgisi">
      <div className="publishers-footer__inner">
        <div className="publishers-footer__brand">
          <Link className="publishers-footer__logo" href="/" aria-label="İlkOku ana sayfa">
            <Image src={logo} alt="İlkOku" sizes="156px" />
          </Link>
          <p>İlk cümle, ilk okurun, <strong>ilk adımın.</strong></p>
        </div>
        <div className="publishers-footer__column"><h3>Platform</h3><Link href="/#hakkimizda">Hakkımızda</Link><Link href="/eserler">Eserler</Link><Link href="/yazarlar">Yazarlar</Link><Link href="/turler">Türler</Link><Link href="/#eser-pasaportu">Eser Pasaportu</Link><Link href="/#neden-ilkoku">Neden İlkOku?</Link><Link href="/editorler">Editörler</Link></div>
        <div className="publishers-footer__column"><h3>Hesap</h3><Link href="/giris">Giriş Yap</Link><Link href="/kayit">Üye Ol</Link><Link href="/sifremi-unuttum">Şifremi Unuttum</Link></div>
        <div className="publishers-footer__column"><h3>Destek</h3><Link href="/yardim">Yardım Merkezi</Link><Link href="/rehber">Yazarlık Rehberi</Link></div>
      </div>
      <div className="publishers-footer__bottom">
        <span>© 2026 İlkOku. Tüm hakları saklıdır.</span>
        <nav aria-label="Yasal bağlantılar"><Link href="/yasal/kullanim-sartlari">Kullanım Şartları</Link><Link href="/yasal/gizlilik-politikasi">Gizlilik Politikası</Link><Link href="/yasal/kvkk">KVKK</Link><Link href="/yasal/cerez-politikasi">Çerez Politikası</Link><Link href="/yasal/telif-hakki-politikasi">Telif Hakkı Politikası</Link></nav>
      </div>
    </footer>
  );
}

export function ForPublishersExperience({ body, summary, title, updatedAt }: { body: string; summary: string; title: string; updatedAt?: Date | string | null }) {
  const parsed = splitSections(body);
  const sectionMap = new Map(parsed.sections.map((section) => [section.title, section]));
  const extras = parsed.sections.filter((section) => !knownSections.has(section.title));
  const updatedLabel = formatUpdatedAt(updatedAt);
  const visual = getPublicTrustPageVisual("/yayinevleri-icin");

  return (
    <main className="how-page for-publishers-page">
      <header className="how-header">
        <div className="how-container how-header__inner">
          <Link className="how-logo" href="/" aria-label="İlkOku ana sayfa"><Image src={logo} alt="İlkOku" priority sizes="160px" /></Link>
          <nav aria-label="Herkese açık sayfalar"><Link href="/eserler">Eserler</Link><Link href="/yazarlar">Yazarlar</Link><Link href="/editorler">Editörler</Link><Link href="/yardim">Yardım</Link></nav>
          <Link className="how-header__account" href="/giris">Giriş yap</Link>
        </div>
      </header>

      <section className="how-hero publishers-hero">
        <div className="how-container how-hero__grid">
          <div className="how-hero__content">
            <span className="how-eyebrow">Keşiften kurumsal değerlendirmeye</span>
            <h1>{title.split(/\s+/).map((word, index) => <span key={`${word}-${index}`}>{word}</span>)}</h1>
            <p>{summary}</p>
            <div className="how-hero__actions"><Link className="how-button how-button--primary" href="/kayit?rol=publisher">Yayınevi olarak başla <span aria-hidden="true">→</span></Link><Link className="how-button how-button--secondary" href="#yayinevi-kesfi">Keşif akışını gör</Link></div>
            <div className="how-hero__proof"><span><strong>Public</strong> keşif</span><span><strong>Rol bazlı</strong> yetki</span><span><strong>Ayrı</strong> sözleşme akışı</span></div>
            {updatedLabel ? <small>Son güncelleme: {updatedLabel}</small> : null}
          </div>
          <figure className="how-hero__visual publishers-hero__visual">
            <Image src={visual.src} alt={visual.alt} fill priority sizes="(max-width: 860px) 100vw, 54vw" style={{ objectPosition: visual.focalPoint }} />
            <figcaption><span><PublisherIcon name="search" /> Keşfet</span><span><PublisherIcon name="share" /> Ekipte değerlendir</span><span><PublisherIcon name="contract" /> Kararı ayrı yönet</span></figcaption>
          </figure>
        </div>
      </section>

      <nav className="how-quick-nav how-container" aria-label="Sayfa bölümleri"><a href="#yayinevi-kesfi"><span>01</span>Keşif</a><a href="#kurumsal-degerlendirme"><span>02</span>Değerlendirme</a><a href="#yetki-sinirlari"><span>03</span>Yetkiler</a><a href="#ticari-surec"><span>04</span>Sözleşme</a></nav>

      {parsed.intro ? <section className="how-truth how-container" aria-label="Yayınevi keşfinin sınırı"><span><PublisherIcon name="building" /></span><div><strong>Keşif ilgi üretir; bağlayıcı yayın kararı veya hak devri üretmez.</strong><EditorialBody body={parsed.intro} /></div></section> : null}

      <section className="publishers-discovery how-container" id="yayinevi-kesfi">
        <SectionHeading eyebrow="Kurumsal keşif" title="Önce public yüzeyi keşfet; özel erişimi varsayma." description="Yayınevi üyeliği, keşif ve özel içerik erişimi aynı izin değildir." />
        <div className="publishers-discovery__grid">
          {sectionMap.get("Yayınevi çalışma alanına kurumsal üyelikle gir") ? <article><PublisherIcon name="building" /><span>01 · Üyelik</span><h3>Kurum içindeki her kullanıcı aynı yetkiyle çalışmaz.</h3><EditorialBody body={sectionMap.get("Yayınevi çalışma alanına kurumsal üyelikle gir")!.body} /></article> : null}
          {sectionMap.get("Public eser ve yazarları keşfet") ? <article><PublisherIcon name="search" /><span>02 · Keşif</span><h3>Public eser ve yazarları filtreleyerek değerlendirme havuzu oluştur.</h3><EditorialBody body={sectionMap.get("Public eser ve yazarları keşfet")!.body} /></article> : null}
          {sectionMap.get("Beğeni, favori ve takibi kurumsal sinyal olarak kullan") ? <article><PublisherIcon name="heart" /><span>03 · İlgi sinyali</span><h3>Beğeni ve favori teklif değildir.</h3><EditorialBody body={sectionMap.get("Beğeni, favori ve takibi kurumsal sinyal olarak kullan")!.body} /></article> : null}
        </div>
      </section>

      <section className="publishers-evaluation" id="kurumsal-degerlendirme"><div className="how-container"><SectionHeading eyebrow="Ekip içi değerlendirme" title="İlgiyi ekip içinde taşı; erişimi genelleştirme." description="Paylaşım, pasaport ve editör talebi birbirinden ayrı kurumsal araçlardır." /><div className="publishers-evaluation__grid">
        {sectionMap.get("Eseri ekip içinde kontrollü biçimde paylaş") ? <article><PublisherIcon name="share" /><span>Paylaşım</span><h3>Kaydı belirli üyeye ve değerlendirme notuyla taşı.</h3><EditorialBody body={sectionMap.get("Eseri ekip içinde kontrollü biçimde paylaş")!.body} /></article> : null}
        {sectionMap.get("Eser Pasaportu ile özel içeriği birbirinden ayır") ? <article className="publishers-card--night"><PublisherIcon name="passport" /><span>Eser Pasaportu</span><h3>Pasaport erişimi özel tam metin erişimi değildir.</h3><EditorialBody body={sectionMap.get("Eser Pasaportu ile özel içeriği birbirinden ayır")!.body} /></article> : null}
        {sectionMap.get("Tamamlanmış eser için İlkOku editör incelemesi iste") ? <article><PublisherIcon name="editor" /><span>Profesyonel inceleme</span><h3>Editör görüşünü yayınevi kararından ayrı tut.</h3><EditorialBody body={sectionMap.get("Tamamlanmış eser için İlkOku editör incelemesi iste")!.body} /><Link href="/editoryal-standartlar">Editoryal Standartlar →</Link></article> : null}
      </div></div></section>

      <section className="publishers-permissions how-container" id="yetki-sinirlari"><SectionHeading eyebrow="Rol ve izin modeli" title="En geniş erişim varsayılan değildir." description="Keşif yapan, paylaşım yapan, içerik gören ve sözleşme yöneten kullanıcı aynı kişi olmak zorunda değildir." /><div className="publishers-permissions__grid">
        {sectionMap.get("Ekip üyelerini rol ve yetki sınırlarıyla yönet") ? <article className="publishers-card--night"><PublisherIcon name="team" /><span>Ekip ve yetkiler</span><h3>Her üyeye yalnız görevini gerektiren erişimi ver.</h3><EditorialBody body={sectionMap.get("Ekip üyelerini rol ve yetki sınırlarıyla yönet")!.body} /></article> : null}
        {sectionMap.get("Gizli ve yetkili içeriği görev amacıyla kullan") ? <article><PublisherIcon name="shield" /><span>Gizlilik</span><h3>Yetkili içerik sınırsız kullanım hakkı değildir.</h3><EditorialBody body={sectionMap.get("Gizli ve yetkili içeriği görev amacıyla kullan")!.body} /><Link href="/telif-bildirimi">Telif Bildirimi →</Link></article> : null}
      </div></section>

      <section className="publishers-contract" id="ticari-surec"><div className="how-container"><SectionHeading eyebrow="Ticari karar sınırı" title="Keşif, değerlendirme ve sözleşmeyi ayrı yaşam döngülerinde tut." description="İlgi sinyalleri ancak tarafların ayrıca verdiği kararlarla ticari sürece dönüşür." /><div className="publishers-contract__grid">
        {sectionMap.get("Sözleşme ve yayın planını keşiften ayrı tut") ? <article><PublisherIcon name="contract" /><span>Sözleşme</span><h3>Bağlayıcı işlem ayrı yetki ve geçerli belge gerektirir.</h3><EditorialBody body={sectionMap.get("Sözleşme ve yayın planını keşiften ayrı tut")!.body} /></article> : null}
        {sectionMap.get("İlkOku yayınevi için neyi garanti etmez") ? <article><PublisherIcon name="shield" /><span>Garanti sınırı</span><h3>Keşif ve inceleme, yayın veya ticari başarı garantisi değildir.</h3><EditorialBody body={sectionMap.get("İlkOku yayınevi için neyi garanti etmez")!.body} /></article> : null}
      </div></div></section>

      {extras.length ? <section className="publishers-extra how-container">{extras.map((section) => <article key={section.title}><h2>{section.title}</h2><EditorialBody body={section.body} /></article>)}</section> : null}

      {sectionMap.get("Yayınevi olarak başla") ? <section className="publishers-start-section"><div className="publishers-start how-container"><PublisherIcon name="building" /><div><span>Kurumsal başlangıç</span><h2>Keşif yetkisini ekip sorumluluğuyla birlikte kur.</h2><EditorialBody body={sectionMap.get("Yayınevi olarak başla")!.body} /><div className="publishers-start__actions"><Link className="how-button how-button--primary" href="/kayit?rol=publisher">Yayınevi olarak başla <span aria-hidden="true">→</span></Link><Link className="how-button how-button--secondary" href="/editoryal-standartlar">Editoryal Standartlar</Link><Link className="how-button how-button--secondary" href="/telif-bildirimi">Telif Bildirimi</Link></div></div></div></section> : null}

      <PublisherFooter />
    </main>
  );
}
