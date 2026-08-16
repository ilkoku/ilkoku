import "server-only";

import {
  getPublisherMembership,
  isPublisherAdminReadOnlyMembership,
} from "@/features/publisher-workspace/repository";
import {
  hasPublisherPermission,
} from "@/features/publisher-workspace/permissions";
import { prisma } from "@/lib/prisma";

export async function markPublisherSharedItemAndNotificationRead(input: {
  shareId: string;
  userId: string;
}) {
  const membership = await getPublisherMembership(input.userId);

  if (
    !membership ||
    isPublisherAdminReadOnlyMembership(membership) ||
    !hasPublisherPermission(
      membership.role,
      "view_shared_items",
      membership.permissionOverrides,
    )
  ) {
    return false;
  }

  const now = new Date();

  return prisma.$transaction(async (transaction) => {
    const recipient =
      await transaction.publisherDiscoveryShareRecipient.updateMany({
        where: {
          membershipId: membership.id,
          readAt: null,
          shareId: input.shareId,
        },
        data: { readAt: now },
      });

    await transaction.notification.updateMany({
      where: {
        readAt: null,
        relatedEntityId: input.shareId,
        relatedEntityType: "publisher_discovery_share",
        type: "publisher_discovery_shared",
        userId: input.userId,
      },
      data: { readAt: now },
    });

    return recipient.count === 1;
  });
}
