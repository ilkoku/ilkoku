import Link from "next/link";
import { updateCmsLocaleAction } from "@/features/cms/locale-actions";
import { requireCmsAdmin } from "@/lib/cms-access";
import { getCmsLocaleStates, type CmsLocaleState } from "@/lib/cms-locale-state";
import { cmsLocaleNamespace, normalizeCmsLocale, type CmsLocaleCode } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";
import ops from "../PublishingOperationsWorkbench.module.css";
import growth from "../GrowthOperationsWorkbench.module.css";

type CountRow = { total: bigint | number; status: "draft" | "published" | "archived" };
type StatusCounts = { draft: number; published: number; archived: number };
type Coverage = {
  homepage: StatusCounts;
  roleCards: StatusCounts;
  faq: StatusCounts;
  legal: StatusCounts;
  guides: StatusCounts;
  pages: StatusCounts;
};
type LocaleManagementData = { locales: CmsLocaleState[]; coverage: Record<CmsLocaleCode, Coverage> };
type CoverageKey = keyof Coverage;

type CoverageMeta = { label: string; href: (locale: CmsLocaleCode) => string; core: boolean };

const coverageMeta: Record<CoverageKey, CoverageMeta> = {
  homepage: { label: "Ana Sayfa", href: (locale) => `/icerik/ana-sayfa?dil=${locale}`, core: true },
  roleCards: { label: "Rol Kartları", href: (locale) => `/icerik/rol-kartlari?dil=${locale}`, core: true },
  faq: { label: "SSS & Yardım", href: (locale) => `/icerik/sss?dil=${locale}`, core: true },
  legal: { label: "Yasal Sayfalar", href: (locale) => `/icerik/yasal?dil=${locale}`, core: true },
  guides: { label: "Rehber", href: (locale) => `/icerik/rehber?dil=${locale}`, core: false },
  pages: { label: "Kurumsal Sayfalar", href: () => "/icerik/sayfalar", core: false },
};

