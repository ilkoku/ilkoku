import Link from "next/link";
import {
  getPublicAuthors,
  getPublicGenres,
} from "@/features/public-discovery/library";
import {
  defaultFooterNavigation,
  FOOTER_LIVE_KEY,
  parseFooterNavigation,
} from "@/lib/cms-footer-navigation";
import { analyzeFooterNavigation } from "@/lib/cms-footer-validation";
import { prisma } from "@/lib/prisma";
import { isBlockedPublicWorkSlug } from "@/lib/public-content-safety";
import { getLiveSeoVerification } from "@/lib/seo-live-verification";
import styles from "./SeoTechnicalAudit.module.css";

type SeoRow = {
  contentKey: string;
  slug: string;
  canonicalUrl: string | null;
  noIndex: boolean;
};
type FooterRow = { valueJson: string };
type Tone = "ok" | "warn" | "danger";

type PublicDiscoveryState = {
  state: "ok" | "unavailable";
  staticRoutes: number;
  works: number;
  authors: number;
  genres: number;
};

type TechnicalState = {
  pages: SeoRow[];
  publicDiscovery: PublicDiscoveryState;
  footer: {
    state: "ok" | "fallback" | "corrupt" | "unavailable";
    blockers: number;
    fallbacks: number;
  };
};

const codeOwnedStaticRoutes = [
  "/",
  "/eserler",
  "/eserler/yeni",
  "/eserler/guncellenen",
  "/yazarlar",
  "/turler",
  "/yardim",
  "/editorler",
  "/iletisim",
] as const;

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
  return contentKey.startsWith("legal:") || contentKey.startsWith("page:tr:");
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

  let publicDiscovery: PublicDiscoveryState = {
    state: "unavailable",
    staticRoutes: codeOwnedStaticRoutes.length,
    works: 0,
    authors: 0,
    genres: 0,
  };

  try {
    const [works, authors, genres] = await Promise.all([
      prisma.work.findMany({
        where: {
          archivedAt: null,
          contentRating: {
            not: "adult_18",
          },
          author: {
            is: {
              deletedAt: null,
              status: "active",
            },
          },
          language: "tr",
          publishedAt: {
            not: null,
          },
          status: "published",
          visibility: "public",
        },
        select: {
          slug: true,
        },
        take: 50_000,
      }),
      getPublicAuthors(),
      getPublicGenres(),
    ]);

    publicDiscovery = {
      state: "ok",
      staticRoutes: codeOwnedStaticRoutes.length,
      works: works.filter((work) => !isBlockedPublicWorkSlug(work.slug)).length,
      authors: authors.length,
      genres: genres.length,
    };
  } catch {
    // Keep the code-owned static inventory visible, but fail closed on
    // database-backed public discovery counts.
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

  return { pages: pages.filter((page) => isTrSeoPage(page.contentKey)), publicDiscovery, footer };
}

