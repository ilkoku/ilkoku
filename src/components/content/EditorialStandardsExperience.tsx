import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { EditorialBody } from "@/components/content/PublicEditorialDocument";
import { getPublicTrustPageVisual } from "@/content/public-trust-page-visuals";

type ContentSection = {
  body: string;
  title: string;
};

type EditorialStandardsExperienceProps = {
  body: string;
  summary: string;
  title: string;
  updatedAt?: Date | string | null;
};

type StandardsIconName =
  | "balance"
  | "evidence"
  | "independent"
  | "privacy"
  | "report"
  | "writer";

const knownSectionTitles = new Set([
  "İlkOku'da editoryal değerlendirme nedir?",
  "Değerlendirme ölçütleri",
  "İyi bir editör raporu nasıl görünür?",
  "Bağımsızlık ve çıkar çatışması",
  "İki editörlü inceleme nasıl korunur?",
  "Gizlilik ve eser güvenliği",
  "Yazarın yaratıcı kararı",
  "Editoryal görüşün sınırı",
  "İhlal bildirimi ve kalite incelemesi",
]);

function headingId(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[ç]/g, "c")
    .replace(/[ğ]/g, "g")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ş]/g, "s")
    .replace(/[ü]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitSections(body: string, marker: "##" | "###") {
  const headingPrefix = `${marker} `;
  const sections: ContentSection[] = [];
  const intro: string[] = [];
  let current: ContentSection | null = null;

  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith(headingPrefix) && !line.startsWith(`${marker}#`)) {
      if (current) sections.push({ ...current, body: current.body.trim() });
      current = { title: line.slice(headingPrefix.length).trim(), body: "" };
      continue;
    }
    if (current) current.body += `${line}\n`;
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

function StandardsIcon({ name }: { name: StandardsIconName }) {
  const paths = {
    balance: <><path d="M12 3v18M5 6h14M5 6l-3 6h6L5 6Zm14 0-3 6h6l-3-6ZM8 21h8" /></>,
    evidence: <><path d="M4 4h11v16H4z" /><path d="M8 8h4M8 12h4M8 16h3M16 15l2 2 4-5" /></>,
    independent: <><circle cx="7" cy="7" r="3" /><circle cx="17" cy="7" r="3" /><path d="M2 20a5 5 0 0 1 10 0M12 20a5 5 0 0 1 10 0M12 4v12" /></>,
    privacy: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    report: <><path d="M5 3h10l4 4v14H5z" /><path d="M14 3v5h5M8 12h8M8 16h6" /></>,
    writer: <><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" /><path d="m14.5 7.5 3 3M11 20h9" /></>,
  } as const;

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
      {paths[name]}
    </svg>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <header className="how-section-heading"><span>{eyebrow}</span><h2>{title}</h2>{description ? <p>{description}</p> : null}</header>;
}

function GenericSection({ section, tone }: { section: ContentSection; tone?: "night" | "soft" }) {
  return (
    <section className={`how-editorial-card${tone ? ` how-editorial-card--${tone}` : ""}`} id={headingId(section.title)}>
      <h2>{section.title}</h2>
      <EditorialBody body={section.body} />
    </section>
  );
}

export function EditorialStandardsExperience({ body, summary, title, updatedAt }: EditorialStandardsExperienceProps) {
  const parsed = splitSections(body, "##");
  const sectionMap = new Map(parsed.sections.map((section) => [section.title, section]));
  const criteriaSection = sectionMap.get("Değerlendirme ölçütleri");
  const criteria = splitSections(criteriaSection?.body ?? "", "###");
  const extras = parsed.sections.filter((section) => !knownSectionTitles.has(section.title));
  const updatedLabel = formatUpdatedAt(updatedAt);
  const visual = getPublicTrustPageVisual("/editoryal-standartlar");
  const titleWords = title.trim().split(/\s+/).filter(Boolean);

  return (
    <main className="how-page standards-page">
      <header className="how-header">
        <div className="how-container how-header__inner">
          <Link className="how-logo" href="/" aria-label="İlkOku ana sayfa"><Image src={logo} alt="İlkOku" priority sizes="160px" /></Link>
          <nav aria-label="Herkese açık sayfalar"><Link href="/eserler">Eserler</Link><Link href="/yazarlar">Yazarlar</Link><Link href="/editorler">Editörler</Link><Link href="/yardim">Yardım</Link></nav>
          <Link className="how-header__account" href="/giris">Giriş yap</Link>
        </div>
      </header>

      <section className="how-hero standards-hero">
        <div className="how-container how-hero__grid">
          <div className="how-hero__content">
            <span className="how-eyebrow">Eseri geliştiren profesyonel ikinci bakış</span>
            <h1>{titleWords.map((word) => <span key={word}>{word}</span>)}</h1>
            <p>{summary}</p>
            <div className="how-hero__actions"><Link className="how-button how-button--primary" href="/editorler-icin">Editör olarak katkı ver <span aria-hidden="true">→</span></Link><Link className="how-button how-button--secondary" href="#degerlendirme-olcutleri">Standartları incele</Link></div>
            <div className="how-hero__proof"><span><strong>8</strong> değerlendirme ölçütü</span><span><strong>2</strong> bağımsız görüş</span><span><strong>1</strong> yaratıcı karar sahibi</span></div>
            {updatedLabel ? <small>Son güncelleme: {updatedLabel}</small> : null}
          </div>

          <figure className="how-hero__visual standards-hero__visual">
            <Image src={visual.src} alt={visual.alt} fill priority sizes="(max-width: 860px) 100vw, 54vw" style={{ objectPosition: visual.focalPoint }} />
            <figcaption><span><StandardsIcon name="evidence" /> Metni keşfet</span><span><StandardsIcon name="report" /> Gerekçelendir</span><span><StandardsIcon name="independent" /> Yeni bakış ekle</span></figcaption>
          </figure>
        </div>
      </section>

      <nav className="how-quick-nav how-container" aria-label="Sayfa bölümleri">
        <a href="#degerlendirme-olcutleri"><span>01</span>Ölçütler</a><a href="#iyi-bir-editor-raporu-nasil-gorunur"><span>02</span>Rapor</a><a href="#bagimsizlik-ve-cikar-catismasi"><span>03</span>Bağımsızlık</a><a href="#gizlilik-ve-eser-guvenligi"><span>04</span>Güven</a>
      </nav>

      {parsed.intro ? <section className="how-truth how-container" aria-label="Editoryal değerlendirmenin değeri"><span><StandardsIcon name="report" /></span><div><strong>İyi editörlük, eserin güçlü ve gelişmeye açık yönlerini yazara görünür kılar.</strong><EditorialBody body={parsed.intro} /></div></section> : null}

      {sectionMap.get("İlkOku'da editoryal değerlendirme nedir?") ? <section className="how-definition how-container standards-definition"><div><SectionHeading eyebrow="Değerlendirmenin amacı" title="Bir eserin güçlü ve gelişmeye açık yönlerini görünür kılmak." /><EditorialBody body={sectionMap.get("İlkOku'da editoryal değerlendirme nedir?")!.body} /></div><aside><StandardsIcon name="writer" /><strong>Görüş editörden, yaratıcı karar yazardan.</strong><p>Editör gözlem ve seçenek üretir; yazar kendi sesini koruyarak karar verir.</p></aside></section> : null}

      {criteriaSection ? <section className="standards-criteria" id="degerlendirme-olcutleri"><div className="how-container"><SectionHeading eyebrow="Sekiz profesyonel bakış alanı" title="Değerlendirme ölçütleri" description="Kurgu, anlatım, karakter, dil, tempo ve hedef okur gibi temel alanlar eserin kendi amacı içinde ele alınır." />{criteria.intro ? <div className="how-section-intro"><EditorialBody body={criteria.intro} /></div> : null}<div className="standards-criteria__grid">{criteria.sections.map((criterion, index) => <article className="standards-criterion" key={criterion.title} id={headingId(criterion.title)}><div className="standards-criterion__top"><StandardsIcon name={index === 7 ? "evidence" : index === 6 ? "balance" : "report"} /></div><h3>{criterion.title.replace(/^\d+\.\s*/, "")}</h3><EditorialBody body={criterion.body} /></article>)}</div></div></section> : null}

      {sectionMap.get("İyi bir editör raporu nasıl görünür?") ? <section className="standards-report how-container" id="iyi-bir-editor-raporu-nasil-gorunur"><SectionHeading eyebrow="Geri bildirimi gelişim aracına dönüştür" title="İyi bir editör raporu yazara ne kazandırır?" description="Gözlem, metin örneği, okur üzerindeki etki ve uygulanabilir seçenek aynı raporda buluştuğunda yazarın önünde gerçek bir geliştirme haritası oluşur." /><div className="standards-report__panel"><EditorialBody body={sectionMap.get("İyi bir editör raporu nasıl görünür?")!.body} /></div></section> : null}

      <section className="standards-independence">
        <div className="how-container"><SectionHeading eyebrow="İki ayrı profesyonel pencere" title="Bağımsızlık ikinci görüşün değerini büyütür." description="İki editör aynı metne farklı açılardan baktığında yazar tek bir görüşe bağlı kalmadan daha zengin bir değerlendirme zemini kazanır." /><div className="standards-independence__grid">{sectionMap.get("Bağımsızlık ve çıkar çatışması") ? <GenericSection section={sectionMap.get("Bağımsızlık ve çıkar çatışması")!} tone="soft" /> : null}{sectionMap.get("İki editörlü inceleme nasıl korunur?") ? <GenericSection section={sectionMap.get("İki editörlü inceleme nasıl korunur?")!} tone="night" /> : null}</div></div>
      </section>

      <section className="standards-guardrails how-container">
        {sectionMap.get("Gizlilik ve eser güvenliği") ? <article className="standards-guardrail standards-guardrail--privacy" id="gizlilik-ve-eser-guvenligi"><span><StandardsIcon name="privacy" /></span><div><h2>Profesyonel güven ve eser gizliliği</h2><EditorialBody body={sectionMap.get("Gizlilik ve eser güvenliği")!.body} /></div></article> : null}
        {sectionMap.get("Yazarın yaratıcı kararı") ? <article className="standards-guardrail" id="yazarin-yaratici-karari"><span><StandardsIcon name="writer" /></span><div><h2>Yazarın özgün sesi merkezde kalır</h2><EditorialBody body={sectionMap.get("Yazarın yaratıcı kararı")!.body} /></div></article> : null}
      </section>

      <section className="standards-boundaries how-container">
        {sectionMap.get("Editoryal görüşün sınırı") ? <GenericSection section={sectionMap.get("Editoryal görüşün sınırı")!} tone="soft" /> : null}
        {sectionMap.get("İhlal bildirimi ve kalite incelemesi") ? <div className="standards-contact"><StandardsIcon name="evidence" /><div><span>Kaliteyi birlikte koru</span><h2>Editoryal kaliteyle ilgili somut geri bildirim yolu açık.</h2><EditorialBody body={sectionMap.get("İhlal bildirimi ve kalite incelemesi")!.body} /><Link className="how-button how-button--primary" href="/iletisim">Geri bildirim gönder <span aria-hidden="true">→</span></Link></div></div> : null}
      </section>

      {extras.length > 0 ? <section className="how-extras how-container">{extras.map((section) => <GenericSection section={section} key={section.title} />)}</section> : null}

      <aside className="how-related how-container" aria-label="İlkOku içinde devam et"><SectionHeading eyebrow="İlkOku içinde devam et" title="Profesyonel değerlendirmeyi gerçek eser yolculuğunda keşfet." /><div className="how-related__grid"><Link href="/editorler-icin"><strong>Editörler İçin</strong><span>Yeni eserlerde profesyonel iz bırakma akışını incele.</span></Link><Link href="/yazarlar-icin"><strong>Yazarlar İçin</strong><span>İki editör görüşünün yazarın gelişim yolculuğuna nasıl katıldığını gör.</span></Link><Link href="/nasil-calisir"><strong>Nasıl Çalışır?</strong><span>Eserin okur, editör ve yayınevi keşfine uzanan yolculuğunu incele.</span></Link><Link href="/editorler"><strong>Editörleri keşfet</strong><span>Editör profillerini ve uzmanlık alanlarını gör.</span></Link></div></aside>

      <footer className="how-footer"><div className="how-container"><Link className="how-logo" href="/"><Image src={logo} alt="İlkOku" sizes="150px" /></Link><nav><Link href="/nasil-calisir">Nasıl Çalışır?</Link><Link href="/editoryal-standartlar">Editoryal Standartlar</Link><Link href="/icerik-ve-yas-politikasi">İçerik ve Yaş</Link><Link href="/yasal/gizlilik-politikasi">Gizlilik</Link><Link href="/yasal/kullanim-sartlari">Kullanım Şartları</Link></nav></div></footer>
    </main>
  );
}
