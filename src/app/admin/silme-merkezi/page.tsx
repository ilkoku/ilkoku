/* eslint-disable @next/next/no-html-link-for-pages -- Category switches must hard-navigate to refresh server-rendered query-specific tables. */
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";

import { deleteFromAdminCenterAction } from "@/features/admin/deletion-actions";
import { prisma } from "@/lib/prisma";

const LIMIT = 40;
const DELETION_CENTER_PATH = "/sistem-yonetimi/silme-merkezi";
type DeletionCategory = "yazar" | "eser" | "yayinevi" | "editor";

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
  bolum?: string;
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
  query: string;
}) {
  return (
    <form action={deleteFromAdminCenterAction} className="admin-delete-form">
      <input name="targetId" type="hidden" value={input.id} />
      <input name="targetType" type="hidden" value={input.targetType} />
      <input name="q" type="hidden" value={input.query} />
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
  const selectedCategory: DeletionCategory =
    params.bolum === "eser" || params.bolum === "yayinevi" || params.bolum === "editor"
      ? params.bolum : "yazar";
  const categoryHref = (category: DeletionCategory) => {
    const query = new URLSearchParams({ bolum: category });
    if (q) query.set("q", q);
    return `${DELETION_CENTER_PATH}?${query.toString()}`;
  };
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

  const publisherEditorRequestCount = new Map<string, number>();
  for (const group of publisherEditorRequestGroups) {
    if (group.assignedEditorId) {
      publisherEditorRequestCount.set(
        group.assignedEditorId,
        group._count._all,
      );
    }
  }

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

      <nav className="admin-archive-summary admin-delete-picker" aria-label="Silinebilir kayıt türü seçimi">
        <a href={categoryHref("yazar")} className="admin-delete-picker__link" aria-current={selectedCategory === "yazar" ? "page" : undefined}>
          <span>Yazar</span><strong>{writerCount}</strong>
        </a>
        <a href={categoryHref("eser")} className="admin-delete-picker__link" aria-current={selectedCategory === "eser" ? "page" : undefined}>
          <span>Eser</span><strong>{workCount}</strong>
        </a>
        <a href={categoryHref("yayinevi")} className="admin-delete-picker__link" aria-current={selectedCategory === "yayinevi" ? "page" : undefined}>
          <span>Yayınevi</span><strong>{publisherCount}</strong>
        </a>
        <a href={categoryHref("editor")} className="admin-delete-picker__link" aria-current={selectedCategory === "editor" ? "page" : undefined}>
          <span>Editör</span><strong>{editorCount}</strong>
        </a>
      </nav>

      <section className="admin-panel admin-delete-search">
        <form method="get">
          <input type="hidden" name="bolum" value={selectedCategory} />
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
          {q ? <a href={`${DELETION_CENTER_PATH}?bolum=${selectedCategory}`}>Temizle</a> : null}
        </form>
        <small>
          {total.toLocaleString("tr-TR")} eşleşme · Her bölümde en fazla {LIMIT} kayıt gösterilir.
        </small>
      </section>

      {selectedCategory === "yazar" ? (
        <section id="admin-delete-active-panel" className="admin-panel admin-delete-section" aria-label="Yazar silme ekranı">
          <div className="admin-panel__heading">
          <div><span>Hesaplar</span><h2>Yazar silme</h2></div>
          <b>{writerCount}</b>
        </div>
        <p className="admin-delete-section__intro">
          Yazar hesabı kaldırıldığında giriş oturumları kapatılır. Satın alınmış
          eser veya aktif okur erişim hakkı varsa silme otomatik olarak engellenir.
        </p>
        {writers.length ? (
          <div className="admin-delete-table-scroll" role="region" aria-label="Yazar silme kayıtları" tabIndex={0}>
            <table className="admin-delete-table">
              <thead><tr>
                <th scope="col">Yazar</th><th scope="col">E-posta</th><th scope="col">İlkOku ID / Durum</th>
                <th scope="col">Eser</th><th scope="col">Yayınevi başvurusu</th>
                <th scope="col">Koruma</th><th scope="col">Bağlantı</th><th scope="col">Silme onayı</th>
              </tr></thead>
              <tbody>
                {writers.map((writer) => {
                  const protectedByCommerce = writer.works.length > 0;
                  return (
                    <tr key={writer.id}>
                      <th scope="row">{writer.displayName || writer.fullName}</th>
                      <td className="admin-delete-table__wrap">{writer.email}</td>
                      <td><span className="admin-delete-table__id">{writer.publicId}</span><small>{writer.status}</small></td>
                      <td className="admin-delete-table__number">{writer._count.works}</td>
                      <td className="admin-delete-table__number">{writer._count.publisherSubmissions}</td>
                      <td>{protectedByCommerce ? <span className="admin-delete-blocker">Ücretli eser / aktif erişim hakkı bulunduğu için silme korumalı.</span> : <span className="admin-delete-table__safe">—</span>}</td>
                      <td><Link href={"/sistem-yonetimi/eserler?yazar=" + encodeURIComponent(writer.id)}>Yazarın eserlerini gör</Link></td>
                      <td>{deletionForm({ blocked: protectedByCommerce, id: writer.id, label: "Yazarı sil", targetType: "writer", query: q })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="admin-profile-empty">Yazar bulunamadı.</p>}
        </section>
      ) : null}

      {selectedCategory === "eser" ? (
        <section id="admin-delete-active-panel" className="admin-panel admin-delete-section" aria-label="Eser silme ekranı">
          <div className="admin-panel__heading">
          <div><span>İçerik</span><h2>Eser silme</h2></div>
          <b>{workCount}</b>
        </div>
        <p className="admin-delete-section__intro">
          Eser silme, kaydı arşive taşır. Aktif entitlement veya başarılı
          satın alma bulunan eserler okur haklarını korumak için silinemez.
        </p>
        {works.length ? (
          <div className="admin-delete-table-scroll" role="region" aria-label="Eser silme kayıtları" tabIndex={0}>
            <table className="admin-delete-table">
              <thead><tr>
                <th scope="col">Eser</th><th scope="col">Yazar</th><th scope="col">İlkOku ID / Durum</th>
                <th scope="col">Bölüm</th><th scope="col">Aktif erişim</th><th scope="col">Başarılı sipariş</th>
                <th scope="col">Koruma</th><th scope="col">Bağlantı</th><th scope="col">Silme onayı</th>
              </tr></thead>
              <tbody>
                {works.map((work) => {
                  const protectedByCommerce = work._count.entitlements > 0 || work._count.commerceOrders > 0;
                  return (
                    <tr key={work.id}>
                      <th scope="row">{work.title}</th>
                      <td>{work.author.displayName || work.author.fullName}</td>
                      <td><span className="admin-delete-table__id">{work.publicId}</span><small>{work.status} · {work.visibility}</small></td>
                      <td className="admin-delete-table__number">{work._count.chapters}</td>
                      <td className="admin-delete-table__number">{work._count.entitlements}</td>
                      <td className="admin-delete-table__number">{work._count.commerceOrders}</td>
                      <td>{protectedByCommerce ? <span className="admin-delete-blocker">Okur satın alma/erişim kaydı bulunduğu için silme korumalı.</span> : <span className="admin-delete-table__safe">—</span>}</td>
                      <td><Link href={"/sistem-yonetimi/eserler/" + work.id}>Eser detayını aç</Link></td>
                      <td>{deletionForm({ blocked: protectedByCommerce, id: work.id, label: "Eseri sil", targetType: "work", query: q })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="admin-profile-empty">Eser bulunamadı.</p>}
        </section>
      ) : null}

      {selectedCategory === "yayinevi" ? (
        <section id="admin-delete-active-panel" className="admin-panel admin-delete-section" aria-label="Yayınevi silme ekranı">
          <div className="admin-panel__heading">
          <div><span>Kurumsal hesaplar</span><h2>Yayınevi silme</h2></div>
          <b>{publisherCount}</b>
        </div>
        <p className="admin-delete-section__intro">
          Yayınevi arşivlenir ve pasif hale gelir. Üyelik ve başvuru geçmişi
          silinmez.
        </p>
        {publishers.length ? (
          <div className="admin-delete-table-scroll" role="region" aria-label="Yayınevi silme kayıtları" tabIndex={0}>
            <table className="admin-delete-table">
              <thead><tr>
                <th scope="col">Yayınevi</th><th scope="col">Slug</th><th scope="col">İlkOku ID / Durum</th>
                <th scope="col">Aktif üye</th><th scope="col">Başvuru</th><th scope="col">Bağlantı</th><th scope="col">Silme onayı</th>
              </tr></thead>
              <tbody>
                {publishers.map((publisher) => (
                  <tr key={publisher.id}>
                    <th scope="row">{publisher.companyName}</th>
                    <td>{publisher.slug}</td>
                    <td><span className="admin-delete-table__id">{publisher.publicId}</span><small>{publisher.active ? "aktif" : "pasif"}</small></td>
                    <td className="admin-delete-table__number">{publisher._count.members}</td>
                    <td className="admin-delete-table__number">{publisher._count.submissions}</td>
                    <td><Link href={"/sistem-yonetimi/yayinevleri/" + publisher.id}>Yayınevi detayını aç</Link></td>
                    <td>{deletionForm({ id: publisher.id, label: "Yayınevini sil", targetType: "publisher", query: q })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="admin-profile-empty">Yayınevi bulunamadı.</p>}
        </section>
      ) : null}

      {selectedCategory === "editor" ? (
        <section id="admin-delete-active-panel" className="admin-panel admin-delete-section" aria-label="Editör silme ekranı">
          <div className="admin-panel__heading">
          <div><span>Editoryal ağ</span><h2>Editör silme</h2></div>
          <b>{editorCount}</b>
        </div>
        <p className="admin-delete-section__intro">
          Tamamlanan editör raporları korunur. Aktif incelemesi bulunan editör,
          iş akışının ortasında sahipsiz kayıt bırakmamak için silinemez.
        </p>
        {editors.length ? (
          <div className="admin-delete-table-scroll" role="region" aria-label="Editör silme kayıtları" tabIndex={0}>
            <table className="admin-delete-table">
              <thead><tr>
                <th scope="col">Editör</th><th scope="col">E-posta</th><th scope="col">İlkOku ID / Durum</th>
                <th scope="col">Aktif inceleme</th><th scope="col">Yayınevi incelemesi</th><th scope="col">Tamamlanan rapor</th>
                <th scope="col">Koruma</th><th scope="col">Bağlantı</th><th scope="col">Silme onayı</th>
              </tr></thead>
              <tbody>
                {editors.map((editor) => {
                  const publisherReviewCount = publisherEditorRequestCount.get(editor.id) ?? 0;
                  const hasActiveReview = editor._count.editorReviewAssignments > 0 || publisherReviewCount > 0;
                  return (
                    <tr key={editor.id}>
                      <th scope="row">{editor.displayName || editor.fullName}</th>
                      <td className="admin-delete-table__wrap">{editor.email}</td>
                      <td><span className="admin-delete-table__id">{editor.publicId}</span><small>{editor.status}</small></td>
                      <td className="admin-delete-table__number">{editor._count.editorReviewAssignments}</td>
                      <td className="admin-delete-table__number">{publisherReviewCount}</td>
                      <td className="admin-delete-table__number">{editor._count.feedbackWritten}</td>
                      <td>{hasActiveReview ? <span className="admin-delete-blocker">Aktif inceleme bulunduğu için önce iş akışını kapatın veya devredin.</span> : <span className="admin-delete-table__safe">—</span>}</td>
                      <td><Link href={"/sistem-yonetimi/editorler/" + editor.id}>Editör detayını aç</Link></td>
                      <td>{deletionForm({ blocked: hasActiveReview, id: editor.id, label: "Editörü sil", targetType: "editor", query: q })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="admin-profile-empty">Editör bulunamadı.</p>}
        </section>
      ) : null}
    </div>
  );
}
