import "server-only";

import {
  getPublisherMembership,
  isPublisherAdminReadOnlyMembership,
} from "@/features/publisher-workspace/repository";
import {
  hasPublisherPermission,
  publisherRoleLabels,
} from "@/features/publisher-workspace/permissions";
import {
  getEmailDeliveryIdForIdempotencyKey,
} from "@/lib/email/dedupe";
import { sendPublisherDiscoveryShareEmail } from "@/lib/email/publisher-sharing-emails";
import { prisma } from "@/lib/prisma";

const publicWorkWhere = {
  archivedAt: null,
  publishedAt: { not: null },
  status: "published" as const,
  visibility: "public" as const,
};

const EMAIL_SHARE_BURST_WINDOW_MS = 10 * 60 * 1000;
const EMAIL_SHARE_BURST_LIMIT = 12;
const EMAIL_SHARE_RECIPIENT_COOLDOWN_MS = 5 * 60 * 1000;

function displayName(user: {
  displayName: string | null;
  fullName: string;
}) {
  return user.displayName?.trim() || user.fullName.trim();
}

function publicAuthorName(author: {
  displayName: string | null;
  publicId: string;
  username: string | null;
}) {
  return (
    author.displayName?.trim() ||
    author.username?.trim() ||
    author.publicId
  );
}

function validEmail(value: string) {
  return (
    value.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

function publisherDiscoveryShareEmailIdempotencyKey(
  shareId: string,
) {
  return `publisher-discovery-share:${shareId}`;
}

export async function getPublisherDiscoveryShareEmailDeliveryId(
  shareId: string,
) {
  return getEmailDeliveryIdForIdempotencyKey(
    publisherDiscoveryShareEmailIdempotencyKey(shareId),
  );
}

export interface PublisherShareRecipientOption {
  id: string;
  label: string;
  roleLabel: string;
}

export type PublisherShareEntityKind = "author" | "work";
export type PublisherShareChannel = "email" | "team";

export type CreatePublisherShareResult =
  | { status: "created"; shareId: string }
  | { status: "email_failed"; shareId: string }
  | {
      status:
        | "forbidden"
        | "invalid_email"
        | "invalid_entity"
        | "invalid_note"
        | "invalid_recipients"
        | "membership_not_found"
        | "rate_limited"
        | "recipient_rate_limited";
    };

export async function getPublisherShareRecipientOptions(
  userId: string,
): Promise<PublisherShareRecipientOption[]> {
  const membership = await getPublisherMembership(userId);

  if (
    !membership ||
    isPublisherAdminReadOnlyMembership(membership) ||
    !hasPublisherPermission(
      membership.role,
      "share_internal",
      membership.permissionOverrides,
    )
  ) {
    return [];
  }

  const members = await prisma.publisherMembership.findMany({
    where: {
      active: true,
      id: { not: membership.id },
      publisherId: membership.publisherId,
      user: {
        deletedAt: null,
        status: "active",
      },
    },
    orderBy: [
      { role: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      id: true,
      permissionOverrides: true,
      role: true,
      user: {
        select: {
          displayName: true,
          fullName: true,
        },
      },
    },
  });

  return members
    .filter((member) =>
      hasPublisherPermission(
        member.role,
        "view_shared_items",
        member.permissionOverrides,
      ),
    )
    .map((member) => ({
      id: member.id,
      label: displayName(member.user),
      roleLabel: publisherRoleLabels[member.role],
    }));
}

async function resolveShareEntity(
  entityKind: PublisherShareEntityKind,
  entityId: string,
) {
  if (entityKind === "work") {
    const work = await prisma.work.findFirst({
      where: {
        ...publicWorkWhere,
        author: {
          is: {
            deletedAt: null,
            role: "writer",
            status: "active",
          },
        },
        id: entityId,
      },
      select: {
        id: true,
        slug: true,
        title: true,
      },
    });

    return work
      ? {
          authorId: null,
          entityKind,
          entityTitle: work.title,
          targetPath: `/kitap/${encodeURIComponent(work.slug)}`,
          workId: work.id,
        }
      : null;
  }

  const author = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      id: entityId,
      role: "writer",
      status: "active",
      works: { some: publicWorkWhere },
    },
    select: {
      displayName: true,
      id: true,
      publicId: true,
      username: true,
    },
  });

  if (!author) return null;

  const authorName = publicAuthorName(author);

  return {
    authorId: author.id,
    entityKind,
    entityTitle: authorName,
    targetPath:
      `/kesfet?arama=${encodeURIComponent(authorName)}`,
    workId: null,
  };
}

