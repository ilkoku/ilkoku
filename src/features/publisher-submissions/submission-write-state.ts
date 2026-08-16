import "server-only";

import type {
  Prisma,
  PublisherSubmissionStatus,
} from "@/generated/prisma/client";
import { hasPublisherPermission } from "@/features/publisher-workspace/permissions";
import { prisma } from "@/lib/prisma";

type LockedActorRow = {
  deletedAt: Date | string | null;
  id: string;
  isBanned: boolean | number;
  status: "active" | "suspended" | "disabled";
};

type LockedPublisherRow = {
  active: boolean | number;
  archivedAt: Date | string | null;
  id: string;
  verified: boolean | number;
};

type LockedMembershipRow = {
  active: boolean | number;
  id: string;
  publisherId: string;
  userId: string;
};

type LockedSubmissionRow = {
  archivedAt: Date | string | null;
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

function transitionAllowed(
  from: PublisherSubmissionStatus,
  to: Exclude<PublisherSubmissionStatus, "withdrawn">,
) {
  if (from === "withdrawn") return false;
  if (from === "accepted" || from === "rejected") return from === to;
  if (from === "reviewing" && to === "pending") return false;
  return true;
}

async function lockAuthorizedSubmission(
  transaction: Prisma.TransactionClient,
  input: {
    permission: "add_internal_note" | "decide_submission";
    submissionId: string;
    userId: string;
  },
) {
  const candidate = await transaction.publisherSubmission.findUnique({
    where: { id: input.submissionId },
    select: { publisherId: true },
  });

  if (!candidate) return { status: "not_found" as const };

  const actors = await transaction.$queryRaw<LockedActorRow[]>`
    SELECT id, status, isBanned, deletedAt
    FROM User
    WHERE id = ${input.userId}
    LIMIT 1
    FOR UPDATE
  `;
  const actor = actors[0] ?? null;

  if (
    !actor ||
    actor.status !== "active" ||
    Boolean(actor.isBanned) ||
    actor.deletedAt
  ) {
    return { status: "forbidden" as const };
  }

  const publishers = await transaction.$queryRaw<LockedPublisherRow[]>`
    SELECT id, active, verified, archivedAt
    FROM Publisher
    WHERE id = ${candidate.publisherId}
    LIMIT 1
    FOR UPDATE
  `;
  const publisher = publishers[0] ?? null;

  if (
    !publisher ||
    !Boolean(publisher.active) ||
    !Boolean(publisher.verified) ||
    publisher.archivedAt
  ) {
    return { status: "forbidden" as const };
  }

  const memberships = await transaction.$queryRaw<LockedMembershipRow[]>`
    SELECT id, publisherId, userId, active
    FROM PublisherMembership
    WHERE publisherId = ${publisher.id}
      AND userId = ${actor.id}
    LIMIT 1
    FOR UPDATE
  `;
  const lockedMembership = memberships[0] ?? null;

  if (!lockedMembership || !Boolean(lockedMembership.active)) {
    return { status: "forbidden" as const };
  }

  const membership = await transaction.publisherMembership.findUnique({
    where: { id: lockedMembership.id },
    select: {
      active: true,
      permissionOverrides: true,
      publisherId: true,
      role: true,
      userId: true,
    },
  });

  if (
    !membership ||
    !membership.active ||
    membership.publisherId !== publisher.id ||
    membership.userId !== actor.id ||
    !hasPublisherPermission(
      membership.role,
      input.permission,
      membership.permissionOverrides,
    )
  ) {
    return { status: "forbidden" as const };
  }

  const submissions = await transaction.$queryRaw<LockedSubmissionRow[]>`
    SELECT id, publisherId, workId, authorId, publisherNote, status, archivedAt
    FROM PublisherSubmission
    WHERE id = ${input.submissionId}
      AND publisherId = ${publisher.id}
    LIMIT 1
    FOR UPDATE
  `;
  const submission = submissions[0] ?? null;

  if (!submission || submission.archivedAt) {
    return { status: "not_found" as const };
  }

  return {
    actor,
    membership,
    publisher,
    status: "authorized" as const,
    submission,
  };
}

export async function updatePublisherSubmissionDecisionLocked(input: {
  note: string | null;
  status: Exclude<PublisherSubmissionStatus, "withdrawn">;
  submissionId: string;
  userId: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const authorization = await lockAuthorizedSubmission(transaction, {
      permission: "decide_submission",
      submissionId: input.submissionId,
      userId: input.userId,
    });

    if (authorization.status !== "authorized") return authorization;

    const locked = authorization.submission;

    if (!transitionAllowed(locked.status, input.status)) {
      return {
        currentStatus: locked.status,
        status: "invalid_transition" as const,
      };
    }

    const submission = await transaction.publisherSubmission.findUnique({
      where: { id: locked.id },
      select: {
        author: { select: { email: true, fullName: true } },
        authorId: true,
        work: { select: { title: true } },
      },
    });

    if (!submission) return { status: "not_found" as const };

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
        metadata: auditMetadata({ from: locked.status, to: input.status }),
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
          message: `${submission.work.title} eserinizin yayınevi başvuru durumu güncellendi.`,
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

export async function addPublisherInternalNoteLocked(input: {
  note: string;
  submissionId: string;
  userId: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const authorization = await lockAuthorizedSubmission(transaction, {
      permission: "add_internal_note",
      submissionId: input.submissionId,
      userId: input.userId,
    });

    if (authorization.status !== "authorized") return authorization;

    const locked = authorization.submission;

    if (locked.status === "withdrawn") {
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

    return { event, status: "created" as const };
  });
}
