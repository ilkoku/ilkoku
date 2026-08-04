import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCustomizablePublisherPermissions,
  publisherPermissionLabels,
  publisherRoleLabels,
} from "@/features/publisher-workspace/permissions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Yayınevi Ekibi | İlkOku Admin",
};

export const dynamic = "force-dynamic";

const invitationStatusLabels = {
  accepted: "Kabul edildi",
  cancelled: "İptal edildi",
  declined: "Reddedildi",
  expired: "Süresi doldu",
  pending: "Bekliyor",
} as const;

function formatDate(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminPublisherTeamPage({
  params,
}: {
  params: Promise<{ publisherId: string }>;
}) {
  const { publisherId } = await params;

  const publisher = await prisma.publisher.findUnique({
    where: {
      id: publisherId,
    },
    select: {
      active: true,
      archivedAt: true,
      companyName: true,
      invitations: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          acceptedAt: true,
          acceptedBy: {
            select: {
              displayName: true,
              fullName: true,
              publicId: true,
            },
          },
          createdAt: true,
          expiresAt: true,
          id: true,
          invitedBy: {
            select: {
              displayName: true,
              fullName: true,
              publicId: true,
            },
          },
          invitedEmail: true,
          permissionOverrides: true,
          role: true,
          status: true,
        },
      },
      members: {
        orderBy: [
          {
            active: "desc",
          },
          {
            createdAt: "asc",
          },
        ],
        select: {
          active: true,
          createdAt: true,
          id: true,
          permissionOverrides: true,
          role: true,
          user: {
            select: {
              displayName: true,
              email: true,
              fullName: true,
              publicId: true,
              role: true,
              status: true,
            },
          },
        },
      },
      publicId: true,
      verified: true,
    },
  });

  if (!publisher) {
    notFound();
  }

  return (
    <div className="admin-directory-page">
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            Salt okunur yönetici incelemesi
          </span>
          <h1>{publisher.companyName} ekibi</h1>
          <p>
            {publisher.publicId} · Üyelik rolleri ve kişi bazlı
            yetkiler
          </p>
        </div>

        <div className="admin-heading-actions">
          <Link
            className="admin-button admin-button--ghost"
            href={`/admin/yayinevleri/${publisherId}`}
          >
            Yayınevi detayına dön
          </Link>

          <Link
            className="admin-button admin-button--ghost"
            href="/admin/yayinevleri"
          >
            Tüm yayınevleri
          </Link>
        </div>
      </header>

      <section
        className="admin-readonly-notice"
        role="status"
      >
        <strong>Salt okunur admin görünümü</strong>
        <p>
          Bu sayfa üyelik veya yetki değiştirmez. Davet gönderme,
          üyeyi pasifleştirme ve kişi bazlı yetki düzenleme yalnızca
          yetkili yayınevi yöneticisinin çalışma alanından yapılır.
        </p>
      </section>

      <section className="admin-detail-grid">
        <article className="admin-panel">
          <h2>Yayınevi durumu</h2>

          <dl className="admin-detail-list">
            <div>
              <dt>Platform kaydı</dt>
              <dd>{publisher.publicId}</dd>
            </div>

            <div>
              <dt>Aktiflik</dt>
              <dd>{publisher.active ? "Aktif" : "Pasif"}</dd>
            </div>

            <div>
              <dt>Doğrulama</dt>
              <dd>
                {publisher.verified
                  ? "Doğrulandı"
                  : "Doğrulanmadı"}
              </dd>
            </div>

            <div>
              <dt>Arşiv</dt>
              <dd>{formatDate(publisher.archivedAt)}</dd>
            </div>
          </dl>
        </article>

        <article className="admin-panel">
          <h2>Ekip özeti</h2>

          <dl className="admin-detail-list">
            <div>
              <dt>Toplam üye</dt>
              <dd>{publisher.members.length}</dd>
            </div>

            <div>
              <dt>Aktif üye</dt>
              <dd>
                {
                  publisher.members.filter(
                    (member) => member.active,
                  ).length
                }
              </dd>
            </div>

            <div>
              <dt>Toplam davet</dt>
              <dd>{publisher.invitations.length}</dd>
            </div>

            <div>
              <dt>Bekleyen davet</dt>
              <dd>
                {
                  publisher.invitations.filter(
                    (invitation) =>
                      invitation.status === "pending",
                  ).length
                }
              </dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="admin-panel admin-directory-panel">
        <header className="admin-section-heading">
          <div>
            <span className="admin-eyebrow">Ekip kayıtları</span>
            <h2>Üyeler ve yetkileri</h2>
          </div>

          <strong>{publisher.members.length} üye</strong>
        </header>

        {publisher.members.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Kullanıcı</th>
                  <th>Ekip rolü</th>
                  <th>Durum</th>
                  <th>Kişi bazlı yetkiler</th>
                  <th>Üyelik tarihi</th>
                </tr>
              </thead>

              <tbody>
                {publisher.members.map((member) => {
                  const displayName =
                    member.user.displayName?.trim() ||
                    member.user.fullName;

                  const permissions =
                    getCustomizablePublisherPermissions(
                      member.role,
                      member.permissionOverrides,
                    );

                  return (
                    <tr key={member.id}>
                      <td>
                        <strong>{displayName}</strong>
                        <span>{member.user.email}</span>
                        <small>
                          {member.user.publicId} · Platform rolü:{" "}
                          {member.user.role}
                        </small>
                      </td>

                      <td>
                        <strong>
                          {publisherRoleLabels[member.role]}
                        </strong>
                      </td>

                      <td>
                        <span
                          className="admin-table-badge"
                          data-status={
                            member.active &&
                            member.user.status === "active"
                              ? "active"
                              : "disabled"
                          }
                        >
                          {member.active &&
                          member.user.status === "active"
                            ? "Aktif"
                            : "Pasif"}
                        </span>
                      </td>

                      <td>
                        <ul className="admin-permission-list">
                          {permissions.length ? (
                            permissions.map((permission) => (
                              <li key={permission}>
                                {
                                  publisherPermissionLabels[
                                    permission
                                  ]
                                }
                              </li>
                            ))
                          ) : (
                            <li>Yetki tanımlı değil</li>
                          )}
                        </ul>
                      </td>

                      <td>{formatDate(member.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Üye bulunmuyor</strong>
            <p>
              Bu yayınevinin henüz bir ekip üyeliği bulunmuyor.
            </p>
          </div>
        )}
      </section>

      <section className="admin-panel admin-directory-panel">
        <header className="admin-section-heading">
          <div>
            <span className="admin-eyebrow">
              Davet geçmişi
            </span>
            <h2>Ekip davetleri</h2>
          </div>

          <strong>{publisher.invitations.length} davet</strong>
        </header>

        {publisher.invitations.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Alıcı</th>
                  <th>Rol</th>
                  <th>Durum</th>
                  <th>Yetkiler</th>
                  <th>Davet eden</th>
                  <th>Tarih</th>
                </tr>
              </thead>

              <tbody>
                {publisher.invitations.map((invitation) => {
                  const permissions =
                    getCustomizablePublisherPermissions(
                      invitation.role,
                      invitation.permissionOverrides,
                    );

                  const invitedByName =
                    invitation.invitedBy.displayName?.trim() ||
                    invitation.invitedBy.fullName;

                  return (
                    <tr key={invitation.id}>
                      <td>
                        <strong>
                          {invitation.invitedEmail}
                        </strong>
                        {invitation.acceptedBy ? (
                          <small>
                            Kabul eden:{" "}
                            {invitation.acceptedBy
                              .displayName?.trim() ||
                              invitation.acceptedBy.fullName}
                          </small>
                        ) : null}
                      </td>

                      <td>
                        {publisherRoleLabels[invitation.role]}
                      </td>

                      <td>
                        <span
                          className="admin-table-badge"
                          data-status={invitation.status}
                        >
                          {
                            invitationStatusLabels[
                              invitation.status
                            ]
                          }
                        </span>
                      </td>

                      <td>
                        <ul className="admin-permission-list">
                          {permissions.length ? (
                            permissions.map((permission) => (
                              <li key={permission}>
                                {
                                  publisherPermissionLabels[
                                    permission
                                  ]
                                }
                              </li>
                            ))
                          ) : (
                            <li>Yetki tanımlı değil</li>
                          )}
                        </ul>
                      </td>

                      <td>
                        <strong>{invitedByName}</strong>
                        <small>
                          {invitation.invitedBy.publicId}
                        </small>
                      </td>

                      <td>
                        <span>
                          {formatDate(invitation.createdAt)}
                        </span>
                        <small>
                          Son geçerlilik:{" "}
                          {formatDate(invitation.expiresAt)}
                        </small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Davet bulunmuyor</strong>
            <p>
              Bu yayınevinden henüz ekip daveti gönderilmemiş.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
