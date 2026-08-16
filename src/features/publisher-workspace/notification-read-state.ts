import "server-only";

import { prisma } from "@/lib/prisma";
import {
  getPublisherMembership,
  isPublisherAdminReadOnlyMembership,
} from "./repository";

export async function markPublisherNotificationAndShareRead(input: {
  notificationId: string;
  userId: string;
}) {
  const membership = await getPublisherMembership(input.userId);

  if (!membership || isPublisherAdminReadOnlyMembership(membership)) {
    return false;
  }

  const notification = await prisma.notification.findFirst({
    where: {
      id: input.notificationId,
      userId: input.userId,
    },
    select: {
      id: true,
      relatedEntityId: true,
      relatedEntityType: true,
    },
  });

  if (!notification) return false;

  const now = new Date();

  await prisma.$transaction(async (transaction) => {
    await transaction.notification.updateMany({
      where: {
        id: notification.id,
        readAt: null,
        userId: input.userId,
      },
      data: { readAt: now },
    });

    if (
      notification.relatedEntityType === "publisher_discovery_share" &&
      notification.relatedEntityId
    ) {
      await transaction.publisherDiscoveryShareRecipient.updateMany({
        where: {
          membershipId: membership.id,
          readAt: null,
          shareId: notification.relatedEntityId,
        },
        data: { readAt: now },
      });
    }
  });

  return true;
}

export async function markAllPublisherNotificationsAndSharesRead(
  userId: string,
) {
  const membership = await getPublisherMembership(userId);

  if (!membership || isPublisherAdminReadOnlyMembership(membership)) {
    return false;
  }

  const unreadShareNotifications = await prisma.notification.findMany({
    where: {
      readAt: null,
      relatedEntityId: { not: null },
      relatedEntityType: "publisher_discovery_share",
      type: "publisher_discovery_shared",
      userId,
    },
    select: {
      relatedEntityId: true,
    },
  });

  const shareIds = Array.from(
    new Set(
      unreadShareNotifications
        .map((notification) => notification.relatedEntityId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const now = new Date();

  await prisma.$transaction(async (transaction) => {
    await transaction.notification.updateMany({
      where: {
        readAt: null,
        userId,
      },
      data: { readAt: now },
    });

    if (shareIds.length > 0) {
      await transaction.publisherDiscoveryShareRecipient.updateMany({
        where: {
          membershipId: membership.id,
          readAt: null,
          shareId: { in: shareIds },
        },
        data: { readAt: now },
      });
    }
  });

  return true;
}
