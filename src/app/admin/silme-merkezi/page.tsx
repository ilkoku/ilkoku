import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";

import { deleteFromAdminCenterAction } from "@/features/admin/deletion-actions";
import { prisma } from "@/lib/prisma";

const LIMIT = 40;

const resultMessages: Record<string, { tone: "success" | "warning"; text: string }> = {
  "yazar-silindi": {
    tone: "success",
    text: "Yazar hesabı platformdan kaldırıldı. Hesap ve geçmiş kayıtlar Arşiv Merkezi'nde korunuyor.",
  },
  "editor-silindi": {
    tone: "success",
    text: "Editör hesabı platformdan kaldırıldı. Tamamlanan inceleme geçmişi korunuyor.",
  },
  "eser-silindi": {
    tone: "success",
    text: "Eser arşive alındı ve okuyucu yüzeylerinden kaldırıldı.",
  },
  "yayinevi-silindi": {
    tone: "success",
    text: "Yayınevi arşive alındı ve aktif çalışma alanından kaldırıldı.",
  },
  "onay-gerekli": {
    tone: "warning",
    text: "Silme işlemi için onay alanına SİL yazılması gerekiyor.",
  },
  "kayit-bulunamadi": {
    tone: "warning",
    text: "Kayıt bulunamadı veya daha önce kaldırılmış.",
  },
  "editor-aktif-inceleme": {
    tone: "warning",
    text: "Bu editörün aktif incelemesi var. Önce incelemeyi tamamlayın, iptal edin veya başka editöre devredin.",
  },
  "eser-ucretli-erisim-korumali": {
    tone: "warning",
    text: "Bu eserde satın alma veya aktif erişim hakkı bulunduğu için silme kapalı. Okur erişim hakları korunmalı.",
  },
  "yazar-ucretli-erisim-korumali": {
    tone: "warning",
    text: "Bu yazarın satın alınmış veya aktif erişim hakkı bulunan eseri var. Okur haklarını etkilememek için yazar silme işlemi durduruldu.",
  },
};

type SearchParams = Promise<{
  durum?: string;
  q?: string;
}>;

function userSearch(q: string): Prisma.UserWhereInput {
  if (!q) return {};

  return {
    OR: [
      { displayName: { contains: q } },
      { email: { contains: q } },
      { fullName: { contains: q } },
      { publicId: { contains: q } },
      { username: { contains: q } },
    ],
  };
}

function deletionForm(input: {
  blocked?: boolean;
  id: string;
  label: string;
  targetType: "writer" | "editor" | "work" | "publisher";
}) {
  return (
    <form action={deleteFromAdminCenterAction} className="admin-delete-form">
      <input name="targetId" type="hidden" value={input.id} />
      <input name="targetType" type="hidden" value={input.targetType} />
      <label>
        <span>Onay için SİL yaz</span>
        <input
          autoComplete="off"
          disabled={input.blocked}
          name="confirmation"
          placeholder="SİL"
          required
          type="text"
        />
      </label>
      <button disabled={input.blocked} type="submit">
        {input.blocked ? "Silme korumalı" : input.label}
      </button>
    </form>
  );
}

