import "../publisher-workspace.css";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { markAllPublisherNotificationsReadAction, markPublisherNotificationReadAction } from "../actions";
import type { PublisherNotificationData } from "../types";

const formatDate = (value: string) => new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function PublisherNotificationCenter({ companyName, notifications }: { companyName: string; notifications: PublisherNotificationData[] }) {
  const unread = notifications.filter((item) => !item.readAt).length;
  return <div className="publisher-workspace">
    <header className="publisher-workspace__hero"><div><p>{companyName}</p><h1>Bildirim merkezi</h1><span>{unread ? `${unread} okunmamış bildiriminiz var.` : "Tüm bildirimler okundu."}</span></div>{unread ? <form action={markAllPublisherNotificationsReadAction}><button type="submit">Tümünü okundu işaretle</button></form> : null}</header>
    {notifications.length ? <div className="publisher-notification-list">{notifications.map((notification) => <Card data-read={Boolean(notification.readAt)} key={notification.id}>
      <div><strong>{notification.title}</strong><p>{notification.message}</p><time dateTime={notification.createdAt}>{formatDate(notification.createdAt)}</time></div>
      <div className="publisher-notification-list__actions">{notification.href ? <Link href={notification.href}>İlgili kaydı aç</Link> : null}{!notification.readAt ? <form action={markPublisherNotificationReadAction}><input name="notificationId" type="hidden" value={notification.id} /><button type="submit">Okundu</button></form> : null}</div>
    </Card>)}</div> : <Card className="publisher-workspace__empty"><h2>Bildirim yok</h2><p>Başvurular ve yayın operasyonlarıyla ilgili güncellemeler burada görünecek.</p></Card>}
  </div>;
}
