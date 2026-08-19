import Link from "next/link";
import { requireCmsManager } from "@/lib/cms-access";
import {
  cmsRevisionLocale,
  cmsRevisionStatusLabel,
  cmsRevisionTypeLabel,
  diffCmsRevisionSnapshots,
  isRestorableCmsRevision,
  isValidCmsRevisionSnapshotJson,
  parseCmsRevisionSnapshot,
} from "@/lib/cms-revisions";
import { prisma } from "@/lib/prisma";
import ops from "../PublishingOperationsWorkbench.module.css";
import flow from "../WorkflowOperationsWorkbench.module.css";

export const dynamic = "force-dynamic";

type RevisionRow = {
  id: string;
  pageId: string;
  version: number;
  snapshotJson: string;
  createdAt: Date;
  title: string;
  contentKey: string;
  slug: string;
  currentStatus: "draft" | "published" | "archived";
  actorName: string | null;
  actorEmail: string | null;
};
type SearchParams = Record<string, string | string[] | undefined>;
type PreparedRevision = RevisionRow & {
  validJson: boolean;
  snapshot: ReturnType<typeof parseCmsRevisionSnapshot>;
  locale: string;
  restorable: boolean;
};
type PageGroup = {
  pageId: string;
  title: string;
  slug: string;
  contentKey: string;
  locale: string;
  typeLabel: string;
  currentStatus: RevisionRow["currentStatus"];
  revisions: PreparedRevision[];
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value));
}
function param(params: SearchParams, key: string) {
  const value = params[key];
  return typeof value === "string" ? value : "";
}
function kindKey(contentKey: string) {
  if (contentKey.startsWith("legal:")) return "legal";
  if (contentKey.startsWith("guide:")) return "guide";
  if (contentKey.startsWith("page:")) return "page";
  return "other";
}
function editHref(group: PageGroup) {
  if (group.contentKey.startsWith("legal:")) {
    const parts = group.contentKey.split(":");
    const locale = parts[1] === "en" ? "en" : "tr";
    const slug = locale === "en" ? parts[2] || "" : parts[1] || "";
    return `/icerik/yasal/${slug}?dil=${locale}`;
  }
  if (group.contentKey.startsWith("guide:")) return `/icerik/rehber/${group.pageId}?dil=${group.locale}`;
  return `/icerik/sayfalar/${group.pageId}`;
}
function historyHref(params: SearchParams, patch: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const key of ["q", "tur", "dil", "icerik", "surum"] as const) {
    const current = param(params, key);
    if (current) query.set(key, current);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) query.set(key, value);
    else query.delete(key);
  }
  const suffix = query.toString();
  return suffix ? `/icerik/gecmis?${suffix}` : "/icerik/gecmis";
}
function revisionTone(item: PreparedRevision) {
  if (!item.validJson) return "failed";
  if (item.snapshot._meta?.action === "restore" || item.snapshot._meta?.action === "restore-to-working-draft") return "scheduled";
  if (item.snapshot.status === "published") return "published";
  if (item.snapshot.status === "draft") return "working";
  return "initial";
}

