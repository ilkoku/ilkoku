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

function priority(page: SeoPage, canonicalCounts: CanonicalCounts) {
  if (page.noIndex) return { label: "Noindex", level: "clean" };
  const critical = criticalIssueCount(page, canonicalCounts);
  const warnings = qualityWarningCount(page, canonicalCounts);
  if (critical > 0) return { label: "Düzelt", level: "high" };
  if (warnings > 0) return { label: "Öneri", level: "medium" };
  return { label: "Hazır", level: "clean" };
}

function issueLabel(issue: IssueKey) {
  const labels: Record<IssueKey, string> = {
    title: "SEO başlığı eksik",
    description: "Meta açıklaması eksik",
    canonical: "Canonical eksik",
    "canonical-invalid": "Canonical hatalı",
    "canonical-duplicate": "Canonical tekrarı",
    "title-quality": "SEO başlığı uzunluğu iyileştirilebilir",
    "description-quality": "Meta açıklaması uzunluğu iyileştirilebilir",
    noindex: "Bilinçli noindex",
  };
  return labels[issue];
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
  const technicalMode = param(params, "mod") === "teknik";

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

    if ((issueFilter === "attention" || issueFilter === "critical") && critical === 0) return false;
    if (issueFilter === "quality" && warnings === 0) return false;
    if (issueFilter === "complete" && (critical !== 0 || page.noIndex)) return false;
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
    (page) => criticalIssueCount(page, canonicalCounts) === 0,
  ).length;
  const criticalPages = indexablePages.filter(
    (page) => criticalIssueCount(page, canonicalCounts) > 0,
  ).length;

  const dashboardState = criticalFieldCount > 0 ? "danger" : "ok";
  const dashboardTitle = criticalFieldCount > 0
    ? "Önce kritik SEO sorunlarını düzelt"
    : "Temel SEO hazır";
  const dashboardText = criticalFieldCount > 0
    ? `${criticalPages} sayfada indekslemeyi etkileyebilecek sorun var. Önce düzeltilecek sayfalardan başlayın.`
    : qualityWarnings > 0
      ? `${readyIndexable}/${indexablePages.length} sayfa indeksleme için hazır. ${qualityWarnings} kalite önerisi var; bunlar yayın veya indeksleme engeli değil.`
      : `${readyIndexable}/${indexablePages.length} indexlenebilir sayfanın temel SEO alanları temiz.`;

  const selectedIssues = selected ? seoIssues(selected, canonicalCounts) : [];
  const selectedCritical = selected ? criticalIssueCount(selected, canonicalCounts) : 0;
  const selectedWarnings = selected ? qualityWarningCount(selected, canonicalCounts) : 0;
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
          <p>İndekslemeyi engelleyen sorunları görün, sayfayı seçin ve düzeltin. Kalite önerileri ayrı tutulur.</p>
        </div>
      </div>

      <div className={ops.workbench}>
        {technicalMode ? (
          <>
            <section className={styles.statusCard} aria-labelledby="technical-seo-title">
              <div className={styles.statusTop}>
                <div className={styles.statusCopy}>
                  <span>Teknik görünüm</span>
                  <h2 id="technical-seo-title">Teknik SEO denetimleri</h2>
                  <p>Bu bölüm günlük içerik düzenleme akışından ayrıdır. Sitemap, robots, canlı sinyaller, structured data ve rol kartı kontrolleri burada izlenir.</p>
                </div>
              </div>
              <div className={styles.quickActions}>
                <Link href="/icerik/seo">← Günlük SEO görünümüne dön</Link>
                <Link href="/sitemap.xml" target="_blank">Sitemap ↗</Link>
                <Link href="/robots.txt" target="_blank">Robots ↗</Link>
                <Link href="/icerik/saglik">Sistem Sağlığı</Link>
              </div>
            </section>
            <div className={styles.advancedBody} style={{ padding: 0 }}>
              <SeoRoleCardsAudit />
            </div>
          </>
        ) : (
          <>
            <section className={styles.statusCard} aria-labelledby="seo-now-title">
              <div className={styles.statusTop}>
                <div className={styles.statusCopy}>
                  <span>Şu anda ne yapmalıyım?</span>
                  <h2 id="seo-now-title">{dashboardTitle}</h2>
                  <p>{dashboardText}</p>
                </div>
                <span className={styles.statusBadge} data-state={dashboardState}>
                  {criticalFieldCount > 0 ? `${criticalFieldCount} kritik` : `${readyIndexable}/${indexablePages.length} hazır`}
                </span>
              </div>
              <div className={styles.quickActions}>
                {criticalPages > 0 ? <Link href="/icerik/seo?sorun=critical#sayfa-seo">Düzeltilecek sayfalar</Link> : null}
                {qualityWarnings > 0 ? <Link href="/icerik/seo?sorun=quality#sayfa-seo">Kalite önerilerini gör</Link> : null}
                <Link href="/icerik/seo#sayfa-seo">Tüm sayfalar</Link>
                <Link href="/icerik/seo?mod=teknik">Teknik kontroller →</Link>
              </div>
            </section>

            <div className={ops.summaryBar}>
              <article className={ops.summaryCard}>
                <span>Temel SEO</span>
                <strong>{readyIndexable} / {indexablePages.length} hazır</strong>
                <small>İndeksleme için kritik blokajı olmayan CMS sayfaları</small>
              </article>
              <article className={ops.summaryCard}>
                <span>Kritik sorun</span>
                <strong>{criticalFieldCount}</strong>
                <small>{missingTitle} başlık · {missingDescription} açıklama · {canonicalBlockers} canonical</small>
              </article>
              <article className={ops.summaryCard}>
                <span>Kalite önerisi</span>
                <strong>{qualityWarnings}</strong>
                <small>Yayın engeli değil · {noIndexCount} bilinçli noindex</small>
              </article>
            </div>

            <section id="sayfa-seo" aria-labelledby="page-seo-title">
              <div className="content-page-heading">
                <div>
                  <span>Sayfa bazlı SEO</span>
                  <h2 id="page-seo-title">Sayfayı seç, kontrol et, düzelt</h2>
                  <p>Kritik sorunlar ve kalite önerileri birbirinden ayrıdır. Bir sayfa seçtiğinizde yalnız gerekli alanlar gösterilir.</p>
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
                        { key: "critical", label: "Düzeltilecek" },
                        { key: "quality", label: "Kalite önerisi" },
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
                                      ? `Temel SEO hazır · ${warnings} öneri`
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
                          <div>
                            <span>Temel durum</span>
                            <strong>{selected.noIndex ? "Noindex" : selectedCritical > 0 ? "Düzelt" : "Hazır"}</strong>
                            <small>{selectedCritical > 0 ? "İndekslemeyi etkileyebilir" : "Kritik blokaj yok"}</small>
                          </div>
                          <div><span>Kritik</span><strong>{selectedCritical}</strong><small>Eksik / hatalı alan</small></div>
                          <div><span>Kalite</span><strong>{selectedWarnings}</strong><small>Yayın engeli değil</small></div>
                        </div>
                      </div>

                      <div className={ops.detailBody}>
                        {selectedCritical > 0 ? (
                          <div className={ops.infoBox}>
                            <strong>Düzeltilmesi gerekenler</strong>
                            <p>{selectedIssues.filter((issue) => criticalIssueKeys.has(issue)).map(issueLabel).join(" · ")}</p>
                          </div>
                        ) : selectedWarnings > 0 ? (
                          <div className={ops.infoBox}>
                            <strong>Temel SEO hazır.</strong>
                            <p>{selectedIssues.filter((issue) => qualityIssueKeys.has(issue)).map(issueLabel).join(" · ")}. Bunlar indeksleme engeli değildir.</p>
                          </div>
                        ) : selected.noIndex ? (
                          <div className={ops.infoBox}>
                            <strong>Bu sayfa bilinçli noindex.</strong>
                            <p>Arama motoru indeksine alınmaması politika gereği tercih edilmiş.</p>
                          </div>
                        ) : (
                          <div className={ops.infoBox}>
                            <strong>Bu sayfa hazır.</strong>
                            <p>Kritik metadata veya kalite önerisi görünmüyor.</p>
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

            <section className={styles.statusCard}>
              <div className={styles.statusTop}>
                <div className={styles.statusCopy}>
                  <span>Gelişmiş</span>
                  <h2>Teknik kontroller ayrı görünümde</h2>
                  <p>Günlük SEO ekranını kalabalıklaştırmamak için sitemap, robots, structured data ve rol kartı denetimleri ayrı teknik görünümde tutulur.</p>
                </div>
              </div>
              <div className={styles.quickActions}>
                <Link href="/icerik/seo?mod=teknik">Teknik kontrolleri aç →</Link>
              </div>
            </section>
          </>
        )}
      </div>
    </section>
  );
}
