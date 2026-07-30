import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { markNotificationReadAction } from "@/features/editor-workspace/actions";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Bildirimler | İlkOku" };
export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function ReaderNotificationsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=/bildirimler");
  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Takip ettiğiniz eserler, yorumlar ve okuma etkinlikleriyle ilgili güncellemeler."
          eyebrow="Okuyucu alanı"
          title="Bildirimler"
        />
        <div className="editor-notification-list">
          {notifications.map((notification) => (
            <article data-read={Boolean(notification.readAt)} key={notification.id}>
              <div>
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
                <time dateTime={notification.createdAt.toISOString()}>
                  {formatDate(notification.createdAt)}
                </time>
              </div>
              {!notification.readAt && (
                <form action={markNotificationReadAction}>
                  <input name="notificationId" type="hidden" value={notification.id} />
                  <input name="returnPath" type="hidden" value="/bildirimler" />
                  <button className="button button--ghost" type="submit">
                    Okundu İşaretle
                  </button>
                </form>
              )}
            </article>
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
