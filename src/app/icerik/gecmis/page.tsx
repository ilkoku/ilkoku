import Link from "next/link";
import { requireCmsManager } from "@/lib/cms-access";
import {
  cmsRevisionLocale,
  cmsRevisionStatusLabel,
  cmsRevisionTypeLabel,
  isRestorableCmsRevision,
  isValidCmsRevisionSnapshotJson,
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
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function RevisionCenterPage() {
  await requireCmsManager("/icerik/gecmis");

  let rows: RevisionRow[] | null = null;
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
    rows = null;
  }

  if (!rows) {
    return (
      <section className="content-editor-page revision-center">
        <div className="content-page-heading"><div><span>Sistem</span><h1>Revision Center</h1><p>Revision verisi doğrulanamadığında boş geçmiş sonucu üretilmez.</p></div></div>
        <div className="content-panel" role="alert"><strong>Revision geçmişi okunamadı.</strong><p>Bu durum “henüz sürüm kaydı yok” anlamına gelmez. Sürüm verisi doğrulanana kadar karşılaştırma ve restore kararları durduruldu.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/gecmis">Tekrar dene</Link></div></div>
      </section>
    );
  }

  const prepared = rows.map((row) => {
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

  const invalid = prepared.filter((item) => !item.validJson);
  const distinctPages = new Set(prepared.map((item) => item.pageId)).size;
  const restorable = prepared.filter((item) => item.restorable).length;
  const restores = prepared.filter((item) => item.validJson && item.snapshot._meta?.action === "restore").length;

  return (
    <section className="content-editor-page revision-center">
      <div className="content-page-heading"><div><span>Sistem</span><h1>Revision Center</h1><p>Yasal sayfa, rehber ve kurumsal sayfa sürümlerini inceleyin, değişiklikleri karşılaştırın ve uygun sürümleri güvenle geri yükleyin.</p></div></div>

      <div className="content-metric-grid">
        <article className="content-metric-card"><span>Toplam sürüm</span><strong>{prepared.length}</strong><small>son 250 kayıt</small></article>
        <article className="content-metric-card"><span>İçerik</span><strong>{distinctPages}</strong><small>sürümü bulunan</small></article>
        <article className="content-metric-card"><span>Geri yüklenebilir</span><strong>{restorable}</strong><small>tam snapshot</small></article>
        <article className="content-metric-card"><span>Bozuk snapshot</span><strong>{invalid.length}</strong><small>restore kilitli</small></article>
      </div>

      {invalid.length > 0 ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>{invalid.length} revision snapshot JSON kaydı bozuk.</strong><p>Bu kayıtlar “durum kaydı” olarak gizlenmez ve restore edilemez. Ham kayıtlar veri incelemesi için korunur.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}

      <div className="content-panel revision-list-panel">
        <div className="content-dashboard-section-title"><div><span>Sürümler</span><h2>Değişiklik geçmişi</h2></div><small>En yeni önce · {restores} restore</small></div>
        {prepared.length === 0 ? <div className="content-empty"><strong>Henüz sürüm kaydı yok.</strong><p>Yasal sayfa, rehber veya kurumsal sayfa kaydedildiğinde revision kayıtları burada görünür.</p></div> : (
          <div className="revision-list">
            {prepared.map((item) => item.validJson ? (
              <Link className="revision-row" href={`/icerik/gecmis/${item.id}`} key={item.id}>
                <div className="revision-row__content"><span className="revision-row__type">{cmsRevisionTypeLabel(item.contentKey)} · {item.locale.toUpperCase()}</span><strong>{item.snapshot.title || item.title}</strong><small>{item.slug}</small></div>
                <div className="revision-row__meta"><strong>v{item.version}</strong><span>{cmsRevisionStatusLabel(item.snapshot.status)}</span><small>{item.restorable ? "Geri yüklenebilir" : "Durum kaydı"}</small></div>
                <div className="revision-row__actor"><span>{item.actorName || item.actorEmail || "Sistem"}</span><small>{formatDate(item.createdAt)}</small></div><span className="revision-row__arrow">İncele →</span>
              </Link>
            ) : (
              <article className="revision-row" key={item.id}>
                <div className="revision-row__content"><span className="revision-row__type">BOZUK SNAPSHOT</span><strong>{item.title}</strong><small>{item.slug}</small></div>
                <div className="revision-row__meta"><strong>v{item.version}</strong><span>Parse edilemiyor</span><small>Restore kilitli</small></div>
                <div className="revision-row__actor"><span>{item.actorName || item.actorEmail || "Sistem"}</span><small>{formatDate(item.createdAt)}</small></div><span className="revision-row__arrow">Teşhis</span>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
