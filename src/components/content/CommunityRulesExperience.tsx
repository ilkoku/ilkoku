import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { EditorialBody } from "@/components/content/PublicEditorialDocument";
import { getPublicTrustPageVisual } from "@/content/public-trust-page-visuals";

type Section = { body: string; title: string };

const knownSections = new Set([
  "Saygılı iletişim",
  "Yapıcı geri bildirim ve yorum",
  "Taciz, nefret ve hedef gösterme",
  "Mahremiyet ve kişisel bilgi",
  "Spam, sahte etkileşim ve manipülasyon",
  "Eser, telif ve intihal sınırı",
  "Yaş ve hassas içerik sınırı",
  "Rol ve çıkar çatışması sınırı",
  "Bildirim, inceleme ve yaptırım",
  "İtiraz ve bağlam",
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

function CommunityIcon({ name }: { name: "people" | "comment" | "shield" | "privacy" | "flag" | "spark" }) {
  const paths = {
    people: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6" /><circle cx="17" cy="9" r="2.3" /><path d="M15.3 14.8c3.1-.7 5.1.9 5.5 4.2" /></>,
    comment: <><path d="M4 5h16v11H9l-5 4V5Z" /><path d="M8 9h8M8 12h5" /></>,
    shield: <><path d="M12 3 4.5 6v5.5c0 4.6 3 7.7 7.5 9.5 4.5-1.8 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-5" /></>,
    privacy: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15" r="1" /></>,
    flag: <><path d="M5 21V4m0 1h11l-2 4 2 4H5" /></>,
    spark: <><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z" /><path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z" /></>,
  } as const;

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">{paths[name]}</svg>;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <header className="how-section-heading"><span>{eyebrow}</span><h2>{title}</h2>{description ? <p>{description}</p> : null}</header>;
}

export function CommunityRulesExperience({ body, summary, title, updatedAt }: { body: string; summary: string; title: string; updatedAt?: Date | string | null }) {
  const parsed = splitSections(body);
  const sectionMap = new Map(parsed.sections.map((section) => [section.title, section]));
  const extras = parsed.sections.filter((section) => !knownSections.has(section.title));
  const updatedLabel = formatUpdatedAt(updatedAt);
  const visual = getPublicTrustPageVisual("/topluluk-kurallari");

  return (
    <main className="how-page community-rules-page">
      <header className="how-header">
        <div className="how-container how-header__inner">
          <Link className="how-logo" href="/" aria-label="İlkOku ana sayfa"><Image src={logo} alt="İlkOku" priority sizes="160px" /></Link>
          <nav aria-label="Herkese açık sayfalar"><Link href="/eserler">Eserler</Link><Link href="/yazarlar">Yazarlar</Link><Link href="/editorler">Editörler</Link><Link href="/yardim">Yardım</Link></nav>
          <Link className="how-header__account" href="/giris">Giriş yap</Link>
        </div>
      </header>

      <section className="how-hero community-hero">
        <div className="how-container how-hero__grid">
          <div className="how-hero__content">
            <span className="how-eyebrow">Edebiyat etrafında birlikte büyüyen topluluk</span>
            <h1>{title.split(/\s+/).map((word) => <span key={word}>{word}</span>)}</h1>
            <p>{summary}</p>
            <div className="how-hero__actions">
              <Link className="how-button how-button--primary" href="/eserler">Yeni eserleri keşfet <span aria-hidden="true">→</span></Link>
              <Link className="how-button how-button--secondary" href="#saygili-iletisim">Topluluk ilkelerini gör</Link>
            </div>
            <div className="how-hero__proof"><span><strong>4</strong> rol aynı toplulukta</span><span><strong>Yapıcı</strong> geri bildirim</span><span><strong>Gerçek</strong> keşif sinyalleri</span></div>
            {updatedLabel ? <small>Son güncelleme: {updatedLabel}</small> : null}
          </div>
          <figure className="how-hero__visual community-hero__visual">
            <Image src={visual.src} alt={visual.alt} fill priority sizes="(max-width: 860px) 100vw, 54vw" style={{ objectPosition: visual.focalPoint }} />
            <figcaption><span><CommunityIcon name="people" /> Birbirini dinle</span><span><CommunityIcon name="comment" /> Eseri geliştir</span><span><CommunityIcon name="spark" /> Yeni sesleri keşfet</span></figcaption>
          </figure>
        </div>
      </section>

      <nav className="how-quick-nav how-container" aria-label="Sayfa bölümleri">
        <a href="#saygili-iletisim"><span>01</span>Geri bildirim</a>
        <a href="#guvenlik-siniri"><span>02</span>Güven</a>
        <a href="#platform-butunlugu"><span>03</span>Keşif</a>
        <a href="#bildirim-inceleme"><span>04</span>Katkı</a>
      </nav>

      {parsed.intro ? <section className="how-truth how-container" aria-label="Topluluk standardının amacı"><span><CommunityIcon name="people" /></span><div><strong>İyi bir topluluk, yeni bir eserin cesaretle paylaşılmasını ve daha iyi geri bildirimle gelişmesini sağlar.</strong><EditorialBody body={parsed.intro} /></div></section> : null}

      <section className="community-principles how-container" id="saygili-iletisim">
        <SectionHeading eyebrow="Birlikte üretmenin değeri" title="İyi geri bildirim yeni bir eserin yolunu açabilir." description="Okur yorumu, editör raporu, yazar cevabı ve yayınevi ilgisi farklı bakışlar getirir; amaç eseri ve keşfi büyütmektir." />
        <div className="community-principles__grid">
          {sectionMap.get("Saygılı iletişim") ? <article><CommunityIcon name="people" /><span>Saygı</span><h3>Fikir ayrılığı, yeni bakış açılarına alan açar.</h3><EditorialBody body={sectionMap.get("Saygılı iletişim")!.body} /></article> : null}
          {sectionMap.get("Yapıcı geri bildirim ve yorum") ? <article><CommunityIcon name="comment" /><span>Geri bildirim</span><h3>Metne odaklanan somut yorum, yazarın gelişimine gerçek katkı verir.</h3><EditorialBody body={sectionMap.get("Yapıcı geri bildirim ve yorum")!.body} /></article> : null}
        </div>
      </section>

      <section className="community-safety" id="guvenlik-siniri">
        <div className="how-container">
          <SectionHeading eyebrow="Üretmek için güvenli alan" title="Güvenli topluluk, daha cesur üretim ve keşif demektir." description="Yazar paylaşırken, okur yorum yaparken, editör değerlendirirken ve yayınevi keşfederken ortak güven zemini korunur." />
          <div className="community-safety__grid">
            {sectionMap.get("Taciz, nefret ve hedef gösterme") ? <article className="community-safety__night"><CommunityIcon name="shield" /><span>Güven</span><h3>İnsanları değil fikirleri ve metni tartış.</h3><EditorialBody body={sectionMap.get("Taciz, nefret ve hedef gösterme")!.body} /></article> : null}
            {sectionMap.get("Mahremiyet ve kişisel bilgi") ? <article><CommunityIcon name="privacy" /><span>Mahremiyet</span><h3>Yaratıcı paylaşımın yanında kişisel alan da korunur.</h3><EditorialBody body={sectionMap.get("Mahremiyet ve kişisel bilgi")!.body} /></article> : null}
          </div>
        </div>
      </section>

      <section className="community-integrity how-container" id="platform-butunlugu">
        <SectionHeading eyebrow="Keşfin değeri gerçek etkileşimden gelir" title="Gerçek etkileşim, gerçek keşif üretir." description="Okur ilgisi, yorumlar ve diğer topluluk sinyalleri doğal olduğunda yeni eser ve yazarların keşfine anlamlı katkı sağlar." />
        <div className="community-integrity__grid">
          {sectionMap.get("Spam, sahte etkileşim ve manipülasyon") ? <article><CommunityIcon name="spark" /><h3>Keşif sinyalleri gerçek kalsın</h3><EditorialBody body={sectionMap.get("Spam, sahte etkileşim ve manipülasyon")!.body} /></article> : null}
          {sectionMap.get("Eser, telif ve intihal sınırı") ? <article><CommunityIcon name="shield" /><h3>Özgün emeği koru</h3><EditorialBody body={sectionMap.get("Eser, telif ve intihal sınırı")!.body} /><Link href="/telif-bildirimi">Telif Bildirimi →</Link></article> : null}
          {sectionMap.get("Yaş ve hassas içerik sınırı") ? <article><CommunityIcon name="flag" /><h3>Okura doğru bağlamı ver</h3><EditorialBody body={sectionMap.get("Yaş ve hassas içerik sınırı")!.body} /><Link href="/icerik-ve-yas-politikasi">İçerik ve Yaş Politikası →</Link></article> : null}
          {sectionMap.get("Rol ve çıkar çatışması sınırı") ? <article><CommunityIcon name="people" /><h3>Rolünü açık tut</h3><EditorialBody body={sectionMap.get("Rol ve çıkar çatışması sınırı")!.body} /></article> : null}
        </div>
      </section>

      {sectionMap.get("Bildirim, inceleme ve yaptırım") ? <section className="community-report how-container" id="bildirim-inceleme"><CommunityIcon name="flag" /><div><span>Topluluğun kalitesine katkı</span><h2>Bir sorun gördüğünde somut bilgiyle topluluğun kalitesine katkı ver.</h2><EditorialBody body={sectionMap.get("Bildirim, inceleme ve yaptırım")!.body} /><Link className="how-button how-button--primary" href="/iletisim">Bildirim gönder <span aria-hidden="true">→</span></Link></div></section> : null}

      {sectionMap.get("İtiraz ve bağlam") ? <section className="community-appeal how-container"><div><CommunityIcon name="comment" /><strong>Bağlam adil değerlendirmeyi güçlendirir.</strong></div><article><span>Ek bilgi</span><h2>İlgili kayda yeni bağlam ekleyerek değerlendirmeyi daha sağlıklı hâle getir.</h2><EditorialBody body={sectionMap.get("İtiraz ve bağlam")!.body} /></article></section> : null}

      {extras.length ? <section className="how-extras how-container">{extras.map((section) => <article className="how-editorial-card" key={section.title}><h2>{section.title}</h2><EditorialBody body={section.body} /></article>)}</section> : null}

      <aside className="how-related how-container" aria-label="İlkOku içinde devam et">
        <SectionHeading eyebrow="İlkOku içinde devam et" title="Topluluktan keşfe devam et." />
        <div className="how-related__grid">
          <Link href="/eserler"><strong>Keşfe açık eserler</strong><span>Henüz herkesin bilmediği yeni hikâyeleri keşfet.</span></Link>
          <Link href="/yazarlar"><strong>Yazarları keşfet</strong><span>Yeni yazarların eser yolculuklarını ve yayımlanmış eserlerini gör.</span></Link>
          <Link href="/editoryal-standartlar"><strong>Editoryal Standartlar</strong><span>Profesyonel geri bildirimin nasıl değer ürettiğini incele.</span></Link>
          <Link href="/nasil-calisir"><strong>Nasıl Çalışır?</strong><span>Yazar, okur, editör ve yayınevini aynı eser etrafında buluşturan akışı gör.</span></Link>
        </div>
      </aside>

      <footer className="how-footer"><div className="how-container"><Link className="how-logo" href="/"><Image src={logo} alt="İlkOku" sizes="150px" /></Link><nav><Link href="/nasil-calisir">Nasıl Çalışır?</Link><Link href="/editoryal-standartlar">Editoryal Standartlar</Link><Link href="/icerik-ve-yas-politikasi">İçerik ve Yaş</Link><Link href="/topluluk-kurallari">Topluluk</Link><Link href="/yasal/kullanim-sartlari">Kullanım Şartları</Link></nav></div></footer>
    </main>
  );
}