export default async function AdminDeletionCenterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const flash = params.durum ? resultMessages[params.durum] ?? null : null;

  const writerWhere: Prisma.UserWhereInput = {
    deletedAt: null,
    role: "writer",
    ...userSearch(q),
  };
  const editorWhere: Prisma.UserWhereInput = {
    deletedAt: null,
    role: "editor",
    ...userSearch(q),
  };
  const workWhere: Prisma.WorkWhereInput = {
    archivedAt: null,
    status: { not: "archived" },
    ...(q
      ? {
          OR: [
            { publicId: { contains: q } },
            { title: { contains: q } },
            { author: { is: { displayName: { contains: q } } } },
            { author: { is: { fullName: { contains: q } } } },
            { author: { is: { email: { contains: q } } } },
          ],
        }
      : {}),
  };
  const publisherWhere: Prisma.PublisherWhereInput = {
    archivedAt: null,
    ...(q
      ? {
          OR: [
            { companyName: { contains: q } },
            { publicId: { contains: q } },
            { slug: { contains: q } },
          ],
        }
      : {}),
  };

  const [
    writerCount,
    editorCount,
    workCount,
    publisherCount,
    writers,
    editors,
    works,
    publishers,
  ] = await Promise.all([
    prisma.user.count({ where: writerWhere }),
    prisma.user.count({ where: editorWhere }),
    prisma.work.count({ where: workWhere }),
    prisma.publisher.count({ where: publisherWhere }),
    prisma.user.findMany({
      where: writerWhere,
      orderBy: { updatedAt: "desc" },
      take: LIMIT,
      select: {
        displayName: true,
        email: true,
        fullName: true,
        id: true,
        publicId: true,
        status: true,
        _count: {
          select: {
            works: true,
            publisherSubmissions: true,
          },
        },
        works: {
          where: {
            OR: [
              { entitlements: { some: { status: "active" } } },
              { commerceOrders: { some: { status: "paid" } } },
            ],
          },
          select: { id: true },
          take: 1,
        },
      },
    }),
    prisma.user.findMany({
      where: editorWhere,
      orderBy: { updatedAt: "desc" },
      take: LIMIT,
      select: {
        displayName: true,
        email: true,
        fullName: true,
        id: true,
        publicId: true,
        status: true,
        _count: {
          select: {
            editorReviewAssignments: {
              where: { status: { in: ["waiting", "assigned", "in_progress"] } },
            },
            feedbackWritten: {
              where: {
                isProfessionalReview: true,
                reportStatus: "completed",
              },
            },
          },
        },
      },
    }),
    prisma.work.findMany({
      where: workWhere,
      orderBy: { updatedAt: "desc" },
      take: LIMIT,
      select: {
        id: true,
        publicId: true,
        status: true,
        title: true,
        visibility: true,
        author: {
          select: {
            displayName: true,
            fullName: true,
          },
        },
        _count: {
          select: {
            chapters: { where: { archivedAt: null } },
            commerceOrders: { where: { status: "paid" } },
            entitlements: { where: { status: "active" } },
          },
        },
      },
    }),
    prisma.publisher.findMany({
      where: publisherWhere,
      orderBy: { updatedAt: "desc" },
      take: LIMIT,
      select: {
        active: true,
        companyName: true,
        id: true,
        publicId: true,
        slug: true,
        _count: {
          select: {
            members: { where: { active: true } },
            submissions: { where: { archivedAt: null } },
          },
        },
      },
    }),
  ]);

  const publisherEditorRequestGroups = editors.length
    ? await prisma.publisherEditorRequest.groupBy({
        by: ["assignedEditorId"],
        where: {
          assignedEditorId: { in: editors.map((editor) => editor.id) },
          status: { in: ["waiting", "in_progress"] },
        },
        _count: { _all: true },
      })
    : [];

  const publisherEditorRequestCount = new Map(
    publisherEditorRequestGroups
      .filter(
        (group): group is typeof group & { assignedEditorId: string } =>
          Boolean(group.assignedEditorId),
      )
      .map((group) => [group.assignedEditorId, group._count._all]),
  );

  const total = writerCount + editorCount + workCount + publisherCount;

  return (
    <div className="admin-deletion-center">
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Kontrollü kaldırma alanı</span>
          <h1>Silme Merkezi</h1>
          <p>
            Yazar, eser, yayınevi ve editör kayıtlarını ilişkili verileri
            bozmadan platformdan kaldırın.
          </p>
        </div>
        <div className="admin-heading-actions">
          <Link className="admin-button admin-button--ghost" href="/sistem-yonetimi/arsiv">
            Arşiv Merkezi
          </Link>
        </div>
      </header>

      <section className="admin-delete-safety" role="note">
        <strong>Güvenli silme kullanılıyor.</strong>
        <p>
          Bu ekran veritabanından geri döndürülemez fiziksel silme yapmaz.
          Yazar ve editör hesapları soft-delete edilir ve oturumları kapatılır;
          eser ve yayınevleri arşivlenir. Sözleşme, audit, editör geçmişi ve
          finansal kayıtlar korunur. Geri alma Arşiv Merkezi üzerinden yapılır.
        </p>
      </section>

      {flash ? (
        <div
          className="admin-delete-flash"
          data-tone={flash.tone}
          role={flash.tone === "warning" ? "alert" : "status"}
        >
          {flash.text}
        </div>
      ) : null}

      <section className="admin-archive-summary" aria-label="Silinebilir kayıt özeti">
        <article><span>Yazar</span><strong>{writerCount}</strong></article>
        <article><span>Eser</span><strong>{workCount}</strong></article>
        <article><span>Yayınevi</span><strong>{publisherCount}</strong></article>
        <article><span>Editör</span><strong>{editorCount}</strong></article>
      </section>

      <section className="admin-panel admin-delete-search">
        <form method="get">
          <label>
            <span>Kayıt ara</span>
            <input
              defaultValue={q}
              name="q"
              placeholder="Ad, e-posta, eser, yayınevi veya İlkOku ID"
              type="search"
            />
          </label>
          <button type="submit">Ara</button>
          {q ? <Link href="/sistem-yonetimi/silme-merkezi">Temizle</Link> : null}
        </form>
        <small>
          {total.toLocaleString("tr-TR")} eşleşme · Her bölümde en fazla {LIMIT} kayıt gösterilir.
        </small>
      </section>

      <section className="admin-panel admin-delete-section">
        <div className="admin-panel__heading">
          <div><span>Hesaplar</span><h2>Yazar silme</h2></div>
          <b>{writerCount}</b>
        </div>
        <p className="admin-delete-section__intro">
          Yazar hesabı kaldırıldığında giriş oturumları kapatılır. Satın alınmış
          eser veya aktif okur erişim hakkı varsa silme otomatik olarak engellenir.
        </p>
        {writers.length ? (
          <div className="admin-delete-grid">
            {writers.map((writer) => {
              const protectedByCommerce = writer.works.length > 0;
              return (
                <article className="admin-delete-card" key={writer.id}>
                  <div>
                    <strong>{writer.displayName || writer.fullName}</strong>
                    <span>{writer.email}</span>
                    <small>{writer.publicId} · {writer.status}</small>
                  </div>
                  <dl>
                    <div><dt>Eser</dt><dd>{writer._count.works}</dd></div>
                    <div><dt>Yayınevi başvurusu</dt><dd>{writer._count.publisherSubmissions}</dd></div>
                  </dl>
                  {protectedByCommerce ? (
                    <p className="admin-delete-blocker">
                      Ücretli eser / aktif erişim hakkı bulunduğu için silme korumalı.
                    </p>
                  ) : null}
                  <Link href={`/sistem-yonetimi/eserler?yazar=${encodeURIComponent(writer.id)}`}>
                    Yazarın eserlerini gör
                  </Link>
                  {deletionForm({
                    blocked: protectedByCommerce,
                    id: writer.id,
                    label: "Yazarı sil",
                    targetType: "writer",
                  })}
                </article>
              );
            })}
          </div>
        ) : <p className="admin-profile-empty">Yazar bulunamadı.</p>}
      </section>

      <section className="admin-panel admin-delete-section">
        <div className="admin-panel__heading">
          <div><span>İçerik</span><h2>Eser silme</h2></div>
          <b>{workCount}</b>
        </div>
        <p className="admin-delete-section__intro">
          Eser silme, kaydı arşive taşır. Aktif entitlement veya başarılı
          satın alma bulunan eserler okur haklarını korumak için silinemez.
        </p>
        {works.length ? (
          <div className="admin-delete-grid">
            {works.map((work) => {
              const protectedByCommerce =
                work._count.entitlements > 0 || work._count.commerceOrders > 0;
              return (
                <article className="admin-delete-card" key={work.id}>
                  <div>
                    <strong>{work.title}</strong>
                    <span>{work.author.displayName || work.author.fullName}</span>
                    <small>{work.publicId} · {work.status} · {work.visibility}</small>
                  </div>
                  <dl>
                    <div><dt>Bölüm</dt><dd>{work._count.chapters}</dd></div>
                    <div><dt>Aktif erişim</dt><dd>{work._count.entitlements}</dd></div>
                    <div><dt>Başarılı sipariş</dt><dd>{work._count.commerceOrders}</dd></div>
                  </dl>
                  {protectedByCommerce ? (
                    <p className="admin-delete-blocker">
                      Okur satın alma/erişim kaydı bulunduğu için silme korumalı.
                    </p>
                  ) : null}
                  <Link href={`/sistem-yonetimi/eserler/${work.id}`}>Eser detayını aç</Link>
                  {deletionForm({
                    blocked: protectedByCommerce,
                    id: work.id,
                    label: "Eseri sil",
                    targetType: "work",
                  })}
                </article>
              );
            })}
          </div>
        ) : <p className="admin-profile-empty">Eser bulunamadı.</p>}
      </section>

      <section className="admin-panel admin-delete-section">
        <div className="admin-panel__heading">
          <div><span>Kurumsal hesaplar</span><h2>Yayınevi silme</h2></div>
          <b>{publisherCount}</b>
        </div>
        <p className="admin-delete-section__intro">
          Yayınevi arşivlenir ve pasif hale gelir. Üyelik ve başvuru geçmişi
          silinmez.
        </p>
        {publishers.length ? (
          <div className="admin-delete-grid">
            {publishers.map((publisher) => (
              <article className="admin-delete-card" key={publisher.id}>
                <div>
                  <strong>{publisher.companyName}</strong>
                  <span>{publisher.slug}</span>
                  <small>{publisher.publicId} · {publisher.active ? "aktif" : "pasif"}</small>
                </div>
                <dl>
                  <div><dt>Aktif üye</dt><dd>{publisher._count.members}</dd></div>
                  <div><dt>Başvuru</dt><dd>{publisher._count.submissions}</dd></div>
                </dl>
                <Link href={`/sistem-yonetimi/yayinevleri/${publisher.id}`}>
                  Yayınevi detayını aç
                </Link>
                {deletionForm({
                  id: publisher.id,
                  label: "Yayınevini sil",
                  targetType: "publisher",
                })}
              </article>
            ))}
          </div>
        ) : <p className="admin-profile-empty">Yayınevi bulunamadı.</p>}
      </section>

      <section className="admin-panel admin-delete-section">
        <div className="admin-panel__heading">
          <div><span>Editoryal ağ</span><h2>Editör silme</h2></div>
          <b>{editorCount}</b>
        </div>
        <p className="admin-delete-section__intro">
          Tamamlanan editör raporları korunur. Aktif incelemesi bulunan editör,
          iş akışının ortasında sahipsiz kayıt bırakmamak için silinemez.
        </p>
        {editors.length ? (
          <div className="admin-delete-grid">
            {editors.map((editor) => {
              const publisherReviewCount =
                publisherEditorRequestCount.get(editor.id) ?? 0;
              const hasActiveReview =
                editor._count.editorReviewAssignments > 0 ||
                publisherReviewCount > 0;
              return (
                <article className="admin-delete-card" key={editor.id}>
                  <div>
                    <strong>{editor.displayName || editor.fullName}</strong>
                    <span>{editor.email}</span>
                    <small>{editor.publicId} · {editor.status}</small>
                  </div>
                  <dl>
                    <div><dt>Aktif inceleme</dt><dd>{editor._count.editorReviewAssignments}</dd></div>
                    <div><dt>Yayınevi incelemesi</dt><dd>{publisherReviewCount}</dd></div>
                    <div><dt>Tamamlanan rapor</dt><dd>{editor._count.feedbackWritten}</dd></div>
                  </dl>
                  {hasActiveReview ? (
                    <p className="admin-delete-blocker">
                      Aktif inceleme bulunduğu için önce iş akışını kapatın veya devredin.
                    </p>
                  ) : null}
                  <Link href={`/sistem-yonetimi/editorler/${editor.id}`}>Editör detayını aç</Link>
                  {deletionForm({
                    blocked: hasActiveReview,
                    id: editor.id,
                    label: "Editörü sil",
                    targetType: "editor",
                  })}
                </article>
              );
            })}
          </div>
        ) : <p className="admin-profile-empty">Editör bulunamadı.</p>}
      </section>
    </div>
  );
}
