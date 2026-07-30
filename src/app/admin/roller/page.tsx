import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type {
  Prisma,
  RoleRequestStatus,
  UserRole,
} from "@/generated/prisma/client";
import { RoleRequestActions } from "@/features/admin-role-requests/components/RoleRequestActions";
import {
  publisherCompanyTypes,
  validateStoredPublisherApplication,
} from "@/features/publisher-applications/schema";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import "../roles.css";

export const metadata: Metadata = {
  title: "Rol Başvuruları | İlkOku Yönetim",
  description: "Editör ve yayınevi rol başvurularını yönetin.",
};

export const dynamic = "force-dynamic";

const roleLabels: Record<UserRole, string> = {
  admin: "Yönetici",
  editor: "Editör",
  editor_pending: "Editör adayı",
  publisher: "Yayınevi",
  reader: "Okur",
  writer: "Yazar",
};

const statusLabels: Record<RoleRequestStatus, string> = {
  approved: "Onaylandı",
  cancelled: "İptal edildi",
  pending: "Yönetici incelemesinde",
  rejected: "Reddedildi",
};

const selectableStatuses = ["pending", "approved", "rejected"] as const;
const selectableRoles = ["editor", "publisher", "writer"] as const;

const publisherApplicationStatusLabels = {
  approved: "Doğrulandı",
  changes_requested: "Düzeltme bekleniyor",
  draft: "Taslak",
  rejected: "Reddedildi",
  submitted: "İncelemeye hazır",
} as const;

const companyTypeLabels = Object.fromEntries(
  publisherCompanyTypes.map((option) => [option.value, option.label]),
) as Record<string, string>;

type SearchParams = Promise<{
  arama?: string;
  durum?: string;
  q?: string;
  rol?: string;
}>;

