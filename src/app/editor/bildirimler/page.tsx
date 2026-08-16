import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { markNotificationReadAction } from "@/features/editor-workspace/actions";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { getEditorNotifications } from "@/features/editor-workspace/queries";
import { resolveNotificationTargets } from "@/features/notifications/targets";

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
  const notifications = await getEditorNotifications(profile.id);
  const targets = await resolveNotificationTargets({
    notifications,
    scope: "editor",
    userId: profile.id,
  });

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="İnceleme ve editör önerilerinizle ilgili güncellemeler."
          title="Bildirimler"
        />
        <div className="editor-notification-list">
          {notifications.map((notification) => {
            const href = targets.get(notification.id) ?? null;

            return (
              <article data-read={Boolean(notification.readAt)} key={notification.id}>
                <div>
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                  <time dateTime={notification.createdAt.toISOString()}>
                    {formatDate(notification.createdAt)}
                  </time>
                  {href ? (
                    <Link className="button button--ghost" href={href}>
                      İlgili kaydı aç
                    </Link>
                  ) : null}
                </div>
                {!notification.readAt && (
                  <form action={markNotificationReadAction}>
                    <input name="notificationId" type="hidden" value={notification.id} />
                    <input name="returnPath" type="hidden" value="/editor/bildirimler" />
                    <button className="button button--ghost" type="submit">
                      Okundu İşaretle
                    </button>
                  </form>
                )}
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
