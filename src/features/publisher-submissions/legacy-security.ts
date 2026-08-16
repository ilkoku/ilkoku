import "server-only";

import type {
  Prisma,
  PublisherSubmissionStatus,
} from "@/generated/prisma/client";
import {
  getPublisherMembership,
  isPublisherAdminReadOnlyMembership,
} from "@/features/publisher-workspace/repository";
import {
  hasPublisherPermission,
} from "@/features/publisher-workspace/permissions";
import { prisma } from "@/lib/prisma";

const ACTIVE_SUBMISSION_STATUSES = [
  "pending",
  "reviewing",
  "accepted",
  "rejected",
] as const satisfies readonly PublisherSubmissionStatus[];

type LockedSubmission = {
  archivedAt: Date | null;
  authorId: string;
  id: string;
  publisherId: string;
  publisherNote: string | null;
  status: PublisherSubmissionStatus;
  workId: string;
};

function auditMetadata(input: Record<string, unknown>) {
  return JSON.stringify(input);
}

async function lockSubmission(
  transaction: Prisma.TransactionClient,
  submissionId: string,
) {
  const rows = await transaction.$queryRaw<LockedSubmission[]>`
    SELECT
      id,
      publisherId,
      workId,
      authorId,
      publisherNote,
      status,
      archivedAt
    FROM PublisherSubmission
    WHERE id = ${submissionId}
    LIMIT 1
    FOR UPDATE
  `;

  return rows[0] ?? null;
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

export async function createLegacyPublisherSubmission(input: {
  authorId: string;
  coverLetter: string;
  publisherId: string;
  workId: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const workRows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM Work
      WHERE id = ${input.workId}
        AND authorId = ${input.authorId}
        AND archivedAt IS NULL
        AND status <> 'archived'
      LIMIT 1
      FOR UPDATE
    `;

    if (!workRows[0]) {
      throw new Error("WORK_NOT_FOUND");
    }

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

    if (!publisherRows[0]) {
      throw new Error("PUBLISHER_NOT_AVAILABLE");
    }

    const existing = await transaction.publisherSubmission.findFirst({
      where: {
        archivedAt: null,
        authorId: input.authorId,
        publisherId: input.publisherId,
        status: {
          in: [...ACTIVE_SUBMISSION_STATUSES],
        },
        workId: input.workId,
      },
      select: { id: true },
    });

    if (existing) {
      throw new Error("SUBMISSION_EXISTS");
    }

    const submission = await transaction.publisherSubmission.create({
      data: input,
      select: {
        id: true,
        publisherId: true,
        workId: true,
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "work_status_changed",
        actorId: input.authorId,
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
          message:
            "Yeni bir eser başvurusu yayınevi çalışma alanınıza ulaştı.",
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

export async function withdrawLegacyPublisherSubmission(
  authorId: string,
  submissionId: string,
) {
  return prisma.$transaction(async (transaction) => {
    const submission = await lockSubmission(
      transaction,
      submissionId,
    );

    if (
      !submission ||
      submission.authorId !== authorId ||
      submission.archivedAt ||
      (
        submission.status !== "pending" &&
        submission.status !== "reviewing"
      )
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
        actorId: authorId,
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

function transitionAllowed(
  from: PublisherSubmissionStatus,
  to: Exclude<PublisherSubmissionStatus, "withdrawn">,
) {
  if (from === "withdrawn") return false;
  if (from === "accepted" || from === "rejected") {
    return from === to;
  }
  if (from === "reviewing" && to === "pending") {
    return false;
  }

  return true;
}

export async function updateLegacyPublisherSubmissionDecision(input: {
  note: string | null;
  status: Exclude<PublisherSubmissionStatus, "withdrawn">;
  submissionId: string;
  userId: string;
}) {
  const membership = await getPublisherMembership(input.userId);

  if (
    !membership ||
    isPublisherAdminReadOnlyMembership(membership) ||
    !hasPublisherPermission(
      membership.role,
      "decide_submission",
      membership.permissionOverrides,
    )
  ) {
    return { status: "forbidden" as const };
  }

  return prisma.$transaction(async (transaction) => {
    const locked = await lockSubmission(
      transaction,
      input.submissionId,
    );

    if (
      !locked ||
      locked.publisherId !== membership.publisherId ||
      locked.archivedAt
    ) {
      return { status: "not_found" as const };
    }

    if (!transitionAllowed(locked.status, input.status)) {
      return {
        currentStatus: locked.status,
        status: "invalid_transition" as const,
      };
    }

    const submission = await transaction.publisherSubmission.findUnique({
      where: { id: locked.id },
      select: {
        author: {
          select: {
            email: true,
            fullName: true,
          },
        },
        authorId: true,
        work: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!submission) {
      return { status: "not_found" as const };
    }

    const statusChanged = locked.status !== input.status;
    const noteChanged = locked.publisherNote !== input.note;

    if (!statusChanged && !noteChanged) {
      return {
        author: submission.author,
        status: "updated" as const,
        statusChanged: false,
        updated: await transaction.publisherSubmission.findUniqueOrThrow({
          where: { id: locked.id },
        }),
        work: submission.work,
      };
    }

    const updated = await transaction.publisherSubmission.update({
      where: { id: locked.id },
      data: {
        publisherNote: input.note,
        status: input.status,
      },
    });

    await transaction.publisherSubmissionEvent.create({
      data: {
        actorId: input.userId,
        detail: input.note,
        metadata: auditMetadata({
          from: locked.status,
          to: input.status,
        }),
        submissionId: locked.id,
        title:
          input.status === "reviewing"
            ? "Başvuru incelemeye alındı"
            : input.status === "accepted"
              ? "Başvuru kabul edildi"
              : input.status === "rejected"
                ? "Başvuru reddedildi"
                : "Başvuru güncellendi",
        type:
          input.status === "reviewing"
            ? "review_started"
            : "decision_changed",
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "work_status_changed",
        actorId: input.userId,
        entityId: locked.workId,
        entityType: "Work",
        metadata: auditMetadata({
          from: locked.status,
          noteChanged,
          publisherId: locked.publisherId,
          publisherSubmissionId: locked.id,
          source: "publisher_submission_decision_updated",
          to: input.status,
        }),
      },
    });

    if (statusChanged) {
      await transaction.notification.create({
        data: {
          message:
            `${submission.work.title} eserinizin yayınevi başvuru durumu güncellendi.`,
          relatedEntityId: locked.id,
          relatedEntityType: "publisher_submission",
          title:
            input.status === "accepted"
              ? "Başvurunuz kabul edildi"
              : input.status === "rejected"
                ? "Başvurunuz sonuçlandı"
                : "Başvurunuz inceleniyor",
          type: "system",
          userId: submission.authorId,
        },
      });
    }

    return {
      author: submission.author,
      status: "updated" as const,
      statusChanged,
      updated,
      work: submission.work,
    };
  });
}

export async function addLegacyPublisherInternalNote(input: {
  note: string;
  submissionId: string;
  userId: string;
}) {
  const membership = await getPublisherMembership(input.userId);

  if (
    !membership ||
    isPublisherAdminReadOnlyMembership(membership) ||
    !hasPublisherPermission(
      membership.role,
      "add_internal_note",
      membership.permissionOverrides,
    )
  ) {
    return { status: "forbidden" as const };
  }

  return prisma.$transaction(async (transaction) => {
    const locked = await lockSubmission(
      transaction,
      input.submissionId,
    );

    if (
      !locked ||
      locked.publisherId !== membership.publisherId ||
      locked.archivedAt ||
      locked.status === "withdrawn"
    ) {
      return { status: "not_found" as const };
    }

    const event = await transaction.publisherSubmissionEvent.create({
      data: {
        actorId: input.userId,
        detail: input.note,
        submissionId: locked.id,
        title: "Yayınevi iç notu eklendi",
        type: "internal_note",
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "work_status_changed",
        actorId: input.userId,
        entityId: locked.workId,
        entityType: "Work",
        metadata: auditMetadata({
          noteLength: input.note.length,
          publisherId: locked.publisherId,
          publisherSubmissionId: locked.id,
          source: "publisher_submission_internal_note_added",
          status: locked.status,
        }),
      },
    });

    return {
      event,
      status: "created" as const,
    };
  });
}

export async function getLegacyPublisherFiles(userId: string) {
  const membership = await getPublisherMembership(userId);

  if (
    !membership ||
    !hasPublisherPermission(
      membership.role,
      "view_files",
      membership.permissionOverrides,
    )
  ) {
    return null;
  }

  return prisma.publisherFile.findMany({
    where: {
      archivedAt: null,
      submission: {
        archivedAt: null,
        publisherId: membership.publisherId,
      },
    },
    include: {
      submission: {
        select: {
          id: true,
          work: {
            select: {
              title: true,
            },
          },
        },
      },
      uploadedBy: {
        select: {
          displayName: true,
          fullName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getLegacyPublisherFileForDownload(
  userId: string,
  fileId: string,
) {
  const membership = await getPublisherMembership(userId);

  if (
    !membership ||
    isPublisherAdminReadOnlyMembership(membership) ||
    !hasPublisherPermission(
      membership.role,
      "download_files",
      membership.permissionOverrides,
    )
  ) {
    return null;
  }

  return prisma.publisherFile.findFirst({
    where: {
      archivedAt: null,
      id: fileId,
      submission: {
        archivedAt: null,
        publisherId: membership.publisherId,
      },
    },
    select: {
      fileName: true,
      storageUrl: true,
    },
  });
}
