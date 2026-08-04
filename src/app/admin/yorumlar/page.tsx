import Link from "next/link";
import type {
  CommentStatus,
  Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 25;

const statusLabels = {
  visible: "Görünür",
  reported: "Bildirildi",
  hidden: "Gizli",
} as const;

type SearchParams = Promise<{
  q?: string;
  durum?: string;
  page?: string;
}>;

function isStatus(
  value: string | undefined,
): value is CommentStatus {
  return Boolean(
    value &&
      Object.hasOwn(statusLabels, value),
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function pageHref(
  query: string,
  status: string,
  page: number,
) {
  const params = new URLSearchParams({
    page: String(page),
  });

  if (query) params.set("q", query);
  if (status) params.set("durum", status);

  return `/admin/yorumlar?${params.toString()}`;
}

function excerpt(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  return normalized.length > 180
    ? `${normalized.slice(0, 177)}…`
    : normalized;
}

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = isStatus(params.durum)
    ? params.durum
    : "";

  const requestedPage =
    Number.parseInt(params.page ?? "1", 10);

  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const where: Prisma.CommentWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(query
      ? {
          OR: [
            { publicId: { contains: query } },
            { content: { contains: query } },
            {
              user: {
                is: {
                  OR: [
                    { publicId: { contains: query } },
                    { fullName: { contains: query } },
                    { displayName: { contains: query } },
                    { email: { contains: query } },
                  ],
                },
              },
            },
            {
              work: {
                is: {
                  OR: [
                    { publicId: { contains: query } },
                    { title: { contains: query } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const [
    filteredCount,
    totalComments,
    visibleComments,
    reportedComments,
    hiddenComments,
  ] = await Promise.all([
    prisma.comment.count({ where }),
    prisma.comment.count({
      where: { deletedAt: null },
    }),
    prisma.comment.count({
      where: {
        deletedAt: null,
        status: "visible",
      },
    }),
    prisma.comment.count({
      where: {
        deletedAt: null,
        status: "reported",
      },
    }),
    prisma.comment.count({
      where: {
        deletedAt: null,
        status: "hidden",
      },
    }),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCount / PAGE_SIZE),
  );

  const safePage = Math.min(
    currentPage,
    totalPages,
  );

  const comments = await prisma.comment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      publicId: true,
      content: true,
      status: true,
      parentId: true,
      editedAt: true,
      createdAt: true,
      user: {
        select: {
          publicId: true,
          displayName: true,
          email: true,
          fullName: true,
          role: true,
        },
      },
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
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const first =
    filteredCount
      ? (safePage - 1) * PAGE_SIZE + 1
      : 0;

  const last = Math.min(
    safePage * PAGE_SIZE,
    filteredCount,
  );

  return (
    <div className="admin-directory-page">
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            Topluluk denetimi
          </span>
          <h1>Yorumlar</h1>
          <p>
            Bütün yorumları, ilişkili eseri, kullanıcıyı ve
            mevcut görünürlük aşamasını tek listede inceleyin.
          </p>
        </div>
      </header>

      <section className="admin-stats-grid admin-directory-stats">
        {[
          ["Toplam yorum", totalComments],
          ["Görünür", visibleComments],
          ["Bildirildi", reportedComments],
          ["Gizli", hiddenComments],
        ].map(([label, value]) => (
          <article className="admin-stat" key={label}>
            <span>{label}</span>
            <strong>
              {Number(value).toLocaleString("tr-TR")}
            </strong>
          </article>
        ))}
      </section>

      <section className="admin-panel admin-directory-panel">
        <form
          className="admin-directory-filters"
          method="get"
        >
          <label>
            <span>Yorum ara</span>
            <input
              defaultValue={query}
              name="q"
              placeholder="IKO kimliği, metin, eser veya kullanıcı"
              type="search"
            />
          </label>

          <label>
            <span>Yorum durumu</span>
            <select
              defaultValue={status}
              name="durum"
            >
              <option value="">Tüm durumlar</option>
              {Object.entries(statusLabels).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>

          <button type="submit">Filtrele</button>

          {query || status ? (
            <Link href="/admin/yorumlar">
              Temizle
            </Link>
          ) : null}
        </form>

        {comments.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Yorum kimliği</th>
                  <th>Yorum</th>
                  <th>Eser</th>
                  <th>Kullanıcı</th>
                  <th>Tür</th>
                  <th>Aşama</th>
                  <th>Tarih</th>
                </tr>
              </thead>

              <tbody>
                {comments.map((comment) => (
                  <tr key={comment.id}>
                    <td>
                      <strong className="admin-public-id">
                        {comment.publicId}
                      </strong>
                    </td>

                    <td className="admin-comment-copy">
                      <strong>
                        {excerpt(comment.content)}
                      </strong>

                      <details className="admin-comment-details">
                        <summary>Yorumu Gör</summary>
                        <p>{comment.content}</p>
                      </details>

                      <small>
                        {comment._count.replies} yanıt
                        {comment.editedAt
                          ? " · Düzenlendi"
                          : ""}
                      </small>
                    </td>

                    <td>
                      <strong>{comment.work.title}</strong>
                      <span>{comment.work.publicId}</span>
                      <Link
                        href={`/admin/eserler/${comment.work.id}`}
                      >
                        Eseri aç
                      </Link>
                    </td>

                    <td>
                      <strong>
                        {comment.user.displayName ||
                          comment.user.fullName}
                      </strong>
                      <span>{comment.user.publicId}</span>
                      <small>{comment.user.email}</small>
                    </td>

                    <td>
                      {comment.parentId
                        ? "Yanıt"
                        : "Ana yorum"}
                    </td>

                    <td>
                      <span
                        className="admin-table-badge"
                        data-status={comment.status}
                      >
                        {statusLabels[comment.status]}
                      </span>
                    </td>

                    <td>
                      <time>
                        {formatDate(comment.createdAt)}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Yorum bulunamadı</strong>
            <p>
              Seçilen filtrelerle eşleşen yorum kaydı
              bulunmuyor.
            </p>
          </div>
        )}

        <footer className="admin-pagination">
          <span>
            {first}–{last} / {filteredCount} kayıt
          </span>

          <div>
            {safePage > 1 ? (
              <Link
                href={pageHref(
                  query,
                  status,
                  safePage - 1,
                )}
              >
                ← Önceki
              </Link>
            ) : (
              <span>← Önceki</span>
            )}

            <b>
              {safePage} / {totalPages}
            </b>

            {safePage < totalPages ? (
              <Link
                href={pageHref(
                  query,
                  status,
                  safePage + 1,
                )}
              >
                Sonraki →
              </Link>
            ) : (
              <span>Sonraki →</span>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