function emptyCounts(): StatusCounts { return { draft: 0, published: 0, archived: 0 }; }
function normalizeCounts(rows: CountRow[]): StatusCounts {
  const counts = emptyCounts();
  for (const row of rows) counts[row.status] = Number(row.total);
  return counts;
}
async function siteContentCounts(namespace: string) {
  const rows = await prisma.$queryRaw<CountRow[]>`
    SELECT status, COUNT(*) AS total
    FROM SiteContent
    WHERE namespace = ${namespace}
    GROUP BY status
  `;
  return normalizeCounts(rows);
}
async function prefixedPageCounts(prefix: "legal" | "guide", locale: CmsLocaleCode) {
  const rows = locale === "en"
    ? await prisma.$queryRaw<CountRow[]>`
        SELECT status, COUNT(*) AS total
        FROM ContentPage
        WHERE contentKey LIKE ${`${prefix}:en:%`}
        GROUP BY status
      `
    : await prisma.$queryRaw<CountRow[]>`
        SELECT status, COUNT(*) AS total
        FROM ContentPage
        WHERE contentKey LIKE ${`${prefix}:%`}
          AND contentKey NOT LIKE ${`${prefix}:en:%`}
        GROUP BY status
      `;
  return normalizeCounts(rows);
}
async function corporatePageCounts(locale: CmsLocaleCode) {
  const rows = await prisma.$queryRaw<CountRow[]>`
    SELECT status, COUNT(*) AS total
    FROM ContentPage
    WHERE contentKey LIKE ${`page:${locale}:%`}
    GROUP BY status
  `;
  return normalizeCounts(rows);
}
async function localeCoverage(locale: CmsLocaleCode): Promise<Coverage> {
  const [homepage, roleCards, faq, legal, guides, pages] = await Promise.all([
    siteContentCounts(cmsLocaleNamespace("homepage", locale)),
    siteContentCounts(cmsLocaleNamespace("role_cards", locale)),
    siteContentCounts(cmsLocaleNamespace("faq", locale)),
    prefixedPageCounts("legal", locale),
    prefixedPageCounts("guide", locale),
    corporatePageCounts(locale),
  ]);
  return { homepage, roleCards, faq, legal, guides, pages };
}
async function loadLocaleManagementData(): Promise<LocaleManagementData | null> {
  try {
    const [locales, tr, en] = await Promise.all([getCmsLocaleStates(), localeCoverage("tr"), localeCoverage("en")]);
    return { locales, coverage: { tr, en } };
  } catch {
    return null;
  }
}
function coveragePercent(current: StatusCounts, baseline: StatusCounts, isDefault: boolean) {
  if (isDefault) return 100;
  if (baseline.published <= 0) return current.published > 0 ? 100 : 0;
  return Math.min(100, Math.round((current.published / baseline.published) * 100));
}
function coreReadiness(coverage: Coverage) {
  return (Object.keys(coverageMeta) as CoverageKey[]).filter((key) => coverageMeta[key].core && coverage[key].published > 0).length;
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireCmsAdmin("/icerik/diller");
  const params = await searchParams;
  const requested = typeof params.dil === "string" ? params.dil : "tr";
  const selectedCode = normalizeCmsLocale(requested);
  const data = await loadLocaleManagementData();

  if (!data) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>Büyüme</span><h1>Dil Yönetimi</h1><p>Dil durumu doğrulanamadığında public dil kararları değiştirilmez.</p></div></div>
        <div className="content-panel" role="alert"><strong>Dil yönetimi verileri okunamadı.</strong><p>Locale durumu veya içerik kapsamı sorgularından en az biri tamamlanamadı. Yanlış bir hazırlık sonucu üretmemek için dil açma-kapama aksiyonları durduruldu.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/diller">Tekrar dene</Link></div></div>
      </section>
    );
  }

  const selectedLocale = data.locales.find((locale) => locale.code === selectedCode) ?? data.locales[0];
  const selectedCoverage = data.coverage[selectedCode];
  const trCoverage = data.coverage.tr;
  const enCoverage = data.coverage.en;
  const enLocale = data.locales.find((locale) => locale.code === "en");
  const readiness = coreReadiness(enCoverage);
  const coreTotal = (Object.keys(coverageMeta) as CoverageKey[]).filter((key) => coverageMeta[key].core).length;
  const totalPublished = (Object.keys(selectedCoverage) as CoverageKey[]).reduce((sum, key) => sum + selectedCoverage[key].published, 0);
  const totalDraft = (Object.keys(selectedCoverage) as CoverageKey[]).reduce((sum, key) => sum + selectedCoverage[key].draft, 0);

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Büyüme</span><h1>Dil Yönetimi</h1><p>Public dil kararını içerik hazırlığından ayırmadan yönetin; TR ve EN kapsamını alan alan karşılaştırın ve eksik çalışma masasına doğrudan gidin.</p></div>
        <div className="content-profile"><strong>EN hazırlık {readiness}/{coreTotal}</strong><small>{enLocale?.enabled ? "Public /en açık" : "Public /en kapalı"}</small></div>
      </div>

      <div className={ops.workbench}>
        <div className={ops.summaryBar}>
          <article className={ops.summaryCard}><span>Seçili dil</span><strong>{selectedCode.toUpperCase()}</strong><small>{selectedLocale?.label || selectedCode}</small></article>
          <article className={ops.summaryCard}><span>Yayındaki kayıt</span><strong>{totalPublished}</strong><small>6 içerik alanı toplamı</small></article>
          <article className={ops.summaryCard}><span>Hazır taslak</span><strong>{totalDraft}</strong><small>yayın bekleyen içerik</small></article>
          <article className={ops.summaryCard}><span>EN çekirdek hazırlık</span><strong>{readiness}/{coreTotal}</strong><small>Ana Sayfa · Roller · SSS · Yasal</small></article>
        </div>

        <div className={ops.layout}>
          <aside className={ops.rail}>
            <div className={ops.railHeader}><span className={ops.railLabel}>Public diller</span><strong>{data.locales.length} dil tanımlı</strong></div>
            <div className={ops.itemList}>{data.locales.map((locale) => {
              const coverage = data.coverage[locale.code];
              const published = (Object.keys(coverage) as CoverageKey[]).reduce((sum, key) => sum + coverage[key].published, 0);
              return <Link key={locale.code} href={`/icerik/diller?dil=${locale.code}`} className={ops.itemLink} data-active={selectedCode === locale.code}>
                <div className={ops.itemTop}><strong>{locale.label}</strong><span className={ops.badge} data-tone={locale.enabled ? "published" : "initial"}>{locale.isDefault ? "Varsayılan" : locale.enabled ? "Public açık" : "Hazırlık"}</span></div>
                <p>{locale.code.toUpperCase()} · {published} yayınlanmış CMS kaydı</p>
                <div className={ops.itemMeta}><span>{locale.isDefault ? "Kapatılamaz" : locale.enabled ? "Canlı" : "Taslak hazırlanabilir"}</span></div>
              </Link>;
            })}</div>
          </aside>

          <main className={ops.detail}>
            <div className={ops.detailHeader}>
              <div className={growth.localeHero}><span className={growth.localeCode}>{selectedCode.toUpperCase()}</span><div><span className={ops.eyebrow}>Seçili dil</span><h2>{selectedLocale?.label}</h2><small>{selectedLocale?.isDefault ? "Varsayılan public dil" : selectedLocale?.enabled ? "Public erişime açık" : "İçerik hazırlık modunda"}</small></div></div>
              <div className={ops.detailMetaGrid}>
                <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Public durum</span><strong>{selectedLocale?.enabled ? "Açık" : "Kapalı"}</strong><small>{selectedLocale?.isDefault ? "sabit" : "admin kontrollü"}</small></div>
                <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Yayınlanmış</span><strong>{totalPublished}</strong><small>tüm içerik alanları</small></div>
                <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Taslak</span><strong>{totalDraft}</strong><small>çalışma alanlarında</small></div>
              </div>
            </div>
            <div className={ops.detailBody}>
              <div className={growth.coverageGrid}>{(Object.keys(coverageMeta) as CoverageKey[]).map((key) => {
                const meta = coverageMeta[key];
                const current = selectedCoverage[key];
                const baseline = trCoverage[key];
                const percent = coveragePercent(current, baseline, selectedCode === "tr");
                return <div className={growth.coverageRow} key={key}><div className={growth.coverageTop}><strong>{meta.label}</strong><Link href={meta.href(selectedCode)}>Çalışma alanı →</Link></div><div className={growth.coverageTrack}><span className={growth.coverageFill} style={{ width: `${percent}%` }} /></div><div className={growth.coverageMeta}><span>{current.published} yayınlanmış</span><span>{current.draft} taslak</span>{selectedCode === "en" ? <span>TR karşılığı: {baseline.published} yayınlanmış</span> : <span>Kaynak dil</span>}</div></div>;
              })}</div>
              {selectedCode === "en" ? <div className={ops.infoBox}><strong>Kapsam yüzdesi eşleştirme değildir.</strong><p>Gösterge EN yayınlanmış kayıt sayısını TR kapsamıyla kıyaslar. İçeriklerin bire bir çeviri eşleştiğini iddia etmez; editoryal hazırlık sinyalidir.</p></div> : null}
            </div>
          </main>

          <aside className={ops.sidePane}>
            <div className={ops.sideHeader}><span className={ops.railLabel}>Yayın hazırlığı</span><strong>{selectedLocale?.isDefault ? "Varsayılan dil" : selectedLocale?.enabled ? "Public açık" : "Public açılış kontrolü"}</strong></div>
            <div className={ops.sideBody}>
              {selectedCode === "en" ? <div className={growth.readinessList}>{(Object.keys(coverageMeta) as CoverageKey[]).filter((key) => coverageMeta[key].core).map((key) => {
                const ready = enCoverage[key].published > 0;
                return <div className={growth.readinessItem} data-state={ready ? "ok" : "warn"} key={key}><span>{ready ? "✓" : "!"}</span><div><strong>{coverageMeta[key].label}</strong><small>{ready ? `${enCoverage[key].published} EN kayıt yayında.` : "Henüz EN yayınlanmış kayıt yok; public açılıştan önce kontrol önerilir."}</small></div></div>;
              })}</div> : <div className={ops.infoBox}><strong>TR kaynak kapsam</strong><p>Türkçe varsayılan ve kapatılamayan dildir. EN hazırlık karşılaştırmaları bu kapsamı referans alır.</p></div>}

              <div className={growth.launchBox}>
                <strong>{selectedLocale?.isDefault ? "TR her zaman aktif" : selectedLocale?.enabled ? "EN public erişime açık" : "EN public erişime kapalı"}</strong>
                <p>{selectedLocale?.isDefault ? "Bu dil için aç/kapat kararı yoktur." : selectedLocale?.enabled ? "Kapatmak /en ve ilgili public EN yüzeylerini erişimden kaldırır; içerik kayıtları korunur." : "Açmak teknik public erişimi etkinleştirir. Hazırlık göstergeleri karar desteğidir; gizli bir otomatik blokaj uygulanmaz."}</p>
                {!selectedLocale?.isDefault ? <form action={updateCmsLocaleAction}><input type="hidden" name="locale" value={selectedCode} /><input type="hidden" name="enabled" value={selectedLocale?.enabled ? "false" : "true"} /><button type="submit">{selectedLocale?.enabled ? "Public EN’i Kapat" : "Public EN’i Aç"}</button></form> : null}
              </div>

              <div className={ops.actionRow}>{selectedCode === "en" && enLocale?.enabled ? <Link href="/en" target="_blank">Public /en ↗</Link> : null}<Link href="/icerik/yayin-kuyrugu?dil=en">EN Yayın Kuyruğu</Link><Link href="/icerik/saglik">Sistem Sağlığı</Link></div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
