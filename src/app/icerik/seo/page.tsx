import Link from "next/link";
import { requireCmsManager } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";
import ops from "../PublishingOperationsWorkbench.module.css";
import growth from "../GrowthOperationsWorkbench.module.css";
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
  if (page.noIndex) return { label: "Politika", level: "clean" };
  const critical = criticalIssueCount(page, canonicalCounts);
  const warnings = qualityWarningCount(page, canonicalCounts);
  if (critical >= 2) return { label: "Yüksek", level: "high" };
  if (critical === 1) return { label: "Düzelt", level: "medium" };
  if (warnings > 0) return { label: "Kalite", level: "medium" };
  return { label: "Hazır", level: "clean" };
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value));
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
        <div className="content-page-heading"><div><span>Büyüme · TR</span><h1>SEO Operasyon Merkezi</h1><p>SEO envanteri doğrulanamadığında sistem yanlış bir “sorun yok” sonucu üretmez.</p></div></div>
        <div className="content-panel" role="alert"><strong>SEO denetim verileri okunamadı.</strong><p>Yayındaki sayfalar doğrulanamadığı için teşhis, kabul kapısı ve düzeltme kuyruğu fail-closed durduruldu.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/seo">Tekrar dene</Link></div></div>
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
    if (q && !`${page.title} ${page.slug} ${page.seoTitle || ""} ${page.seoDescription || ""} ${page.canonicalUrl || ""}`.toLocaleLowerCase("tr-TR").includes(q)) return false;
    if (issueFilter === "critical" && critical === 0) return false;
    if (issueFilter === "quality" && warnings === 0) return false;
    if (issueFilter === "complete" && (critical !== 0 || warnings !== 0)) return false;
    if (["title", "description", "canonical", "canonical-invalid", "canonical-duplicate", "title-quality", "description-quality", "noindex"].includes(issueFilter) && !issues.includes(issueFilter as IssueKey)) return false;
    return true;
  });
  const selected = filtered.find((page) => page.id === selectedId) ?? filtered[0] ?? null;

  const indexablePages = pages.filter((page) => !page.noIndex);
  const noIndexCount = pages.length - indexablePages.length;
  const missingTitle = indexablePages.filter((page) => !page.seoTitle?.trim()).length;
  const missingDescription = indexablePages.filter((page) => !page.seoDescription?.trim()).length;
  const missingCanonical = indexablePages.filter((page) => !page.canonicalUrl?.trim()).length;
  const invalidCanonical = indexablePages.filter((page) => page.canonicalUrl?.trim() && !canonicalIsSafe(page.canonicalUrl)).length;
  const duplicateCanonical = [...canonicalCounts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0);
  const canonicalBlockers = missingCanonical + invalidCanonical + duplicateCanonical;
  const criticalFieldCount = indexablePages.reduce((sum, page) => sum + criticalIssueCount(page, canonicalCounts), 0);
  const qualityWarnings = indexablePages.reduce((sum, page) => sum + qualityWarningCount(page, canonicalCounts), 0);
  const readyIndexable = indexablePages.filter((page) => criticalIssueCount(page, canonicalCounts) === 0 && qualityWarningCount(page, canonicalCounts) === 0).length;
  const highPriority = indexablePages.filter((page) => criticalIssueCount(page, canonicalCounts) >= 2).length;
  const acceptanceLevel = criticalFieldCount > 0 ? "high" : qualityWarnings > 0 ? "medium" : "clean";
  const acceptanceLabel = criticalFieldCount > 0 ? "Müdahale gerekli" : qualityWarnings > 0 ? "Teknik hazır · kalite kontrolü" : "SEO metadata kabulü hazır";

  const selectedIssues = selected ? seoIssues(selected, canonicalCounts) : [];
  const selectedCanonical = selected?.canonicalUrl?.trim() ?? "";
  const selectedCanonicalSafe = selected?.noIndex ? true : Boolean(selectedCanonical && canonicalIsSafe(selectedCanonical));
  const selectedCanonicalUnique = selected?.noIndex || !selectedCanonical ? true : (canonicalCounts.get(normalizedCanonical(selectedCanonical)) ?? 0) <= 1;
  const selectedTitleLength = selected?.seoTitle?.trim().length ?? 0;
  const selectedDescriptionLength = selected?.seoDescription?.trim().length ?? 0;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Büyüme · SEO</span><h1>SEO Operasyon Merkezi</h1><p>Teknik indeksleme, metadata kalitesi, structured data, Ana Sayfa sinyalleri ve sayfa bazlı düzeltme kuyruğunu tek profesyonel çalışma masasında yönetin. “Hazır” durumu yalnız gerçek denetimler geçtiğinde verilir.</p></div>
        <div className="content-profile"><strong>{readyIndexable}/{indexablePages.length} indexlenebilir sayfa hazır</strong><small>{highPriority} yüksek öncelikli · {qualityWarnings} kalite uyarısı</small></div>
      </div>

      <div className={ops.workbench}>
        <div className={ops.summaryBar}>
          <article className={ops.summaryCard}><span>Indexlenebilir CMS</span><strong>{indexablePages.length}</strong><small>{noIndexCount} bilinçli noindex ayrı izleniyor</small></article>
          <article className={ops.summaryCard}><span>SEO başlığı eksik</span><strong>{missingTitle}</strong><small>indexlenebilir sayfalarda</small></article>
          <article className={ops.summaryCard}><span>Açıklama eksik</span><strong>{missingDescription}</strong><small>SERP metni eksik</small></article>
          <article className={ops.summaryCard}><span>Canonical blokajı</span><strong>{canonicalBlockers}</strong><small>{missingCanonical} eksik · {invalidCanonical} hatalı · {duplicateCanonical} tekrar</small></article>
        </div>

        <section className={ops.detail} id="seo-kabul-kapisi" aria-labelledby="seo-acceptance-title">
          <div className={ops.detailHeader}>
            <div className={ops.detailTopline}><span className={growth.priority} data-level={acceptanceLevel}>{acceptanceLabel}</span><span className={ops.badge} data-tone={criticalFieldCount > 0 ? "initial" : "published"}>{criticalFieldCount > 0 ? `${criticalFieldCount} kritik` : "Kritik temiz"}</span></div>
            <div><span className={ops.eyebrow}>SEO kabul kapısı · TR</span><h2 id="seo-acceptance-title">Profesyonel operasyon özeti</h2><p>Bu üst panel indexlenebilir CMS metadata’sını gerçek veriden kabul eder. Teknik SEO, Ana Sayfa, structured data ve rol kartı katmanları aşağıdaki kendi fail-closed denetimleriyle ayrıca onaylanır.</p></div>
            <div className={ops.detailMetaGrid}>
              <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Hazır indexlenebilir</span><strong>{readyIndexable} / {indexablePages.length}</strong><small>kritik + kalite uyarısı olmayan</small></div>
              <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Kritik metadata</span><strong>{criticalFieldCount}</strong><small>eksik / hatalı / duplicate sinyal</small></div>
              <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Canonical kabulü</span><strong>{canonicalBlockers === 0 ? "OK" : `${canonicalBlockers} sorun`}</strong><small>eksik · host · benzersizlik</small></div>
              <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Kalite uyarısı</span><strong>{qualityWarnings}</strong><small>title / description uzunluk rehberi</small></div>
              <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Noindex politikası</span><strong>{noIndexCount}</strong><small>hata değil; ayrı indeks politikası</small></div>
            </div>
          </div>
          <div className={ops.detailBody}>
            <div className={growth.issueChecklist}>
              <div className={growth.issueLine} data-state={missingTitle + missingDescription === 0 ? "ok" : "missing"}><span>{missingTitle + missingDescription === 0 ? "✓" : "!"}</span><div><strong>Temel SERP metadata</strong><small>{missingTitle + missingDescription === 0 ? "Tüm indexlenebilir CMS sayfalarında title ve description mevcut." : `${missingTitle} title · ${missingDescription} description eksik.`}</small></div><em>{missingTitle + missingDescription === 0 ? "OK" : "Düzelt"}</em></div>
              <div className={growth.issueLine} data-state={canonicalBlockers === 0 ? "ok" : "missing"}><span>{canonicalBlockers === 0 ? "✓" : "!"}</span><div><strong>Canonical güvenliği</strong><small>{canonicalBlockers === 0 ? "Canonical alanları mevcut, ilkoku.com hostunda ve benzersiz." : `${missingCanonical} eksik · ${invalidCanonical} hatalı · ${duplicateCanonical} duplicate canonical.`}</small></div><em>{canonicalBlockers === 0 ? "OK" : "Blokaj"}</em></div>
              <div className={growth.issueLine} data-state={qualityWarnings === 0 ? "ok" : "warning"}><span>{qualityWarnings === 0 ? "✓" : "!"}</span><div><strong>SERP kalite rehberi</strong><small>{qualityWarnings === 0 ? "Indexlenebilir CMS metadata’sında uzunluk uyarısı görünmüyor." : `${qualityWarnings} title/description uzunluk uyarısı editoryal kontrolde.`}</small></div><em>{qualityWarnings === 0 ? "OK" : "Kontrol"}</em></div>
              <div className={growth.issueLine} data-state="ok"><span>✓</span><div><strong>Noindex ayrımı</strong><small>{noIndexCount} noindex kayıt kritik metadata eksiklerinden bilinçli olarak ayrılıyor; noindex tek başına hata sayılmıyor.</small></div><em>Politika</em></div>
            </div>
            <div className={ops.actionRow}><Link href="/icerik/seo#teknik-seo">Teknik SEO ↓</Link><Link href="/icerik/seo#ana-sayfa-seo">Ana Sayfa ↓</Link><Link href="/icerik/seo#metadata-kalitesi">SERP Kalitesi ↓</Link><Link href="/icerik/seo#structured-data">Structured Data ↓</Link><Link href="/icerik/seo#rol-kartlari-seo">Rol Kartları ↓</Link><Link href="/icerik/seo#metadata-kuyrugu">Düzeltme Kuyruğu ↓</Link></div>
          </div>
        </section>

        <SeoRoleCardsAudit />

        <div className={ops.layout} id="metadata-kuyrugu">
          <aside className={ops.rail}>
            <div className={ops.railHeader}><span className={ops.railLabel}>Sayfa metadata kuyruğu</span><strong>{filtered.length} sayfa gösteriliyor</strong></div>
            <form method="get" className={ops.searchForm}>
              <input type="search" name="q" defaultValue={param(params, "q")} placeholder="Sayfa, URL, canonical veya meta ara" />
              {issueFilter !== "all" ? <input type="hidden" name="sorun" value={issueFilter} /> : null}
              <button type="submit">Ara</button>
            </form>
            <div className={ops.filters}>
              <span className={ops.railLabel}>Operasyon filtresi</span>
              <div className={ops.filterRow}>
                {[
                  { key: "all", label: "Tümü" },
                  { key: "critical", label: "Kritik" },
                  { key: "quality", label: "Kalite" },
                  { key: "title", label: "Title eksik" },
                  { key: "description", label: "Açıklama eksik" },
                  { key: "canonical", label: "Canonical eksik" },
                  { key: "canonical-invalid", label: "Canonical hatalı" },
                  { key: "canonical-duplicate", label: "Canonical tekrar" },
                  { key: "noindex", label: "Noindex" },
                  { key: "complete", label: "Hazır" },
                ].map((filter) => <Link key={filter.key} data-active={issueFilter === filter.key} href={seoHref(params, { sorun: filter.key === "all" ? undefined : filter.key, sec: undefined })}>{filter.label}</Link>)}
              </div>
            </div>
            {filtered.length === 0 ? <div className={ops.empty}>Bu filtrelerde SEO kaydı yok.</div> : <div className={ops.itemList}>{filtered.map((page) => {
              const critical = criticalIssueCount(page, canonicalCounts);
              const warnings = qualityWarningCount(page, canonicalCounts);
              const p = priority(page, canonicalCounts);
              return <Link key={page.id} href={seoHref(params, { sec: page.id })} className={ops.itemLink} data-active={selected?.id === page.id}>
                <div className={ops.itemTop}><strong>{page.title}</strong><span className={growth.priority} data-level={p.level}>{p.label}</span></div>
                <p>{page.slug}</p>
                <div className={ops.itemMeta}><span>{page.noIndex ? "Bilinçli noindex" : critical === 0 ? warnings === 0 ? "SEO hazır" : `${warnings} kalite uyarısı` : `${critical} kritik sorun`}</span>{page.noIndex ? <span>noindex</span> : <span>index</span>}</div>
              </Link>;
            })}</div>}
          </aside>

          <main className={ops.detail}>
            {!selected ? <div className={ops.empty}><strong>İncelenecek sayfa yok.</strong><p>Filtreleri temizleyin veya yayınlanmış içerik durumunu kontrol edin.</p></div> : <>
              <div className={ops.detailHeader}>
                <div className={ops.detailTopline}><span className={growth.priority} data-level={priority(selected, canonicalCounts).level}>{priority(selected, canonicalCounts).label}</span><span className={ops.badge} data-tone={selected.noIndex ? "initial" : "published"}>{selected.noIndex ? "noindex" : "index"}</span></div>
                <div><span className={ops.eyebrow}>Sayfa SEO teşhisi</span><h2>{selected.title}</h2><p>{selected.slug}</p></div>
                <div className={ops.detailMetaGrid}>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>SEO sağlığı</span><strong>{healthScore(selected, canonicalCounts)} / 100</strong><small>kritik + kalite sinyalleri</small></div>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Kritik sorun</span><strong>{criticalIssueCount(selected, canonicalCounts)}</strong><small>metadata · canonical</small></div>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Kalite uyarısı</span><strong>{qualityWarningCount(selected, canonicalCounts)}</strong><small>title · description uzunluğu</small></div>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Son içerik güncelleme</span><strong>{formatDate(selected.updatedAt)}</strong><small>Europe/Istanbul</small></div>
                </div>
              </div>
              <div className={ops.detailBody}>
                <div className={growth.issueChecklist}>
                  <div className={growth.issueLine} data-state={selected.noIndex || selected.seoTitle?.trim() ? "ok" : "missing"}><span>{selected.noIndex || selected.seoTitle?.trim() ? "✓" : "!"}</span><div><strong>SEO başlığı</strong><small>{selected.noIndex ? "Noindex politikası nedeniyle kritik kabul kapısına dahil değil." : selected.seoTitle?.trim() || "Eksik — arama sonucu başlığı kontrollü değil"}</small></div><em>{selected.noIndex ? "Politika" : selected.seoTitle?.trim() ? "Hazır" : "Eksik"}</em></div>
                  <div className={growth.issueLine} data-state={selected.noIndex || !selected.seoTitle?.trim() || (selectedTitleLength >= 25 && selectedTitleLength <= 65) ? "ok" : "warning"}><span>{selected.noIndex || !selected.seoTitle?.trim() || (selectedTitleLength >= 25 && selectedTitleLength <= 65) ? "✓" : "!"}</span><div><strong>Title kalite rehberi</strong><small>{selected.noIndex || !selected.seoTitle?.trim() ? "Kritik alan tamamlandıktan sonra değerlendirilir." : `${selectedTitleLength} karakter · rehber aralık 25–65.`}</small></div><em>{selected.noIndex || !selected.seoTitle?.trim() || (selectedTitleLength >= 25 && selectedTitleLength <= 65) ? "OK" : "Kontrol"}</em></div>
                  <div className={growth.issueLine} data-state={selected.noIndex || selected.seoDescription?.trim() ? "ok" : "missing"}><span>{selected.noIndex || selected.seoDescription?.trim() ? "✓" : "!"}</span><div><strong>Meta açıklaması</strong><small>{selected.noIndex ? "Noindex politikası nedeniyle kritik kabul kapısına dahil değil." : selected.seoDescription?.trim() || "Eksik — SERP açıklaması kontrollü değil"}</small></div><em>{selected.noIndex ? "Politika" : selected.seoDescription?.trim() ? "Hazır" : "Eksik"}</em></div>
                  <div className={growth.issueLine} data-state={selected.noIndex || !selected.seoDescription?.trim() || (selectedDescriptionLength >= 70 && selectedDescriptionLength <= 170) ? "ok" : "warning"}><span>{selected.noIndex || !selected.seoDescription?.trim() || (selectedDescriptionLength >= 70 && selectedDescriptionLength <= 170) ? "✓" : "!"}</span><div><strong>Description kalite rehberi</strong><small>{selected.noIndex || !selected.seoDescription?.trim() ? "Kritik alan tamamlandıktan sonra değerlendirilir." : `${selectedDescriptionLength} karakter · rehber aralık 70–170.`}</small></div><em>{selected.noIndex || !selected.seoDescription?.trim() || (selectedDescriptionLength >= 70 && selectedDescriptionLength <= 170) ? "OK" : "Kontrol"}</em></div>
                  <div className={growth.issueLine} data-state={selected.noIndex || selectedCanonical ? "ok" : "missing"}><span>{selected.noIndex || selectedCanonical ? "✓" : "!"}</span><div><strong>Canonical URL</strong><small>{selected.noIndex ? "Noindex politikası nedeniyle kritik kabul kapısına dahil değil." : selectedCanonical || "Eksik — tercih edilen URL sinyali tanımlı değil"}</small></div><em>{selected.noIndex ? "Politika" : selectedCanonical ? "Hazır" : "Eksik"}</em></div>
                  <div className={growth.issueLine} data-state={selectedCanonicalSafe ? "ok" : "missing"}><span>{selectedCanonicalSafe ? "✓" : "!"}</span><div><strong>Canonical host güvenliği</strong><small>{selected.noIndex ? "Noindex politikası." : selectedCanonicalSafe ? "HTTPS ve ilkoku.com host sözleşmesi geçerli." : "Canonical HTTPS + ilkoku.com host sözleşmesini geçmiyor."}</small></div><em>{selectedCanonicalSafe ? "OK" : "Blokaj"}</em></div>
                  <div className={growth.issueLine} data-state={selectedCanonicalUnique ? "ok" : "missing"}><span>{selectedCanonicalUnique ? "✓" : "!"}</span><div><strong>Canonical benzersizliği</strong><small>{selected.noIndex ? "Noindex politikası." : selectedCanonicalUnique ? "Aynı canonical başka indexlenebilir CMS kaydında kullanılmıyor." : "Aynı canonical birden fazla indexlenebilir CMS kaydında kullanılıyor."}</small></div><em>{selectedCanonicalUnique ? "OK" : "Blokaj"}</em></div>
                  <div className={growth.issueLine} data-state="ok"><span>✓</span><div><strong>İndeks politikası</strong><small>{selected.noIndex ? "Bu sayfa bilinçli noindex olarak ayrı izleniyor." : "Sayfa indexlenebilir durumda."}</small></div><em>{selected.noIndex ? "Noindex" : "Index"}</em></div>
                </div>
                {selectedIssues.length > 0 ? <div className={ops.infoBox}><strong>Aktif teşhis</strong><p>{selectedIssues.join(" · ")}</p></div> : <div className={ops.infoBox}><strong>Aktif teşhis</strong><p>Bu sayfada kritik metadata veya kalite uyarısı görünmüyor.</p></div>}
                <div className={ops.actionRow}><Link href={editHref(selected)}>SEO Alanlarını Düzenle →</Link><Link href={selected.slug} target="_blank">Public Sayfayı Aç ↗</Link></div>
              </div>
            </>}
          </main>

          <aside className={ops.sidePane}>
            <div className={ops.sideHeader}><span className={ops.railLabel}>SERP önizleme + araçlar</span><strong>Seçili sayfa</strong></div>
            <div className={ops.sideBody}>
              {selected ? <><div className={growth.healthScore}><div><strong>{healthScore(selected, canonicalCounts)}</strong><small>SEO puanı</small></div></div><div className={growth.serpPreview}><small>{selectedCanonical || `https://ilkoku.com${selected.slug}`}</small><strong>{selected.seoTitle?.trim() || selected.title}</strong><p>{selected.seoDescription?.trim() || "Meta açıklaması henüz tanımlanmadı. İlgili içerik editöründen ekleyin."}</p></div><div className={ops.infoBox}><strong>Tek kaynak prensibi</strong><p>SEO verisini burada ikinci bir kopya halinde düzenlemiyoruz. Sayfa metadata’sı ilgili Sayfa / Yasal / Rehber editöründe; Ana Sayfa bileşenleri ise kendi canonical çalışma masasında yönetilir.</p></div></> : <div className={ops.empty}>Bir sayfa seçin.</div>}
              <div className={ops.actionRow}><Link href="/sitemap.xml" target="_blank">Sitemap ↗</Link><Link href="/robots.txt" target="_blank">Robots ↗</Link><Link href="/icerik/rol-kartlari?dil=tr">Rol Kartları</Link><Link href="/icerik/yonlendirmeler">Yönlendirmeler</Link><Link href="/icerik/saglik">Sistem Sağlığı</Link></div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
