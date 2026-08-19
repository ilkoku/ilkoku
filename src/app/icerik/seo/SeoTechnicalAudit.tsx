import Link from "next/link";
import {
  defaultFooterNavigation,
  FOOTER_LIVE_KEY,
  parseFooterNavigation,
} from "@/lib/cms-footer-navigation";
import { analyzeFooterNavigation } from "@/lib/cms-footer-validation";
import { prisma } from "@/lib/prisma";
import styles from "./SeoTechnicalAudit.module.css";

type SeoRow = {
  contentKey: string;
  slug: string;
  canonicalUrl: string | null;
  noIndex: boolean;
};
type FooterRow = { valueJson: string };
type Tone = "ok" | "warn" | "danger";

type TechnicalState = {
  pages: SeoRow[];
  footer: {
    state: "ok" | "fallback" | "corrupt" | "unavailable";
    blockers: number;
    fallbacks: number;
  };
};

function normalizedCanonical(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return `https://ilkoku.com${trimmed}`;
  return trimmed.replace(/\/$/, "");
}

function canonicalIsSafe(value: string) {
  const normalized = normalizedCanonical(value);
  if (!normalized) return false;
  try {
    const url = new URL(normalized);
    return url.protocol === "https:" && url.hostname === "ilkoku.com";
  } catch {
    return false;
  }
}

function isTrSeoPage(contentKey: string) {
  if (contentKey.startsWith("legal:en:")) return false;
  if (contentKey.startsWith("guide:en:")) return false;
  if (contentKey.startsWith("page:en:")) return false;
  return contentKey.startsWith("legal:") || contentKey.startsWith("guide:") || contentKey.startsWith("page:tr:");
}

function sitemapFamily(contentKey: string) {
  return contentKey.startsWith("legal:") || contentKey.startsWith("guide:") || contentKey.startsWith("page:tr:");
}

async function loadTechnicalState(): Promise<TechnicalState | null> {
  let pages: SeoRow[];
  try {
    pages = await prisma.$queryRaw<SeoRow[]>`
      SELECT contentKey, slug, canonicalUrl, noIndex
      FROM ContentPage
      WHERE status = 'published'
        AND contentKey NOT LIKE 'legal:en:%'
        AND contentKey NOT LIKE 'guide:en:%'
        AND contentKey NOT LIKE 'page:en:%'
      ORDER BY updatedAt DESC
      LIMIT 5000
    `;
  } catch {
    return null;
  }

  let footer: TechnicalState["footer"] = { state: "fallback", blockers: 0, fallbacks: 0 };
  try {
    const rows = await prisma.$queryRaw<FooterRow[]>`
      SELECT valueJson
      FROM SiteContent
      WHERE namespace = 'site'
        AND contentKey = ${FOOTER_LIVE_KEY}
        AND status = 'published'
      LIMIT 1
    `;
    const payload = rows[0] ? parseFooterNavigation(rows[0].valueJson) : defaultFooterNavigation;
    if (!payload) {
      footer = { state: "corrupt", blockers: 1, fallbacks: 0 };
    } else {
      const analysis = await analyzeFooterNavigation(payload).catch(() => null);
      footer = analysis
        ? {
            state: rows[0] ? "ok" : "fallback",
            blockers: analysis.blocking.length,
            fallbacks: analysis.fallbackCount,
          }
        : { state: "unavailable", blockers: 1, fallbacks: 0 };
    }
  } catch {
    footer = { state: "unavailable", blockers: 1, fallbacks: 0 };
  }

  return { pages: pages.filter((page) => isTrSeoPage(page.contentKey)), footer };
}

