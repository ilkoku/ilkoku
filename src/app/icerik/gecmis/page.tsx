import Link from "next/link";
import { requireCmsManager } from "@/lib/cms-access";
import {
  cmsRevisionLocale,
  cmsRevisionStatusLabel,
  cmsRevisionTypeLabel,
  isRestorableCmsRevision,
  parseCmsRevisionSnapshot,
} from "@/lib/cms-revisions";
import { prisma } from "@/lib/prisma";

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
  actorName: string | null;
  actorEmail: string | null;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function RevisionCenterPage() {
  await requireCmsManager("/icerik/gecmis");

  let rows: RevisionRow[] = [];
  try {
    rows = await prisma.$queryRaw<RevisionRow[]>`
      SELECT r.id, r.pageId, r.version, r.snapshotJson, r.createdAt,
             p.title, p.contentKey, p.slug,
             COALESCE(u.displayName, u.fullName) AS actorName,
             u.email AS actorEmail
      FROM ContentRevision r
      INNER JOIN ContentPage p ON p.id = r.pageId
      LEFT JOIN User u ON u.id = r.createdById
      ORDER BY r.createdAt DESC
      LIMIT 250
    `;
  } catch {
    rows = [];
  }

  const prepared = rows.map((row) => {
    const snapshot = parseCmsRevisionSnapshot(row.snapshotJson);
    return {
      ...row,
      snapshot,
      locale: cmsRevisionLocale(row.contentKey, snapshot),
      restorable: isRestorableCmsRevision(row.contentKey, snapshot),
    };
  });

  const distinctPages = new Set(prepared.map((item) => item.pageId)).size;
  const restorable = prepared.filter((item) => item.restorable).length;
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = prepared.filter((item) => new Date(item.createdAt).getTime() >= since).length;

  return (
    <section className="content-editor-page revision-center">
      <div className="content-page-heading">
        <div>
          <span>Sistem</span>
          <h1>Revision Center</h1>
          <p>Yasal sayfa ve rehber sürümlerini inceleyin, değişiklikleri karşılaştırın ve uygun sürümleri güvenle geri yükleyin.</p>
        </div>
      </div>

      <div className="content-metric-grid">
        <article className="content-metric-card"><span>Toplam sürüm</span><strong>{prepared.length}</strong><small>son 250 kayıt</small></article>
        <article className="content-metric-card"><span>İçerik</span><strong>{distinctPages}</strong><small>sürümü bulunan</small></article>
        <article className="content-metric-card"><span>Geri yüklenebilir</span><strong>{restorable}</strong><small>tam snapshot</small></article>
        <article className="content-metric-card"><span>Son 7 gün</span><strong>{recent}</strong><small>revision hareketi</small></article>
      </div>

      <div className="content-panel revision-list-panel">
        <div className="content-dashboard-section-title">
          <div><span>Sürümler</span><h2>Değişiklik geçmişi</h2></div>
          <small>En yeni önce</small>
        </div>

        {prepared.length === 0 ? (
          <div className="content-empty"><strong>Henüz sürüm kaydı yok.</strong><p>Yasal sayfa veya rehber kaydedildiğinde revision kayıtları burada görünür.</p></div>
        ) : (
          <div className="revision-list">
            {prepared.map((item) => (
              <Link className="revision-row" href={`/icerik/gecmis/${item.id}`} key={item.id}>
                <div className="revision-row__content">
                  <span className="revision-row__type">{cmsRevisionTypeLabel(item.contentKey)} · {item.locale.toUpperCase()}</span>
                  <strong>{item.snapshot.title || item.title}</strong>
                  <small>{item.slug}</small>
                </div>
                <div className="revision-row__meta">
                  <strong>v{item.version}</strong>
                  <span>{cmsRevisionStatusLabel(item.snapshot.status)}</span>
                  <small>{item.restorable ? "Geri yüklenebilir" : "Durum kaydı"}</small>
                </div>
                <div className="revision-row__actor">
                  <span>{item.actorName || item.actorEmail || "Sistem"}</span>
                  <small>{formatDate(item.createdAt)}</small>
                </div>
                <span className="revision-row__arrow">İncele →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
