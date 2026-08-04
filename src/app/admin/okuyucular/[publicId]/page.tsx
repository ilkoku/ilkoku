import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

const statusLabels = {
  active: "Aktif",
  suspended: "Askıda",
  disabled: "Devre dışı",
} as const;

const commentStatusLabels = {
  visible: "Görünür",
  reported: "Bildirildi",
  hidden: "Gizli",
} as const;

function formatDate(value: Date | null) {
  if (!value) {
    return "Kayıt yok";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminReaderDetailPage({
  params,
}: {
  params: Promise<{
    publicId: string;
  }>;
}) {
  const { publicId } = await params;

  const reader = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      publicId,
      role: "reader",
    },
    select: {
      id: true,
      publicId: true,
      fullName: true,
      displayName: true,
      email: true,
      username: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
      profile: {
        select: {
          city: true,
          country: true,
          completionPercentage: true,
        },
      },
      _count: {
        select: {
          favorites: true,
          readingProgress: true,
        },
      },
      comments: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          publicId: true,
          content: true,
          status: true,
          parentId: true,
          createdAt: true,
          editedAt: true,
          work: {
            select: {
              id: true,
              publicId: true,
              title: true,
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
      },
    },
  });

  if (!reader) {
    notFound();
  }

  type ReaderComment =
    (typeof reader.comments)[number];

  const workGroups = new Map<
    string,
    {
      comments: ReaderComment[];
      work: ReaderComment["work"];
    }
  >();

  for (const comment of reader.comments) {
    const existing =
      workGroups.get(comment.work.id);

    if (existing) {
      existing.comments.push(comment);
    } else {
      workGroups.set(comment.work.id, {
        comments: [comment],
        work: comment.work,
      });
    }
  }

  const groupedComments =
    Array.from(workGroups.values());

  const visibleCount =
    reader.comments.filter(
      (comment) =>
        comment.status === "visible",
    ).length;

  const reportedCount =
    reader.comments.filter(
      (comment) =>
        comment.status === "reported",
    ).length;

  const hiddenCount =
    reader.comments.filter(
      (comment) =>
        comment.status === "hidden",
    ).length;

  return (
    <div className="admin-directory-page">
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            Okuyucu kaydı
          </span>

          <h1>
            {reader.displayName ||
              reader.fullName}
          </h1>

          <p>
            {reader.publicId} · {reader.email}
          </p>
        </div>

        <Link
          className="admin-button admin-button--ghost"
          href="/admin/okuyucular"
        >
          Okuyuculara dön
        </Link>
      </header>

      <section
        className="admin-stats-grid admin-directory-stats"
        aria-label="Okuyucu yorum özeti"
      >
        {[
          [
            "Toplam yorum",
            reader.comments.length,
          ],
          [
            "Yorum yapılan eser",
            groupedComments.length,
          ],
          [
            "Görünür",
            visibleCount,
          ],
          [
            "Bildirildi",
            reportedCount,
          ],
          [
            "Gizli",
            hiddenCount,
          ],
        ].map(([label, value]) => (
          <article
            className="admin-stat"
            key={label}
          >
            <span>{label}</span>
            <strong>
              {Number(value).toLocaleString(
                "tr-TR",
              )}
            </strong>
          </article>
        ))}
      </section>

      <section className="admin-detail-grid">
        <article className="admin-panel">
          <h2>Okuyucu bilgileri</h2>

          <dl className="admin-detail-list">
            <div>
              <dt>İlkOku kimliği</dt>
              <dd className="admin-public-id">
                {reader.publicId}
              </dd>
            </div>

            <div>
              <dt>Hesap durumu</dt>
              <dd>
                {statusLabels[reader.status]}
              </dd>
            </div>

            <div>
              <dt>Kullanıcı adı</dt>
              <dd>
                {reader.username ||
                  "Belirtilmedi"}
              </dd>
            </div>

            <div>
              <dt>Şehir / ülke</dt>
              <dd>
                {[
                  reader.profile?.city,
                  reader.profile?.country,
                ]
                  .filter(Boolean)
                  .join(" / ") ||
                  "Belirtilmedi"}
              </dd>
            </div>

            <div>
              <dt>Profil tamamlanma</dt>
              <dd>
                %
                {reader.profile
                  ?.completionPercentage ?? 0}
              </dd>
            </div>
          </dl>
        </article>

        <article className="admin-panel">
          <h2>Okuma hareketleri</h2>

          <dl className="admin-detail-list">
            <div>
              <dt>Okuma kaydı</dt>
              <dd>
                {reader._count.readingProgress}
              </dd>
            </div>

            <div>
              <dt>Favori eser</dt>
              <dd>
                {reader._count.favorites}
              </dd>
            </div>

            <div>
              <dt>Son giriş</dt>
              <dd>
                {formatDate(reader.lastLoginAt)}
              </dd>
            </div>

            <div>
              <dt>Üyelik tarihi</dt>
              <dd>
                {formatDate(reader.createdAt)}
              </dd>
            </div>
          </dl>
        </article>
      </section>

      <section
        className="admin-reader-comments"
        id="yorum-gecmisi"
      >
        <div className="admin-panel__heading">
          <div>
            <span>Okuyucu hareketleri</span>
            <h2>Yorum Geçmişi</h2>
          </div>

          <b>
            {reader.comments.length} yorum ·{" "}
            {groupedComments.length} eser
          </b>
        </div>

        {groupedComments.length ? (
          <div className="admin-reader-comment-groups">
            {groupedComments.map(
              (group) => (
                <article
                  className="admin-panel admin-reader-comment-work"
                  key={group.work.id}
                >
                  <header>
                    <div>
                      <span className="admin-public-id">
                        {group.work.publicId}
                      </span>
                      <h3>{group.work.title}</h3>
                      <p>
                        Bu eserde{" "}
                        {group.comments.length} yorum
                      </p>
                    </div>

                    <Link
                      href={`/admin/eserler/${group.work.id}`}
                    >
                      Eseri incele
                    </Link>
                  </header>

                  <div className="admin-reader-comment-list">
                    {group.comments.map(
                      (comment) => (
                        <article
                          className="admin-reader-comment"
                          key={comment.id}
                        >
                          <header>
                            <span className="admin-public-id">
                              {comment.publicId}
                            </span>

                            <span
                              className="admin-table-badge"
                              data-status={
                                comment.status
                              }
                            >
                              {
                                commentStatusLabels[
                                  comment.status
                                ]
                              }
                            </span>

                            <time
                              dateTime={
                                comment.createdAt
                                  .toISOString()
                              }
                            >
                              {formatDate(
                                comment.createdAt,
                              )}
                            </time>
                          </header>

                          <p>{comment.content}</p>

                          <footer>
                            <span>
                              {comment.parentId
                                ? "Yanıt"
                                : "Ana yorum"}
                            </span>

                            <span>
                              {
                                comment._count
                                  .replies
                              }{" "}
                              yanıt
                            </span>

                            {comment.editedAt ? (
                              <span>
                                Düzenlendi
                              </span>
                            ) : null}
                          </footer>
                        </article>
                      ),
                    )}
                  </div>
                </article>
              ),
            )}
          </div>
        ) : (
          <div className="admin-panel admin-empty-state">
            <strong>
              Bu okuyucunun yorumu bulunmuyor
            </strong>
            <p>
              Yorum yaptığında eser bazında burada
              görüntülenecek.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
