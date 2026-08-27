import Link from "next/link";
import { getPublishedHomepageState } from "@/lib/cms-homepage-store";
import { safeCmsInternalHref } from "@/lib/cms-links";
import styles from "./SeoTechnicalAudit.module.css";

type Tone = "ok" | "warn" | "danger";
type CtaCheck = { href: string; state: Tone; detail: string };

const baseUrl = "https://ilkoku.com";
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function verifyCtaHref(input: string): Promise<CtaCheck> {
  const href = safeCmsInternalHref(input);
  if (!href) {
    return { href: input, state: "danger", detail: "CTA hedefi güvenli site içi URL/anchor sözleşmesini geçemedi." };
  }

  const normalized = href.startsWith("#") ? `/${href}` : href;
  const url = new URL(normalized, baseUrl);
  const anchor = url.hash.slice(1);
  url.hash = "";

  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: { "user-agent": "IlkOku-SEO-CTA-Evidence/1.0" },
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) {
      return { href, state: "danger", detail: `${href} canlı hedefi HTTP ${response.status} döndürdü.` };
    }
    if (anchor) {
      const html = await response.text();
      const pattern = new RegExp(`id=["']${escapeRegExp(anchor)}["']`, "iu");
      if (!pattern.test(html)) {
        return { href, state: "danger", detail: `${href} sayfası açılıyor ancak #${anchor} anchor'ı canlı HTML içinde bulunamadı.` };
      }
    }
    return { href, state: "ok", detail: `${href} canlı hedefi doğrulandı.` };
  } catch {
    return { href, state: "warn", detail: `${href} canlı hedefi okunamadı; PASS üretilmedi.` };
  }
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
  const ctaInputs = [hero?.primaryCtaHref, hero?.secondaryCtaHref, passport?.ctaHref]
    .filter((value): value is string => Boolean(value?.trim()));
  const ctaChecks = await Promise.all(ctaInputs.map((value) => verifyCtaHref(value)));
  const invalidCtas = ctaChecks.filter((check) => check.state === "danger").length;
  const unverifiableCtas = ctaChecks.filter((check) => check.state === "warn").length;
  const ctaTone: Tone = invalidCtas > 0
    ? "danger"
    : ctaInputs.length === 0 || unverifiableCtas > 0
      ? "warn"
      : "ok";
  const fallbackMode = state.state === "missing";
  const tone: Tone = ctaTone === "danger" ? "danger" : fallbackMode || missingCount > 0 || ctaTone === "warn" ? "warn" : "ok";
  const ctaValue = ctaTone === "ok"
    ? `${ctaChecks.length}/${ctaChecks.length} canlı`
    : ctaTone === "danger"
      ? `${invalidCtas} hatalı hedef`
      : ctaInputs.length === 0
        ? "CTA yok"
        : `${unverifiableCtas} doğrulanamadı`;
  const ctaDetail = ctaChecks.length > 0
    ? ctaChecks.map((check) => check.detail).join(" · ")
    : "Published CTA hedefi bulunmadı; biçim veya canlı hedef için PASS üretilmedi.";

  return (
    <section className={styles.audit} aria-labelledby="seo-homepage-title">
      <div className={styles.header}>
        <div className={styles.copy}><span>Ana Sayfa SEO · TR</span><h2 id="seo-homepage-title">İçerik Bütünlüğü</h2><p>Hero, rol girişi, Eser Pasaportu, Neden İlkOku ve footer metinlerinin published CMS durumunu kontrol edin. CTA kartı artık yalnız URL biçimini değil, canlı hedefin HTTP erişimini ve varsa anchor kanıtını da doğrular.</p></div>
        <span className={styles.status} data-state={tone}>{tone === "ok" ? "Temiz" : tone === "warn" ? "Kontrol" : "Blokaj"}</span>
      </div>

      <div className={styles.grid}>
        {sectionResults.map((item) => {
          const labels: Record<string, string> = { hero: "Hero", roles: "Rol bölümü", passport: "Eser Pasaportu", why: "Neden İlkOku", footer: "Footer" };
          const missing = item.missing;
          const sectionExists = Boolean(content[item.key as keyof typeof content]);
          return <Card key={item.key} state={!sectionExists ? "warn" : missing.length > 0 ? "warn" : "ok"} label={labels[item.key]} value={!sectionExists ? "Kod fallback" : missing.length > 0 ? `${missing.length} alan eksik` : "Published hazır"} detail={!sectionExists ? "CMS published bölümü yok; public sayfa güvenli kod içeriğini kullanıyor." : missing.length > 0 ? `Eksik: ${missing.join(", ")}.` : "Kritik metin alanları published CMS kaydında mevcut."} />;
        })}
        <Card state={ctaTone} label="CTA hedef doğrulaması" value={ctaValue} detail={ctaDetail} />
      </div>

      <div className={styles.focus}><div><strong>Şimdi ne yapılmalı?</strong><p>{invalidCtas > 0 ? "Açılmayan, anchor'ı bulunmayan veya güvenli URL sözleşmesini geçemeyen CTA hedeflerini düzeltin." : unverifiableCtas > 0 ? "Canlı olarak okunamayan CTA hedeflerini yeniden doğrulayın; bunlara PASS verilmedi." : fallbackMode ? "Ana Sayfa tamamen kod fallback’i ile çalışıyor. SEO kontrolü için canonical CMS bölümlerini yayınlayın." : missingCount > 0 || missingSections > 0 ? "Eksik CMS alanlarını tamamlayın; public sayfa fallback metinlerle karışık çalışmasın." : "Ana Sayfa published CMS içerik bütünlüğü ve canlı CTA hedefleri doğrulandı. Rol Kartları ve teknik SEO kontrollerine geçebilirsiniz."}</p></div><div className={styles.actions}><Link href="/icerik/ana-sayfa">Ana Sayfa çalışma masası →</Link><Link href="/" target="_blank">Public Ana Sayfa ↗</Link></div></div>
    </section>
  );
}
