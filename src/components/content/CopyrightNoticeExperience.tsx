import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { EditorialBody } from "@/components/content/PublicEditorialDocument";
import { getPublicTrustPageVisual } from "@/content/public-trust-page-visuals";

type Section = { body: string; title: string };

const knownSections = new Set([
  "Bildirim ne zaman kullanılmalı",
  "Bildirimde gerekli bilgiler",
  "Eseri ve içeriği tanımlama",
  "Hak sahipliği ve yetki",
  "İnceleme nasıl ilerler",
  "Erişim ve geçici önlem",
  "Karşı açıklama ve bağlam",
  "Kötüye kullanım ve yanıltıcı bildirim",
  "Mahremiyet ve veri minimizasyonu",
  "Bildirim ve hukuki yollar",
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

function CopyrightIcon({ name }: { name: "document" | "link" | "shield" | "search" | "balance" | "privacy" | "warning" }) {
  const paths = {
    document: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>,
    link: <><path d="M10 13a4 4 0 0 0 5.7.1l2.1-2.1a4 4 0 0 0-5.7-5.7L11 6.4" /><path d="M14 11a4 4 0 0 0-5.7-.1L6.2 13a4 4 0 0 0 5.7 5.7l1.1-1.1" /></>,
    shield: <><path d="M12 3 4.5 6v5.5c0 4.6 3 7.7 7.5 9.5 4.5-1.8 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-5" /></>,
    search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4M8.5 11h5M11 8.5v5" /></>,
    balance: <><path d="M12 3v18M5 6h14M7 6l-4 7h8L7 6ZM17 6l-4 7h8l-4-7ZM8 21h8" /></>,
    privacy: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15" r="1" /></>,
    warning: <><path d="m12 3 9 17H3L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
  } as const;

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">{paths[name]}</svg>;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <header className="how-section-heading"><span>{eyebrow}</span><h2>{title}</h2>{description ? <p>{description}</p> : null}</header>;
}

export function CopyrightNoticeExperience({ body, summary, title, updatedAt }: { body: string; summary: string; title: string; updatedAt?: Date | string | null }) {
  const parsed = splitSections(body);
  const sectionMap = new Map(parsed.sections.map((section) => [section.title, section]));
  const extras = parsed.sections.filter((section) => !knownSections.has(section.title));
  const updatedLabel = formatUpdatedAt(updatedAt);
  const visual = getPublicTrustPageVisual("/telif-bildirimi");

  return (
    <main className="how-page copyright-notice-page">
      <header className="how-header">
        <div className="how-container how-header__inner">
          <Link className="how-logo" href="/" aria-label="İlkOku ana sayfa"><Image src={logo} alt="İlkOku" priority sizes="160px" /></Link>
          <nav aria-label="Herkese açık sayfalar"><Link href="/eserler">Eserler</Link><Link href="/yazarlar">Yazarlar</Link><Link href="/editorler">Editörler</Link><Link href="/yardim">Yardım</Link></nav>
          <Link className="how-header__account" href="/giris">Giriş yap</Link>
        </div>
      </header>

      <section className="how-hero copyright-hero">
        <div className="how-container how-hero__grid">
          <div className="how-hero__content">
            <span className="how-eyebrow">Hak iddiası için somut kayıt yolu</span>
            <h1>{title.split(/\s+/).map((word, index) => <span key={`${word}-${index}`}>{word}</span>)}</h1>
            <p>{summary}</p>
            <div className="how-hero__actions">
              <Link className="how-button how-button--primary" href="#bildirim-hazirla">Bildirimi hazırla <span aria-hidden="true">→</span></Link>
              <Link className="how-button how-button--secondary" href="/iletisim">İletişime geç</Link>
            </div>
            <div className="how-hero__proof"><span><strong>1</strong> somut URL</span><span><strong>En az</strong> gerekli veri</span><span><strong>0</strong> otomatik hüküm</span></div>
            {updatedLabel ? <small>Son güncelleme: {updatedLabel}</small> : null}
          </div>
          <figure className="how-hero__visual copyright-hero__visual">
            <Image src={visual.src} alt={visual.alt} fill priority sizes="(max-width: 860px) 100vw, 54vw" style={{ objectPosition: visual.focalPoint }} />
            <figcaption><span><CopyrightIcon name="document" /> Eseri tanımla</span><span><CopyrightIcon name="link" /> URL’yi ekle</span><span><CopyrightIcon name="shield" /> Gereksiz veriyi çıkar</span></figcaption>
          </figure>
        </div>
      </section>

      <nav className="how-quick-nav how-container" aria-label="Sayfa bölümleri">
        <a href="#bildirim-hazirla"><span>01</span>Hazırlık</a>
        <a href="#inceleme"><span>02</span>İnceleme</a>
        <a href="#denge"><span>03</span>Bağlam</a>
        <a href="#gonder"><span>04</span>Gönderim</a>
      </nav>

      {parsed.intro ? <section className="how-truth how-container" aria-label="Telif bildiriminin sınırı"><span><CopyrightIcon name="balance" /></span><div><strong>Bildirim, otomatik ihlal veya kaldırma kararı değildir.</strong><EditorialBody body={parsed.intro} /></div></section> : null}

      <section className="copyright-prepare how-container" id="bildirim-hazirla">
        <SectionHeading eyebrow="Önce doğru iddiayı tanımla" title="Eser, hak ve sorunlu İlkOku kaydı aynı bildirimde buluşmalı." description="Genel şüphe yerine somut içerik, somut bağlantı ve anlaşılır hak ilişkisi incelemeyi mümkün kılar." />
        <div className="copyright-prepare__grid">
          {sectionMap.get("Bildirim ne zaman kullanılmalı") ? <article><CopyrightIcon name="search" /><span>Uygun durum</span><h3>Telif sürecini fikir ayrılığı veya eleştiri için kullanma.</h3><EditorialBody body={sectionMap.get("Bildirim ne zaman kullanılmalı")!.body} /></article> : null}
          {sectionMap.get("Bildirimde gerekli bilgiler") ? <article><CopyrightIcon name="document" /><span>Gerekli bilgiler</span><h3>İncelemeyi başlatacak kadar açık, mahremiyeti bozmayacak kadar sınırlı.</h3><EditorialBody body={sectionMap.get("Bildirimde gerekli bilgiler")!.body} /></article> : null}
          {sectionMap.get("Eseri ve içeriği tanımlama") ? <article><CopyrightIcon name="link" /><span>Somut bağlantı</span><h3>Özgün eser ile sorunlu İlkOku yüzeyini birbirine bağla.</h3><EditorialBody body={sectionMap.get("Eseri ve içeriği tanımlama")!.body} /></article> : null}
          {sectionMap.get("Hak sahipliği ve yetki") ? <article><CopyrightIcon name="shield" /><span>Hak ve temsil</span><h3>Kendi hakkını veya gerçekten temsil ettiğin hak sahibini bildir.</h3><EditorialBody body={sectionMap.get("Hak sahipliği ve yetki")!.body} /></article> : null}
        </div>
      </section>

      <section className="copyright-review" id="inceleme">
        <div className="how-container">
          <SectionHeading eyebrow="Platform içi inceleme" title="Kayıtlar değerlendirilir; sonuç baştan varsayılmaz." description="İlkOku kendi erişim yüzeylerini ve kayıtlarını inceleyebilir, ancak telif mülkiyeti hakkında mahkeme yerine geçen kesin hüküm kurmaz." />
          <div className="copyright-review__grid">
            {sectionMap.get("İnceleme nasıl ilerler") ? <article className="copyright-review__primary"><CopyrightIcon name="search" /><span>İnceleme</span><h3>Önce kaydı ve iddiayı anlaşılır hâle getir.</h3><EditorialBody body={sectionMap.get("İnceleme nasıl ilerler")!.body} /></article> : null}
            {sectionMap.get("Erişim ve geçici önlem") ? <article><CopyrightIcon name="shield" /><span>Geçici önlem</span><h3>Görünürlük kararı, hak sahipliği hakkında nihai hüküm değildir.</h3><EditorialBody body={sectionMap.get("Erişim ve geçici önlem")!.body} /></article> : null}
          </div>
        </div>
      </section>

      <section className="copyright-balance how-container" id="denge">
        <SectionHeading eyebrow="Çelişen iddialarda bağlam" title="Karşı açıklama, ilk bildirimi otomatik silmez; yeni bağlam ekler." description="Lisans, ortak yazarlık, temsil veya kaynak konusunda farklı anlatımlar varsa platformun sınırı açık tutulur." />
        <div className="copyright-balance__grid">
          {sectionMap.get("Karşı açıklama ve bağlam") ? <article><CopyrightIcon name="balance" /><span>Karşı bağlam</span><h3>İki tarafın iddiası da kayıt ve somut bilgiyle değerlendirilir.</h3><EditorialBody body={sectionMap.get("Karşı açıklama ve bağlam")!.body} /></article> : null}
          {sectionMap.get("Kötüye kullanım ve yanıltıcı bildirim") ? <article><CopyrightIcon name="warning" /><span>Kötüye kullanım</span><h3>Telif bildirimi baskı veya susturma aracı değildir.</h3><EditorialBody body={sectionMap.get("Kötüye kullanım ve yanıltıcı bildirim")!.body} /><Link href="/topluluk-kurallari">Topluluk Kuralları →</Link></article> : null}
          {sectionMap.get("Mahremiyet ve veri minimizasyonu") ? <article><CopyrightIcon name="privacy" /><span>Mahremiyet</span><h3>İddiayı kanıtla; gereksiz kişisel veriyi gönderme.</h3><EditorialBody body={sectionMap.get("Mahremiyet ve veri minimizasyonu")!.body} /><Link href="/yasal/gizlilik-politikasi">Gizlilik Politikası →</Link></article> : null}
        </div>
      </section>

      {sectionMap.get("Bildirim ve hukuki yollar") ? <section className="copyright-submit how-container" id="gonder"><CopyrightIcon name="document" /><div><span>Somut kayıt · gerekli en az bilgi</span><h2>İlgili İlkOku bağlantısını ekleyerek bildiriminizi iletin.</h2><EditorialBody body={sectionMap.get("Bildirim ve hukuki yollar")!.body} /><div className="copyright-submit__actions"><Link className="how-button how-button--primary" href="/iletisim">İletişim sayfasını aç <span aria-hidden="true">→</span></Link><a className="how-button how-button--secondary" href="mailto:destek@ilkoku.com">destek@ilkoku.com</a></div></div></section> : null}

      {extras.length ? <section className="how-extras how-container">{extras.map((section) => <article className="how-editorial-card" key={section.title}><h2>{section.title}</h2><EditorialBody body={section.body} /></article>)}</section> : null}

      <aside className="how-related how-container" aria-label="İlkOku içinde devam et">
        <SectionHeading eyebrow="İlkOku içinde devam et" title="Telif bildiriminin temas ettiği diğer açık sınırları incele." />
        <div className="how-related__grid">
          <Link href="/yasal/telif-hakki-politikasi"><strong>Telif Hakkı Politikası</strong><span>Platformdaki eser ve kullanıcı içeriğine ilişkin genel telif çerçevesini incele.</span></Link>
          <Link href="/topluluk-kurallari"><strong>Topluluk Kuralları</strong><span>İntihal, yanıltıcı bildirim ve kullanıcı davranışı sınırlarını gör.</span></Link>
          <Link href="/icerik-ve-yas-politikasi"><strong>İçerik ve Yaş Politikası</strong><span>İçerik sınıflandırmasının telif sürecinden neden ayrı olduğunu öğren.</span></Link>
          <Link href="/iletisim"><strong>İletişim</strong><span>Somut telif iddianızı gerekli en az bilgiyle iletin.</span></Link>
        </div>
      </aside>

      <footer className="how-footer"><div className="how-container"><Link className="how-logo" href="/"><Image src={logo} alt="İlkOku" sizes="150px" /></Link><nav><Link href="/nasil-calisir">Nasıl Çalışır?</Link><Link href="/editoryal-standartlar">Editoryal Standartlar</Link><Link href="/icerik-ve-yas-politikasi">İçerik ve Yaş</Link><Link href="/topluluk-kurallari">Topluluk</Link><Link href="/telif-bildirimi">Telif Bildirimi</Link></nav></div></footer>
    </main>
  );
}
