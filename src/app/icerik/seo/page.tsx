import Link from "next/link";
import { requireCmsManager } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";
import ops from "../PublishingOperationsWorkbench.module.css";
import growth from "../GrowthOperationsWorkbench.module.css";
import styles from "./SeoDashboard.module.css";
import { SeoRoleCardsAudit } from "./SeoRoleCardsAudit";

export const dynamic = "force-dynamic";

type SeoPage = {
  id: string;
  contentKey: string;
  slug: string;
  title: string;
  status: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  updatedAt: Date;
};

type SearchParams = Record<string, string | string[] | undefined>;
type IssueKey =
  | "title"
  | "description"
  | "canonical"
  | "canonical-invalid"
  | "canonical-duplicate"
  | "title-quality"
  | "description-quality"
  | "noindex";
type CanonicalCounts = Map<string, number>;

const criticalIssueKeys = new Set<IssueKey>([
  "title",
  "description",
  "canonical",
  "canonical-invalid",
  "canonical-duplicate",
]);
const qualityIssueKeys = new Set<IssueKey>(["title-quality", "description-quality"]);

function param(params: SearchParams, key: string) {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

function editHref(page: SeoPage) {
  if (page.contentKey.startsWith("legal:")) {
    const parts = page.contentKey.split(":");
    const slug = parts[1] || "";
    return `/icerik/yasal/${slug}?dil=tr`;
  }
  if (page.contentKey.startsWith("guide:")) return `/icerik/rehber/${page.id}?dil=tr`;
  if (page.contentKey.startsWith("page:")) return `/icerik/sayfalar/${page.id}`;
  return "/icerik/sayfalar";
}

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

function buildCanonicalCounts(pages: SeoPage[]) {
  const counts: CanonicalCounts = new Map();
  for (const page of pages) {
    if (page.noIndex || !page.canonicalUrl?.trim()) continue;
    const key = normalizedCanonical(page.canonicalUrl);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function seoIssues(page: SeoPage, canonicalCounts: CanonicalCounts): IssueKey[] {
  if (page.noIndex) return ["noindex"];

  const result: IssueKey[] = [];
  const seoTitle = page.seoTitle?.trim() ?? "";
  const seoDescription = page.seoDescription?.trim() ?? "";
  const canonical = page.canonicalUrl?.trim() ?? "";

  if (!seoTitle) result.push("title");
  else if (seoTitle.length < 25 || seoTitle.length > 65) result.push("title-quality");

  if (!seoDescription) result.push("description");
  else if (seoDescription.length < 70 || seoDescription.length > 170) result.push("description-quality");

  if (!canonical) {
    result.push("canonical");
  } else {
    if (!canonicalIsSafe(canonical)) result.push("canonical-invalid");
    const normalized = normalizedCanonical(canonical);
    if (normalized && (canonicalCounts.get(normalized) ?? 0) > 1) result.push("canonical-duplicate");
  }

  return result;
}

function criticalIssueCount(page: SeoPage, canonicalCounts: CanonicalCounts) {
  return seoIssues(page, canonicalCounts).filter((issue) => criticalIssueKeys.has(issue)).length;
}

function qualityWarningCount(page: SeoPage, canonicalCounts: CanonicalCounts) {
  return seoIssues(page, canonicalCounts).filter((issue) => qualityIssueKeys.has(issue)).length;
}

function healthScore(page: SeoPage, canonicalCounts: CanonicalCounts) {
  const critical = criticalIssueCount(page, canonicalCounts);
  const warnings = qualityWarningCount(page, canonicalCounts);
  return Math.max(0, 100 - critical * 20 - warnings * 5);
}

function priority(page: SeoPage, canonicalCounts: CanonicalCounts) {
  if (page.noIndex) return { label: "Noindex", level: "clean" };
  const critical = criticalIssueCount(page, canonicalCounts);
  const warnings = qualityWarningCount(page, canonicalCounts);
  if (critical > 0) return { label: "Düzelt", level: "high" };
  if (warnings > 0) return { label: "Kontrol", level: "medium" };
  return { label: "Hazır", level: "clean" };
}

function issueLabel(issue: IssueKey) {
  const labels: Record<IssueKey, string> = {
    title: "SEO başlığı eksik",
    description: "Meta açıklaması eksik",
    canonical: "Canonical eksik",
    "canonical-invalid": "Canonical hatalı",
    "canonical-duplicate": "Canonical tekrarı",
    "title-quality": "SEO başlığı uzunluğu kontrol edilmeli",
    "description-quality": "Meta açıklaması uzunluğu kontrol edilmeli",
    noindex: "Bilinçli noindex",
  };
  return labels[issue];
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function seoHref(params: SearchParams, patch: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const key of ["q", "sorun", "sec"] as const) {
    const current = param(params, key);
    if (current) query.set(key, current);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) query.set(key, value);
    else query.delete(key);
  }
  const suffix = query.toString();
  return suffix ? `/icerik/seo?${suffix}` : "/icerik/seo";
}

async function loadSeoPages(): Promise<SeoPage[] | null> {
  try {
    return await prisma.$queryRaw<SeoPage[]>`
      SELECT id, contentKey, slug, title, status, seoTitle, seoDescription,
             canonicalUrl, noIndex, updatedAt
      FROM ContentPage
      WHERE status = 'published'
        AND contentKey NOT LIKE 'legal:en:%'
        AND contentKey NOT LIKE 'guide:en:%'
        AND contentKey NOT LIKE 'page:en:%'
      ORDER BY updatedAt DESC
      LIMIT 500
    `;
  } catch {
    return null;
  }
}

export default async function SeoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireCmsManager("/icerik/seo");
  const params = await searchParams;
  const pages = await loadSeoPages();

  if (!pages) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading">
          <div>
            <span>Büyüme · SEO</span>
            <h1>SEO Merkezi</h1>
            <p>SEO verileri okunamadı. Yanlış bir “sorun yok” sonucu göstermiyoruz.</p>
          </div>
        </div>
        <div className="content-panel" role="alert">
          <strong>SEO denetim verileri okunamadı.</strong>
          <p>Yayındaki sayfalar doğrulanamadığı için SEO paneli güvenli biçimde durduruldu.</p>
          <div className="content-form-actions" style={{ flexWrap: "wrap" }}>
            <Link href="/icerik/saglik">Sistem Sağlığı →</Link>
            <Link href="/icerik/seo">Tekrar dene</Link>
          </div>
        </div>
      </section>
    );
  }

  const canonicalCounts = buildCanonicalCounts(pages);
  const q = param(params, "q").trim().toLocaleLowerCase("tr-TR");
  const issueFilter = param(params, "sorun") || "all";
  const selectedId = param(params, "sec");

  const filtered = pages.filter((page) => {
    const issues = seoIssues(page, canonicalCounts);
    const critical = criticalIssueCount(page, canonicalCounts);
    const warnings = qualityWarningCount(page, canonicalCounts);

    if (
      q &&
      !`${page.title} ${page.slug} ${page.seoTitle || ""} ${page.seoDescription || ""} ${page.canonicalUrl || ""}`
        .toLocaleLowerCase("tr-TR")
        .includes(q)
    ) return false;

    if (issueFilter === "attention" && critical === 0 && warnings === 0) return false;
    if (issueFilter === "critical" && critical === 0) return false;
    if (issueFilter === "quality" && warnings === 0) return false;
    if (issueFilter === "complete" && (critical !== 0 || warnings !== 0 || page.noIndex)) return false;
    if (issueFilter === "noindex" && !page.noIndex) return false;
    if (["title", "description", "canonical", "canonical-invalid", "canonical-duplicate"].includes(issueFilter) && !issues.includes(issueFilter as IssueKey)) return false;
    return true;
  });

  const selected = filtered.find((page) => page.id === selectedId) ?? filtered[0] ?? null;
  const indexablePages = pages.filter((page) => !page.noIndex);
  const noIndexCount = pages.length - indexablePages.length;
  const missingTitle = indexablePages.filter((page) => !page.seoTitle?.trim()).length;
  const missingDescription = indexablePages.filter((page) => !page.seoDescription?.trim()).length;
  const missingCanonical = indexablePages.filter((page) => !page.canonicalUrl?.trim()).length;
  const invalidCanonical = indexablePages.filter((page) => page.canonicalUrl?.trim() && !canonicalIsSafe(page.canonicalUrl)).length;
  const duplicateCanonical = [...canonicalCounts.values()]
    .filter((count) => count > 1)
    .reduce((sum, count) => sum + count - 1, 0);
  const canonicalBlockers = missingCanonical + invalidCanonical + duplicateCanonical;
  const criticalFieldCount = indexablePages.reduce((sum, page) => sum + criticalIssueCount(page, canonicalCounts), 0);
  const qualityWarnings = indexablePages.reduce((sum, page) => sum + qualityWarningCount(page, canonicalCounts), 0);
  const readyIndexable = indexablePages.filter(
    (page) => criticalIssueCount(page, canonicalCounts) === 0 && qualityWarningCount(page, canonicalCounts) === 0,
  ).length;
  const attentionPages = indexablePages.filter(
    (page) => criticalIssueCount(page, canonicalCounts) > 0 || qualityWarningCount(page, canonicalCounts) > 0,
  ).length;

  const dashboardState = criticalFieldCount > 0 ? "danger" : qualityWarnings > 0 ? "warning" : "ok";
  const dashboardTitle = criticalFieldCount > 0
    ? "Önce kritik SEO sorunlarını düzelt"
    : qualityWarnings > 0
      ? "Temel SEO temiz; kalite uyarılarını kontrol et"
      : "CMS SEO metadata durumu temiz";
  const dashboardText = criticalFieldCount > 0
    ? `${attentionPages} sayfada müdahale veya kalite kontrolü gerekiyor. Önce “Sorunlu sayfalar” filtresinden başlayın.`
    : qualityWarnings > 0
      ? `${qualityWarnings} kalite uyarısı var; indeksleme için kritik metadata blokajı görünmüyor.`
      : `${readyIndexable}/${indexablePages.length} indexlenebilir sayfa temel metadata ve kalite kontrollerini geçiyor.`;

  const selectedIssues = selected ? seoIssues(selected, canonicalCounts) : [];
  const selectedCanonical = selected?.canonicalUrl?.trim() ?? "";
  const selectedCanonicalSafe = selected?.noIndex ? true : Boolean(selectedCanonical && canonicalIsSafe(selectedCanonical));
  const selectedCanonicalUnique = selected?.noIndex || !selectedCanonical
    ? true
    : (canonicalCounts.get(normalizedCanonical(selectedCanonical)) ?? 0) <= 1;
  const selectedTitleLength = selected?.seoTitle?.trim().length ?? 0;
  const selectedDescriptionLength = selected?.seoDescription?.trim().length ?? 0;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Büyüme · SEO</span>
          <h1>SEO Merkezi</h1>
          <p>Önce mevcut durumu görün, sonra sorunlu sayfayı seçip düzeltin. Teknik denetimler gerektiğinde aşağıdan açılır.</p>
        </div>
        <div className="content-profile">
          <strong>{readyIndexable}/{indexablePages.length} sayfa hazır</strong>
          <small>{attentionPages} sayfa dikkat istiyor</small>
        </div>
      </div>

      <div className={ops.workbench}>
        <section className={styles.statusCard} aria-labelledby="seo-now-title">
          <div className={styles.statusTop}>
            <div className={styles.statusCopy}>
              <span>Şu anda ne yapmalıyım?</span>
              <h2 id="seo-now-title">{dashboardTitle}</h2>
              <p>{dashboardText}</p>
            </div>
            <span className={styles.statusBadge} data-state={dashboardState}>
              {criticalFieldCount > 0 ? `${criticalFieldCount} kritik` : qualityWarnings > 0 ? `${qualityWarnings} uyarı` : "Temiz"}
            </span>
          </div>
          <div className={styles.quickActions}>
            {attentionPages > 0 ? <Link href="/icerik/seo?sorun=attention#sayfa-seo">Sorunlu sayfaları göster</Link> : null}
            <Link href="/icerik/seo#sayfa-seo">Tüm sayfalar</Link>
            <Link href="/sitemap.xml" target="_blank">Sitemap ↗</Link>
            <Link href="/robots.txt" target="_blank">Robots ↗</Link>
            <Link href="/icerik/saglik">Sistem Sağlığı</Link>
          </div>
        </section>

        <div className={ops.summaryBar}>
          <article className={ops.summaryCard}>
            <span>Hazır sayfa</span>
            <strong>{readyIndexable} / {indexablePages.length}</strong>
            <small>Indexlenebilir CMS sayfaları</small>
          </article>
          <article className={ops.summaryCard}>
            <span>Kritik sorun</span>
            <strong>{criticalFieldCount}</strong>
            <small>{missingTitle} başlık · {missingDescription} açıklama eksik</small>
          </article>
          <article className={ops.summaryCard}>
            <span>Canonical</span>
            <strong>{canonicalBlockers === 0 ? "Temiz" : `${canonicalBlockers} sorun`}</strong>
            <small>{missingCanonical} eksik · {invalidCanonical} hatalı · {duplicateCanonical} tekrar</small>
          </article>
          <article className={ops.summaryCard}>
            <span>Kalite / politika</span>
            <strong>{qualityWarnings} uyarı</strong>
            <small>{noIndexCount} bilinçli noindex</small>
          </article>
        </div>

        <section id="sayfa-seo" aria-labelledby="page-seo-title">
          <div className="content-page-heading">
            <div>
              <span>Sayfa bazlı SEO</span>
              <h2 id="page-seo-title">Sayfayı seç, sorunu gör, düzelt</h2>
              <p>Filtreleyin, bir sayfa seçin; yalnız o sayfanın gerekli SEO bilgileri ve düzeltme bağlantısı gösterilir.</p>
            </div>
          </div>

          <div className={styles.queueLayout}>
            <aside className={ops.rail}>
              <div className={ops.railHeader}>
                <span className={ops.railLabel}>Sayfalar</span>
                <strong>{filtered.length} kayıt</strong>
              </div>
              <form method="get" className={ops.searchForm}>
                <input type="search" name="q" defaultValue={param(params, "q")} placeholder="Sayfa veya URL ara" />
                {issueFilter !== "all" ? <input type="hidden" name="sorun" value={issueFilter} /> : null}
                <button type="submit">Ara</button>
              </form>
              <div className={ops.filters}>
                <span className={ops.railLabel}>Göster</span>
                <div className={ops.filterRow}>
                  {[
                    { key: "all", label: "Tümü" },
                    { key: "attention", label: "Sorunlu" },
                    { key: "critical", label: "Kritik" },
                    { key: "quality", label: "Kalite" },
                    { key: "complete", label: "Hazır" },
                    { key: "noindex", label: "Noindex" },
                  ].map((filter) => (
                    <Link
                      key={filter.key}
                      data-active={issueFilter === filter.key}
                      href={seoHref(params, {
                        sorun: filter.key === "all" ? undefined : filter.key,
                        sec: undefined,
                      })}
                    >
                      {filter.label}
                    </Link>
                  ))}
                </div>
              </div>
              {filtered.length === 0 ? (
                <div className={ops.empty}>Bu filtrede sayfa yok.</div>
              ) : (
                <div className={ops.itemList}>
                  {filtered.map((page) => {
                    const critical = criticalIssueCount(page, canonicalCounts);
                    const warnings = qualityWarningCount(page, canonicalCounts);
                    const p = priority(page, canonicalCounts);
                    return (
                      <Link
                        key={page.id}
                        href={seoHref(params, { sec: page.id })}
                        className={ops.itemLink}
                        data-active={selected?.id === page.id}
                      >
                        <div className={ops.itemTop}>
                          <strong>{page.title}</strong>
                          <span className={growth.priority} data-level={p.level}>{p.label}</span>
                        </div>
                        <p>{page.slug}</p>
                        <div className={ops.itemMeta}>
                          <span>
                            {page.noIndex
                              ? "Bilinçli noindex"
                              : critical > 0
                                ? `${critical} kritik sorun`
                                : warnings > 0
                                  ? `${warnings} kalite uyarısı`
                                  : "SEO hazır"}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </aside>

            <main className={ops.detail}>
              {!selected ? (
                <div className={ops.empty}>
                  <strong>İncelenecek sayfa yok.</strong>
                  <p>Filtreyi değiştirin veya aramayı temizleyin.</p>
                </div>
              ) : (
                <>
                  <div className={ops.detailHeader}>
                    <div className={ops.detailTopline}>
                      <span className={growth.priority} data-level={priority(selected, canonicalCounts).level}>
                        {priority(selected, canonicalCounts).label}
                      </span>
                      <span className={ops.badge} data-tone={selected.noIndex ? "initial" : "published"}>
                        {selected.noIndex ? "noindex" : "index"}
                      </span>
                    </div>
                    <div>
                      <span className={ops.eyebrow}>Seçili sayfa</span>
                      <h2>{selected.title}</h2>
                      <p>{selected.slug}</p>
                    </div>
                    <div className={styles.selectedSummary}>
                      <div><span>SEO puanı</span><strong>{healthScore(selected, canonicalCounts)} / 100</strong><small>Panel içi metadata skoru</small></div>
                      <div><span>Kritik</span><strong>{criticalIssueCount(selected, canonicalCounts)}</strong><small>Eksik / hatalı alan</small></div>
                      <div><span>Kalite</span><strong>{qualityWarningCount(selected, canonicalCounts)}</strong><small>Uzunluk kontrolü</small></div>
                      <div><span>Güncellendi</span><strong>{formatDate(selected.updatedAt)}</strong><small>İçerik kaydı</small></div>
                    </div>
                  </div>

                  <div className={ops.detailBody}>
                    {selectedIssues.length > 0 ? (
                      <div className={ops.infoBox}>
                        <strong>Bu sayfada ne var?</strong>
                        <p>{selectedIssues.map(issueLabel).join(" · ")}</p>
                      </div>
                    ) : (
                      <div className={ops.infoBox}>
                        <strong>Bu sayfa hazır.</strong>
                        <p>Kritik metadata veya kalite uyarısı görünmüyor.</p>
                      </div>
                    )}

                    <div className={growth.issueChecklist}>
                      <div className={growth.issueLine} data-state={selected.noIndex || selected.seoTitle?.trim() ? "ok" : "missing"}>
                        <span>{selected.noIndex || selected.seoTitle?.trim() ? "✓" : "!"}</span>
                        <div><strong>SEO başlığı</strong><small>{selected.noIndex ? "Noindex politikası." : selected.seoTitle?.trim() || "Eksik"}</small></div>
                        <em>{selected.noIndex ? "Politika" : selected.seoTitle?.trim() ? `${selectedTitleLength} kr.` : "Eksik"}</em>
                      </div>
                      <div className={growth.issueLine} data-state={selected.noIndex || selected.seoDescription?.trim() ? "ok" : "missing"}>
                        <span>{selected.noIndex || selected.seoDescription?.trim() ? "✓" : "!"}</span>
                        <div><strong>Meta açıklaması</strong><small>{selected.noIndex ? "Noindex politikası." : selected.seoDescription?.trim() || "Eksik"}</small></div>
                        <em>{selected.noIndex ? "Politika" : selected.seoDescription?.trim() ? `${selectedDescriptionLength} kr.` : "Eksik"}</em>
                      </div>
                      <div className={growth.issueLine} data-state={selected.noIndex || selectedCanonical ? "ok" : "missing"}>
                        <span>{selected.noIndex || selectedCanonical ? "✓" : "!"}</span>
                        <div><strong>Canonical URL</strong><small>{selected.noIndex ? "Noindex politikası." : selectedCanonical || "Eksik"}</small></div>
                        <em>{selected.noIndex ? "Politika" : selectedCanonical ? "Var" : "Eksik"}</em>
                      </div>
                      {!selected.noIndex ? (
                        <div className={growth.issueLine} data-state={selectedCanonicalSafe && selectedCanonicalUnique ? "ok" : "missing"}>
                          <span>{selectedCanonicalSafe && selectedCanonicalUnique ? "✓" : "!"}</span>
                          <div>
                            <strong>Canonical güvenliği</strong>
                            <small>
                              {!selectedCanonicalSafe
                                ? "HTTPS + ilkoku.com host kontrolünü geçmiyor."
                                : !selectedCanonicalUnique
                                  ? "Aynı canonical başka indexlenebilir CMS kaydında da kullanılıyor."
                                  : "Host ve benzersizlik kontrolü geçti."}
                            </small>
                          </div>
                          <em>{selectedCanonicalSafe && selectedCanonicalUnique ? "OK" : "Düzelt"}</em>
                        </div>
                      ) : null}
                    </div>

                    <div className={styles.serpBox}>
                      <small>{selectedCanonical || `https://ilkoku.com${selected.slug}`}</small>
                      <strong>{selected.seoTitle?.trim() || selected.title}</strong>
                      <p>{selected.seoDescription?.trim() || "Meta açıklaması henüz tanımlanmadı."}</p>
                    </div>

                    <div className={ops.actionRow}>
                      <Link href={editHref(selected)}>SEO alanlarını düzenle →</Link>
                      <Link href={selected.slug} target="_blank">Canlı sayfayı aç ↗</Link>
                    </div>
                  </div>
                </>
              )}
            </main>
          </div>
        </section>

        <details className={styles.advanced}>
          <summary>Gelişmiş SEO ve teknik denetimler</summary>
          <div className={styles.advancedIntro}>
            Günlük kullanım için bu bölüm gerekli değildir. Teknik indeksleme, ana sayfa, structured data, metadata kalitesi ve rol kartı denetimlerini ayrıntılı incelemek istediğinizde açın.
          </div>
          <div className={styles.advancedBody}>
            <SeoRoleCardsAudit />
          </div>
        </details>
      </div>
    </section>
  );
}