function formatDate(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function isStatus(value: string | undefined): value is (typeof selectableStatuses)[number] {
  return selectableStatuses.some((status) => status === value);
}

function isRole(value: string | undefined): value is (typeof selectableRoles)[number] {
  return selectableRoles.some((role) => role === value);
}

function parseStoredList(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await getCurrentUser();

  if (!admin) redirect("/giris?sonraki=/admin/roller");
  if (admin.role !== "admin") redirect("/erisim-reddedildi?kaynak=admin");

  const params = await searchParams;
  const searchSource =
    typeof params.q === "string"
      ? params.q
      : typeof params.arama === "string"
        ? params.arama
        : "";
  const search = searchSource.trim();
  const status = isStatus(params.durum) ? params.durum : "";
  const requestedRole = isRole(params.rol) ? params.rol : "";
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const searchPattern = `%${search}%`;
  const matchedUsers = search
    ? await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT \`id\`
        FROM \`User\`
        WHERE
          CONVERT(\`displayName\` USING utf8mb4) COLLATE utf8mb4_unicode_ci
            LIKE
          CONVERT(${searchPattern} USING utf8mb4) COLLATE utf8mb4_unicode_ci
          OR
          CONVERT(\`email\` USING utf8mb4) COLLATE utf8mb4_unicode_ci
            LIKE
          CONVERT(${searchPattern} USING utf8mb4) COLLATE utf8mb4_unicode_ci
          OR
          CONVERT(\`fullName\` USING utf8mb4) COLLATE utf8mb4_unicode_ci
            LIKE
          CONVERT(${searchPattern} USING utf8mb4) COLLATE utf8mb4_unicode_ci
          OR
          CONVERT(\`username\` USING utf8mb4) COLLATE utf8mb4_unicode_ci
            LIKE
          CONVERT(${searchPattern} USING utf8mb4) COLLATE utf8mb4_unicode_ci
        LIMIT 500
      `
    : [];
  const matchedUserIds = matchedUsers.map((user) => user.id);

  const where: Prisma.RoleRequestWhereInput = {
    ...(status ? { status } : {}),
    ...(requestedRole ? { requestedRole } : {}),
    ...(search ? { userId: { in: matchedUserIds } } : {}),
  };

  const [
    requests,
    publishers,
    pendingCount,
    pendingEditorCount,
    pendingPublisherCount,
    todayCount,
  ] = await Promise.all([
    prisma.roleRequest.findMany({
      where,
      include: {
        publisherApplication: true,
        reviewedBy: { select: { fullName: true } },
        user: {
          select: {
            bio: true,
            createdAt: true,
            displayName: true,
            email: true,
            fullName: true,
            role: true,
            roleRequests: {
              include: { reviewedBy: { select: { fullName: true } } },
              orderBy: { createdAt: "desc" },
              take: 6,
            },
            username: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    }),
    prisma.publisher.findMany({
      where: { active: true, archivedAt: null },
      orderBy: { companyName: "asc" },
      select: { companyName: true, id: true },
    }),
    prisma.roleRequest.count({ where: { status: "pending" } }),
    prisma.roleRequest.count({ where: { requestedRole: "editor", status: "pending" } }),
    prisma.roleRequest.count({ where: { requestedRole: "publisher", status: "pending" } }),
    prisma.roleRequest.count({ where: { createdAt: { gte: todayStart } } }),
  ]);

  const orderedRequests = requests.toSorted((left, right) => {
    if (left.status === right.status) {
      return right.createdAt.getTime() - left.createdAt.getTime();
    }
    if (left.status === "pending") return -1;
    if (right.status === "pending") return 1;
    return right.createdAt.getTime() - left.createdAt.getTime();
  });

  return (
    <main className="admin-roles-page">
      <header className="admin-roles-hero">
        <div>
          <span className="admin-roles-eyebrow">İlkOku Yönetim Merkezi</span>
          <h1>Rol ve yetkiler</h1>
          <p>
            Rol taleplerini gerçek başvuru geçmişiyle inceleyin. Yayınevi
            onayları, etkin owner üyeliği oluşmadan tamamlanmaz.
          </p>
        </div>

        <div className="admin-roles-total">
          <span>Toplam bekleyen</span>
          <strong>{pendingCount}</strong>
        </div>
      </header>

      <section className="admin-roles-stats" aria-label="Başvuru sayaçları">
        <article>
          <span>Editör başvuruları</span>
          <strong>{pendingEditorCount}</strong>
          <small>Yönetici incelemesinde</small>
        </article>
        <article>
          <span>Yayınevi başvuruları</span>
          <strong>{pendingPublisherCount}</strong>
          <small>Yayınevi bağlantısı bekliyor</small>
        </article>
        <article>
          <span>Bugün gelen</span>
          <strong>{todayCount}</strong>
          <small>Tüm rol başvuruları</small>
        </article>
      </section>

      <section className="admin-role-section admin-role-filter-section">
        <div className="admin-role-section__heading">
          <div>
            <span>Başvuru dizini</span>
            <h2>Filtrele ve incele</h2>
          </div>
          <strong>{orderedRequests.length}</strong>
        </div>

        <form className="admin-role-filters" method="get">
          <label>
            <span>Kullanıcı veya e-posta</span>
            <input
              defaultValue={search}
              name="q"
              placeholder="Ad, e-posta veya kullanıcı adı"
              type="search"
            />
          </label>
          <label>
            <span>Başvuru durumu</span>
            <select defaultValue={status} name="durum">
              <option value="">Tümü</option>
              <option value="pending">Bekleyen</option>
              <option value="approved">Onaylanan</option>
              <option value="rejected">Reddedilen</option>
            </select>
          </label>
          <label>
            <span>Talep edilen rol</span>
            <select defaultValue={requestedRole} name="rol">
              <option value="">Tüm roller</option>
              <option value="editor">Editör</option>
              <option value="publisher">Yayınevi</option>
              <option value="writer">Yazar</option>
            </select>
          </label>
          <div className="admin-role-filters__actions">
            <button type="submit">Filtrele</button>
            {(search || status || requestedRole) && <Link href="/admin/roller">Temizle</Link>}
          </div>
        </form>
      </section>

      <section className="admin-role-section">
        <div className="admin-role-section__heading">
          <div>
            <span>Onay merkezi</span>
            <h2>Rol başvuruları</h2>
          </div>
        </div>

        {orderedRequests.length === 0 ? (
          <div className="admin-role-empty">
            <span aria-hidden="true">✓</span>
            <h3>Başvuru bulunamadı</h3>
            <p>Arama veya filtre ölçütlerini değiştirerek yeniden deneyin.</p>
          </div>
        ) : (
          <div className="admin-role-list">
            {orderedRequests.map((request) => {
              const displayName = request.user.displayName || request.user.fullName;
              const previousRequests = request.user.roleRequests.filter(
                (item) => item.id !== request.id,
              );
              const supported = selectableRoles.some(
                (role) => role === request.requestedRole,
              );
              const publisherApplication = request.publisherApplication;
              const applicationComplete = publisherApplication?.verificationStatus === "submitted"
                && validateStoredPublisherApplication(publisherApplication).success;
              const publicationCategories = publisherApplication
                ? parseStoredList(publisherApplication.publicationCategories)
                : [];
              const verificationDocuments = publisherApplication
                ? parseStoredList(publisherApplication.verificationDocumentUrls)
                    .filter((value) => /^https?:\/\//i.test(value))
                : [];

              return (
                <article className="admin-role-card" key={request.id}>
                  <header className="admin-role-card__header">
                    <div className="admin-role-avatar" aria-hidden="true">
                      {displayName.slice(0, 1).toLocaleUpperCase("tr-TR")}
                    </div>
                    <div className="admin-role-identity">
                      <div className="admin-role-card__badges">
                        <span className="admin-role-badge">
                          {roleLabels[request.requestedRole]}
                        </span>
                        <span className="admin-role-status" data-status={request.status}>
                          {statusLabels[request.status]}
                        </span>
                      </div>
                      <h3>{displayName}</h3>
                      <p>{request.user.email}</p>
                    </div>
                    <time dateTime={request.createdAt.toISOString()}>
                      {formatDate(request.createdAt)}
                    </time>
                  </header>

                  <dl className="admin-role-details">
                    <div><dt>Mevcut rol</dt><dd>{roleLabels[request.user.role]}</dd></div>
                    <div><dt>Talep edilen rol</dt><dd>{roleLabels[request.requestedRole]}</dd></div>
                    <div><dt>Değerlendirme</dt><dd>{formatDate(request.reviewedAt)}</dd></div>
                    <div><dt>Değerlendiren</dt><dd>{request.reviewedBy?.fullName || "—"}</dd></div>
                  </dl>

                  <details className="admin-role-disclosure">
                    <summary>Detayları görüntüle</summary>
                    <div className="admin-role-disclosure__content">
                      <dl className="admin-role-details">
                        <div><dt>Kullanıcı adı</dt><dd>{request.user.username || "Belirtilmemiş"}</dd></div>
                        <div><dt>Üyelik tarihi</dt><dd>{formatDate(request.user.createdAt)}</dd></div>
                        <div><dt>Başvuru kimliği</dt><dd>{request.id}</dd></div>
                        <div><dt>Yönetici notu</dt><dd>{request.reviewNote || "Not bulunmuyor."}</dd></div>
                      </dl>

                      {request.user.bio ? (
                        <div className="admin-role-biography">
                          <span>Başvuru profili</span>
                          <p>{request.user.bio}</p>
                        </div>
                      ) : null}

                      {request.requestedRole === "publisher" ? (
                        <section className="admin-publisher-application">
                          <header>
                            <div>
                              <span>Kurumsal başvuru</span>
                              <h4>
                                {publisherApplication?.publisherName
                                  || "Başvuru bilgileri eksik"}
                              </h4>
                            </div>
                            <strong data-status={publisherApplication?.verificationStatus || "draft"}>
                              {publisherApplication
                                ? publisherApplicationStatusLabels[publisherApplication.verificationStatus]
                                : "Kullanıcıdan tamamlaması istenmeli"}
                            </strong>
                          </header>

                          {publisherApplication ? (
                            <>
                              <dl className="admin-role-details admin-publisher-application__details">
                                <div><dt>Resmî unvan</dt><dd>{publisherApplication.legalCompanyName}</dd></div>
                                <div><dt>Şirket türü</dt><dd>{companyTypeLabels[publisherApplication.companyType] || publisherApplication.companyType}</dd></div>
                                <div><dt>Kuruluş yılı</dt><dd>{publisherApplication.establishmentYear}</dd></div>
                                <div><dt>Vergi dairesi</dt><dd>{publisherApplication.taxOffice}</dd></div>
                                <div><dt>Vergi numarası</dt><dd>{publisherApplication.taxNumber}</dd></div>
                                <div><dt>MERSİS / sicil</dt><dd>{publisherApplication.mersisOrRegistryNumber}</dd></div>
                                <div><dt>İl / ilçe</dt><dd>{publisherApplication.city} / {publisherApplication.district}</dd></div>
                                <div><dt>Kurumsal telefon</dt><dd>{publisherApplication.corporatePhone}</dd></div>
                                <div><dt>Kurumsal e-posta</dt><dd>{publisherApplication.corporateEmail}</dd></div>
                                <div><dt>Web sitesi</dt><dd>{publisherApplication.websiteUrl || "Belirtilmedi"}</dd></div>
                                <div><dt>Yetkili kişi</dt><dd>{publisherApplication.authorizedPersonFirstName} {publisherApplication.authorizedPersonLastName}</dd></div>
                                <div><dt>Yetkili unvanı</dt><dd>{publisherApplication.authorizedPersonTitle}</dd></div>
                                <div><dt>Yetkili telefonu</dt><dd>{publisherApplication.authorizedPersonPhone}</dd></div>
                                <div><dt>Yetkili e-postası</dt><dd>{publisherApplication.authorizedPersonEmail}</dd></div>
                                <div><dt>Eser başvurusu</dt><dd>{publisherApplication.acceptsSubmissions ? "Kabul ediyor" : "Kabul etmiyor"}</dd></div>
                                <div><dt>Logo</dt><dd>{publisherApplication.logoUrl || "Belirtilmedi"}</dd></div>
                              </dl>
                              <div className="admin-publisher-application__copy">
                                <span>Açık adres</span>
                                <p>{publisherApplication.address}</p>
                              </div>
                              <div className="admin-publisher-application__copy">
                                <span>Tanıtım</span>
                                <p>{publisherApplication.description}</p>
                              </div>
                              <div className="admin-publisher-application__copy">
                                <span>Yayın kategorileri</span>
                                <p>{publicationCategories.join(", ") || "Belirtilmedi"}</p>
                              </div>
                              <div className="admin-publisher-application__documents">
                                <span>Doğrulama belgeleri</span>
                                {verificationDocuments.length ? (
                                  <ul>
                                    {verificationDocuments.map((documentUrl, index) => (
                                      <li key={documentUrl}>
                                        <a href={documentUrl} rel="noopener noreferrer" target="_blank">
                                          Belge {index + 1}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                ) : <p>Belge bağlantısı bulunmuyor.</p>}
                              </div>
                              {publisherApplication.correctionNote ? (
                                <div className="admin-publisher-application__copy">
                                  <span>Son düzeltme isteği</span>
                                  <p>{publisherApplication.correctionNote}</p>
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <p className="admin-role-unsupported">
                              Mevcut pending başvuru korunmuştur. Başvuru sahibi,
                              Hesabım ekranından kurumsal bilgilerini tamamlamalıdır.
                            </p>
                          )}
                        </section>
                      ) : null}

                      <div className="admin-role-request-history">
                        <h4>Önceki rol talepleri</h4>
                        {previousRequests.length ? (
                          <ul>
                            {previousRequests.map((previous) => (
                              <li key={previous.id}>
                                <span>{roleLabels[previous.requestedRole]}</span>
                                <strong data-status={previous.status}>{statusLabels[previous.status]}</strong>
                                <time>{formatDate(previous.reviewedAt || previous.createdAt)}</time>
                                <small>{previous.reviewNote || "Yönetici notu yok."}</small>
                              </li>
                            ))}
                          </ul>
                        ) : <p>Daha önce rol talebi bulunmuyor.</p>}
                      </div>
                    </div>
                  </details>

                  {request.status === "pending" ? (
                    supported ? (
                      <RoleRequestActions
                        applicationComplete={applicationComplete}
                        publishers={publishers}
                        publisherName={publisherApplication?.publisherName}
                        requestId={request.id}
                        requestedRole={request.requestedRole}
                      />
                    ) : (
                      <p className="admin-role-unsupported" role="alert">
                        Bu rol değeri mevcut onay kuralları tarafından desteklenmiyor;
                        otomatik rol değişikliği uygulanmadı.
                      </p>
                    )
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
