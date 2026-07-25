import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  approveRoleRequestAction,
  rejectRoleRequestAction,
} from "@/features/admin-role-requests/actions/role-request.actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import "../roles.css";

export const metadata: Metadata = {
  title: "Rol Başvuruları | İlkOku Yönetim",
  description: "Editör ve yayınevi rol başvurularını yönetin.",
};

export const dynamic = "force-dynamic";

const roleLabels = {
  editor: "Editör",
  publisher: "Yayınevi",
  writer: "Yazar",
  reader: "Okur",
  admin: "Yönetici",
} as const;

const statusLabels = {
  pending: "İnceleme bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  cancelled: "İptal edildi",
} as const;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminRolesPage() {
  const admin = await getCurrentUser();

  if (!admin) {
    redirect("/giris");
  }

  if (admin.role !== "admin") {
    redirect("/erisim-reddedildi");
  }

  const [pendingRequests, recentRequests] = await Promise.all([
    prisma.roleRequest.findMany({
      where: {
        status: "pending",
        requestedRole: {
          in: ["editor", "publisher", "writer"],
        },
      },
      include: {
        user: {
          select: {
            avatarUrl: true,
            bio: true,
            createdAt: true,
            displayName: true,
            email: true,
            fullName: true,
            id: true,
            role: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    }),

    prisma.roleRequest.findMany({
      where: {
        status: {
          in: ["approved", "rejected"],
        },
      },
      include: {
        reviewedBy: {
          select: {
            fullName: true,
          },
        },
        user: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        reviewedAt: "desc",
      },
      take: 12,
    }),
  ]);

  const editorCount = pendingRequests.filter(
    (request) => request.requestedRole === "editor",
  ).length;

  const publisherCount = pendingRequests.filter(
    (request) => request.requestedRole === "publisher",
  ).length;

  return (
    <main className="admin-roles-page">
      <header className="admin-roles-hero">
        <div>
          <span className="admin-roles-eyebrow">
            İlkOku Yönetim Merkezi
          </span>

          <h1>Rol başvuruları</h1>

          <p>
            Editör, yayınevi ve yazar başvurularını inceleyin.
            Onaylanan kullanıcının sistem rolü anında güncellenir.
          </p>
        </div>

        <div className="admin-roles-total">
          <span>Bekleyen başvuru</span>
          <strong>{pendingRequests.length}</strong>
        </div>
      </header>

      <section className="admin-roles-stats">
        <article>
          <span>Editör başvuruları</span>
          <strong>{editorCount}</strong>
          <small>Admin onayı bekliyor</small>
        </article>

        <article>
          <span>Yayınevi başvuruları</span>
          <strong>{publisherCount}</strong>
          <small>Admin onayı bekliyor</small>
        </article>

        <article>
          <span>Diğer başvurular</span>
          <strong>
            {pendingRequests.length - editorCount - publisherCount}
          </strong>
          <small>Yazar ve diğer roller</small>
        </article>
      </section>

      <section className="admin-role-section">
        <div className="admin-role-section__heading">
          <div>
            <span>Onay merkezi</span>
            <h2>İnceleme bekleyenler</h2>
          </div>

          <strong>{pendingRequests.length}</strong>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="admin-role-empty">
            <span aria-hidden="true">✓</span>
            <h3>Bekleyen başvuru yok</h3>
            <p>Tüm rol başvuruları sonuçlandırılmış.</p>
          </div>
        ) : (
          <div className="admin-role-list">
            {pendingRequests.map((request) => {
              const displayName =
                request.user.displayName ||
                request.user.fullName;

              return (
                <article className="admin-role-card" key={request.id}>
                  <header className="admin-role-card__header">
                    <div className="admin-role-avatar">
                      {displayName.slice(0, 1).toLocaleUpperCase("tr-TR")}
                    </div>

                    <div className="admin-role-identity">
                      <span className="admin-role-badge">
                        {roleLabels[request.requestedRole]}
                      </span>

                      <h3>{displayName}</h3>

                      <p>{request.user.email}</p>
                    </div>

                    <time dateTime={request.createdAt.toISOString()}>
                      {formatDate(request.createdAt)}
                    </time>
                  </header>

                  <dl className="admin-role-details">
                    <div>
                      <dt>Mevcut rol</dt>
                      <dd>{roleLabels[request.user.role]}</dd>
                    </div>

                    <div>
                      <dt>Talep edilen rol</dt>
                      <dd>{roleLabels[request.requestedRole]}</dd>
                    </div>

                    <div>
                      <dt>Kullanıcı adı</dt>
                      <dd>{request.user.username || "Belirtilmemiş"}</dd>
                    </div>

                    <div>
                      <dt>Üyelik tarihi</dt>
                      <dd>{formatDate(request.user.createdAt)}</dd>
                    </div>
                  </dl>

                  {request.user.bio && (
                    <div className="admin-role-biography">
                      <span>Başvuru profili</span>
                      <p>{request.user.bio}</p>
                    </div>
                  )}

                  <div className="admin-role-actions">
                    <form action={approveRoleRequestAction}>
                      <input
                        name="requestId"
                        type="hidden"
                        value={request.id}
                      />

                      <label>
                        <span>Admin notu</span>
                        <textarea
                          maxLength={2000}
                          name="reviewNote"
                          placeholder="Onay notu veya kısa değerlendirme…"
                        />
                      </label>

                      <button
                        className="admin-role-button admin-role-button--approve"
                        type="submit"
                      >
                        Başvuruyu Onayla
                      </button>
                    </form>

                    <form action={rejectRoleRequestAction}>
                      <input
                        name="requestId"
                        type="hidden"
                        value={request.id}
                      />

                      <label>
                        <span>Ret gerekçesi</span>
                        <textarea
                          maxLength={2000}
                          name="reviewNote"
                          placeholder="Başvurunun neden reddedildiğini yazın…"
                        />
                      </label>

                      <button
                        className="admin-role-button admin-role-button--reject"
                        type="submit"
                      >
                        Başvuruyu Reddet
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="admin-role-section">
        <div className="admin-role-section__heading">
          <div>
            <span>İşlem geçmişi</span>
            <h2>Sonuçlandırılan başvurular</h2>
          </div>
        </div>

        {recentRequests.length === 0 ? (
          <div className="admin-role-history-empty">
            Henüz sonuçlandırılan başvuru bulunmuyor.
          </div>
        ) : (
          <div className="admin-role-history">
            {recentRequests.map((request) => (
              <article key={request.id}>
                <div>
                  <strong>{request.user.fullName}</strong>
                  <span>{request.user.email}</span>
                </div>

                <div>
                  <span>{roleLabels[request.requestedRole]}</span>
                  <strong
                    data-status={request.status}
                  >
                    {statusLabels[request.status]}
                  </strong>
                </div>

                <div>
                  <span>
                    {request.reviewedBy?.fullName || "Yönetici"}
                  </span>
                  <time>
                    {request.reviewedAt
                      ? formatDate(request.reviewedAt)
                      : "—"}
                  </time>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
