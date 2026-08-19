import Link from "next/link";
import { getPublishedHomepageState } from "@/lib/cms-homepage-store";
import { safeCmsInternalHref } from "@/lib/cms-links";
import styles from "./SeoTechnicalAudit.module.css";

type Tone = "ok" | "warn" | "danger";

const requirements = {
  hero: ["title", "description", "primaryCtaLabel", "primaryCtaHref", "secondaryCtaLabel", "secondaryCtaHref"],
  roles: ["eyebrow", "title", "description"],
  passport: ["eyebrow", "title", "description", "ctaLabel", "ctaHref"],
  why: ["eyebrow", "title"],
  footer: ["slogan", "copyright"],
} as const;

function missingFields(section: Record<string, string> | undefined, fields: readonly string[]) {
  return fields.filter((field) => !section?.[field]?.trim());
}

function Card({ state, label, value, detail }: { state: Tone; label: string; value: string; detail: string }) {
  return <article className={styles.card} data-state={state}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

export async function SeoHomepageAudit() {
  const state = await getPublishedHomepageState("tr");

  if (state.state === "unavailable" || state.state === "corrupt") {
    const detail = state.state === "corrupt"
      ? `Published Ana Sayfa payload'ı ${state.section} bölümünde bozuk.`
      : "Published Ana Sayfa kaynağı okunamadı.";
    return (
      <section className={styles.audit} role="alert">
        <div className={styles.header}><div className={styles.copy}><span>Ana Sayfa SEO · TR</span><h2>İçerik Bütünlüğü</h2><p>Ana Sayfa published CMS içeriği doğrulanmadan SEO durumu temiz kabul edilmez.</p></div><span className={styles.status} data-state="danger">Blokaj</span></div>
        <div className={styles.focus}><div><strong>{detail}</strong><p>İlk server HTML güvenli kod fallback’i ile ayakta kalabilir; ancak CMS SEO kabulü için published veri düzeltilmelidir.</p></div><div className={styles.actions}><Link href="/icerik/ana-sayfa">Ana Sayfayı Düzenle →</Link><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div></div>
      </section>
    );
  }

  const content = state.state === "valid" ? state.content : {};
  const sectionResults = Object.entries(requirements).map(([key, fields]) => {
    const section = content[key as keyof typeof content];
    const missing = missingFields(section, fields);
    return { key, missing };
  });
  const missingCount = sectionResults.reduce((sum, item) => sum + item.missing.length, 0);
  const missingSections = sectionResults.filter((item) => !content[item.key as keyof typeof content]).length;
  const hero = content.hero;
  const passport = content.passport;
  const invalidCtas = [hero?.primaryCtaHref, hero?.secondaryCtaHref, passport?.ctaHref]
    .filter((value): value is string => Boolean(value?.trim()))
    .filter((value) => !safeCmsInternalHref(value)).length;
  const fallbackMode = state.state === "missing";
  const tone: Tone = invalidCtas > 0 ? "danger" : fallbackMode || missingCount > 0 ? "warn" : "ok";

  return (
    <section className={styles.audit} aria-labelledby="seo-homepage-title">
      <div className={styles.header}>
        <div className={styles.copy}><span>Ana Sayfa SEO · TR</span><h2 id="seo-homepage-title">İçerik Bütünlüğü</h2><p>Hero, rol girişi, Eser Pasaportu, Neden İlkOku ve footer metinlerinin published CMS durumunu kontrol edin. Bu metinler public Ana Sayfa’nın ilk server HTML’inde kullanılır.</p></div>
        <span className={styles.status} data-state={tone}>{tone === "ok" ? "Temiz" : tone === "warn" ? "Kontrol" : "Blokaj"}</span>
      </div>

      <div className={styles.grid}>
        {sectionResults.map((item) => {
          const labels: Record<string, string> = { hero: "Hero", roles: "Rol bölümü", passport: "Eser Pasaportu", why: "Neden İlkOku", footer: "Footer" };
          const missing = item.missing;
          const sectionExists = Boolean(content[item.key as keyof typeof content]);
          return <Card key={item.key} state={!sectionExists ? "warn" : missing.length > 0 ? "warn" : "ok"} label={labels[item.key]} value={!sectionExists ? "Kod fallback" : missing.length > 0 ? `${missing.length} alan eksik` : "Published hazır"} detail={!sectionExists ? "CMS published bölümü yok; public sayfa güvenli kod içeriğini kullanıyor." : missing.length > 0 ? `Eksik: ${missing.join(", ")}.` : "Kritik metin alanları published CMS kaydında mevcut."} />;
        })}
        <Card state={invalidCtas > 0 ? "danger" : "ok"} label="CTA güvenliği" value={invalidCtas > 0 ? `${invalidCtas} hatalı hedef` : "Güvenli"} detail="Hero ve Eser Pasaportu CTA hedefleri yalnız güvenli site içi URL/anchor kabul eder." />
      </div>

      <div className={styles.focus}><div><strong>Şimdi ne yapılmalı?</strong><p>{invalidCtas > 0 ? "Güvenli olmayan CTA hedeflerini düzeltin; public navigasyon sinyalini bozabilir." : fallbackMode ? "Ana Sayfa tamamen kod fallback’i ile çalışıyor. SEO kontrolü için canonical CMS bölümlerini yayınlayın." : missingCount > 0 || missingSections > 0 ? "Eksik CMS alanlarını tamamlayın; public sayfa fallback metinlerle karışık çalışmasın." : "Ana Sayfa published CMS içerik bütünlüğü hazır. Rol Kartları ve teknik SEO kontrollerine geçebilirsiniz."}</p></div><div className={styles.actions}><Link href="/icerik/ana-sayfa">Ana Sayfa çalışma masası →</Link><Link href="/" target="_blank">Public Ana Sayfa ↗</Link></div></div>
    </section>
  );
}
