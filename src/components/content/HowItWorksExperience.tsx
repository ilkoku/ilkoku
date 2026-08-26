import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { EditorialBody } from "@/components/content/PublicEditorialDocument";

type ContentSection = {
  body: string;
  title: string;
};

type HowItWorksExperienceProps = {
  body: string;
  summary: string;
  title: string;
  updatedAt?: Date | string | null;
};

type JourneyIconName = "draft" | "publish" | "reader" | "review" | "passport" | "discover";

const roles = [
  { title: "Yazarın rolü", label: "Yazar", asset: "/icons/roles/writer.svg", href: "/kayit?rol=writer" },
  { title: "Okurun rolü", label: "Okur", asset: "/icons/roles/reader-fixed.svg", href: "/kayit?rol=reader" },
  { title: "Editörün rolü", label: "Editör", asset: "/icons/roles/editor.svg", href: "/kayit?rol=editor" },
  { title: "Yayınevinin rolü", label: "Yayınevi", asset: "/icons/roles/publisher.svg", href: "/kayit?rol=publisher" },
] as const;

const knownSectionTitles = new Set([
  "İlkOku nedir?",
  "Eser İlkOku'da nasıl ilerler?",
  "Roller ne yapar?",
  "Kim neyi görebilir?",
  "Eserin hakları kimde kalır?",
  "İlkOku sana ne kazandırır?",
  "Özelliklerin güncel durumu",
  "Nereden başlamalısınız?",
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

function JourneyIcon({ name }: { name: JourneyIconName }) {
  const paths = {
    draft: <><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" /><path d="m14.5 7.5 3 3M4 4h7" /></>,
    publish: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5Z" /><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z" /></>,
    reader: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0M17 4v7m-3.5-3.5h7" /></>,
    review: <><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" /><path d="m13.8 8.2 3 3M14 18h6" /></>,
    passport: <><path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><circle cx="12" cy="10" r="3" /><path d="M8 17c1.2-2.2 6.8-2.2 8 0" /></>,
    discover: <><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" /><path d="m17 4 1-2 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z" /></>,
  } as const;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">{paths[name]}</svg>;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <header className="how-section-heading"><span>{eyebrow}</span><h2>{title}</h2>{description ? <p>{description}</p> : null}</header>;
}

function HowItWorksHeroTitle({ title }: { title: string }) {
  const match = title.trim().match(/^(İlkOku Nasıl)\s+(Çalışır\??)$/u);
  if (!match) return <>{title}</>;
  return <><span>{match[1]}</span><span>{match[2]}</span></>;
}

function GenericSection({ section, tone }: { section: ContentSection; tone?: "night" | "soft" }) {
  return (
    <section className={`how-editorial-card${tone ? ` how-editorial-card--${tone}` : ""}`} id={headingId(section.title)}>
      <h2>{section.title}</h2>
      <EditorialBody body={section.body} />
    </section>
  );
}

export function HowItWorksExperience({ body, summary, title, updatedAt }: HowItWorksExperienceProps) {
  const parsed = splitSections(body, "##");
  const sectionMap = new Map(parsed.sections.map((section) => [section.title, section]));
  const journey = sectionMap.get("Eser İlkOku'da nasıl ilerler?");
  const journeyContent = splitSections(journey?.body ?? "", "###");
  const journeyParts = journeyContent.sections;
  const roleSection = sectionMap.get("Roller ne yapar?");
  const roleContent = splitSections(roleSection?.body ?? "", "###");
  const roleParts = roleContent.sections;
  const unknownRoleParts = roleParts.filter((part) => !roles.some((role) => role.title === part.title));
  const updatedLabel = formatUpdatedAt(updatedAt);
  const iconForStep = (index: number): JourneyIconName => index === 0 ? "draft" : index === 1 ? "publish" : index === 2 ? "reader" : index < 7 ? "review" : index === 7 ? "passport" : "discover";
  const extras = parsed.sections.filter((section) => !knownSectionTitles.has(section.title));

  return (
    <main className="how-page">
      <header className="how-header">
        <div className="how-container how-header__inner">
          <Link className="how-logo" href="/" aria-label="İlkOku ana sayfa"><Image src={logo} alt="İlkOku" priority sizes="160px" /></Link>
          <nav aria-label="Herkese açık sayfalar"><Link href="/eserler">Eserler</Link><Link href="/yazarlar">Yazarlar</Link><Link href="/editorler">Editörler</Link><Link href="/yardim">Yardım</Link></nav>
          <Link className="how-header__account" href="/giris">Giriş yap</Link>
        </div>
      </header>

      <section className="how-hero">
        <div className="how-container how-hero__grid">
          <div className="how-hero__content">
            <span className="how-eyebrow">İlkOku&apos;da eser yolculuğu</span>
            <h1><HowItWorksHeroTitle title={title} /></h1>
            <p>{summary}</p>
            <div className="how-hero__actions"><Link className="how-button how-button--primary" href="/kayit?rol=writer">Eserini oluşturmaya başla <span aria-hidden="true">→</span></Link><Link className="how-button how-button--secondary" href="/eserler">Keşfe açık eserleri keşfet</Link></div>
            <div className="how-hero__proof"><span><strong>9</strong> eser yolculuğu adımı</span><span><strong>2</strong> bağımsız editör görüşü</span><span><strong>4</strong> rol tek ekosistemde</span></div>
            {updatedLabel ? <small>Son güncelleme: {updatedLabel}</small> : null}
          </div>

          <figure className="how-hero__visual">
            <Image src="/how-it-works/journey.webp" alt="Bir eserin yazardan editör incelemesine, okura ve yayınevi keşfine uzanan İlkOku yolculuğu" fill priority sizes="(max-width: 860px) 100vw, 54vw" />
            <figcaption><span><JourneyIcon name="draft" /> Yazar oluşturur</span><span><JourneyIcon name="review" /> Editörler geliştirir</span><span><JourneyIcon name="discover" /> Okur ve yayınevi keşfeder</span></figcaption>
          </figure>
        </div>
      </section>

      <nav className="how-quick-nav how-container" aria-label="Sayfa bölümleri">
        <a href="#eser-ilkoku-da-nasil-ilerler"><span>01</span>Süreç</a><a href="#roller-ne-yapar"><span>02</span>Roller</a><a href="#kim-neyi-gorebilir"><span>03</span>Görünürlük</a><a href="#ozelliklerin-guncel-durumu"><span>04</span>Güncel durum</a>
      </nav>

      {parsed.intro ? <section className="how-truth how-container" aria-label="İlkOku eser ekosistemi"><span><JourneyIcon name="passport" /></span><div><strong>Bir fikri; okur, editör ve yayınevi keşfine bağlayan tek eser yolculuğu.</strong><EditorialBody body={parsed.intro} /></div></section> : null}

      {sectionMap.get("İlkOku nedir?") ? <section className="how-definition how-container"><div><SectionHeading eyebrow="Platformun temeli" title="Eser yalnız son hâliyle değil, yolculuğuyla değer kazanır." /><EditorialBody body={sectionMap.get("İlkOku nedir?")!.body} /></div><aside><JourneyIcon name="publish" /><strong>Aynı eser, dört farklı değer</strong><p>Yazar geliştirir, okur keşfeder, editör güçlendirir, yayınevi yeni yeteneği fark eder.</p></aside></section> : null}

      {journey ? <section className="how-journey" id={headingId(journey.title)}><div className="how-container"><SectionHeading eyebrow="Fikirden keşfe tek akış" title={journey.title} description="Her adım bir öncekini büyütür; eser yazıldıkça, okundukça ve değerlendirildikçe yeni keşif fırsatları oluşur." />{journeyContent.intro ? <div className="how-section-intro"><EditorialBody body={journeyContent.intro} /></div> : null}<div className="how-journey__grid">{journeyParts.map((part, index) => <article className={index === 7 ? "how-step how-step--passport" : "how-step"} key={part.title} id={headingId(part.title)}><div className="how-step__top"><span className="how-step__icon"><JourneyIcon name={iconForStep(index)} /></span></div><h3>{part.title.replace(/^\d+\.\s*/, "")}</h3><EditorialBody body={part.body} />{index === 7 ? <div className="how-step__passport-line"><i /><span>Oluşturma</span><i /><span>Sürümler</span><i /><span>İnceleme</span></div> : null}</article>)}</div></div></section> : null}

      {roleSection ? <section className="how-roles how-container" id={headingId(roleSection.title)}><SectionHeading eyebrow="Dört rol, tek eser yolculuğu" title={roleSection.title} description="Her rol aynı esere farklı bir değer katar; keşif, okuma, değerlendirme ve yayın dünyası aynı ekosistemde buluşur." />{roleContent.intro ? <div className="how-section-intro"><EditorialBody body={roleContent.intro} /></div> : null}<div className="how-roles__grid">{roles.map((role) => { const content = roleParts.find((part) => part.title === role.title); return <article className="how-role" key={role.title} id={headingId(role.title)}><div className="how-role__header"><Image src={role.asset} alt="" aria-hidden="true" width={74} height={74} /><div><span>{role.label} rolü</span><h3>{role.label}</h3></div></div>{content ? <EditorialBody body={content.body} /> : null}<Link href={role.href}>{role.label} alanına git <span aria-hidden="true">→</span></Link></article>; })}</div>{unknownRoleParts.length > 0 ? <div className="how-extras how-role-extras">{unknownRoleParts.map((part) => <GenericSection section={part} key={part.title} />)}</div> : null}</section> : null}

      {sectionMap.get("Kim neyi görebilir?") ? <section className="how-visibility" id="kim-neyi-gorebilir"><div className="how-container"><SectionHeading eyebrow="Doğru bilgi, doğru anda" title="Kim neyi görebilir?" description="Keşif yüzeyi geniştir; özel çalışma kayıtları ise ilgili rol ve görevle açılır. Böylece görünürlük ile güven birlikte büyür." /><div className="how-visibility__panel"><EditorialBody body={sectionMap.get("Kim neyi görebilir?")!.body} /></div></div></section> : null}

      <section className="how-guardrails how-container">
        {sectionMap.get("Eserin hakları kimde kalır?") ? <GenericSection section={sectionMap.get("Eserin hakları kimde kalır?")!} tone="soft" /> : null}
        {sectionMap.get("İlkOku sana ne kazandırır?") ? <GenericSection section={sectionMap.get("İlkOku sana ne kazandırır?")!} tone="night" /> : null}
      </section>

      {sectionMap.get("Özelliklerin güncel durumu") ? <section className="how-status how-container"><SectionHeading eyebrow="Bugün kullanabileceğin araçlar" title="İlkOku bugün neleri bir araya getiriyor?" /><GenericSection section={sectionMap.get("Özelliklerin güncel durumu")!} /></section> : null}

      {extras.length > 0 ? <section className="how-extras how-container">{extras.map((section) => <GenericSection section={section} key={section.title} />)}</section> : null}

      {sectionMap.get("Nereden başlamalısınız?") ? <section className="how-start" id="nereden-baslamalisiniz"><div className="how-container how-start__grid"><div><span className="how-eyebrow">Sıra sende</span><h2>Nereden başlamalısınız?</h2><EditorialBody body={sectionMap.get("Nereden başlamalısınız?")!.body} /></div><aside><strong>İlk eserinin yolculuğunu başlat.</strong><p>Taslağını oluştur; hazır olduğunda keşfe aç ve gerçek okurla buluş.</p><Link className="how-button how-button--primary" href="/kayit?rol=writer">Yazar olarak katıl <span aria-hidden="true">→</span></Link><Link href="/eserler">Önce eserleri keşfet</Link></aside></div></section> : null}

      <aside className="how-related how-container" aria-label="İlkOku içinde devam et"><SectionHeading eyebrow="İlkOku içinde devam et" title="Platformu kendi yolundan keşfet." /><div className="how-related__grid"><Link href="/eserler"><strong>Eserleri keşfet</strong><span>Keşfe açık yeni eserleri ve hikâyeleri incele.</span></Link><Link href="/yazarlar"><strong>Yazarları keşfet</strong><span>Yeni yazarları ve yayımlanmış eser vitrinlerini gör.</span></Link><Link href="/editorler"><strong>Editörleri incele</strong><span>Herkese açık editör profillerini ve uzmanlıklarını gör.</span></Link><Link href="/yardim"><strong>Yardım Merkezi</strong><span>Hesap, roller ve platform kullanımı hakkında yanıt bul.</span></Link></div></aside>

      <footer className="how-footer"><div className="how-container"><Link className="how-logo" href="/"><Image src={logo} alt="İlkOku" sizes="150px" /></Link><nav><Link href="/nasil-calisir">Nasıl Çalışır?</Link><Link href="/editoryal-standartlar">Editoryal Standartlar</Link><Link href="/icerik-ve-yas-politikasi">İçerik ve Yaş</Link><Link href="/eserler">Eserler</Link><Link href="/yasal/gizlilik-politikasi">Gizlilik</Link><Link href="/yasal/kullanim-sartlari">Kullanım Şartları</Link></nav></div></footer>
    </main>
  );
}