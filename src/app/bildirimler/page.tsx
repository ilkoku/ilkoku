import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { canAccessNotificationWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { toggleNotificationReadAction } from "@/features/notifications/actions";
import { NotificationEnvelopeIcon } from "@/features/notifications/components/NotificationEnvelopeIcon";
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

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Eserler, yorumlar, yayın ve hesap etkinlikleriyle ilgili güncellemeler."
          eyebrow={eyebrow}
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
                    <div className={styles.relatedAction}>
                      <a className="button button--ghost" href={href}>
                        İlgili kaydı aç
                      </a>
                    </div>
                  ) : null}
                </div>
                <form
                  action={toggleNotificationReadAction}
                  className={styles.readStateForm}
                >
                  <input name="notificationId" type="hidden" value={notification.id} />
                  <input name="returnPath" type="hidden" value="/bildirimler" />
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
