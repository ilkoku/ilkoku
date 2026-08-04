import Link from "next/link";
import type { AuditAction } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const auditActionLabels: Record<AuditAction, string> = {
  email_verified: "E-posta doğrulandı",
  login: "Oturum açıldı",
  logout: "Oturum kapatıldı",
  ownership_stamp_created: "Eser sahiplik kaydı oluşturuldu",
  password_changed: "Şifre değiştirildi",
  password_reset_requested: "Şifre sıfırlama istendi",
  profile_updated: "Profil güncellendi",
  register: "Kullanıcı kaydoldu",
  role_request_reviewed: "Rol başvurusu sonuçlandırıldı",
  role_requested: "Rol başvurusu oluşturuldu",
  work_created: "Eser oluşturuldu",
  work_published: "Eser yayımlandı",
};

const quickLinks = [
  { href: "/admin/eserler", label: "Eserleri incele" },
  { href: "/admin/yazarlar", label: "Yazarları görüntüle" },
  { href: "/admin/editorler", label: "Editörleri görüntüle" },
  { href: "/admin/yayinevleri", label: "Yayınevlerini görüntüle" },
  { href: "/admin/basvurular", label: "Başvuru merkezini aç" },
  { href: "/admin/roller", label: "Rol taleplerini değerlendir" },
  { href: "/admin/audit-log", label: "Sistem hareketlerini incele" },
  { href: "/admin/ayarlar", label: "Sistem durumunu görüntüle" },
] as const;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export async function AdminDashboard() {
  const [
    totalUsers,
    writers,
    editors,
    publishers,
    totalWorks,
    pendingRoleRequests,
    pendingEditorRequests,
    pendingPublisherRequests,
    latestActivity,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, role: "writer" } }),
    prisma.user.count({ where: { deletedAt: null, role: "editor" } }),
    prisma.publisher.count({ where: { archivedAt: null } }),
    prisma.work.count(),
    prisma.roleRequest.count({ where: { status: "pending" } }),
    prisma.roleRequest.count({ where: { requestedRole: "editor", status: "pending" } }),
    prisma.roleRequest.count({ where: { requestedRole: "publisher", status: "pending" } }),
    prisma.auditLog.findMany({
      include: { actor: { select: { displayName: true, email: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const metrics = [
    ["Toplam kullanıcı", totalUsers, "Silinmemiş kullanıcı kayıtları"],
    ["Yazar", writers, "Yazar rolündeki kullanıcılar"],
    ["Editör", editors, "Onaylı editör kullanıcıları"],
    ["Yayınevi", publishers, "Arşivlenmemiş yayınevleri"],
    ["Toplam eser", totalWorks, "Tüm eser kayıtları"],
    ["Bekleyen rol talebi", pendingRoleRequests, "Yönetici kararı bekliyor"],
    ["Editör başvurusu", pendingEditorRequests, "Editör rolü bekliyor"],
    ["Yayınevi başvurusu", pendingPublisherRequests, "Üyelik bağlantısı bekliyor"],
  ] as const;

  const today = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  }).format(new Date());

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">{today}</span>
          <h1>Genel Bakış</h1>
          <p>
            İlkOku kullanıcılarını, eserlerini ve bekleyen yönetim kararlarını
            canlı verilerle izleyin.
          </p>
        </div>
        <Link className="admin-button admin-button--primary" href="/admin/roller">
          Rol taleplerini aç
        </Link>
      </section>

      <section className="admin-stats-grid admin-overview-stats" aria-label="Platform özeti">
        {metrics.map(([label, value, detail], index) => (
          <article className={`admin-stat admin-stat--${["indigo", "violet", "cyan", "amber", "rose"][index % 5]}`} key={label}>
            <div className="admin-stat__top"><span>{label}</span></div>
            <strong>{value.toLocaleString("tr-TR")}</strong>
            <p>{detail}</p>
          </article>
        ))}
      </section>

      <section className="admin-dashboard-grid">
        <article className="admin-panel">
          <div className="admin-panel__heading">
            <div><span>Denetlenebilir hareketler</span><h2>Son sistem hareketleri</h2></div>
            <Link href="/admin/audit-log">Tümünü gör</Link>
          </div>

          {latestActivity.length ? (
            <div className="admin-activity-list">
              {latestActivity.map((activity) => (
                <div className="admin-activity" key={activity.id}>
                  <span aria-hidden="true" />
                  <div>
                    <strong>{auditActionLabels[activity.action]}</strong>
                    <p>
                      {activity.actor?.displayName || activity.actor?.fullName || activity.actor?.email || "Sistem"}
                      {activity.entityType ? ` · ${activity.entityType}` : ""}
                    </p>
                  </div>
                  <time dateTime={activity.createdAt.toISOString()}>{formatDate(activity.createdAt)}</time>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">
              <strong>Henüz sistem hareketi yok</strong>
              <p>Kaydedilen ilk denetlenebilir işlem burada görünecek.</p>
            </div>
          )}
        </article>

        <article className="admin-panel admin-panel--quick">
          <div className="admin-panel__heading">
            <div><span>Yönetim rotaları</span><h2>Hızlı bağlantılar</h2></div>
          </div>
          <div>
            {quickLinks.map((item) => (
              <Link href={item.href} key={item.href}>{item.label}<span>→</span></Link>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