function Card({ state, label, value, detail }: { state: Tone; label: string; value: string; detail: string }) {
  return <article className={styles.card} data-state={state}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

export async function SeoTechnicalAudit() {
  const state = await loadTechnicalState();
  if (!state) {
    return (
      <section className={styles.audit} role="alert">
        <div className={styles.header}><div className={styles.copy}><span>Teknik SEO · TR</span><h2>İndeksleme Sağlığı</h2><p>Published SEO envanteri okunamadı; sistem yanlış bir temiz sonucu üretmiyor.</p></div><span className={styles.status} data-state="danger">Blokaj</span></div>
        <div className={styles.focus}><div><strong>SEO altyapı teşhisi durduruldu.</strong><p>Veri kaynağı doğrulanmadan sitemap/canonical/internal-link sağlığı temiz kabul edilmez.</p></div><div className={styles.actions}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/seo">Tekrar dene</Link></div></div>
      </section>
    );
  }

  const indexable = state.pages.filter((page) => !page.noIndex);
  const noIndexCount = state.pages.length - indexable.length;
  const missingCanonical = indexable.filter((page) => !page.canonicalUrl?.trim()).length;
  const invalidCanonical = indexable.filter((page) => page.canonicalUrl?.trim() && !canonicalIsSafe(page.canonicalUrl)).length;
  const canonicalCounts = new Map<string, number>();
  for (const page of indexable) {
    if (!page.canonicalUrl?.trim()) continue;
    const key = normalizedCanonical(page.canonicalUrl);
    canonicalCounts.set(key, (canonicalCounts.get(key) ?? 0) + 1);
  }
  const duplicateCanonical = [...canonicalCounts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0);
  const sitemapEligible = indexable.filter((page) => sitemapFamily(page.contentKey)).length;
  const unsupportedIndexable = indexable.filter((page) => !sitemapFamily(page.contentKey)).length;
  const canonicalBlockers = invalidCanonical + duplicateCanonical;
  const blockers = canonicalBlockers + state.footer.blockers;
  const warnings = missingCanonical + unsupportedIndexable + state.footer.fallbacks;
  const overall: Tone = blockers > 0 ? "danger" : warnings > 0 ? "warn" : "ok";

  const focus = blockers > 0
    ? `${blockers} teknik SEO blokajı var. Önce canonical veya internal-link hatalarını düzeltin.`
    : warnings > 0
      ? `${warnings} SEO uyarısı var. İndeksleme öncesi eksik canonical/fallback hedeflerini temizleyin.`
      : "Teknik SEO sözleşmeleri temiz görünüyor; metadata kuyruğundaki içerik işlerine geçebilirsiniz.";

  return (
    <section className={styles.audit} aria-labelledby="seo-technical-title">
      <div className={styles.header}>
        <div className={styles.copy}><span>Teknik SEO · TR</span><h2 id="seo-technical-title">İndeksleme Sağlığı</h2><p>Sitemap, robots, canonical/noindex, sosyal önizleme ve footer/internal-link sinyallerini tek yerde izleyin. Bu alan teşhis eder; ikinci bir SEO düzenleme kaynağı oluşturmaz.</p></div>
        <span className={styles.status} data-state={overall}>{overall === "ok" ? "Temiz" : overall === "warn" ? "Kontrol" : "Blokaj"}</span>
      </div>

      <div className={styles.grid}>
        <Card state={noIndexCount > 0 ? "warn" : "ok"} label="İndeks politikası" value={`${indexable.length} index · ${noIndexCount} noindex`} detail="Published TR ContentPage kayıtları; noindex kayıtları sitemap kabulünden ayrılır." />
        <Card state={canonicalBlockers > 0 ? "danger" : missingCanonical > 0 ? "warn" : "ok"} label="Canonical" value={`${missingCanonical} eksik · ${invalidCanonical} hatalı`} detail={`${duplicateCanonical} duplicate canonical · host yalnız ilkoku.com kabul edilir.`} />
        <Card state={unsupportedIndexable > 0 ? "warn" : "ok"} label="Sitemap kapsamı" value={`${sitemapEligible} CMS URL`} detail={unsupportedIndexable > 0 ? `${unsupportedIndexable} indexlenebilir kayıt tanımlı sitemap ailesine girmiyor.` : "TR yasal, rehber ve kurumsal sayfa aileleri kapsanıyor."} />
        <Card state="ok" label="Robots" value="Public açık" detail="/admin, /icerik, /sistem-yonetimi, /api ve /auth crawler erişimine kapalı; sitemap.xml ilan ediliyor." />
        <Card state="ok" label="Social preview" value="1200 × 630" detail="Global Open Graph ve Twitter fallback görseli public route ailesi için mevcut." />
        <Card state={state.footer.blockers > 0 ? "danger" : state.footer.fallbacks > 0 || state.footer.state === "fallback" ? "warn" : "ok"} label="Internal link / Footer" value={`${state.footer.blockers} blokaj · ${state.footer.fallbacks} fallback`} detail={state.footer.state === "corrupt" ? "Published footer payload bozuk." : state.footer.state === "unavailable" ? "Footer hedef analizi çalıştırılamadı." : state.footer.state === "fallback" ? "Published footer yok; güvenli kod fallback hedefleri kullanılıyor." : "Published footer hedefleri public rota sözleşmesine göre doğrulandı."} />
      </div>

      <div className={styles.focus}><div><strong>Şimdi ne yapılmalı?</strong><p>{focus}</p></div><div className={styles.actions}><Link href="/sitemap.xml" target="_blank">Sitemap ↗</Link><Link href="/robots.txt" target="_blank">Robots ↗</Link><Link href="/icerik/menuler">Internal linkleri düzelt →</Link><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div></div>
      <div className={styles.note}><strong>SEO sınırı:</strong> noindex tek başına hata değildir; bilinçli indeks politikasıdır. BLOCKER yalnız hatalı/duplicate canonical, bozuk veya doğrulanamayan internal-link sözleşmesi gibi yanlış canlı sinyal üretebilecek durumlarda yükselir.</div>
    </section>
  );
}
