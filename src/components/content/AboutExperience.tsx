import Image from "next/image";
import Link from "next/link";

import { EditorialBody } from "@/components/content/PublicEditorialDocument";

type ContentSection = {
  title: string;
  body: string;
};

type AboutExperienceProps = {
  title: string;
  summary: string;
  body: string;
  updatedAt?: Date | string | null;
};

type AboutIconName = "spark" | "writer" | "reader" | "editor" | "publisher" | "path" | "shield" | "passport";

const roleMeta = [
  { title: "Yazar", href: "/kayit?rol=writer", icon: "writer" as const, label: "Eseri başlatır" },
  { title: "Okuyucu", href: "/kayit?rol=reader", icon: "reader" as const, label: "Eserle buluşur" },
  { title: "Editör", href: "/kayit?rol=editor", icon: "editor" as const, label: "Bağımsız değerlendirir" },
  { title: "Yayınevi", href: "/kayit?rol=publisher", icon: "publisher" as const, label: "Keşfeder ve kendi kararını verir" },
] as const;

function splitSections(body: string, marker: "##" | "###") {
  const prefix = `${marker} `;
  const sections: ContentSection[] = [];
  const intro: string[] = [];
  let current: ContentSection | null = null;

  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith(prefix) && !line.startsWith(`${marker}#`)) {
      if (current) sections.push({ ...current, body: current.body.trim() });
      current = { title: line.slice(prefix.length).trim(), body: "" };
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

function AboutIcon({ name }: { name: AboutIconName }) {
  const paths = {
    spark: <><path d="m12 2 1.5 5.2L19 9l-5.5 1.8L12 16l-1.5-5.2L5 9l5.5-1.8L12 2Z" /><path d="m19 15 .8 2.3L22 18l-2.2.7L19 21l-.8-2.3L16 18l2.2-.7L19 15Z" /></>,
    writer: <><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" /><path d="m14.5 7.5 3 3M4 4h7" /></>,
    reader: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5Z" /><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z" /></>,
    editor: <><path d="M4 20h4l10.2-10.2a2.1 2.1 0 1 0-3-3L5 17l-1 3Z" /><path d="m13.8 8.2 3 3" /><path d="M4 4h7" /></>,
    publisher: <><path d="M3 21h18" /><path d="M5 21V9l7-5 7 5v12" /><path d="M9 21v-6h6v6" /></>,
    path: <><circle cx="5" cy="18" r="2" /><circle cx="19" cy="6" r="2" /><path d="M7 18h3c4 0 2-12 6-12h1" /></>,
    shield: <><path d="M12 3 20 6v6c0 4.8-3.2 7.4-8 9-4.8-1.6-8-4.2-8-9V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    passport: <><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M8 17c1.2-2.2 6.8-2.2 8 0" /></>,
  } as const;

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
      {paths[name]}
    </svg>
  );
}

