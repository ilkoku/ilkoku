import Link from "next/link";
import { notFound } from "next/navigation";
import { restoreCmsRevisionAction } from "@/features/cms/revision-actions";
import { requireCmsManager } from "@/lib/cms-access";
import {
  cmsRevisionLocale,
  cmsRevisionStatusLabel,
  cmsRevisionTypeLabel,
  diffCmsRevisionSnapshots,
  isRestorableCmsRevision,
  parseCmsRevisionSnapshot,
} from "@/lib/cms-revisions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ revisionId: string }>;
  searchParams: Promise<{ hata?: string; "geri-yuklendi"?: string }>;
};

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

type PreviousRow = {
  id: string;
  version: number;
  snapshotJson: string;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function message(error?: string, restored?: string) {
  if (restored === "1") return { tone: "success", text: "Sürüm başarıyla geri yüklendi. Restore işlemi de yeni bir revision olarak kaydedildi." };
  if (error === "geri-yuklenemez") return { tone: "error", text: "Bu kayıt yalnız durum değişikliği içeriyor; tam içerik snapshot’ı olmadığı için geri yüklenemez." };
  if (error === "dil-pasif") return { tone: "error", text: "Pasif dildeki bir sürüm yayın durumuna geri yüklenemez." };
  return null;
}

export default async function RevisionDetailPage({ params, searchParams }: PageProps) {
  const access = await requireCmsManager("/icerik/gecmis");
  const { revisionId } = await params;
  const query = await searchParams;

  const rows = await prisma.$queryRaw<RevisionRow[]>`
    SELECT r.id, r.pageId, r.version, r.snapshotJson, r.createdAt,
           p.title, p.contentKey, p.slug, p.status AS currentStatus,
           COALESCE(u.displayName, u.fullName) AS actorName,
           u.email AS actorEmail
    FROM ContentRevision r
    INNER JOIN ContentPage p ON p.id = r.pageId
    LEFT JOIN User u ON u.id = r.createdById
    WHERE r.id = ${revisionId}
    LIMIT 1
  `;
  const revision = rows[0];
  if (!revision) notFound();

  const previousRows = await prisma.$queryRaw<PreviousRow[]>`
    SELECT id, version, snapshotJson
    FROM ContentRevision
    WHERE pageId = ${revision.pageId}
      AND version < ${revision.version}
    ORDER BY version DESC
    LIMIT 1
  `;
  const previous = previousRows[0] ?? null;

  const snapshot = parseCmsRevisionSnapshot(revision.snapshotJson);
  const previousSnapshot = previous ? parseCmsRevisionSnapshot(previous.snapshotJson) : null;
  const diffs = diffCmsRevisionSnapshots(previousSnapshot, snapshot);
  const restorable = isRestorableCmsRevision(revision.contentKey, snapshot);
  const locale = cmsRevisionLocale(revision.contentKey, snapshot);
  const notice = message(query.hata, query["geri-yuklendi"]);
  const metaAction = snapshot._meta?.action;

  return (
    <section className="content-editor-page revision-detail">
      <div className="content-page-heading revision-detail__heading">
        <div>
          <span>{cmsRevisionTypeLabel(revision.contentKey)} · {locale.toUpperCase()}</span>
          <h1>{snapshot.title || revision.title}</h1>
          <p>Sürüm v{revision.version} · {formatDate(revision.createdAt)} · {revision.actorName || revision.actorEmail || "Sistem"}</p>
        </div>
        <Link className="content-button content-button--secondary" href="/icerik/gecmis">← Tüm sürümler</Link>
      </div>

      {notice ? <div className={`revision-notice is-${notice.tone}`}>{notice.text}</div> : null}

      <div className="content-metric-grid revision-detail__metrics">
        <article className="content-metric-card"><span>Sürüm</span><strong>v{revision.version}</strong><small>{previous ? `önceki v${previous.version}` : "ilk kayıt"}</small></article>
        <article className="content-metric-card"><span>Bu sürüm</span><strong>{cmsRevisionStatusLabel(snapshot.status)}</strong><small>snapshot durumu</small></article>
        <article className="content-metric-card"><span>Şu an</span><strong>{cmsRevisionStatusLabel(revision.currentStatus)}</strong><small>mevcut içerik</small></article>
        <article className="content-metric-card"><span>Restore</span><strong>{restorable ? "Hazır" : "Kapalı"}</strong><small>{restorable ? "tam snapshot" : "durum kaydı"}</small></article>
      </div>

      {metaAction ? (
        <div className="revision-notice is-info">
          {metaAction === "restore" ? `Bu revision, v${snapshot._meta?.restoredFromVersion ?? "?"} sürümünden geri yükleme sonucu oluştu.` : "Bu revision geri yükleme öncesi otomatik güvenlik yedeğidir."}
        </div>
      ) : null}

      <div className="content-panel revision-compare-panel">
        <div className="content-dashboard-section-title">
          <div><span>Karşılaştırma</span><h2>{previous ? `v${previous.version} → v${revision.version}` : `v${revision.version} içeriği`}</h2></div>
          <small>{diffs.length} değişen alan</small>
        </div>

        {diffs.length === 0 ? (
          <div className="content-empty"><strong>Alan farkı bulunamadı.</strong><p>Bu kayıt durum/işlem metadatası nedeniyle oluşmuş olabilir.</p></div>
        ) : (
          <div className="revision-diff-list">
            {diffs.map((diff) => (
              <article className={`revision-diff ${diff.key === "body" ? "is-body" : ""}`} key={diff.key}>
                <h3>{diff.label}</h3>
                <div className="revision-diff__columns">
                  <div><span>Önceki</span><pre>{diff.before}</pre></div>
                  <div><span>Bu sürüm</span><pre>{diff.after}</pre></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="content-panel revision-restore-panel">
        <div>
          <span className="content-eyebrow">Geri yükleme</span>
          <h2>Bu sürümü yeniden kullan</h2>
          <p>Restore işleminden önce mevcut içerik otomatik olarak tam snapshot şeklinde yedeklenir. Ardından seçilen sürüm uygulanır ve işlem yeni bir revision olarak kaydedilir.</p>
        </div>
        {restorable && access.canPublish ? (
          <form action={restoreCmsRevisionAction}>
            <input type="hidden" name="revisionId" value={revision.id} />
            <button className="content-button" type="submit">v{revision.version} sürümünü geri yükle</button>
          </form>
        ) : (
          <div className="revision-restore-disabled">
            <strong>{restorable ? "Yayın yetkisi gerekli" : "Bu sürüm geri yüklenemez"}</strong>
            <small>{restorable ? "Canlı içerik durumunu değiştirebildiği için restore yalnız yayın yetkisi olan kullanıcıya açıktır." : "Tam başlık + içerik snapshot’ı olmayan durum kayıtları yalnız inceleme içindir."}</small>
          </div>
        )}
      </div>
    </section>
  );
}
