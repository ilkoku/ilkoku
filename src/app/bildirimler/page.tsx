import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { canAccessNotificationWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { NotificationBackButton } from "@/features/notifications/components/NotificationBackButton";
import { NotificationListItem } from "@/features/notifications/components/NotificationListItem";
import styles from "@/features/notifications/notification-list.module.css";
import { resolveNotificationTargets } from "@/features/notifications/targets";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Bildirimler | İlkOku" };
export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function NotificationsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=/bildirimler");
  if (!canAccessNotificationWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=bildirimler");
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const targets = await resolveNotificationTargets({
    notifications,
    scope: "default",
    userId: profile.id,
  });
  const eyebrow = profile.role === "writer" ? "Yazar alanı" : "Okuyucu alanı";
  const backFallback = profile.role === "writer" ? "/yazar" : "/okuyucu";

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <div className={styles.backRow}>
          <NotificationBackButton
            className={`button button--ghost ${styles.backButton}`}
            fallbackHref={backFallback}
          />
        </div>
        <EditorPageHeader
          description="Eserler, yorumlar, yayın ve hesap etkinlikleriyle ilgili güncellemeler."
          eyebrow={eyebrow}
          title="Bildirimler"
        />
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
              returnPath="/bildirimler"
              title={notification.title}
            />
          ))}
        </div>
        {notifications.length === 0 && (
          <div className="editor-empty">
            <h2>Bildirim yok</h2>
            <p>Yeni gelişmeler burada gösterilecek.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
