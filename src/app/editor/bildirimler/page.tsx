import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { NotificationBackButton } from "@/features/notifications/components/NotificationBackButton";
import { NotificationListItem } from "@/features/notifications/components/NotificationListItem";
import styles from "@/features/notifications/notification-list.module.css";
import { resolveNotificationTargets } from "@/features/notifications/targets";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Editör Bildirimleri | İlkOku",
};
export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function EditorNotificationsPage() {
  const profile = await requireEditorProfile("/editor/bildirimler");
  const notifications = await prisma.notification.findMany({
    where: { userId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const targets = await resolveNotificationTargets({
    notifications,
    scope: "editor",
    userId: profile.id,
  });

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <div className={styles.backRow}>
          <NotificationBackButton
            className={`button button--ghost ${styles.backButton}`}
            fallbackHref="/editor"
          />
        </div>
        <EditorPageHeader
          description="İnceleme ve editör önerilerinizle ilgili güncellemeler."
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
              returnPath="/editor/bildirimler"
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
