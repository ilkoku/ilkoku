import Link from "next/link";
import type {
  Prisma,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import {
  updateUserRoleAction,
  updateUserStatusAction,
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

const statusLabels = {
  active: "Aktif",
  suspended: "Askıda",
  disabled: "Devre dışı",
} as const;

const standardRoleLabels = {
  reader: "Okuyucu",
  writer: "Yazar",
} as const;

const PAGE_SIZE = 20;

export type UserFilters = {
  q?: string;
  role?: string;
  status?: string;
  page?: string;
};

type UserManagementProps = {
  basePath?: string;
  filters?: UserFilters;
};

function isRole(value: string): value is UserRole {
  return Object.hasOwn(roleLabels, value);
}

function isStatus(value: string): value is UserStatus {
  return Object.hasOwn(statusLabels, value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function buildPageHref(
  filters: UserFilters,
  page: number,
  basePath: string,
) {
  const params = new URLSearchParams();
  const query = filters.q?.trim();

  if (query) params.set("q", query);
  if (filters.role && isRole(filters.role)) {
    params.set("role", filters.role);
  }
  if (filters.status && isStatus(filters.status)) {
    params.set("status", filters.status);
  }

  params.set("page", String(page));

  return `${basePath}?${params.toString()}`;
}

export async function UserManagement({
  basePath = "/admin/kullanicilar",
  filters = {},
}: UserManagementProps) {
  const query = filters.q?.trim() ?? "";
  const selectedRole =
    filters.role && isRole(filters.role)
      ? filters.role
      : "";
  const selectedStatus =
    filters.status && isStatus(filters.status)
      ? filters.status
      : "";

  const requestedPage =
    Number.parseInt(filters.page ?? "1", 10);

  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(selectedRole ? { role: selectedRole } : {}),
    ...(selectedStatus
      ? { status: selectedStatus }
      : {}),
    ...(query
      ? {
          OR: [
            { publicId: { contains: query } },
            { fullName: { contains: query } },
            { email: { contains: query } },
            { displayName: { contains: query } },
            { username: { contains: query } },
          ],
        }
      : {}),
  };

  const totalUsers = await prisma.user.count({ where });
  const totalPages = Math.max(
    1,
    Math.ceil(totalUsers / PAGE_SIZE),
  );
  const safePage = Math.min(currentPage, totalPages);

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      publicId: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      _count: {
        select: {
          comments: true,
          readingProgress: true,
          works: true,
        },
      },
    },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const firstResult =
    totalUsers === 0
      ? 0
      : (safePage - 1) * PAGE_SIZE + 1;

  const lastResult = Math.min(
    safePage * PAGE_SIZE,
    totalUsers,
  );

  return (
    <section
      className="admin-panel admin-users-panel"
      id="kullanicilar"
    >
      <div className="admin-panel__heading">
        <div>
          <span>Kullanıcı yönetimi</span>
          <h2>Üyeler, roller ve durumlar</h2>
        </div>
        <b>{totalUsers} kullanıcı</b>
      </div>

      <form
        action={basePath}
        className="admin-users-filters"
        method="get"
      >
        <label className="admin-users-search">
          <span className="sr-only">Kullanıcı ara</span>
          <input
            defaultValue={query}
            name="q"
            placeholder="IKO kimliği, ad, e-posta veya kullanıcı adı"
            type="search"
          />
        </label>

        <label>
          <span className="sr-only">Role göre filtrele</span>
          <select defaultValue={selectedRole} name="role">
            <option value="">Tüm roller</option>
            {Object.entries(roleLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          <span className="sr-only">Duruma göre filtrele</span>
          <select
            defaultValue={selectedStatus}
            name="status"
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
        <Link href={basePath}>Temizle</Link>
      </form>

      <div className="admin-users-table-wrap">
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>İlkOku kimliği</th>
              <th>Kullanıcı</th>
              <th>Rol</th>
              <th>Durum</th>
              <th>Kayıtları</th>
              <th>Son giriş</th>
              <th>Üyelik</th>
            </tr>
          </thead>

          <tbody>
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <Link
                      className="admin-public-id"
                      href={`/admin/kullanicilar/${user.publicId}`}
                    >
                      {user.publicId}
                    </Link>
                  </td>

                  <td>
                    <strong>{user.fullName}</strong>
                    <span>{user.email}</span>
                  </td>

                  <td>
                    <form
                      action={updateUserRoleAction}
                      className="admin-user-control"
                    >
                      <input
                        name="userId"
                        type="hidden"
                        value={user.id}
                      />

                      <select
                        aria-label={`${user.email} rolü`}
                        defaultValue={user.role}
                        name="role"
                      >
                        {!Object.hasOwn(
                          standardRoleLabels,
                          user.role,
                        ) ? (
                          <option value={user.role}>
                            {roleLabels[user.role]} · mevcut
                          </option>
                        ) : null}

                        {Object.entries(
                          standardRoleLabels,
                        ).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>

                      <button type="submit">Kaydet</button>
                    </form>
                  </td>

                  <td>
                    <form
                      action={updateUserStatusAction}
                      className="admin-user-control"
                    >
                      <input
                        name="userId"
                        type="hidden"
                        value={user.id}
                      />

                      <select
                        aria-label={`${user.email} durumu`}
                        defaultValue={user.status}
                        name="status"
                      >
                        {Object.entries(statusLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>

                      <button type="submit">Kaydet</button>
                    </form>
                  </td>

                  <td>
                    <span>
                      {user._count.works} eser ·{" "}
                      {user._count.readingProgress} okuma
                    </span>
                    <small>
                      {user._count.comments} yorum
                    </small>
                  </td>

                  <td>
                    {user.lastLoginAt ? (
                      <time
                        dateTime={user.lastLoginAt.toISOString()}
                      >
                        {formatDateTime(user.lastLoginAt)}
                      </time>
                    ) : (
                      <span>Henüz giriş yapmadı</span>
                    )}
                  </td>

                  <td>
                    <time dateTime={user.createdAt.toISOString()}>
                      {formatDate(user.createdAt)}
                    </time>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="admin-users-empty"
                  colSpan={7}
                >
                  Bu filtrelere uygun kullanıcı bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        className="admin-users-pagination"
        aria-label="Kullanıcı sayfaları"
      >
        <span>
          {firstResult}–{lastResult} / {totalUsers}
        </span>

        <div>
          {safePage > 1 ? (
            <Link
              href={buildPageHref(
                filters,
                safePage - 1,
                basePath,
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
              href={buildPageHref(
                filters,
                safePage + 1,
                basePath,
              )}
            >
              Sonraki →
            </Link>
          ) : (
            <span>Sonraki →</span>
          )}
        </div>
      </div>
    </section>
  );
}
