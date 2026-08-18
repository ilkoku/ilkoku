import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import {
  openNotificationTargetAction,
  toggleNotificationReadAction,
} from "@/features/notifications/actions";
import { NotificationBackButton } from "@/features/notifications/components/NotificationBackButton";
import { NotificationEnvelopeIcon } from "@/features/notifications/components/NotificationEnvelopeIcon";
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
          {notifications.map((notification) => {
            const href = targets.get(notification.id) ?? null;
            const read = Boolean(notification.readAt);
            const readActionLabel = read
              ? "Okunmadı olarak işaretle"
              : "Okundu olarak işaretle";

            return (
              <article
                className={styles.notificationItem}
                data-read={read}
                key={notification.id}
              >
                <div className={styles.notificationContent}>
                  <strong className={styles.notificationTitle}>
                    {notification.title}
                  </strong>
                  <p className={styles.notificationMessage}>{notification.message}</p>
                  <time
                    className={styles.notificationTime}
                    dateTime={notification.createdAt.toISOString()}
                  >
                    {formatDate(notification.createdAt)}
                  </time>
                  {href ? (
                    <form
                      action={openNotificationTargetAction}
                      className={styles.relatedAction}
                    >
                      <input
                        name="notificationId"
                        type="hidden"
                        value={notification.id}
                      />
                      <input
                        name="returnPath"
                        type="hidden"
                        value="/editor/bildirimler"
                      />
                      <button className="button button--ghost" type="submit">
                        İlgili kaydı aç
                      </button>
                    </form>
                  ) : null}
                </div>
                <form
                  action={toggleNotificationReadAction}
                  className={styles.readStateForm}
                >
                  <input name="notificationId" type="hidden" value={notification.id} />
                  <input
                    name="returnPath"
                    type="hidden"
                    value="/editor/bildirimler"
                  />
                  <button
                    aria-label={readActionLabel}
                    aria-pressed={read}
                    className={styles.readStateButton}
                    data-read={read}
                    title={readActionLabel}
                    type="submit"
                  >
                    <NotificationEnvelopeIcon read={read} />
                  </button>
                </form>
              </article>
            );
          })}
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
