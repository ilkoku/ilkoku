import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { EditorialBody } from "@/components/content/PublicEditorialDocument";
import { getPublicTrustPageVisual } from "@/content/public-trust-page-visuals";

type Section = { body: string; title: string };

const knownSections = new Set([
  "Dört yaş sınıfı",
  "İçerik uyarıları",
  "Yazarın sınıflandırma sorumluluğu",
  "Okurun gördüğü bilgi",
  "Başlık, kapak ve açıklama sınırı",
  "Yasak içerik ile yaş sınıfı aynı şey değildir",
  "Mevcut eserler nasıl ele alınır?",
  "Bildirim ve inceleme",
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

function PolicyIcon({ name }: { name: "eye" | "flag" | "shield" | "writer" }) {
  const paths = {
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
    flag: <><path d="M5 21V4m0 1h11l-2 4 2 4H5" /></>,
    shield: <><path d="M12 3 4.5 6v5.5c0 4.6 3 7.7 7.5 9.5 4.5-1.8 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-5" /></>,
    writer: <><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" /><path d="m14.5 7.5 3 3" /></>,
  } as const;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">{paths[name]}</svg>;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <header className="how-section-heading"><span>{eyebrow}</span><h2>{title}</h2>{description ? <p>{description}</p> : null}</header>;
}

export function ContentAgePolicyExperience({ body, summary, title, updatedAt }: { body: string; summary: string; title: string; updatedAt?: Date | string | null }) {
  const parsed = splitSections(body);
  const sectionMap = new Map(parsed.sections.map((section) => [section.title, section]));
  const extras = parsed.sections.filter((section) => !knownSections.has(section.title));
  const updatedLabel = formatUpdatedAt(updatedAt);
  const visual = getPublicTrustPageVisual("/icerik-ve-yas-politikasi");

  return (
    <main className="how-page age-policy-page">
      <header className="how-header"><div className="how-container how-header__inner"><Link className="how-logo" href="/" aria-label="İlkOku ana sayfa"><Image src={logo} alt="İlkOku" priority sizes="160px" /></Link><nav aria-label="Herkese açık sayfalar"><Link href="/eserler">Eserler</Link><Link href="/yazarlar">Yazarlar</Link><Link href="/editorler">Editörler</Link><Link href="/yardim">Yardım</Link></nav><Link className="how-header__account" href="/giris">Giriş yap</Link></div></header>

      <section className="how-hero age-policy-hero"><div className="how-container how-hero__grid"><div className="how-hero__content"><span className="how-eyebrow">Okur güvenle keşfetsin</span><h1>{title.split(/\s+/).map((word) => <span key={word}>{word}</span>)}</h1><p>{summary}</p><div className="how-hero__actions"><Link className="how-button how-button--primary" href="/eserler">Keşfe açık eserleri gör <span aria-hidden="true">→</span></Link><Link className="how-button how-button--secondary" href="#dort-yas-sinifi">Sınıflandırmayı incele</Link></div><div className="how-hero__proof"><span><strong>4</strong> yaş sınıfı</span><span><strong>6</strong> içerik uyarısı</span><span><strong>Açık</strong> okuma öncesi bilgi</span></div>{updatedLabel ? <small>Son güncelleme: {updatedLabel}</small> : null}</div><figure className="how-hero__visual age-policy-hero__visual"><Image src={visual.src} alt={visual.alt} fill priority sizes="(max-width: 860px) 100vw, 54vw" style={{ objectPosition: visual.focalPoint }} /><figcaption><span><PolicyIcon name="eye" /> Önceden bil</span><span><PolicyIcon name="writer" /> Doğru sınıflandır</span><span><PolicyIcon name="shield" /> Güvenle keşfet</span></figcaption></figure></div></section>

      <nav className="how-quick-nav how-container" aria-label="Sayfa bölümleri"><a href="#dort-yas-sinifi"><span>01</span>Yaş sınıfları</a><a href="#icerik-uyarilari"><span>02</span>Uyarılar</a><a href="#yazarin-siniflandirma-sorumlulugu"><span>03</span>Yazar</a><a href="#bildirim-ve-inceleme"><span>04</span>Bildirim</a></nav>

      {parsed.intro ? <section className="how-truth how-container" aria-label="Sınıflandırmanın amacı"><span><PolicyIcon name="eye" /></span><div><strong>Doğru sınıflandırma, okura eseri güvenle seçme özgürlüğü verir.</strong><EditorialBody body={parsed.intro} /></div></section> : null}

      {sectionMap.get("Dört yaş sınıfı") ? <section className="age-ratings" id="dort-yas-sinifi"><div className="how-container"><SectionHeading eyebrow="Doğru eser, doğru okur" title="Her eser doğru okurla buluşsun." description="Yaş sınıfı, eserin en yoğun içeriğini önceden görünür kılar ve okurun bilinçli seçim yapmasına yardımcı olur." /><div className="age-ratings__cards"><article><strong>T</strong><span>Tüm yaşlar</span><p>Geniş okur kitlesi için belirgin yoğun tema içermez.</p></article><article><strong>13+</strong><span>Genç okur</span><p>Hafif veya sınırlı hassas temalar içerebilir.</p></article><article><strong>16+</strong><span>Daha yoğun tema</span><p>Şiddet, ağır dil veya hassas konu yoğunlaşabilir.</p></article><article className="age-ratings__adult"><strong>18+</strong><span>Yetişkin içerik</span><p>Doğrulanmış yaş erişimi etkinleşene kadar keşif yüzeyine çıkmaz.</p></article></div><div className="age-ratings__detail"><EditorialBody body={sectionMap.get("Dört yaş sınıfı")!.body} /></div></div></section> : null}

      {sectionMap.get("İçerik uyarıları") ? <section className="age-warnings how-container" id="icerik-uyarilari"><SectionHeading eyebrow="Okur seçimini bilinçli yapsın" title="İçerik uyarıları sürprizi azaltır, keşfi kolaylaştırır." description="Uyarılar okura karşılaşabileceği temayı söyler; yaş sınıfı ise genel yoğunluğu gösterir." /><div className="age-warnings__grid">{["Şiddet", "Ağır dil", "Cinsel temalar", "Kendine zarar veya istismar", "Alkol veya madde", "Korku veya rahatsız edici içerik"].map((label) => <article key={label}><PolicyIcon name="flag" /><strong>{label}</strong></article>)}</div><div className="age-warnings__body"><EditorialBody body={sectionMap.get("İçerik uyarıları")!.body} /></div></section> : null}

      <section className="age-responsibility"><div className="how-container age-responsibility__grid">{sectionMap.get("Yazarın sınıflandırma sorumluluğu") ? <article id="yazarin-siniflandirma-sorumlulugu"><PolicyIcon name="writer" /><span>Yazarın katkısı</span><h2>Eserini doğru tanımla; doğru okurun seni daha kolay keşfetmesini sağla.</h2><EditorialBody body={sectionMap.get("Yazarın sınıflandırma sorumluluğu")!.body} /></article> : null}{sectionMap.get("Okurun gördüğü bilgi") ? <article id="okurun-gordugu-bilgi"><PolicyIcon name="eye" /><span>Okurun seçimi</span><h2>Okur, okumaya başlamadan önce yaş sınıfını ve uyarıları birlikte görür.</h2><EditorialBody body={sectionMap.get("Okurun gördüğü bilgi")!.body} /></article> : null}</div></section>

      <section className="age-boundaries how-container">{sectionMap.get("Başlık, kapak ve açıklama sınırı") ? <article><span>Keşif vitrini</span><h2>Başlık, kapak ve açıklama herkes için davetkâr ve güvenli kalır.</h2><EditorialBody body={sectionMap.get("Başlık, kapak ve açıklama sınırı")!.body} /></article> : null}{sectionMap.get("Yasak içerik ile yaş sınıfı aynı şey değildir") ? <article className="age-boundaries__night"><span>Net çerçeve</span><h2>Yaş etiketi içeriği açıklar; platform kurallarını değiştirmez.</h2><EditorialBody body={sectionMap.get("Yasak içerik ile yaş sınıfı aynı şey değildir")!.body} /><Link href="/yasal/kullanim-sartlari">Kullanım Şartları →</Link></article> : null}</section>

      {sectionMap.get("Mevcut eserler nasıl ele alınır?") ? <section className="age-existing how-container"><div><strong>Sınıflandırılmadı</strong><span>→</span><strong>Doğru sınıfa hazırla</strong></div><article><span>Güvenli geçiş</span><h2>Eski eserler de sınıflandırılarak keşfe hazırlanır.</h2><EditorialBody body={sectionMap.get("Mevcut eserler nasıl ele alınır?")!.body} /></article></section> : null}

      {sectionMap.get("Bildirim ve inceleme") ? <section className="age-contact how-container" id="bildirim-ve-inceleme"><PolicyIcon name="flag" /><div><span>Topluluğun katkısı</span><h2>Yanlış sınıflandırmayı birlikte düzeltmek için bildirim yolu açık.</h2><EditorialBody body={sectionMap.get("Bildirim ve inceleme")!.body} /><Link className="how-button how-button--primary" href="/iletisim">Sınıflandırma bildirimi gönder <span aria-hidden="true">→</span></Link></div></section> : null}

      {extras.length ? <section className="how-extras how-container">{extras.map((section) => <article className="how-editorial-card" key={section.title}><h2>{section.title}</h2><EditorialBody body={section.body} /></article>)}</section> : null}

      <aside className="how-related how-container" aria-label="İlkOku içinde devam et"><SectionHeading eyebrow="İlkOku içinde devam et" title="Güvenli keşiften gerçek eserlere geç." /><div className="how-related__grid"><Link href="/eserler"><strong>Keşfe açık eserler</strong><span>Yaş sınıfı ve uyarıları görerek yeni eserleri keşfet.</span></Link><Link href="/nasil-calisir"><strong>Nasıl Çalışır?</strong><span>Eserin fikirden keşfe uzanan yolculuğunu incele.</span></Link><Link href="/editoryal-standartlar"><strong>Editoryal Standartlar</strong><span>Hedef okurun profesyonel değerlendirmedeki yerini öğren.</span></Link><Link href="/yazarlar-icin"><strong>Yazarlar İçin</strong><span>Eserini doğru sınıflandırıp keşfe nasıl açacağını gör.</span></Link></div></aside>

      <footer className="how-footer"><div className="how-container"><Link className="how-logo" href="/"><Image src={logo} alt="İlkOku" sizes="150px" /></Link><nav><Link href="/nasil-calisir">Nasıl Çalışır?</Link><Link href="/editoryal-standartlar">Editoryal Standartlar</Link><Link href="/icerik-ve-yas-politikasi">İçerik ve Yaş</Link><Link href="/yasal/gizlilik-politikasi">Gizlilik</Link><Link href="/yasal/kullanim-sartlari">Kullanım Şartları</Link></nav></div></footer>
    </main>
  );
}
