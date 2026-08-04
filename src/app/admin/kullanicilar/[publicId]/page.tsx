import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

const roleLabels = {
  reader: "Okuyucu",
  writer: "Yazar",
  editor_pending: "Editör adayı",
  editor: "Editör",
  publisher: "Yayınevi",
  admin: "Admin",
} as const;

const statusLabels = {
  active: "Aktif",
  suspended: "Askıda",
  disabled: "Kapalı",
} as const;

const workStatusLabels = {
  draft: "Taslak",
  in_review: "İncelemede",
  published: "Yayında",
  archived: "Arşivde",
} as const;

function formatDate(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function textPreview(value: string, limit = 180) {
  return value.length <= limit
    ? value
    : `${value.slice(0, limit).trim()}…`;
}

type PageProps = {
  params: Promise<{
    publicId: string;
  }>;
};

export default async function AdminUserProfilePage({
  params,
}: PageProps) {
  const { publicId } = await params;

  const user = await prisma.user.findUnique({
    where: { publicId },
    select: {
      id: true,
      publicId: true,
      email: true,
      fullName: true,
      displayName: true,
      username: true,
      bio: true,
      role: true,
      status: true,
      emailVerified: true,
      termsAcceptedAt: true,
      lastLoginAt: true,
      isPremium: true,
      isBanned: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
      profile: {
        select: {
          city: true,
          country: true,
          website: true,
          writingGenres: true,
          completionPercentage: true,
        },
      },
      works: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          publicId: true,
          title: true,
          status: true,
          editorReviewStatus: true,
          createdAt: true,
          publishedAt: true,
          archivedAt: true,
          _count: {
            select: {
              chapters: true,
              comments: true,
              favorites: true,
              readingProgress: true,
            },
          },
        },
      },
      comments: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          publicId: true,
          content: true,
          status: true,
          createdAt: true,
          work: {
            select: {
              publicId: true,
              title: true,
            },
          },
        },
      },
      readingProgress: {
        orderBy: { lastReadAt: "desc" },
        take: 30,
        select: {
          progressPercent: true,
          completed: true,
          startedAt: true,
          lastReadAt: true,
          completedAt: true,
          work: {
            select: {
              publicId: true,
              title: true,
            },
          },
        },
      },
      favorites: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          createdAt: true,
          work: {
            select: {
              publicId: true,
              title: true,
            },
          },
        },
      },
      editorReviewAssignments: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          stage: true,
          source: true,
          status: true,
          assignedAt: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          work: {
            select: {
              id: true,
              publicId: true,
              title: true,
            },
          },
        },
      },
      feedbackWritten: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          title: true,
          reportStatus: true,
          status: true,
          isProfessionalReview: true,
          createdAt: true,
          work: {
            select: {
              id: true,
              publicId: true,
              title: true,
            },
          },
        },
      },
      publisherMemberships: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          role: true,
          active: true,
          createdAt: true,
          publisher: {
            select: {
              id: true,
              publicId: true,
              companyName: true,
              active: true,
              archivedAt: true,
            },
          },
        },
      },
      publisherApplications: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          publisherName: true,
          verificationStatus: true,
          submittedAt: true,
          createdAt: true,
          publisher: {
            select: {
              id: true,
              publicId: true,
              companyName: true,
            },
          },
        },
      },
      roleRequests: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          requestedRole: true,
          status: true,
          reviewNote: true,
          reviewedAt: true,
          createdAt: true,
        },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const commentedWorkCount = new Set(
    user.comments.map((comment) => comment.work.publicId),
  ).size;

  const completedReviews =
    user.editorReviewAssignments.filter(
      (assignment) => assignment.status === "completed",
    ).length;

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            Global kullanıcı profili
          </span>
          <h1>{user.displayName || user.fullName}</h1>
          <p>
            {user.publicId} kimliğine bağlı hesap, rol ve
            platform geçmişi.
          </p>
        </div>

        <Link
          className="admin-button"
          href="/admin/kullanicilar"
        >
          ← Kullanıcılara dön
        </Link>
      </section>

      <section className="admin-profile-hero">
        <div>
          <span
            className="admin-table-badge"
            data-status={user.status}
          >
            {statusLabels[user.status]}
          </span>

          <span className="admin-profile-role">
            {roleLabels[user.role]}
          </span>

          <h2>{user.publicId}</h2>
          <p>{user.email}</p>
        </div>

        <dl>
          <div>
            <dt>Üyelik</dt>
            <dd>{formatDate(user.createdAt)}</dd>
          </div>
          <div>
            <dt>Son giriş</dt>
            <dd>{formatDate(user.lastLoginAt)}</dd>
          </div>
          <div>
            <dt>E-posta</dt>
            <dd>
              {user.emailVerified
                ? "Doğrulandı"
                : "Doğrulanmadı"}
            </dd>
          </div>
          <div>
            <dt>Hesap</dt>
            <dd>
              {user.deletedAt
                ? "Arşiv kaydı"
                : user.isBanned
                  ? "Engelli"
                  : "Sistemde"}
            </dd>
          </div>
        </dl>
      </section>

      <section
        className="admin-profile-metrics"
        aria-label="Kullanıcı özeti"
      >
        <article>
          <span>Yazdığı eser</span>
          <strong>{user.works.length}</strong>
        </article>
        <article>
          <span>Yaptığı yorum</span>
          <strong>{user.comments.length}</strong>
        </article>
        <article>
          <span>Yorum yaptığı eser</span>
          <strong>{commentedWorkCount}</strong>
        </article>
        <article>
          <span>Okuma kaydı</span>
          <strong>{user.readingProgress.length}</strong>
        </article>
        <article>
          <span>Favori</span>
          <strong>{user.favorites.length}</strong>
        </article>
        <article>
          <span>Tamamlanan inceleme</span>
          <strong>{completedReviews}</strong>
        </article>
      </section>

      <section className="admin-profile-grid">
        <article className="admin-panel admin-profile-section">
          <div className="admin-panel__heading">
            <div>
              <span>Hesap</span>
              <h2>Kimlik ve profil bilgileri</h2>
            </div>
          </div>

          <dl className="admin-profile-details">
            <div>
              <dt>Ad soyad</dt>
              <dd>{user.fullName}</dd>
            </div>
            <div>
              <dt>Görünen ad</dt>
              <dd>{user.displayName || "—"}</dd>
            </div>
            <div>
              <dt>Kullanıcı adı</dt>
              <dd>{user.username || "—"}</dd>
            </div>
            <div>
              <dt>Şehir / ülke</dt>
              <dd>
                {[user.profile?.city, user.profile?.country]
                  .filter(Boolean)
                  .join(" / ") || "—"}
              </dd>
            </div>
            <div>
              <dt>Profil tamamlanma</dt>
              <dd>
                %{user.profile?.completionPercentage ?? 0}
              </dd>
            </div>
            <div>
              <dt>Son güncelleme</dt>
              <dd>{formatDate(user.updatedAt)}</dd>
            </div>
          </dl>

          {user.bio ? (
            <p className="admin-profile-description">
              {user.bio}
            </p>
          ) : null}
        </article>

        <article className="admin-panel admin-profile-section">
          <div className="admin-panel__heading">
            <div>
              <span>Rol</span>
              <h2>Başvuru ve rol geçmişi</h2>
            </div>
          </div>

          {user.roleRequests.length ? (
            <div className="admin-profile-list">
              {user.roleRequests.map((request, index) => (
                <div key={`${request.createdAt}-${index}`}>
                  <strong>
                    {roleLabels[request.requestedRole]}
                  </strong>
                  <span>{request.status}</span>
                  <small>
                    {formatDate(
                      request.reviewedAt || request.createdAt,
                    )}
                  </small>
                  {request.reviewNote ? (
                    <p>{request.reviewNote}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-profile-empty">
              Rol başvurusu bulunmuyor.
            </p>
          )}
        </article>
      </section>

      <section className="admin-panel admin-profile-section">
        <div className="admin-panel__heading">
          <div>
            <span>Yazar faaliyeti</span>
            <h2>Eserler</h2>
          </div>
          <b>{user.works.length} kayıt</b>
        </div>

        {user.works.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Eser</th>
                  <th>Durum</th>
                  <th>Editör aşaması</th>
                  <th>Okuma / yorum</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {user.works.map((work) => (
                  <tr key={work.publicId}>
                    <td>
                      <Link
                        href={`/admin/eserler/${work.id}`}
                      >
                        <strong>{work.publicId}</strong>
                        <span>{work.title}</span>
                      </Link>
                    </td>
                    <td>{workStatusLabels[work.status]}</td>
                    <td>{work.editorReviewStatus}</td>
                    <td>
                      {work._count.readingProgress} okuma ·{" "}
                      {work._count.comments} yorum ·{" "}
                      {work._count.favorites} favori
                    </td>
                    <td>{formatDate(work.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-profile-empty">
            Kullanıcının yazdığı eser bulunmuyor.
          </p>
        )}
      </section>

      <section className="admin-panel admin-profile-section">
        <div className="admin-panel__heading">
          <div>
            <span>Okuyucu faaliyeti</span>
            <h2>Yorum yaptığı eserler</h2>
          </div>
          <b>{user.comments.length} yorum</b>
        </div>

        {user.comments.length ? (
          <div className="admin-profile-list">
            {user.comments.map((comment) => (
              <div key={comment.publicId}>
                <strong>
                  {comment.publicId} · {comment.work.title}
                </strong>
                <span>{comment.work.publicId}</span>
                <p>{textPreview(comment.content)}</p>
                <small>
                  {comment.status} ·{" "}
                  {formatDate(comment.createdAt)}
                </small>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-profile-empty">
            Kullanıcının yorumu bulunmuyor.
          </p>
        )}
      </section>

      <section className="admin-profile-grid">
        <article className="admin-panel admin-profile-section">
          <div className="admin-panel__heading">
            <div>
              <span>Okuma geçmişi</span>
              <h2>Okuduğu eserler</h2>
            </div>
          </div>

          {user.readingProgress.length ? (
            <div className="admin-profile-list">
              {user.readingProgress.map((progress) => (
                <div key={progress.work.publicId}>
                  <strong>{progress.work.title}</strong>
                  <span>{progress.work.publicId}</span>
                  <p>
                    %{progress.progressPercent} ·{" "}
                    {progress.completed
                      ? "Tamamlandı"
                      : "Okunuyor"}
                  </p>
                  <small>
                    Son okuma: {formatDate(progress.lastReadAt)}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-profile-empty">
              Okuma geçmişi bulunmuyor.
            </p>
          )}
        </article>

        <article className="admin-panel admin-profile-section">
          <div className="admin-panel__heading">
            <div>
              <span>Okuyucu tercihleri</span>
              <h2>Favori eserler</h2>
            </div>
          </div>

          {user.favorites.length ? (
            <div className="admin-profile-list">
              {user.favorites.map((favorite) => (
                <div key={favorite.work.publicId}>
                  <strong>{favorite.work.title}</strong>
                  <span>{favorite.work.publicId}</span>
                  <small>
                    {formatDate(favorite.createdAt)}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-profile-empty">
              Favori eser bulunmuyor.
            </p>
          )}
        </article>
      </section>

      <section className="admin-panel admin-profile-section">
        <div className="admin-panel__heading">
          <div>
            <span>Editör faaliyeti</span>
            <h2>İnceleme görevleri ve raporları</h2>
          </div>
          <b>
            {user.editorReviewAssignments.length} görev
          </b>
        </div>

        {user.editorReviewAssignments.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Eser</th>
                  <th>Aşama</th>
                  <th>Durum</th>
                  <th>Başlangıç</th>
                  <th>Tamamlanma</th>
                </tr>
              </thead>
              <tbody>
                {user.editorReviewAssignments.map(
                  (assignment, index) => (
                    <tr
                      key={`${assignment.work.publicId}-${assignment.stage}-${index}`}
                    >
                      <td>
                        <Link
                          href={`/admin/eserler/${assignment.work.id}`}
                        >
                          <strong>
                            {assignment.work.publicId}
                          </strong>
                          <span>
                            {assignment.work.title}
                          </span>
                        </Link>
                      </td>
                      <td>{assignment.stage}</td>
                      <td>{assignment.status}</td>
                      <td>
                        {formatDate(
                          assignment.startedAt ||
                            assignment.assignedAt,
                        )}
                      </td>
                      <td>
                        {formatDate(assignment.completedAt)}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-profile-empty">
            Editör görevi bulunmuyor.
          </p>
        )}
      </section>

      <section className="admin-profile-grid">
        <article className="admin-panel admin-profile-section">
          <div className="admin-panel__heading">
            <div>
              <span>Yayınevi</span>
              <h2>Üyelikler</h2>
            </div>
          </div>

          {user.publisherMemberships.length ? (
            <div className="admin-profile-list">
              {user.publisherMemberships.map(
                (membership) => (
                  <div key={membership.publisher.publicId}>
                    <Link
                      href={`/admin/yayinevleri/${membership.publisher.id}`}
                    >
                      <strong>
                        {membership.publisher.companyName}
                      </strong>
                    </Link>
                    <span>
                      {membership.publisher.publicId} ·{" "}
                      {membership.role}
                    </span>
                    <small>
                      {membership.active
                        ? "Aktif üyelik"
                        : "Pasif üyelik"}
                    </small>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="admin-profile-empty">
              Yayınevi üyeliği bulunmuyor.
            </p>
          )}
        </article>

        <article className="admin-panel admin-profile-section">
          <div className="admin-panel__heading">
            <div>
              <span>Yayınevi</span>
              <h2>Başvurular</h2>
            </div>
          </div>

          {user.publisherApplications.length ? (
            <div className="admin-profile-list">
              {user.publisherApplications.map(
                (application, index) => (
                  <div
                    key={`${application.publisherName}-${index}`}
                  >
                    <strong>
                      {application.publisherName}
                    </strong>
                    <span>
                      {application.verificationStatus}
                    </span>
                    <small>
                      {formatDate(
                        application.submittedAt ||
                          application.createdAt,
                      )}
                    </small>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="admin-profile-empty">
              Yayınevi başvurusu bulunmuyor.
            </p>
          )}
        </article>
      </section>

      <section className="admin-panel admin-profile-section">
        <div className="admin-panel__heading">
          <div>
            <span>Sistem geçmişi</span>
            <h2>Son denetlenebilir hareketler</h2>
          </div>
        </div>

        {user.auditLogs.length ? (
          <div className="admin-profile-list">
            {user.auditLogs.map((log) => (
              <div key={log.id}>
                <strong>{log.action}</strong>
                <span>
                  {[log.entityType, log.entityId]
                    .filter(Boolean)
                    .join(" · ") || "Kullanıcı hesabı"}
                </span>
                <small>{formatDate(log.createdAt)}</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-profile-empty">
            Audit Log kaydı bulunmuyor.
          </p>
        )}
      </section>
    </>
  );
}