function Card({ state, label, value, detail }: { state: Tone; label: string; value: string; detail: string }) {
  return <article className={styles.card} data-state={state}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function evidenceValue(state: Tone) {
  if (state === "ok") return "Canlı doğrulandı";
  if (state === "danger") return "Canlı hata";
  return "Doğrulanamadı";
}

export async function SeoTechnicalAudit() {
  const [state, live] = await Promise.all([
    loadTechnicalState(),
    getLiveSeoVerification(),
  ]);
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
  const dynamicDiscoveryCount = state.publicDiscovery.works + state.publicDiscovery.authors + state.publicDiscovery.genres;
  const codeOwnedSitemapCount = state.publicDiscovery.staticRoutes + dynamicDiscoveryCount;
  const calculatedSitemapCoverage = sitemapEligible + codeOwnedSitemapCount;
  const canonicalBlockers = invalidCanonical + duplicateCanonical;
  const publicDiscoveryBlockers = state.publicDiscovery.state === "unavailable" && live.sitemap.state !== "ok" ? 1 : 0;
  const liveEvidenceBlockers = Number(live.robots.state === "danger") + Number(live.sitemap.state === "danger") + Number(live.social.state === "danger");
  const liveEvidenceWarnings = Number(live.robots.state === "warn") + Number(live.sitemap.state === "warn") + Number(live.social.state === "warn");
  const blockers = canonicalBlockers + publicDiscoveryBlockers + state.footer.blockers + liveEvidenceBlockers;
  // Safe code fallbacks are operational information, not SEO warnings. Only
  // missing/unsupported metadata and unreadable live evidence count here.
  const warnings = missingCanonical + unsupportedIndexable + liveEvidenceWarnings;
  const overall: Tone = blockers > 0 ? "danger" : warnings > 0 ? "warn" : "ok";

  const focus = blockers > 0
    ? `${blockers} teknik SEO blokajı var. Önce canonical, canlı sitemap/robots/social kanıtı veya internal-link hatalarını düzeltin.`
    : warnings > 0
      ? `${warnings} teknik SEO uyarısı var. Eksik canonical veya doğrulanamayan canlı sinyalleri kontrol edin.`
      : state.footer.state === "fallback"
        ? "Teknik SEO temiz. Footer güvenli kod fallback hedeflerini kullanıyor; bu durum indeksleme hatası değildir."
        : "Teknik SEO sözleşmeleri ile canlı sitemap/robots/social kanıtı doğrulandı; metadata kuyruğundaki içerik işlerine geçebilirsiniz.";

  const runtimeSitemapDetail = state.publicDiscovery.state === "ok"
    ? `${sitemapEligible} CMS URL · ${state.publicDiscovery.staticRoutes} kod tabanlı keşif URL'si · ${state.publicDiscovery.works} eser · ${state.publicDiscovery.authors} yazar · ${state.publicDiscovery.genres} tür.`
    : `${sitemapEligible} CMS URL ve ${state.publicDiscovery.staticRoutes} kod tabanlı keşif URL'si biliniyor; eser/yazar/tür runtime envanteri okunamadı.`;
  const sitemapDetail = `${live.sitemap.detail} İç envanter: ${runtimeSitemapDetail}`;
  const sitemapCardState: Tone = live.sitemap.state === "danger"
    ? "danger"
    : live.sitemap.state === "warn"
      ? "warn"
      : unsupportedIndexable > 0
        ? "warn"
        : "ok";
  const sitemapValue = live.sitemap.count !== null
    ? `${live.sitemap.count} canlı URL`
    : state.publicDiscovery.state === "ok"
      ? `${calculatedSitemapCoverage} hesaplanan URL`
      : "Canlı kontrol gerekli";

  const footerState: Tone = state.footer.blockers > 0 ? "danger" : "ok";
  const footerValue = state.footer.state === "fallback"
    ? `${state.footer.fallbacks} güvenli fallback`
    : `${state.footer.blockers} blokaj · ${state.footer.fallbacks} fallback`;
  const footerDetail = state.footer.state === "corrupt"
    ? "Published footer payload bozuk."
    : state.footer.state === "unavailable"
      ? "Footer hedef analizi çalıştırılamadı."
      : state.footer.state === "fallback"
        ? "Published footer kaydı yok; doğrulanmış kod fallback hedefleri kullanılıyor. SEO blokajı veya uyarısı değildir."
        : "Published footer hedefleri public rota sözleşmesine göre doğrulandı.";

  return (
    <section className={styles.audit} aria-labelledby="seo-technical-title">
      <div className={styles.header}>
        <div className={styles.copy}><span>Teknik SEO · TR</span><h2 id="seo-technical-title">İndeksleme Sağlığı</h2><p>Sitemap, robots, canonical/noindex, sosyal önizleme ve footer/internal-link sinyallerini tek yerde izleyin. Sitemap, robots ve sosyal metadata kartları kod varsayımıyla değil, canlı ilkoku.com çıktısıyla doğrulanır.</p></div>
        <span className={styles.status} data-state={overall}>{overall === "ok" ? "Temiz" : overall === "warn" ? "Kontrol" : "Blokaj"}</span>
      </div>

      <div className={styles.grid}>
        <Card state="ok" label="İndeks politikası" value={`${indexable.length} CMS index · ${noIndexCount} noindex`} detail="Noindex bilinçli indeks politikasıdır; tek başına hata veya uyarı sayılmaz. Query varyantları sayfa metadata sözleşmesinde noindex kalır." />
        <Card state={canonicalBlockers > 0 ? "danger" : missingCanonical > 0 ? "warn" : "ok"} label="Canonical" value={`${missingCanonical} eksik · ${invalidCanonical} hatalı`} detail={`${duplicateCanonical} duplicate canonical · host yalnız ilkoku.com kabul edilir.`} />
        <Card state={sitemapCardState} label="Sitemap kapsamı" value={sitemapValue} detail={unsupportedIndexable > 0 ? `${sitemapDetail} Ayrıca ${unsupportedIndexable} indexlenebilir CMS kayıt tanımlı sitemap ailesine girmiyor.` : sitemapDetail} />
        <Card state={live.robots.state} label="Robots" value={evidenceValue(live.robots.state)} detail={live.robots.detail} />
        <Card state={live.social.state} label="Social preview" value={evidenceValue(live.social.state)} detail={live.social.detail} />
        <Card state={footerState} label="Internal link / Footer" value={footerValue} detail={footerDetail} />
      </div>

      <div className={styles.focus}><div><strong>Şimdi ne yapılmalı?</strong><p>{focus}</p></div><div className={styles.actions}><Link href="/sitemap.xml" target="_blank">Sitemap ↗</Link><Link href="/robots.txt" target="_blank">Robots ↗</Link><Link href="/icerik/menuler">Internal linkleri yönet →</Link><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div></div>
      <div className={styles.note}><strong>SEO sınırı:</strong> noindex ve doğrulanmış kod fallback kullanımı tek başına hata değildir. Canlı kanıt okunamazsa yeşil sonuç üretilmez. BLOCKER hatalı/duplicate canonical, bozuk/eksik canlı sitemap, eksik canlı robots/social sinyali veya bozuk/doğrulanamayan internal-link sözleşmesi gibi yanlış canlı sinyal üretebilecek durumlarda yükselir.</div>
    </section>
  );
}