export function AboutExperience({ title, summary, body, updatedAt }: AboutExperienceProps) {
  const parsed = splitSections(body, "##");
  const sectionMap = new Map(parsed.sections.map((section) => [section.title, section]));
  const roles = sectionMap.get("Dört rol, tek eser yolculuğu");
  const roleParts = splitSections(roles?.body ?? "", "###");
  const updatedLabel = formatUpdatedAt(updatedAt);

  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="about-container about-hero__grid">
          <div className="about-hero__content">
            <span className="about-eyebrow">{title} · İlkOku&apos;nun hikâyesi</span>
            <h1>
              Bir eserin yolculuğu <span>ilk cümlede başlar.</span>
            </h1>
            <p>{summary}</p>
            <div className="about-hero__roles" aria-label="İlkOku ekosistemindeki roller">
              <span>Yazar</span><span>Okuyucu</span><span>Editör</span><span>Yayınevi</span>
            </div>
            {updatedLabel ? <small>Son güncelleme: {updatedLabel}</small> : null}
          </div>

          <div className="about-hero__visual">
            <Image
              src="/about/about-collaboration-hero.webp?v=20260827"
              alt="İlkOku için insan ve yapay zekânın birlikte çalışmasını anlatan, gözlüklü ve kalemli yaratıcı çalışma sahnesi"
              fill
              priority
              unoptimized
              sizes="(max-width: 1024px) 100vw, 48vw"
            />
          </div>
        </div>
      </section>

      {parsed.intro ? (
        <section className="about-opening about-container">
          <span className="about-opening__icon"><AboutIcon name="path" /></span>
          <div>
            <span className="about-eyebrow">İlk cümleden keşfe</span>
            <EditorialBody body={parsed.intro} />
          </div>
        </section>
      ) : null}

      {sectionMap.get("Neden İlkOku var?") ? (
        <section className="about-mission">
          <div className="about-container about-mission__grid">
            <header>
              <span className="about-eyebrow">Meselemiz teknoloji değil, eser</span>
              <h2>Neden İlkOku var?</h2>
            </header>
            <div className="about-mission__body">
              <EditorialBody body={sectionMap.get("Neden İlkOku var?")!.body} />
              <blockquote>“Yazarı geliştirmek, okuru yeni eserlerle buluşturmak ve güçlü hikâyeleri görünür kılmak.”</blockquote>
            </div>
          </div>
        </section>
      ) : null}

      {roles ? (
        <section className="about-roles about-container">
          <header className="about-section-heading">
            <span className="about-eyebrow">Dört farklı bakış, aynı eser</span>
            <h2>{roles.title}</h2>
            {roleParts.intro ? <EditorialBody body={roleParts.intro} /> : null}
          </header>
          <div className="about-role-grid">
            {roleMeta.map((role) => {
              const content = roleParts.sections.find((section) => section.title === role.title);
              return (
                <article className="about-role-card" key={role.title}>
                  <div className="about-role-card__top">
                    <span className="about-role-card__icon"><AboutIcon name={role.icon} /></span>
                    <small>{role.label}</small>
                  </div>
                  <h3>{role.title}</h3>
                  {content ? <EditorialBody body={content.body} /> : null}
                  <Link href={role.href}>{role.title} olarak katıl <span aria-hidden="true">→</span></Link>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {sectionMap.get("Bir eseri yalnızca son hâliyle görmüyoruz") ? (
        <section className="about-passport">
          <div className="about-container about-passport__grid">
            <div className="about-passport__visual" aria-hidden="true">
              <span className="about-passport__icon"><AboutIcon name="passport" /></span>
              <div className="about-passport__line"><i /><span>İlk cümle</span><i /><span>Revizyon</span><i /><span>İnceleme</span><i /><span>Keşif</span></div>
            </div>
            <div>
              <span className="about-eyebrow">Eser Pasaportu yaklaşımı</span>
              <h2>Bir eseri yalnızca son hâliyle görmüyoruz.</h2>
              <EditorialBody body={sectionMap.get("Bir eseri yalnızca son hâliyle görmüyoruz")!.body} />
            </div>
          </div>
        </section>
      ) : null}

      {sectionMap.get("Güvenin temeli: herkesin rolü belli") ? (
        <section className="about-trust about-container">
          <div className="about-trust__heading">
            <span className="about-trust__icon"><AboutIcon name="shield" /></span>
            <div><span className="about-eyebrow">Güven &amp; sınırlar</span><h2>Güvenin temeli: herkesin rolü belli.</h2></div>
          </div>
          <EditorialBody body={sectionMap.get("Güvenin temeli: herkesin rolü belli")!.body} />
          <div className="about-trust__principles">
            <span><strong>Yazar</strong> yaratıcı kontrolü korur.</span>
            <span><strong>Editör</strong> bağımsız değerlendirme yapar.</span>
            <span><strong>Yayınevi</strong> kendi kararını kendisi verir.</span>
          </div>
        </section>
      ) : null}

      {sectionMap.get("Yazar gelişir, okur keşfeder") ? (
        <section className="about-boundaries">
          <div className="about-container about-boundaries__grid">
            <header><span className="about-eyebrow">Yazarın gelişimi · okurun keşfi</span><h2>Yazar gelişir, okur keşfeder.</h2><p>İlkOku, yeni yazarların güçlenebildiği ve okurların yeni hikâyeleri erkenden keşfedebildiği canlı bir buluşma alanı kurar.</p></header>
            <div className="about-boundaries__body"><EditorialBody body={sectionMap.get("Yazar gelişir, okur keşfeder")!.body} /></div>
          </div>
        </section>
      ) : null}

      {sectionMap.get("Nereye gidiyoruz?") ? (
        <section className="about-future about-container">
          <div className="about-future__copy">
            <span className="about-eyebrow">Bir sonraki bölüm</span>
            <h2>Nereye gidiyoruz?</h2>
            <EditorialBody body={sectionMap.get("Nereye gidiyoruz?")!.body} />
          </div>
          <div className="about-future__cta">
            <strong>Hikâyenin hangi tarafındasın?</strong>
            <p>Okur olarak keşfet, yazar olarak ilk cümleni yaz veya profesyonel rolünle ekosisteme katıl.</p>
            <div><Link className="about-button about-button--primary" href="/#roller">Rolünü seç <span aria-hidden="true">→</span></Link><Link className="about-button about-button--secondary" href="/eserler">Keşfe açık eserler</Link></div>
          </div>
        </section>
      ) : null}

      <section className="about-final">
        <div className="about-container">
          <span><Image src="/about/about-final-parchment-quill.webp" alt="" width={44} height={44} aria-hidden="true" /></span>
          <p>Her büyük hikâye bir ilk cümleyle başlar.</p>
          <strong>O ilk cümlenin yolculuğu için İlkOku var.</strong>
        </div>
      </section>
    </main>
  );
}
