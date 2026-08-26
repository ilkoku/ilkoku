import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { EditorialBody } from "@/components/content/PublicEditorialDocument";
import { getPublicTrustPageVisual } from "@/content/public-trust-page-visuals";

type Section = { body: string; title: string };

type EditorIconName =
  | "pool"
  | "lock"
  | "report"
  | "second"
  | "shield"
  | "conflict"
  | "author"
  | "record";

const knownSections = new Set([
  "Editör çalışma alanına yetkili rol ile gir",
  "Genel Editör Havuzu'ndan uygun görevi al",
  "İncelediğin sürümü ve kapsamı sabit tut",
  "Gerekçeli ve uygulanabilir bir rapor hazırla",
  "Birinci editör raporunu tamamla ve ikinci aşamayı başlat",
  "İkinci editör bağımsız değerlendirme yapar",
  "Gizliliği görev boyunca koru",
  "Çıkar çatışmasını gizleme",
  "Yazarın yaratıcı kararına saygı göster",
  "Editör görüşünün sınırını açık tut",
  "Tamamlanan incelemelerini kayıt üzerinden takip et",
  "Editör olarak başla",
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

function EditorIcon({ name }: { name: EditorIconName }) {
  const paths = {
    pool: <><circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M2.5 20c.5-4.2 2.3-6 5.5-6s5 1.8 5.5 6M14 15c3.5-.6 5.8 1 6.5 5" /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></>,
    report: <><path d="M6 3h9l3 3v15H6z" /><path d="M15 3v4h4M9 11h6M9 15h6M9 19h4" /></>,
    second: <><circle cx="8" cy="9" r="3" /><circle cx="16" cy="9" r="3" /><path d="M3 20c.4-3.8 2-5.8 5-5.8M21 20c-.4-3.8-2-5.8-5-5.8M12 5v14" /></>,
    shield: <><path d="M12 3 4.5 6v5.5c0 4.6 3 7.7 7.5 9.5 4.5-1.8 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-5" /></>,
    conflict: <><path d="M12 3v18M5 6h14M7 6l-4 7h8L7 6ZM17 6l-4 7h8l-4-7ZM8 21h8" /></>,
    author: <><circle cx="12" cy="8" r="3" /><path d="M6 20c.6-4.2 2.5-6 6-6s5.4 1.8 6 6" /><path d="m18 4 2 2 2-3" /></>,
    record: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  } as const;

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">{paths[name]}</svg>;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <header className="how-section-heading"><span>{eyebrow}</span><h2>{title}</h2>{description ? <p>{description}</p> : null}</header>;
}

export function ForEditorsExperience({ body, summary, title, updatedAt }: { body: string; summary: string; title: string; updatedAt?: Date | string | null }) {
  const parsed = splitSections(body);
  const sectionMap = new Map(parsed.sections.map((section) => [section.title, section]));
  const extras = parsed.sections.filter((section) => !knownSections.has(section.title));
  const updatedLabel = formatUpdatedAt(updatedAt);
  const visual = getPublicTrustPageVisual("/editorler-icin");

  return (
    <main className="how-page for-editors-page">
      <header className="how-header">
        <div className="how-container how-header__inner">
          <Link className="how-logo" href="/" aria-label="İlkOku ana sayfa"><Image src={logo} alt="İlkOku" priority sizes="160px" /></Link>
          <nav aria-label="Herkese açık sayfalar"><Link href="/eserler">Eserler</Link><Link href="/yazarlar">Yazarlar</Link><Link href="/editorler">Editörler</Link><Link href="/yardim">Yardım</Link></nav>
          <Link className="how-header__account" href="/giris">Giriş yap</Link>
        </div>
      </header>

      <section className="how-hero editors-hero">
        <div className="how-container how-hero__grid">
          <div className="how-hero__content">
            <span className="how-eyebrow">Bağımsız, gerekçeli, gizli</span>
            <h1>{title.split(/\s+/).map((word, index) => <span key={`${word}-${index}`}>{word}</span>)}</h1>
            <p>{summary}</p>
            <div className="how-hero__actions">
              <Link className="how-button how-button--primary" href="/kayit?rol=editor">Editör olarak başla <span aria-hidden="true">→</span></Link>
              <Link className="how-button how-button--secondary" href="#editor-akisi">İnceleme akışını gör</Link>
            </div>
            <div className="how-hero__proof"><span><strong>1.</strong> editör kilidi</span><span><strong>2.</strong> bağımsız görüş</span><span><strong>Gizlilik</strong> görev sınırı</span></div>
            {updatedLabel ? <small>Son güncelleme: {updatedLabel}</small> : null}
          </div>
          <figure className="how-hero__visual editors-hero__visual">
            <Image src={visual.src} alt={visual.alt} fill priority sizes="(max-width: 860px) 100vw, 54vw" style={{ objectPosition: visual.focalPoint }} />
            <figcaption><span><EditorIcon name="pool" /> Görevi al</span><span><EditorIcon name="report" /> Gerekçelendir</span><span><EditorIcon name="second" /> Bağımsız ikinci görüş</span></figcaption>
          </figure>
        </div>
      </section>

      <nav className="how-quick-nav how-container" aria-label="Sayfa bölümleri">
        <a href="#editor-akisi"><span>01</span>Görev</a>
        <a href="#rapor-standardi"><span>02</span>Rapor</a>
        <a href="#bagimsizlik"><span>03</span>Bağımsızlık</a>
        <a href="#gizlilik"><span>04</span>Gizlilik</a>
      </nav>

      {parsed.intro ? <section className="how-truth how-container" aria-label="Editör rolünün sınırı"><span><EditorIcon name="report" /></span><div><strong>Editör karar makamı değil; gerekçeli profesyonel ikinci bakıştır.</strong><EditorialBody body={parsed.intro} /></div></section> : null}

      <section className="editors-flow how-container" id="editor-akisi">
        <SectionHeading eyebrow="Görev yaşam döngüsü" title="Erişim, görev ve sürüm aynı anda sınırlandırılır." description="Public editör profili bütün eserlere erişim değildir; çalışma alanı görev ve aşama üzerinden açılır." />
        <div className="editors-flow__grid">
          {sectionMap.get("Editör çalışma alanına yetkili rol ile gir") ? <article><EditorIcon name="shield" /><h3>Public profil ile özel çalışma erişimini birbirinden ayır.</h3><EditorialBody body={sectionMap.get("Editör çalışma alanına yetkili rol ile gir")!.body} /></article> : null}
          {sectionMap.get("Genel Editör Havuzu'ndan uygun görevi al") ? <article><EditorIcon name="lock" /><h3>İlk alan editörün görevi kilitlenir.</h3><EditorialBody body={sectionMap.get("Genel Editör Havuzu'ndan uygun görevi al")!.body} /></article> : null}
          {sectionMap.get("İncelediğin sürümü ve kapsamı sabit tut") ? <article><EditorIcon name="record" /><h3>Raporun hangi metne dayandığı görünür kalsın.</h3><EditorialBody body={sectionMap.get("İncelediğin sürümü ve kapsamı sabit tut")!.body} /></article> : null}
        </div>
      </section>

      <section className="editors-report" id="rapor-standardi">
        <div className="how-container">
          <SectionHeading eyebrow="Profesyonel değerlendirme" title="Sonuç cümlesi değil; gözlem, yer, etki ve seçenek üret." description="Raporun değeri editörün otoritesinden değil, metinden izlenebilen gerekçesinden gelir." />
          <div className="editors-report__grid">
            {sectionMap.get("Gerekçeli ve uygulanabilir bir rapor hazırla") ? <article className="editors-report__primary"><EditorIcon name="report" /><span>Rapor standardı</span><h3>Yazarı değil metni değerlendir.</h3><EditorialBody body={sectionMap.get("Gerekçeli ve uygulanabilir bir rapor hazırla")!.body} /><Link href="/editoryal-standartlar">Editoryal Standartlar →</Link></article> : null}
            {sectionMap.get("Yazarın yaratıcı kararına saygı göster") ? <article><EditorIcon name="author" /><span>Yaratıcı karar</span><h3>Öneri tavsiyedir; son söz yazarındır.</h3><EditorialBody body={sectionMap.get("Yazarın yaratıcı kararına saygı göster")!.body} /></article> : null}
          </div>
        </div>
      </section>

      <section className="editors-independence how-container" id="bagimsizlik">
        <SectionHeading eyebrow="İki editörlü yapı" title="İkinci görüş, birinci raporun tekrarı değildir." description="İki ayrı değerlendirme aynı sonuca ulaşmak zorunda değildir; bağımsız gerekçe ayrı değer taşır." />
        <div className="editors-independence__grid">
          {sectionMap.get("Birinci editör raporunu tamamla ve ikinci aşamayı başlat") ? <article><EditorIcon name="report" /><span>1. Editör</span><h3>Raporu tamamla; ikinci aşamayı ayrı bir görev olarak başlat.</h3><EditorialBody body={sectionMap.get("Birinci editör raporunu tamamla ve ikinci aşamayı başlat")!.body} /></article> : null}
          {sectionMap.get("İkinci editör bağımsız değerlendirme yapar") ? <article className="editors-independence__night"><EditorIcon name="second" /><span>2. Editör</span><h3>İlk raporu görmeden kendi görüşünü oluştur.</h3><EditorialBody body={sectionMap.get("İkinci editör bağımsız değerlendirme yapar")!.body} /></article> : null}
        </div>
      </section>

      <section className="editors-guardrails" id="gizlilik">
        <div className="how-container">
          <SectionHeading eyebrow="Mesleki sınırlar" title="Eser erişimi, görev dışı kullanım hakkı değildir." description="Gizlilik, çıkar çatışması ve yetki sınırı rapor kalitesi kadar temel bir editör sorumluluğudur." />
          <div className="editors-guardrails__grid">
            {sectionMap.get("Gizliliği görev boyunca koru") ? <article><EditorIcon name="shield" /><span>Gizlilik</span><h3>Yayınlanmamış metni görev alanının dışına taşıma.</h3><EditorialBody body={sectionMap.get("Gizliliği görev boyunca koru")!.body} /></article> : null}
            {sectionMap.get("Çıkar çatışmasını gizleme") ? <article><EditorIcon name="conflict" /><span>Bağımsızlık</span><h3>Tarafsızlığı etkileyen ilişkiyi erken bildir.</h3><EditorialBody body={sectionMap.get("Çıkar çatışmasını gizleme")!.body} /></article> : null}
            {sectionMap.get("Editör görüşünün sınırını açık tut") ? <article><EditorIcon name="lock" /><span>Yetki sınırı</span><h3>Rapor; hukuk, yayınevi veya başarı kararı değildir.</h3><EditorialBody body={sectionMap.get("Editör görüşünün sınırını açık tut")!.body} /><Link href="/telif-bildirimi">Telif Bildirimi →</Link></article> : null}
          </div>
        </div>
      </section>

      {sectionMap.get("Tamamlanan incelemelerini kayıt üzerinden takip et") ? <section className="editors-records how-container"><EditorIcon name="record" /><div><span>İnceleme geçmişi</span><h2>Tamamlanan raporlar süreç kaydının parçasıdır.</h2><EditorialBody body={sectionMap.get("Tamamlanan incelemelerini kayıt üzerinden takip et")!.body} /></div></section> : null}

      {extras.length > 0 ? <section className="how-extras how-container">{extras.map((section) => <article className="how-editorial-card" key={section.title}><h2>{section.title}</h2><EditorialBody body={section.body} /></article>)}</section> : null}

      {sectionMap.get("Editör olarak başla") ? <section className="editors-start how-container"><EditorIcon name="pool" /><div><span>Sıra sende</span><h2>Editör olarak başla</h2><EditorialBody body={sectionMap.get("Editör olarak başla")!.body} /><div className="editors-start__actions"><Link className="how-button how-button--primary" href="/kayit?rol=editor">Editör hesabı oluştur <span aria-hidden="true">→</span></Link><Link className="how-button how-button--secondary" href="/editoryal-standartlar">Önce standartları oku</Link></div></div></section> : null}

      <aside className="how-related how-container" aria-label="İlkOku içinde devam et"><SectionHeading eyebrow="İlkOku içinde devam et" title="Editör rolünü bağlamıyla incele." /><div className="how-related__grid"><Link href="/editoryal-standartlar"><strong>Editoryal Standartlar</strong><span>Rapor ölçütleri, bağımsızlık ve kalite sınırlarını incele.</span></Link><Link href="/icerik-ve-yas-politikasi"><strong>İçerik ve Yaş</strong><span>Public yayın ve yaş sınıflandırması sınırlarını gör.</span></Link><Link href="/topluluk-kurallari"><strong>Topluluk Kuralları</strong><span>Yazar, okur ve editör etkileşimlerinin ortak sınırlarını oku.</span></Link><Link href="/editorler"><strong>Editörleri keşfet</strong><span>Herkese açık editör profillerini incele.</span></Link></div></aside>

      <footer className="how-footer"><div className="how-container"><Link className="how-logo" href="/"><Image src={logo} alt="İlkOku" sizes="150px" /></Link><nav><Link href="/nasil-calisir">Nasıl Çalışır?</Link><Link href="/yazarlar-icin">Yazarlar İçin</Link><Link href="/editoryal-standartlar">Editoryal Standartlar</Link><Link href="/telif-bildirimi">Telif Bildirimi</Link><Link href="/yasal/gizlilik-politikasi">Gizlilik</Link><Link href="/yasal/kullanim-sartlari">Kullanım Şartları</Link></nav></div></footer>
    </main>
  );
}