export default async function RevisionCenterPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireCmsManager("/icerik/gecmis");
  const params = await searchParams;

  let rows: RevisionRow[] | null = null;
  try {
    rows = await prisma.$queryRaw<RevisionRow[]>`
      SELECT r.id, r.pageId, r.version, r.snapshotJson, r.createdAt,
             p.title, p.contentKey, p.slug, p.status AS currentStatus,
             COALESCE(u.displayName, u.fullName) AS actorName,
             u.email AS actorEmail
      FROM ContentRevision r
      INNER JOIN ContentPage p ON p.id = r.pageId
      LEFT JOIN User u ON u.id = r.createdById
      ORDER BY r.createdAt DESC
      LIMIT 300
    `;
  } catch {
    rows = null;
  }

  if (!rows) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>Sistem</span><h1>Sürüm Geçmişi</h1><p>Revision verisi doğrulanamadığında boş geçmiş sonucu üretilmez.</p></div></div>
        <div className="content-panel" role="alert"><strong>Revision geçmişi okunamadı.</strong><p>Bu durum “henüz sürüm kaydı yok” anlamına gelmez. Sürüm verisi doğrulanana kadar karşılaştırma ve restore kararları durduruldu.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/gecmis">Tekrar dene</Link></div></div>
      </section>
    );
  }

  const prepared: PreparedRevision[] = rows.map((row) => {
    const validJson = isValidCmsRevisionSnapshotJson(row.snapshotJson);
    const snapshot = parseCmsRevisionSnapshot(row.snapshotJson);
    return {
      ...row,
      validJson,
      snapshot,
      locale: cmsRevisionLocale(row.contentKey, snapshot),
      restorable: validJson && isRestorableCmsRevision(row.contentKey, snapshot),
    };
  });

  const groupMap = new Map<string, PageGroup>();
  for (const item of prepared) {
    const existing = groupMap.get(item.pageId);
    if (existing) existing.revisions.push(item);
    else groupMap.set(item.pageId, {
      pageId: item.pageId,
      title: item.snapshot.title || item.title,
      slug: item.slug,
      contentKey: item.contentKey,
      locale: item.locale,
      typeLabel: cmsRevisionTypeLabel(item.contentKey),
      currentStatus: item.currentStatus,
      revisions: [item],
    });
  }
  const groups = Array.from(groupMap.values()).map((group) => ({ ...group, revisions: [...group.revisions].sort((a, b) => b.version - a.version) }));

  const q = param(params, "q").trim().toLocaleLowerCase("tr-TR");
  const typeFilter = param(params, "tur") || "all";
  const localeFilter = param(params, "dil") || "all";
  const selectedPageId = param(params, "icerik");
  const selectedRevisionId = param(params, "surum");
  const filteredGroups = groups.filter((group) => {
    if (typeFilter !== "all" && kindKey(group.contentKey) !== typeFilter) return false;
    if (localeFilter !== "all" && group.locale !== localeFilter) return false;
    if (q && !`${group.title} ${group.slug} ${group.typeLabel}`.toLocaleLowerCase("tr-TR").includes(q)) return false;
    return true;
  });
  const selectedGroup = filteredGroups.find((group) => group.pageId === selectedPageId) ?? filteredGroups[0] ?? null;
  const selectedRevision = selectedGroup?.revisions.find((revision) => revision.id === selectedRevisionId) ?? selectedGroup?.revisions[0] ?? null;
  const previousRevision = selectedRevision && selectedGroup
    ? selectedGroup.revisions.find((revision) => revision.version < selectedRevision.version && revision.validJson) ?? null
    : null;
  const diffs = selectedRevision?.validJson
    ? diffCmsRevisionSnapshots(previousRevision?.snapshot ?? null, selectedRevision.snapshot)
    : [];

  const invalidCount = prepared.filter((item) => !item.validJson).length;
  const restorableCount = prepared.filter((item) => item.restorable).length;
  const restoreEvents = prepared.filter((item) => item.validJson && ["restore", "restore-to-working-draft"].includes(item.snapshot._meta?.action || "")).length;
  const typeLabels = [{ key: "all", label: "Tümü" }, { key: "legal", label: "Yasal" }, { key: "guide", label: "Rehber" }, { key: "page", label: "Sayfa" }];

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Sistem</span><h1>Sürüm Geçmişi</h1><p>Önce içeriği, sonra sürümü seçin; alan farklarını tek ekranda anlayın ve yalnız gerektiğinde mevcut güvenli restore ekranına geçin.</p></div>
        <div className="content-profile"><strong>{groups.length} içerik</strong><small>{prepared.length} sürüm · {restoreEvents} restore işlemi</small></div>
      </div>

      {invalidCount > 0 ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>{invalidCount} revision snapshot JSON kaydı bozuk.</strong><p>Bozuk kayıtlar karşılaştırma veya restore akışına sokulmaz; ham revision korunur.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}

      <div className={ops.workbench}>
        <div className={ops.summaryBar}>
          <article className={ops.summaryCard}><span>Toplam sürüm</span><strong>{prepared.length}</strong><small>son 300 kayıt</small></article>
          <article className={ops.summaryCard}><span>İçerik</span><strong>{groups.length}</strong><small>sürümü bulunan</small></article>
          <article className={ops.summaryCard}><span>Geri yüklenebilir</span><strong>{restorableCount}</strong><small>tam snapshot</small></article>
          <article className={ops.summaryCard}><span>Bozuk snapshot</span><strong>{invalidCount}</strong><small>restore kilitli</small></article>
        </div>

        <div className={ops.layout}>
          <aside className={ops.rail}>
            <div className={ops.railHeader}><span className={ops.railLabel}>İçerikler</span><strong>{filteredGroups.length} içerik gösteriliyor</strong></div>
            <form method="get" className={ops.searchForm}><input type="search" name="q" defaultValue={param(params, "q")} placeholder="Başlık, yol veya tür ara" />{typeFilter !== "all" ? <input type="hidden" name="tur" value={typeFilter} /> : null}{localeFilter !== "all" ? <input type="hidden" name="dil" value={localeFilter} /> : null}<button type="submit">Ara</button></form>
            <div className={ops.filters}>
              <div><span className={ops.railLabel}>Tür</span><div className={ops.filterRow}>{typeLabels.map((filter) => <Link key={filter.key} data-active={typeFilter === filter.key} href={historyHref(params, { tur: filter.key === "all" ? undefined : filter.key, icerik: undefined, surum: undefined })}>{filter.label}</Link>)}</div></div>
              <div><span className={ops.railLabel}>Dil</span><div className={ops.filterRow}>{[{ key: "all", label: "Tümü" }, { key: "tr", label: "TR" }, { key: "en", label: "EN" }].map((filter) => <Link key={filter.key} data-active={localeFilter === filter.key} href={historyHref(params, { dil: filter.key === "all" ? undefined : filter.key, icerik: undefined, surum: undefined })}>{filter.label}</Link>)}</div></div>
            </div>
            {filteredGroups.length === 0 ? <div className={ops.empty}>Bu filtrelerde sürüm geçmişi yok.</div> : <div className={ops.itemList}>{filteredGroups.map((group) => {
              const invalid = group.revisions.filter((revision) => !revision.validJson).length;
              return <Link key={group.pageId} href={historyHref(params, { icerik: group.pageId, surum: undefined })} className={ops.itemLink} data-active={selectedGroup?.pageId === group.pageId}>
                <div className={ops.itemTop}><strong>{group.title}</strong><span className={ops.badge}>{group.locale.toUpperCase()}</span></div>
                <p>{group.slug}</p>
                <div className={ops.itemMeta}><span>{group.typeLabel}</span><span>{group.revisions.length} sürüm</span>{invalid > 0 ? <span>{invalid} bozuk</span> : null}</div>
              </Link>;
            })}</div>}
          </aside>

          <main className={ops.detail}>
            {!selectedGroup || !selectedRevision ? <div className={ops.empty}><strong>İncelenecek sürüm yok.</strong><p>Bir içerik seçin.</p></div> : <>
              <div className={ops.detailHeader}>
                <div className={ops.detailTopline}><span className={ops.badge} data-tone={revisionTone(selectedRevision)}>v{selectedRevision.version}</span><span className={ops.badge}>{selectedGroup.locale.toUpperCase()}</span></div>
                <div><span className={ops.eyebrow}>{selectedGroup.typeLabel}</span><h2>{selectedRevision.validJson ? selectedRevision.snapshot.title || selectedGroup.title : selectedGroup.title}</h2><p>{selectedGroup.slug}</p></div>
                <div className={ops.detailMetaGrid}>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Snapshot durumu</span><strong>{selectedRevision.validJson ? cmsRevisionStatusLabel(selectedRevision.snapshot.status) : "Bozuk"}</strong><small>v{selectedRevision.version}</small></div>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Şu an</span><strong>{cmsRevisionStatusLabel(selectedGroup.currentStatus)}</strong><small>mevcut ContentPage</small></div>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Restore</span><strong>{selectedRevision.restorable ? "Uygun" : "Kapalı"}</strong><small>{selectedRevision.restorable ? "detay ekranından" : "durum/bozuk kayıt"}</small></div>
                </div>
              </div>
              <div className={ops.detailBody}>
                {!selectedRevision.validJson ? <div className={`${ops.infoBox} ${ops.blocker}`}><strong>Karşılaştırma kilitli.</strong><p>Snapshot JSON parse edilemediği için alan farkı üretmek güvenilir değildir.</p></div> : diffs.length === 0 ? <div className={ops.infoBox}><strong>Alan farkı bulunamadı.</strong><p>Bu revision durum veya işlem metadatası nedeniyle oluşmuş olabilir.</p></div> : <div className={flow.diffList}>{diffs.map((diff) => <article className={flow.diffCard} key={diff.key}><strong>{diff.label}</strong><div className={flow.diffColumns}><div><span>{previousRevision ? `Önceki v${previousRevision.version}` : "Önceki"}</span><pre>{diff.before}</pre></div><div><span>v{selectedRevision.version}</span><pre>{diff.after}</pre></div></div></article>)}</div>}
                <div className={ops.actionRow}><Link href={`/icerik/gecmis/${selectedRevision.id}`}>Detaylı Karşılaştırma / Geri Yükleme →</Link><Link href={editHref(selectedGroup)}>Güncel İçeriği Aç</Link></div>
              </div>
            </>}
          </main>

          <aside className={ops.sidePane}>
            <div className={ops.sideHeader}><span className={ops.railLabel}>Sürüm zaman çizelgesi</span><strong>{selectedGroup ? `${selectedGroup.revisions.length} kayıt` : "İçerik seçin"}</strong></div>
            <div className={ops.sideBody}>
              {selectedGroup ? <><div className={flow.currentSnapshot}><div><span>Güncel içerik</span><strong>{selectedGroup.title}</strong><small>{cmsRevisionStatusLabel(selectedGroup.currentStatus)} · {selectedGroup.slug}</small></div></div><div className={flow.revisionTimeline}>{selectedGroup.revisions.map((revision) => <Link key={revision.id} href={historyHref(params, { icerik: selectedGroup.pageId, surum: revision.id })} className={flow.revisionLink} data-active={selectedRevision?.id === revision.id}><span className={flow.versionPill}>v{revision.version}</span><div><strong>{revision.validJson ? cmsRevisionStatusLabel(revision.snapshot.status) : "Bozuk snapshot"}</strong><small>{revision.actorName || revision.actorEmail || "Sistem"} · {formatDate(revision.createdAt)}</small></div><em>{revision.restorable ? "Restore uygun" : revision.validJson ? "İncele" : "Teşhis"}</em></Link>)}</div></> : <div className={ops.empty}>Bir içerik seçin.</div>}
              <div className={ops.infoBox}><strong>Restore güvenliği</strong><p>Bu merkez restore işlemini doğrudan çalıştırmaz. Mevcut detay ekranı, yayın yetkisi, locale kilidi, backup-before-restore ve transaction kurallarını uygulamaya devam eder.</p></div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
