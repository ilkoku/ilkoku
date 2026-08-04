import "server-only";

import {
  getPublisherMembership,
  isPublisherAdminReadOnlyMembership,
} from "@/features/publisher-workspace/repository";
import {
  hasPublisherPermission,
  publisherRoleLabels,
} from "@/features/publisher-workspace/permissions";
import { sendPublisherDiscoveryShareEmail } from "@/lib/email/publisher-sharing-emails";
import { prisma } from "@/lib/prisma";

const publicWorkWhere = {
  archivedAt: null,
  publishedAt: { not: null },
  status: "published" as const,
  visibility: "public" as const,
};

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
        | "membership_not_found";
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

  return author
    ? {
        authorId: author.id,
        entityKind,
        entityTitle: publicAuthorName(author),
        targetPath:
          `/kesfet?arama=${encodeURIComponent(publicAuthorName(author))}`,
        workId: null,
      }
    : null;
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
        id: { in: recipientIds, not: membership.id },
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

    return { shareId: share.id, status: "created" };
  }

  const recipientEmail = input.recipientEmail?.trim().toLowerCase() ?? "";
  if (!validEmail(recipientEmail)) {
    return { status: "invalid_email" };
  }

  const share = await prisma.$transaction(async (transaction) => {
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
          recipientDomain:
            recipientEmail.split("@")[1] ?? null,
        }),
      },
    });

    return created;
  });

  try {
    await sendPublisherDiscoveryShareEmail({
      email: recipientEmail,
      entityKind: input.entityKind,
      entityTitle: entity.entityTitle,
      note,
      publisherName: membership.publisher.companyName,
      targetPath: entity.targetPath,
    });
  } catch (error) {
    console.error("PUBLISHER_DISCOVERY_EMAIL_SHARE_FAILED", {
      error:
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR",
      shareId: share.id,
    });

    return { shareId: share.id, status: "email_failed" };
  }

  return { shareId: share.id, status: "created" };
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

  const adminReadOnly = isPublisherAdminReadOnlyMembership(membership);

  const records = adminReadOnly
    ? await prisma.publisherDiscoveryShare.findMany({
        where: {
          channel: "team",
          publisherId: membership.publisherId,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
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
        },
      })
    : await prisma.publisherDiscoveryShareRecipient.findMany({
        where: { membershipId: membership.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          readAt: true,
          share: {
            select: {
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
            },
          },
        },
      });

  const items: PublisherSharedItem[] = adminReadOnly
    ? records.map((record) => ({
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
        readAt: null,
        work: record.work,
      }))
    : records.map((record) => ({
        author: record.share.author
          ? {
              id: record.share.author.id,
              name: publicAuthorName(record.share.author),
              publicId: record.share.author.publicId,
            }
          : null,
        createdAt: record.share.createdAt.toISOString(),
        createdByName: record.share.createdBy
          ? displayName(record.share.createdBy)
          : "Yayınevi ekibi",
        id: record.share.id,
        note: record.share.note,
        readAt: record.readAt?.toISOString() ?? null,
        work: record.share.work,
      }));

  return {
    adminReadOnly,
    companyName: membership.publisher.companyName,
    items,
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

  const updated = await prisma.publisherDiscoveryShareRecipient.updateMany({
    where: {
      membershipId: membership.id,
      readAt: null,
      shareId: input.shareId,
    },
    data: { readAt: new Date() },
  });

  return updated.count === 1;
}
