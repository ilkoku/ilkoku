import "server-only";

import {
  hasPublisherPermission,
} from "@/features/publisher-workspace/permissions";
import {
  sendPublisherFollowedAuthorPublishedEmail,
} from "@/lib/email/publisher-engagement-emails";
import { prisma } from "@/lib/prisma";

export type FollowedAuthorPublicationRecipient = {
  email: string;
  emailVerified: Date | null;
  fullName: string;
  id: string;
};

function logFailure(
  event: string,
  workId: string,
  error: unknown,
) {
  console.error(
    "PUBLISHER_FOLLOW_PUBLICATION_FAILED",
    {
      event,
      workId,
      error:
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR",
    },
  );
}

async function getRecipients(authorId: string) {
  const follows =
    await prisma.publisherAuthorFollow.findMany({
      where: {
        authorId,
        publisher: {
          active: true,
          archivedAt: null,
          verified: true,
        },
      },
      select: {
        publisherId: true,
      },
    });

  const publisherIds = Array.from(
    new Set(follows.map((follow) => follow.publisherId)),
  );

  if (publisherIds.length === 0) {
    return [];
  }

  const memberships =
    await prisma.publisherMembership.findMany({
      where: {
        active: true,
        publisherId: {
          in: publisherIds,
        },
        publisher: {
          active: true,
          archivedAt: null,
          verified: true,
        },
        user: {
          deletedAt: null,
          status: "active",
        },
      },
      select: {
        permissionOverrides: true,
        role: true,
        user: {
          select: {
            email: true,
            emailVerified: true,
            fullName: true,
            id: true,
          },
        },
      },
    });

  const recipientMap = new Map<
    string,
    FollowedAuthorPublicationRecipient
  >();

  for (const membership of memberships) {
    if (
      !hasPublisherPermission(
        membership.role,
        "follow_author",
        membership.permissionOverrides,
      )
    ) {
      continue;
    }

    recipientMap.set(
      membership.user.id,
      membership.user,
    );
  }

  return Array.from(recipientMap.values());
}

async function createMissingNotifications(input: {
  authorName: string;
  recipients: FollowedAuthorPublicationRecipient[];
  workId: string;
  workTitle: string;
}) {
  if (input.recipients.length === 0) return;

  await prisma.$transaction(async (transaction) => {
    const locked = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM Work
      WHERE id = ${input.workId}
      LIMIT 1
      FOR UPDATE
    `;

    if (!locked[0]) return;

    const recipientIds = input.recipients.map(
      (recipient) => recipient.id,
    );

    const existing = await transaction.notification.findMany({
      where: {
        relatedEntityId: input.workId,
        relatedEntityType: "work",
        type: "publisher_followed_author_published",
        userId: {
          in: recipientIds,
        },
      },
      select: {
        userId: true,
      },
    });

    const existingIds = new Set(
      existing.map((notification) => notification.userId),
    );

    const missing = input.recipients.filter(
      (recipient) => !existingIds.has(recipient.id),
    );

    if (missing.length === 0) return;

    await transaction.notification.createMany({
      data: missing.map((member) => ({
        message:
          `${input.authorName}, ${input.workTitle} adlı yeni eserini yayımladı.`,
        relatedEntityId: input.workId,
        relatedEntityType: "work",
        title:
          "Takip ettiğiniz yazar yeni eser yayımladı",
        type:
          "publisher_followed_author_published" as const,
        userId: member.id,
      })),
    });
  });
}

export async function deliverPublisherFollowedAuthorPublication(input: {
  authorId: string;
  authorName: string;
  workId: string;
  workSlug: string;
  workTitle: string;
}) {
  const recipients = await getRecipients(input.authorId);

  if (recipients.length === 0) return;

  try {
    await createMissingNotifications({
      authorName: input.authorName,
      recipients,
      workId: input.workId,
      workTitle: input.workTitle,
    });
  } catch (error) {
    logFailure(
      "in_app_notification",
      input.workId,
      error,
    );
  }

  const deliveries = await Promise.allSettled(
    recipients
      .filter(
        (member) => member.emailVerified !== null,
      )
      .map((member) =>
        sendPublisherFollowedAuthorPublishedEmail({
          authorName: input.authorName,
          email: member.email,
          idempotencyKey:
            `publisher-followed-author-published:${input.workId}:${member.id}`,
          memberName: member.fullName,
          workSlug: input.workSlug,
          workTitle: input.workTitle,
        }),
      ),
  );

  deliveries.forEach((delivery, index) => {
    if (delivery.status === "rejected") {
      logFailure(
        `email_${index}`,
        input.workId,
        delivery.reason,
      );
    }
  });
}
