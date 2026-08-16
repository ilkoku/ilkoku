import "server-only";

import { resolveNotificationTargets } from "@/features/notifications/targets";
import { getPublisherNotifications } from "./repository";
import type { PublisherNotificationData } from "./types";

export async function getPublisherNotificationCenterWithWorkLinks(
  userId: string,
): Promise<PublisherNotificationData[] | null> {
  const notifications = await getPublisherNotifications(userId);

  if (!notifications) return null;

  const targets = await resolveNotificationTargets({
    notifications,
    scope: "publisher",
    userId,
  });

  return notifications.map((notification) => ({
    createdAt: notification.createdAt.toISOString(),
    href: targets.get(notification.id) ?? null,
    id: notification.id,
    message: notification.message,
    readAt: notification.readAt?.toISOString() ?? null,
    title: notification.title,
  }));
}
