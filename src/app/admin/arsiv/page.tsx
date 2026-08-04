import Link from "next/link";
import {
  updateCommentModerationAction,
  updatePublisherArchiveStatusAction,
  updateUserStatusAction,
  updateWorkArchiveStatusAction,
} from "@/features/admin/actions";
import { prisma } from "@/lib/prisma";

const roleLabels = {
  reader: "Okuyucu",
  writer: "Yazar",
  editor_pending: "Editör adayı",
  editor: "Editör",
  publisher: "Yayınevi",
  admin: "Admin",
} as const;

function formatDate(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminArchivePage() {
  const [
    users,
    works,
    publishers,
    comments,
  ] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          {
            status: {
              in: ["suspended", "disabled"],
            },
          },
          { deletedAt: { not: null } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        publicId: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    }),
    prisma.work.findMany({
      where: {
        OR: [
          { status: "archived" },
          { archivedAt: { not: null } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        publicId: true,
        title: true,
        archivedAt: true,
        updatedAt: true,
        author: {
          select: {
            publicId: true,
            fullName: true,
          },
        },
      },
    }),
    prisma.publisher.findMany({
      where: {
        OR: [
          { active: false },
          { archivedAt: { not: null } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        publicId: true,
        companyName: true,
        archivedAt: true,
        updatedAt: true,
      },
    }),
    prisma.comment.findMany({
      where: {
        OR: [
          { status: "hidden" },
          { deletedAt: { not: null } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        publicId: true,
        content: true,
        updatedAt: true,
        user: {
          select: {
            publicId: true,
            fullName: true,
          },
        },
        work: {
          select: {
            publicId: true,
            title: true,
          },
        },
      },
    }),
  ]);

  const total =
    users.length +
    works.length +
    publishers.length +
    comments.length;

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            Korunan sistem kayıtları
          </span>
          <h1>Arşiv Merkezi</h1>
          <p>
            Askıya alınan veya kapatılan hesapları,
            arşivlenen eserleri ve yayınevlerini,
            gizlenen yorumları tek merkezden yönetin.
          </p>
        </div>

        <strong className="admin-archive-total">
          {total} kayıt
        </strong>
      </section>

      <section className="admin-archive-summary">
        <article>
          <span>Hesap</span>
          <strong>{users.length}</strong>
        </article>
        <article>
          <span>Eser</span>
          <strong>{works.length}</strong>
        </article>
        <article>
          <span>Yayınevi</span>
          <strong>{publishers.length}</strong>
        </article>
        <article>
          <span>Yorum</span>
          <strong>{comments.length}</strong>
        </article>
      </section>

      <section className="admin-panel admin-archive-section">
        <div className="admin-panel__heading">
          <div>
            <span>Hesap arşivi</span>
            <h2>Askıda ve kapalı kullanıcılar</h2>
          </div>
          <b>{users.length}</b>
        </div>

        {users.length ? (
          <div className="admin-profile-list">
            {users.map((user) => (
              <div key={user.id}>
                <Link
                  href={`/admin/kullanicilar/${user.publicId}`}
                >
                  <strong>
                    {user.publicId} · {user.fullName}
                  </strong>
                </Link>

                <span>
                  {roleLabels[user.role]} ·{" "}
                  {user.status === "suspended"
                    ? "Askıda"
                    : "Kapalı"}
                </span>

                <small>
                  {user.email} ·{" "}
                  {formatDate(user.updatedAt)}
                </small>

                <form action={updateUserStatusAction}>
                  <input
                    name="userId"
                    type="hidden"
                    value={user.id}
                  />
                  <input
                    name="status"
                    type="hidden"
                    value="active"
                  />
                  <button
                    className="admin-inline-action"
                    type="submit"
                  >
                    Hesabı yeniden aç
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-profile-empty">
            Askıda veya kapalı hesap bulunmuyor.
          </p>
        )}
      </section>

      <section className="admin-panel admin-archive-section">
        <div className="admin-panel__heading">
          <div>
            <span>Eser arşivi</span>
            <h2>Arşivlenen eserler</h2>
          </div>
          <b>{works.length}</b>
        </div>

        {works.length ? (
          <div className="admin-profile-list">
            {works.map((work) => (
              <div key={work.id}>
                <Link href={`/admin/eserler/${work.id}`}>
                  <strong>
                    {work.publicId} · {work.title}
                  </strong>
                </Link>

                <span>
                  {work.author.fullName} ·{" "}
                  {work.author.publicId}
                </span>

                <small>
                  {formatDate(
                    work.archivedAt || work.updatedAt,
                  )}
                </small>

                <form
                  action={updateWorkArchiveStatusAction}
                >
                  <input
                    name="workId"
                    type="hidden"
                    value={work.id}
                  />
                  <input
                    name="mode"
                    type="hidden"
                    value="restore"
                  />
                  <button
                    className="admin-inline-action"
                    type="submit"
                  >
                    Eseri geri al
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-profile-empty">
            Arşivlenmiş eser bulunmuyor.
          </p>
        )}
      </section>

      <section className="admin-profile-grid">
        <article className="admin-panel admin-archive-section">
          <div className="admin-panel__heading">
            <div>
              <span>Kurumsal arşiv</span>
              <h2>Yayınevleri</h2>
            </div>
            <b>{publishers.length}</b>
          </div>

          {publishers.length ? (
            <div className="admin-profile-list">
              {publishers.map((publisher) => (
                <div key={publisher.id}>
                  <Link
                    href={`/admin/yayinevleri/${publisher.id}`}
                  >
                    <strong>
                      {publisher.companyName}
                    </strong>
                  </Link>

                  <span>{publisher.publicId}</span>

                  <small>
                    {formatDate(
                      publisher.archivedAt ||
                        publisher.updatedAt,
                    )}
                  </small>

                  <form
                    action={
                      updatePublisherArchiveStatusAction
                    }
                  >
                    <input
                      name="publisherId"
                      type="hidden"
                      value={publisher.id}
                    />
                    <input
                      name="mode"
                      type="hidden"
                      value="restore"
                    />
                    <button
                      className="admin-inline-action"
                      type="submit"
                    >
                      Yayınevini geri aç
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-profile-empty">
              Arşivlenmiş yayınevi bulunmuyor.
            </p>
          )}
        </article>

        <article className="admin-panel admin-archive-section">
          <div className="admin-panel__heading">
            <div>
              <span>Yorum arşivi</span>
              <h2>Gizlenen yorumlar</h2>
            </div>
            <b>{comments.length}</b>
          </div>

          {comments.length ? (
            <div className="admin-profile-list">
              {comments.map((comment) => (
                <div key={comment.id}>
                  <strong>
                    {comment.publicId} ·{" "}
                    {comment.work.title}
                  </strong>

                  <span>
                    {comment.user.fullName} ·{" "}
                    {comment.user.publicId}
                  </span>

                  <p>{comment.content}</p>

                  <small>
                    {formatDate(comment.updatedAt)}
                  </small>

                  <form
                    action={updateCommentModerationAction}
                  >
                    <input
                      name="commentId"
                      type="hidden"
                      value={comment.id}
                    />
                    <input
                      name="status"
                      type="hidden"
                      value="visible"
                    />
                    <button
                      className="admin-inline-action"
                      type="submit"
                    >
                      Yorumu geri aç
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-profile-empty">
              Gizlenmiş yorum bulunmuyor.
            </p>
          )}
        </article>
      </section>
    </>
  );
}
