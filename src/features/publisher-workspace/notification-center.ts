import "server-only";

import { prisma } from "@/lib/prisma";
import { getPublisherNotifications } from "./repository";
import type { PublisherNotificationData } from "./types";

export async function getPublisherNotificationCenterWithWorkLinks(
  userId: string,
): Promise<PublisherNotificationData[] | null> {
  const notifications = await getPublisherNotifications(userId);

  if (!notifications) return null;

  const workIds = Array.from(
    new Set(
      notifications
        .filter(
          (notification) =>
            notification.relatedEntityType === "work" &&
            Boolean(notification.relatedEntityId),
        )
        .map((notification) => notification.relatedEntityId!)
    ),
  );

  const works = workIds.length
    ? await prisma.work.findMany({
        where: {
          archivedAt: null,
          id: {
            in: workIds,
          },
          publishedAt: {
            not: null,
          },
          status: "published",
          visibility: "public",
        },
        select: {
          id: true,
          slug: true,
        },
      })
    : [];

  const workSlugById = new Map(
    works.map((work) => [work.id, work.slug]),
  );

  return notifications.map((notification) => {
    let href: string | null = null;

    if (
      notification.relatedEntityType === "publisher_submission" &&
      notification.relatedEntityId
    ) {
      href = `/yayinevi/basvurular/${notification.relatedEntityId}`;
    } else if (
      notification.relatedEntityType === "publisher_permission_request"
    ) {
      href = "/yayinevi/yetkilerim";
    } else if (
      notification.relatedEntityType === "work" &&
      notification.relatedEntityId
    ) {
      const slug = workSlugById.get(notification.relatedEntityId);
      href = slug
        ? `/kitap/${encodeURIComponent(slug)}`
        : null;
    }

    return {
      createdAt: notification.createdAt.toISOString(),
      href,
      id: notification.id,
      message: notification.message,
      readAt: notification.readAt?.toISOString() ?? null,
      title: notification.title,
    };
  });
}
