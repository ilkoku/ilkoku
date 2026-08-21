import Link from "next/link";
import { redirect } from "next/navigation";
import { NotificationListItem } from "@/features/notifications/components/NotificationListItem";
import styles from "@/features/notifications/notification-list.module.css";
import { resolveNotificationTargets } from "@/features/notifications/targets";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

export default async function ContractAdminNotificationsPage() {
  const admin = await getCurrentUser();

  if (!admin) {
    redirect("/giris?sonraki=/sozlesme/bildirimler");
  }

  if (admin.role !== "admin") {
    redirect("/erisim-reddedildi?kaynak=contract_management");
  }

  const notifications = await prisma.notification.findMany({
    where: {
      relatedEntityType: "user_contract",
      userId: admin.id,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const targets = await resolveNotificationTargets({
    notifications,
    scope: "admin",
    userId: admin.id,
  });

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <main className="contract-admin-page">
      <header className="contract-admin-hero">
        <div>
          <p className="contract-eyebrow">SÖZLEŞME OLAYLARI</p>
          <h1>Bildirimler</h1>
          <p>Kullanıcıların sözleşme yanıtları ve sözleşme akışındaki size atanmış bildirimler burada izlenir.</p>
        </div>
        <nav><Link href="/sozlesme/takip">Takip Merkezine git →</Link></nav>
      </header>

      <section className="contract-metrics" aria-label="Sözleşme bildirim özeti">
        <article><strong>{notifications.length}</strong><span>Son 100 bildirim</span></article>
        <article><strong>{unreadCount}</strong><span>Okunmamış</span></article>
        <article><strong>{targets.size}</strong><span>Doğrulanmış hedef</span></article>
      </section>

      <section className="contract-admin-section">
        <div className="contract-card-heading">
          <div><p>GELEN KUTUSU</p><h2>Sözleşme bildirimleri</h2></div>
          <span>{notifications.length} kayıt</span>
        </div>

        <div className={styles.notificationList}>
          {notifications.map((notification) => (
            <NotificationListItem
              createdAtIso={notification.createdAt.toISOString()}
              formattedDate={formatDate(notification.createdAt)}
              hasTarget={targets.has(notification.id)}
              initialRead={Boolean(notification.readAt)}
              key={notification.id}
              message={notification.message}
              notificationId={notification.id}
              returnPath="/sozlesme/bildirimler"
              title={notification.title}
            />
          ))}
        </div>

        {notifications.length === 0 ? (
          <div className="contract-empty">Henüz sözleşme bildirimi yok.</div>
        ) : null}
      </section>
    </main>
  );
}
