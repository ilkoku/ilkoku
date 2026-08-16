import "server-only";

import type { Prisma, PublisherSubmissionStatus } from "@/generated/prisma/client";
import { hasPublisherPermission } from "@/features/publisher-workspace/permissions";
import { prisma } from "@/lib/prisma";

const ACTIVE_SUBMISSION_STATUSES = [
  "pending",
  "reviewing",
  "accepted",
  "rejected",
] as const satisfies readonly PublisherSubmissionStatus[];

type LockedWriterRow = {
  deletedAt: Date | string | null;
  id: string;
  isBanned: boolean | number;
  role: string;
  status: "active" | "suspended" | "disabled";
};

type LockedSubmissionRow = {
  archivedAt: Date | string | null;
  authorId: string;
  id: string;
  publisherId: string;
  status: PublisherSubmissionStatus;
  workId: string;
};

function auditMetadata(input: Record<string, unknown>) {
  return JSON.stringify(input);
}

async function lockActiveWriter(
  transaction: Prisma.TransactionClient,
  userId: string,
) {
  const rows = await transaction.$queryRaw<LockedWriterRow[]>`
    SELECT id, role, status, isBanned, deletedAt
    FROM User
    WHERE id = ${userId}
    LIMIT 1
    FOR UPDATE
  `;
  const writer = rows[0] ?? null;

  if (
    !writer ||
    writer.role !== "writer" ||
    writer.status !== "active" ||
    Boolean(writer.isBanned) ||
    writer.deletedAt
  ) {
    return null;
  }

  return writer;
}

async function getSubmissionNotificationRecipients(
  transaction: Prisma.TransactionClient,
  publisherId: string,
) {
  const memberships = await transaction.publisherMembership.findMany({
    where: {
      active: true,
      publisherId,
      user: {
        deletedAt: null,
        isBanned: false,
        status: "active",
      },
    },
    select: {
      permissionOverrides: true,
      role: true,
      userId: true,
    },
  });

  return memberships
    .filter((membership) =>
      hasPublisherPermission(
        membership.role,
        "view_submission",
        membership.permissionOverrides,
      ),
    )
    .map((membership) => membership.userId);
}

export async function createPublisherSubmissionLocked(input: {
  authorId: string;
  coverLetter: string;
  publisherId: string;
  workId: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const writer = await lockActiveWriter(transaction, input.authorId);
    if (!writer) throw new Error("WRITER_UNAVAILABLE");

    const workRows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM Work
      WHERE id = ${input.workId}
        AND authorId = ${writer.id}
        AND archivedAt IS NULL
        AND status <> 'archived'
      LIMIT 1
      FOR UPDATE
    `;

    if (!workRows[0]) throw new Error("WORK_NOT_FOUND");

    const publisherRows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM Publisher
      WHERE id = ${input.publisherId}
        AND active = 1
        AND verified = 1
        AND acceptsSubmissions = 1
        AND archivedAt IS NULL
      LIMIT 1
      FOR UPDATE
    `;

    if (!publisherRows[0]) throw new Error("PUBLISHER_NOT_AVAILABLE");

    const existing = await transaction.publisherSubmission.findFirst({
      where: {
        archivedAt: null,
        authorId: writer.id,
        publisherId: input.publisherId,
        status: { in: [...ACTIVE_SUBMISSION_STATUSES] },
        workId: input.workId,
      },
      select: { id: true },
    });

    if (existing) throw new Error("SUBMISSION_EXISTS");

    const submission = await transaction.publisherSubmission.create({
      data: {
        authorId: writer.id,
        coverLetter: input.coverLetter,
        publisherId: input.publisherId,
        workId: input.workId,
      },
      select: {
        id: true,
        publisherId: true,
        workId: true,
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "work_status_changed",
        actorId: writer.id,
        entityId: input.workId,
        entityType: "Work",
        metadata: auditMetadata({
          publisherId: input.publisherId,
          publisherSubmissionId: submission.id,
          source: "publisher_submission_created",
          status: "pending",
        }),
      },
    });

    const recipients = await getSubmissionNotificationRecipients(
      transaction,
      input.publisherId,
    );

    if (recipients.length) {
      await transaction.notification.createMany({
        data: recipients.map((userId) => ({
          message: "Yeni bir eser başvurusu yayınevi çalışma alanınıza ulaştı.",
          relatedEntityId: submission.id,
          relatedEntityType: "publisher_submission",
          title: "Yeni eser başvurusu",
          type: "system" as const,
          userId,
        })),
      });
    }

    return submission;
  });
}

export async function withdrawPublisherSubmissionLocked(
  authorId: string,
  submissionId: string,
) {
  return prisma.$transaction(async (transaction) => {
    const writer = await lockActiveWriter(transaction, authorId);
    if (!writer) return { count: 0 };

    const rows = await transaction.$queryRaw<LockedSubmissionRow[]>`
      SELECT id, publisherId, workId, authorId, status, archivedAt
      FROM PublisherSubmission
      WHERE id = ${submissionId}
        AND authorId = ${writer.id}
      LIMIT 1
      FOR UPDATE
    `;
    const submission = rows[0] ?? null;

    if (
      !submission ||
      submission.archivedAt ||
      (submission.status !== "pending" && submission.status !== "reviewing")
    ) {
      return { count: 0 };
    }

    const withdrawnAt = new Date();

    await transaction.publisherSubmission.update({
      where: { id: submission.id },
      data: {
        archivedAt: withdrawnAt,
        status: "withdrawn",
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "work_status_changed",
        actorId: writer.id,
        entityId: submission.workId,
        entityType: "Work",
        metadata: auditMetadata({
          from: submission.status,
          publisherId: submission.publisherId,
          publisherSubmissionId: submission.id,
          source: "publisher_submission_withdrawn",
          to: "withdrawn",
        }),
      },
    });

    const work = await transaction.work.findUnique({
      where: { id: submission.workId },
      select: { title: true },
    });

    const recipients = await getSubmissionNotificationRecipients(
      transaction,
      submission.publisherId,
    );

    if (recipients.length) {
      await transaction.notification.createMany({
        data: recipients.map((userId) => ({
          message: `${work?.title ?? "Eser"} başvurusu yazar tarafından geri çekildi.`,
          relatedEntityId: submission.id,
          relatedEntityType: "publisher_submission",
          title: "Başvuru güncellendi",
          type: "system" as const,
          userId,
        })),
      });
    }

    return { count: 1 };
  });
}
