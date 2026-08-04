import Link from "next/link";
import type {
  Prisma,
  UserStatus,
} from "@/generated/prisma/client";
import { updateUserStatusAction } from "@/features/admin/actions";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

const statusLabels = {
  active: "Aktif",
  suspended: "Askıda",
  disabled: "Devre dışı",
} as const;

const activityLabels = {
  reading: "Okumaya devam ediyor",
  completed: "Eser tamamladı",
  comments: "Yorum yaptı",
  favorites: "Favorisi var",
} as const;

type SearchParams = Promise<{
  q?: string;
  durum?: string;
  hareket?: string;
  page?: string;
}>;

function isStatus(
  value: string | undefined,
): value is UserStatus {
  return Boolean(
    value &&
      Object.hasOwn(statusLabels, value),
  );
}

function isActivity(
  value: string | undefined,
): value is keyof typeof activityLabels {
  return Boolean(
    value &&
      Object.hasOwn(activityLabels, value),
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
  activity: string,
  page: number,
) {
  const params = new URLSearchParams({
    page: String(page),
  });

  if (query) params.set("q", query);
  if (status) params.set("durum", status);
  if (activity) params.set("hareket", activity);

  return `/admin/okuyucular?${params.toString()}`;
}

export default async function AdminReadersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = isStatus(params.durum)
    ? params.durum
    : "";
  const activity = isActivity(params.hareket)
    ? params.hareket
    : "";

  const requestedPage =
    Number.parseInt(params.page ?? "1", 10);

  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const activityFilter: Prisma.UserWhereInput =
    activity === "reading"
      ? {
          readingProgress: {
            some: { completed: false },
          },
        }
      : activity === "completed"
        ? {
            readingProgress: {
              some: { completed: true },
            },
          }
        : activity === "comments"
          ? { comments: { some: {} } }
          : activity === "favorites"
            ? { favorites: { some: {} } }
            : {};

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    role: "reader",
    ...(status ? { status } : {}),
    ...activityFilter,
    ...(query
      ? {
          OR: [
            { publicId: { contains: query } },
            { fullName: { contains: query } },
            { displayName: { contains: query } },
            { email: { contains: query } },
            { username: { contains: query } },
          ],
        }
      : {}),
  };

  const [
    filteredCount,
    totalReaders,
    activeReaders,
    readersWithProgress,
    readersWithComments,
  ] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({
      where: {
        deletedAt: null,
        role: "reader",
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        role: "reader",
        status: "active",
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        role: "reader",
        readingProgress: { some: {} },
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        role: "reader",
        comments: { some: {} },
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

  const readers = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
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
      _count: {
        select: {
          comments: true,
          favorites: true,
          readingProgress: true,
        },
      },
      readingProgress: {
        orderBy: { lastReadAt: "desc" },
        take: 1,
        select: {
          completed: true,
          lastReadAt: true,
          progressPercent: true,
          work: {
            select: {
              publicId: true,
              title: true,
            },
          },
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
            Okuyucu ağı
          </span>
          <h1>Okuyucular</h1>
          <p>
            Okuma ilerlemesini, yorumları, favorileri ve
            hesap durumlarını gerçek verilerle izleyin.
          </p>
        </div>
      </header>

      <section className="admin-stats-grid admin-directory-stats">
        {[
          ["Toplam okuyucu", totalReaders],
          ["Aktif okuyucu", activeReaders],
          ["Okumaya başlayan", readersWithProgress],
          ["Yorum yapan", readersWithComments],
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
            <span>Okuyucu ara</span>
            <input
              defaultValue={query}
              name="q"
              placeholder="IKO kimliği, ad veya e-posta"
              type="search"
            />
          </label>

          <label>
            <span>Hesap durumu</span>
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

          <label>
            <span>Okuyucu hareketi</span>
            <select
              defaultValue={activity}
              name="hareket"
            >
              <option value="">Tüm hareketler</option>
              {Object.entries(activityLabels).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>

          <button type="submit">Filtrele</button>

          {query || status || activity ? (
            <Link href="/admin/okuyucular">
              Temizle
            </Link>
          ) : null}
        </form>

        {readers.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>İlkOku kimliği</th>
                  <th>Okuyucu</th>
                  <th>Hesap durumu</th>
                  <th>Okuma aşaması</th>
                  <th>Hareketler</th>
                  <th>Yorum</th>
                  <th>Son giriş</th>
                  <th>Üyelik</th>
                </tr>
              </thead>

              <tbody>
                {readers.map((reader) => {
                  const latest =
                    reader.readingProgress[0];

                  return (
                    <tr key={reader.id}>
                      <td>
                        <strong className="admin-public-id">
                          {reader.publicId}
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {reader.displayName ||
                            reader.fullName}
                        </strong>
                        <span>{reader.email}</span>
                        <small>
                          @{reader.username || "kullanıcı-adı-yok"}
                        </small>
                      </td>

                      <td>
                        <form
                          action={updateUserStatusAction}
                          className="admin-user-control"
                        >
                          <input
                            name="userId"
                            type="hidden"
                            value={reader.id}
                          />
                          <select
                            aria-label={`${reader.email} durumu`}
                            defaultValue={reader.status}
                            name="status"
                          >
                            {Object.entries(
                              statusLabels,
                            ).map(([value, label]) => (
                              <option
                                key={value}
                                value={value}
                              >
                                {label}
                              </option>
                            ))}
                          </select>
                          <button type="submit">
                            Kaydet
                          </button>
                        </form>
                      </td>

                      <td>
                        {latest ? (
                          <>
                            <strong>
                              {latest.completed
                                ? "Tamamlandı"
                                : `%${latest.progressPercent}`}
                            </strong>
                            <span>{latest.work.title}</span>
                            <small>
                              {latest.work.publicId}
                            </small>
                          </>
                        ) : (
                          <span>Henüz okumaya başlamadı</span>
                        )}
                      </td>

                      <td>
                        <span>
                          {reader._count.readingProgress} okuma
                        </span>
                        <small>
                          {reader._count.comments} yorum ·{" "}
                          {reader._count.favorites} favori
                        </small>
                      </td>

                      <td>
                        {reader._count.comments > 0 ? (
                          <Link
                            className="admin-comment-link"
                            href={`/admin/okuyucular/${encodeURIComponent(
                              reader.publicId,
                            )}#yorum-gecmisi`}
                          >
                            Yorumu Gör
                          </Link>
                        ) : (
                          <Link
                            className="admin-comment-link"
                            href={`/admin/okuyucular/${encodeURIComponent(
                              reader.publicId,
                            )}`}
                          >
                            Okuyucuyu Gör
                          </Link>
                        )}
                      </td>

                      <td>
                        {reader.lastLoginAt ? (
                          <time>
                            {formatDate(reader.lastLoginAt)}
                          </time>
                        ) : (
                          <span>Henüz giriş yapmadı</span>
                        )}
                      </td>

                      <td>
                        <time>
                          {formatDate(reader.createdAt)}
                        </time>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Okuyucu bulunamadı</strong>
            <p>
              Seçilen filtrelerle eşleşen okuyucu kaydı
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
                  activity,
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
                  activity,
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