export async function createPublisherDiscoveryShare(input: {
  channel: PublisherShareChannel;
  entityId: string;
  entityKind: PublisherShareEntityKind;
  note: string;
  recipientEmail: string | null;
  recipientMembershipIds: string[];
  userId: string;
}): Promise<CreatePublisherShareResult> {
  const membership = await getPublisherMembership(input.userId);

  if (!membership || isPublisherAdminReadOnlyMembership(membership)) {
    return { status: "membership_not_found" };
  }

  const requiredPermission =
    input.channel === "team"
      ? "share_internal"
      : "share_email";

  if (
    !hasPublisherPermission(
      membership.role,
      requiredPermission,
      membership.permissionOverrides,
    )
  ) {
    return { status: "forbidden" };
  }

  const note = input.note.trim();
  if (note.length < 3 || note.length > 1000) {
    return { status: "invalid_note" };
  }

  const entity = await resolveShareEntity(
    input.entityKind,
    input.entityId,
  );

  if (!entity) return { status: "invalid_entity" };

  if (input.channel === "team") {
    const recipientIds = Array.from(
      new Set(
        input.recipientMembershipIds
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    );

    if (recipientIds.length === 0) {
      return { status: "invalid_recipients" };
    }

    const recipients = await prisma.publisherMembership.findMany({
      where: {
        active: true,
        id: {
          in: recipientIds,
          not: membership.id,
        },
        publisherId: membership.publisherId,
        user: {
          deletedAt: null,
          status: "active",
        },
      },
      select: {
        id: true,
        permissionOverrides: true,
        role: true,
        userId: true,
      },
    });

    const allowedRecipients = recipients.filter((recipient) =>
      hasPublisherPermission(
        recipient.role,
        "view_shared_items",
        recipient.permissionOverrides,
      ),
    );

    if (allowedRecipients.length !== recipientIds.length) {
      return { status: "invalid_recipients" };
    }

    const share = await prisma.$transaction(async (transaction) => {
      const created = await transaction.publisherDiscoveryShare.create({
        data: {
          authorId: entity.authorId,
          channel: "team",
          createdById: input.userId,
          note,
          publisherId: membership.publisherId,
          recipients: {
            createMany: {
              data: allowedRecipients.map((recipient) => ({
                membershipId: recipient.id,
              })),
            },
          },
          workId: entity.workId,
        },
        select: { id: true },
      });

      await transaction.notification.createMany({
        data: allowedRecipients.map((recipient) => ({
          message:
            `${entity.entityTitle} ekip içinde sizinle paylaşıldı. Not: ${note.slice(0, 280)}`,
          relatedEntityId: created.id,
          relatedEntityType: "publisher_discovery_share",
          title: "Yeni yayınevi ekip paylaşımı",
          type: "publisher_discovery_shared" as const,
          userId: recipient.userId,
        })),
      });

      await transaction.auditLog.create({
        data: {
          action: "publisher_discovery_shared",
          actorId: input.userId,
          entityId: created.id,
          entityType: "PublisherDiscoveryShare",
          metadata: JSON.stringify({
            channel: "team",
            entityKind: input.entityKind,
            publisherId: membership.publisherId,
            recipientCount: allowedRecipients.length,
          }),
        },
      });

      return created;
    });

    return {
      shareId: share.id,
      status: "created",
    };
  }

  const recipientEmail =
    input.recipientEmail?.trim().toLowerCase() ?? "";

  if (!validEmail(recipientEmail)) {
    return { status: "invalid_email" };
  }

  const now = new Date();
  const burstStart = new Date(
    now.getTime() - EMAIL_SHARE_BURST_WINDOW_MS,
  );
  const recipientCooldownStart = new Date(
    now.getTime() - EMAIL_SHARE_RECIPIENT_COOLDOWN_MS,
  );
  const recipientDomain =
    recipientEmail.split("@")[1] ?? null;

  const createResult = await prisma.$transaction(async (transaction) => {
    const lockedActor = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM User
      WHERE id = ${input.userId}
      LIMIT 1
      FOR UPDATE
    `;

    if (!lockedActor[0]) {
      throw new Error("PUBLISHER_DISCOVERY_SHARE_ACTOR_NOT_FOUND");
    }

    const recentActorShareCount =
      await transaction.publisherDiscoveryShare.count({
        where: {
          channel: "email",
          createdAt: { gte: burstStart },
          createdById: input.userId,
        },
      });

    if (recentActorShareCount >= EMAIL_SHARE_BURST_LIMIT) {
      return { status: "rate_limited" as const };
    }

    const recentRecipientShare =
      await transaction.publisherDiscoveryShare.findFirst({
        where: {
          channel: "email",
          createdAt: { gte: recipientCooldownStart },
          publisherId: membership.publisherId,
          recipientEmail,
        },
        select: { id: true },
      });

    if (recentRecipientShare) {
      return { status: "recipient_rate_limited" as const };
    }

    const created = await transaction.publisherDiscoveryShare.create({
      data: {
        authorId: entity.authorId,
        channel: "email",
        createdById: input.userId,
        note,
        publisherId: membership.publisherId,
        recipientEmail,
        workId: entity.workId,
      },
      select: { id: true },
    });

    await transaction.auditLog.create({
      data: {
        action: "publisher_discovery_shared",
        actorId: input.userId,
        entityId: created.id,
        entityType: "PublisherDiscoveryShare",
        metadata: JSON.stringify({
          channel: "email",
          entityKind: input.entityKind,
          publisherId: membership.publisherId,
          recipientDomain,
        }),
      },
    });

    return {
      share: created,
      status: "created" as const,
    };
  });

  if (createResult.status === "rate_limited") {
    return { status: "rate_limited" };
  }

  if (createResult.status === "recipient_rate_limited") {
    return { status: "recipient_rate_limited" };
  }

  const share = createResult.share;
  const idempotencyKey =
    publisherDiscoveryShareEmailIdempotencyKey(share.id);

  try {
    const delivery = await sendPublisherDiscoveryShareEmail({
      email: recipientEmail,
      entityKind: input.entityKind,
      entityTitle: entity.entityTitle,
      idempotencyKey,
      note,
      publisherName: membership.publisher.companyName,
      targetPath: entity.targetPath,
    });

    const deliveryId =
      delivery.deliveryId ??
      await getEmailDeliveryIdForIdempotencyKey(idempotencyKey);

    if (!deliveryId) {
      throw new Error(
        "PUBLISHER_DISCOVERY_SHARE_DELIVERY_LINK_MISSING",
      );
    }
  } catch (error) {
    let deliveryId: string | null = null;

    try {
      deliveryId =
        await getEmailDeliveryIdForIdempotencyKey(idempotencyKey);
    } catch (trackingError) {
      console.error(
        "PUBLISHER_DISCOVERY_EMAIL_SHARE_TRACKING_LOOKUP_FAILED",
        {
          error:
            trackingError instanceof Error
              ? trackingError.message
              : "UNKNOWN_ERROR",
          shareId: share.id,
        },
      );
    }

    console.error("PUBLISHER_DISCOVERY_EMAIL_SHARE_FAILED", {
      deliveryId,
      error:
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR",
      shareId: share.id,
    });

    return {
      shareId: share.id,
      status: "email_failed",
    };
  }

  return {
    shareId: share.id,
    status: "created",
  };
}

export interface PublisherSharedItem {
  author: {
    id: string;
    name: string;
    publicId: string;
  } | null;
  createdAt: string;
  createdByName: string;
  id: string;
  note: string;
  readAt: string | null;
  work: {
    id: string;
    slug: string;
    title: string;
  } | null;
}

const sharedItemSelect = {
  author: {
    select: {
      displayName: true,
      id: true,
      publicId: true,
      username: true,
    },
  },
  createdAt: true,
  createdBy: {
    select: {
      displayName: true,
      fullName: true,
    },
  },
  id: true,
  note: true,
  work: {
    select: {
      id: true,
      slug: true,
      title: true,
    },
  },
} as const;

function mapShareRecord(
  record: {
    author: {
      displayName: string | null;
      id: string;
      publicId: string;
      username: string | null;
    } | null;
    createdAt: Date;
    createdBy: {
      displayName: string | null;
      fullName: string;
    } | null;
    id: string;
    note: string;
    work: {
      id: string;
      slug: string;
      title: string;
    } | null;
  },
  readAt: Date | null,
): PublisherSharedItem {
  return {
    author: record.author
      ? {
          id: record.author.id,
          name: publicAuthorName(record.author),
          publicId: record.author.publicId,
        }
      : null,
    createdAt: record.createdAt.toISOString(),
    createdByName: record.createdBy
      ? displayName(record.createdBy)
      : "Yayınevi ekibi",
    id: record.id,
    note: record.note,
    readAt: readAt?.toISOString() ?? null,
    work: record.work,
  };
}

export async function getPublisherSharedItems(
  userId: string,
): Promise<{
  adminReadOnly: boolean;
  companyName: string;
  items: PublisherSharedItem[];
} | null> {
  const membership = await getPublisherMembership(userId);

  if (
    !membership ||
    !hasPublisherPermission(
      membership.role,
      "view_shared_items",
      membership.permissionOverrides,
    )
  ) {
    return null;
  }

  const adminReadOnly =
    isPublisherAdminReadOnlyMembership(membership);

  if (adminReadOnly) {
    const records = await prisma.publisherDiscoveryShare.findMany({
      where: {
        channel: "team",
        publisherId: membership.publisherId,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: sharedItemSelect,
    });

    return {
      adminReadOnly: true,
      companyName: membership.publisher.companyName,
      items: records.map((record) =>
        mapShareRecord(record, null),
      ),
    };
  }

  const recipientRecords =
    await prisma.publisherDiscoveryShareRecipient.findMany({
      where: {
        membershipId: membership.id,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        readAt: true,
        share: {
          select: sharedItemSelect,
        },
      },
    });

  return {
    adminReadOnly: false,
    companyName: membership.publisher.companyName,
    items: recipientRecords.map((record) =>
      mapShareRecord(record.share, record.readAt),
    ),
  };
}

export async function markPublisherSharedItemRead(input: {
  shareId: string;
  userId: string;
}) {
  const membership = await getPublisherMembership(input.userId);

  if (!membership || isPublisherAdminReadOnlyMembership(membership)) {
    return false;
  }

  if (
    !hasPublisherPermission(
      membership.role,
      "view_shared_items",
      membership.permissionOverrides,
    )
  ) {
    return false;
  }

  const updated =
    await prisma.publisherDiscoveryShareRecipient.updateMany({
      where: {
        membershipId: membership.id,
        readAt: null,
        shareId: input.shareId,
      },
      data: { readAt: new Date() },
    });

  return updated.count === 1;
}
