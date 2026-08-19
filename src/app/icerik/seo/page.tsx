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
type IssueKey = "title" | "description" | "canonical" | "noindex";

function param(params: SearchParams, key: string) {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

function editHref(page: SeoPage) {
  if (page.contentKey.startsWith("legal:")) {
    const parts = page.contentKey.split(":");
    const locale = parts[1] === "en" ? "en" : "tr";
    const slug = locale === "en" ? parts[2] || "" : parts[1] || "";
    return `/icerik/yasal/${slug}?dil=${locale}`;
  }
  if (page.contentKey.startsWith("guide:")) {
    const locale = page.contentKey.startsWith("guide:en:") ? "en" : "tr";
    return `/icerik/rehber/${page.id}?dil=${locale}`;
  }
  if (page.contentKey.startsWith("page:")) return `/icerik/sayfalar/${page.id}`;
  return "/icerik/sayfalar";
}

function seoIssues(page: SeoPage): IssueKey[] {
  const result: IssueKey[] = [];
  if (!page.seoTitle?.trim()) result.push("title");
  if (!page.seoDescription?.trim()) result.push("description");
  if (!page.canonicalUrl?.trim()) result.push("canonical");
  if (page.noIndex) result.push("noindex");
  return result;
}

function criticalIssueCount(page: SeoPage) {
  return seoIssues(page).filter((issue) => issue !== "noindex").length;
}

function healthScore(page: SeoPage) {
  const critical = criticalIssueCount(page);
  return Math.max(0, 100 - critical * 33);
}

function priority(page: SeoPage) {
  const count = criticalIssueCount(page);
  if (count >= 2) return { label: "Yüksek", level: "high" };
  if (count === 1) return { label: "Düzelt", level: "medium" };
  return { label: "Temiz", level: "clean" };
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
        <div className="content-page-heading"><div><span>Büyüme · TR</span><h1>SEO Merkezi</h1><p>SEO envanteri doğrulanamadığında sistem yanlış bir “sorun yok” sonucu üretmez.</p></div></div>
        <div className="content-panel" role="alert"><strong>SEO denetim verileri okunamadı.</strong><p>Yayındaki sayfalar doğrulanamadığı için teşhis ve düzeltme kuyruğu fail-closed durduruldu.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/seo">Tekrar dene</Link></div></div>
      </section>
    );
  }

  const q = param(params, "q").trim().toLocaleLowerCase("tr-TR");
  const issueFilter = param(params, "sorun") || "all";
  const selectedId = param(params, "sec");
  const filtered = pages.filter((page) => {
    const issues = seoIssues(page);
    if (q && !`${page.title} ${page.slug} ${page.seoTitle || ""} ${page.seoDescription || ""}`.toLocaleLowerCase("tr-TR").includes(q)) return false;
    if (issueFilter === "complete" && criticalIssueCount(page) !== 0) return false;
    if (["title", "description", "canonical", "noindex"].includes(issueFilter) && !issues.includes(issueFilter as IssueKey)) return false;
    return true;
  });
  const selected = filtered.find((page) => page.id === selectedId) ?? filtered[0] ?? null;

  const missingTitle = pages.filter((page) => !page.seoTitle?.trim()).length;
  const missingDescription = pages.filter((page) => !page.seoDescription?.trim()).length;
  const missingCanonical = pages.filter((page) => !page.canonicalUrl?.trim()).length;
  const cleanCount = pages.filter((page) => criticalIssueCount(page) === 0).length;
  const highPriority = pages.filter((page) => criticalIssueCount(page) >= 2).length;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Büyüme · SEO</span><h1>SEO Merkezi</h1><p>Yayındaki sayfa metadata sorunlarını ve Ana Sayfa on-page SEO sinyallerini tek çalışma masasında yönetin; teşhisten canonical içerik editörüne doğrudan gidin.</p></div>
        <div className="content-profile"><strong>{cleanCount}/{pages.length} sayfa temiz</strong><small>{highPriority} yüksek öncelikli metadata sayfası</small></div>
      </div>

      <div className={ops.workbench}>
        <div className={ops.summaryBar}>
          <article className={ops.summaryCard}><span>Yayındaki sayfa</span><strong>{pages.length}</strong><small>TR metadata kapsamı</small></article>
          <article className={ops.summaryCard}><span>SEO başlığı eksik</span><strong>{missingTitle}</strong><small>düzenleme gerekiyor</small></article>
          <article className={ops.summaryCard}><span>Açıklama eksik</span><strong>{missingDescription}</strong><small>SERP metni eksik</small></article>
          <article className={ops.summaryCard}><span>Canonical eksik</span><strong>{missingCanonical}</strong><small>URL sinyali eksik</small></article>
        </div>

        <SeoRoleCardsAudit />

        <div className={ops.layout}>
          <aside className={ops.rail}>
            <div className={ops.railHeader}><span className={ops.railLabel}>Sayfa metadata kuyruğu</span><strong>{filtered.length} sayfa gösteriliyor</strong></div>
            <form method="get" className={ops.searchForm}>
              <input type="search" name="q" defaultValue={param(params, "q")} placeholder="Sayfa, URL veya meta ara" />
              {issueFilter !== "all" ? <input type="hidden" name="sorun" value={issueFilter} /> : null}
              <button type="submit">Ara</button>
            </form>
            <div className={ops.filters}>
              <span className={ops.railLabel}>Metadata sorunu</span>
              <div className={ops.filterRow}>
                {[{ key: "all", label: "Tümü" }, { key: "title", label: "Başlık" }, { key: "description", label: "Açıklama" }, { key: "canonical", label: "Canonical" }, { key: "noindex", label: "Noindex" }, { key: "complete", label: "Temiz" }].map((filter) => <Link key={filter.key} data-active={issueFilter === filter.key} href={seoHref(params, { sorun: filter.key === "all" ? undefined : filter.key, sec: undefined })}>{filter.label}</Link>)}
              </div>
            </div>
            {filtered.length === 0 ? <div className={ops.empty}>Bu filtrelerde SEO kaydı yok.</div> : <div className={ops.itemList}>{filtered.map((page) => {
              const issues = criticalIssueCount(page);
              const p = priority(page);
              return <Link key={page.id} href={seoHref(params, { sec: page.id })} className={ops.itemLink} data-active={selected?.id === page.id}>
                <div className={ops.itemTop}><strong>{page.title}</strong><span className={growth.priority} data-level={p.level}>{p.label}</span></div>
                <p>{page.slug}</p>
                <div className={ops.itemMeta}><span>{issues === 0 ? "Kritik eksik yok" : `${issues} kritik eksik`}</span>{page.noIndex ? <span>noindex</span> : <span>index</span>}</div>
              </Link>;
            })}</div>}
          </aside>

          <main className={ops.detail}>
            {!selected ? <div className={ops.empty}><strong>İncelenecek sayfa yok.</strong><p>Filtreleri temizleyin veya yayınlanmış içerik durumunu kontrol edin.</p></div> : <>
              <div className={ops.detailHeader}>
                <div className={ops.detailTopline}><span className={growth.priority} data-level={priority(selected).level}>{priority(selected).label}</span><span className={ops.badge} data-tone={selected.noIndex ? "initial" : "published"}>{selected.noIndex ? "noindex" : "index"}</span></div>
                <div><span className={ops.eyebrow}>Sayfa SEO teşhisi</span><h2>{selected.title}</h2><p>{selected.slug}</p></div>
                <div className={ops.detailMetaGrid}>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>SEO sağlığı</span><strong>{healthScore(selected)} / 100</strong><small>3 kritik metadata alanı üzerinden</small></div>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Kritik eksik</span><strong>{criticalIssueCount(selected)}</strong><small>title · description · canonical</small></div>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Son içerik güncelleme</span><strong>{formatDate(selected.updatedAt)}</strong><small>Europe/Istanbul</small></div>
                </div>
              </div>
              <div className={ops.detailBody}>
                <div className={growth.issueChecklist}>
                  <div className={growth.issueLine} data-state={selected.seoTitle?.trim() ? "ok" : "missing"}><span>{selected.seoTitle?.trim() ? "✓" : "!"}</span><div><strong>SEO başlığı</strong><small>{selected.seoTitle?.trim() || "Eksik — arama sonucu başlığı kontrollü değil"}</small></div><em>{selected.seoTitle?.trim() ? "Hazır" : "Eksik"}</em></div>
                  <div className={growth.issueLine} data-state={selected.seoDescription?.trim() ? "ok" : "missing"}><span>{selected.seoDescription?.trim() ? "✓" : "!"}</span><div><strong>Meta açıklaması</strong><small>{selected.seoDescription?.trim() || "Eksik — SERP açıklaması kontrollü değil"}</small></div><em>{selected.seoDescription?.trim() ? "Hazır" : "Eksik"}</em></div>
                  <div className={growth.issueLine} data-state={selected.canonicalUrl?.trim() ? "ok" : "missing"}><span>{selected.canonicalUrl?.trim() ? "✓" : "!"}</span><div><strong>Canonical URL</strong><small>{selected.canonicalUrl?.trim() || "Eksik — tercih edilen URL sinyali tanımlı değil"}</small></div><em>{selected.canonicalUrl?.trim() ? "Hazır" : "Eksik"}</em></div>
                  <div className={growth.issueLine} data-state={selected.noIndex ? "warning" : "ok"}><span>{selected.noIndex ? "!" : "✓"}</span><div><strong>İndeks politikası</strong><small>{selected.noIndex ? "Bu sayfa noindex olarak işaretli" : "Sayfa indexlenebilir durumda"}</small></div><em>{selected.noIndex ? "Kontrol et" : "Index"}</em></div>
                </div>
                <div className={ops.actionRow}><Link href={editHref(selected)}>SEO Alanlarını Düzenle →</Link><Link href={selected.slug} target="_blank">Public Sayfayı Aç ↗</Link></div>
              </div>
            </>}
          </main>

          <aside className={ops.sidePane}>
            <div className={ops.sideHeader}><span className={ops.railLabel}>Arama sonucu önizleme</span><strong>Seçili sayfa</strong></div>
            <div className={ops.sideBody}>
              {selected ? <><div className={growth.healthScore}><div><strong>{healthScore(selected)}</strong><small>SEO puanı</small></div></div><div className={growth.serpPreview}><small>{selected.canonicalUrl?.trim() || `https://ilkoku.com${selected.slug}`}</small><strong>{selected.seoTitle?.trim() || selected.title}</strong><p>{selected.seoDescription?.trim() || "Meta açıklaması henüz tanımlanmadı. İlgili içerik editöründen ekleyin."}</p></div><div className={ops.infoBox}><strong>Düzeltme prensibi</strong><p>SEO verisini burada ikinci bir kopya halinde düzenlemiyoruz. Sayfa metadata'sı ilgili Sayfa / Yasal / Rehber editöründe; Ana Sayfa bileşenleri ise kendi canonical çalışma masasında yönetilir.</p></div></> : <div className={ops.empty}>Bir sayfa seçin.</div>}
              <div className={ops.actionRow}><Link href="/icerik/rol-kartlari?dil=tr">Rol Kartları</Link><Link href="/icerik/yonlendirmeler">Yönlendirmeler</Link><Link href="/icerik/diller">Dil Yönetimi</Link><Link href="/icerik/saglik">Sistem Sağlığı</Link></div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
