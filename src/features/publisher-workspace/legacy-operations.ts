import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePublisherMembershipPermission } from "./repository";
import type { PublisherWorkspaceSubmissionStatus } from "./types";

type LockedSubmission = {
  archivedAt: Date | null;
  id: string;
  publisherId: string;
  status: "pending" | "reviewing" | "accepted" | "rejected" | "withdrawn";
};

async function lockSubmission(
  transaction: Prisma.TransactionClient,
  submissionId: string,
  publisherId: string,
) {
  const rows = await transaction.$queryRaw<LockedSubmission[]>`
    SELECT id, publisherId, status, archivedAt
    FROM PublisherSubmission
    WHERE id = ${submissionId}
      AND publisherId = ${publisherId}
    LIMIT 1
    FOR UPDATE
  `;

  const submission = rows[0] ?? null;
  if (!submission || submission.archivedAt) return null;
  return submission;
}

async function writeLegacyAudit(
  transaction: Prisma.TransactionClient,
  input: {
    actorId: string;
    entityId: string;
    entityType: string;
    metadata: Record<string, unknown>;
  },
) {
  await transaction.auditLog.create({
    data: {
      action: "publisher_status_changed",
      actorId: input.actorId,
      entityId: input.entityId,
      entityType: input.entityType,
      metadata: JSON.stringify(input.metadata),
    },
  });
}

export async function updatePublisherSubmissionDecisionSecure(input: {
  note: string | null;
  status: Exclude<PublisherWorkspaceSubmissionStatus, "withdrawn">;
  submissionId: string;
  userId: string;
}) {
  const membership = await requirePublisherMembershipPermission(
    input.userId,
    "decide_submission",
  );
  if (!membership) return null;

  return prisma.$transaction(async (transaction) => {
    const locked = await lockSubmission(
      transaction,
      input.submissionId,
      membership.publisherId,
    );
    if (!locked || locked.status === "withdrawn") return null;

    const submission = await transaction.publisherSubmission.findUnique({
      where: { id: locked.id },
      select: {
        author: { select: { email: true, fullName: true } },
        authorId: true,
        id: true,
        work: { select: { title: true } },
      },
    });
    if (!submission) return null;

    const statusChanged = locked.status !== input.status;
    const updated = await transaction.publisherSubmission.update({
      where: { id: locked.id },
      data: {
        publisherNote: input.note,
        status: input.status,
      },
    });

    if (statusChanged || input.note) {
      await transaction.publisherSubmissionEvent.create({
        data: {
          actorId: input.userId,
          detail: input.note,
          metadata: JSON.stringify({ from: locked.status, to: input.status }),
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

      await writeLegacyAudit(transaction, {
        actorId: input.userId,
        entityId: locked.id,
        entityType: "PublisherSubmission",
        metadata: {
          from: locked.status,
          publisherId: membership.publisherId,
          source: "publisher_submission_decision",
          submissionId: locked.id,
          to: input.status,
        },
      });
    }

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
      statusChanged,
      updated,
      work: submission.work,
    };
  });
}

export async function addPublisherInternalNoteSecure(input: {
  note: string;
  submissionId: string;
  userId: string;
}) {
  const membership = await requirePublisherMembershipPermission(
    input.userId,
    "add_internal_note",
  );
  if (!membership) return null;

  return prisma.$transaction(async (transaction) => {
    const locked = await lockSubmission(
      transaction,
      input.submissionId,
      membership.publisherId,
    );
    if (!locked) return null;

    const event = await transaction.publisherSubmissionEvent.create({
      data: {
        actorId: input.userId,
        detail: input.note,
        submissionId: locked.id,
        title: "Yayınevi iç notu eklendi",
        type: "internal_note",
      },
    });

    await writeLegacyAudit(transaction, {
      actorId: input.userId,
      entityId: locked.id,
      entityType: "PublisherSubmission",
      metadata: {
        publisherId: membership.publisherId,
        source: "publisher_submission_internal_note",
        submissionId: locked.id,
      },
    });

    return event;
  });
}

export async function upsertPublisherContractSecure(input: {
  advanceAmount: number | null;
  notes: string | null;
  rightsPeriodMonths: number;
  royaltyPercentage: number;
  status: "draft" | "sent";
  submissionId: string;
  territory: string;
  userId: string;
}) {
  const membership = await requirePublisherMembershipPermission(
    input.userId,
    "manage_contract",
  );
  if (!membership) return null;

  return prisma.$transaction(async (transaction) => {
    const locked = await lockSubmission(
      transaction,
      input.submissionId,
      membership.publisherId,
    );
    if (!locked || locked.status !== "accepted") return null;

    const submission = await transaction.publisherSubmission.findUnique({
      where: { id: locked.id },
      select: {
        author: { select: { email: true, fullName: true } },
        authorId: true,
        id: true,
        work: { select: { title: true } },
      },
    });
    if (!submission) return null;

    const existing = await transaction.publishingContract.findUnique({
      where: { submissionId: locked.id },
    });

    const contract = await transaction.publishingContract.upsert({
      where: { submissionId: locked.id },
      create: {
        advanceAmount: input.advanceAmount,
        createdById: input.userId,
        notes: input.notes,
        rightsPeriodMonths: input.rightsPeriodMonths,
        royaltyPercentage: input.royaltyPercentage,
        sentAt: input.status === "sent" ? new Date() : null,
        status: input.status,
        submissionId: locked.id,
        territory: input.territory,
      },
      update: {
        advanceAmount: input.advanceAmount,
        notes: input.notes,
        rightsPeriodMonths: input.rightsPeriodMonths,
        royaltyPercentage: input.royaltyPercentage,
        sentAt: input.status === "sent" ? new Date() : existing?.sentAt,
        status: input.status,
        territory: input.territory,
        version: { increment: 1 },
      },
    });

    await transaction.publisherSubmissionEvent.create({
      data: {
        actorId: input.userId,
        detail: input.notes,
        metadata: JSON.stringify({
          contractId: contract.id,
          status: input.status,
          version: contract.version,
        }),
        submissionId: locked.id,
        title:
          input.status === "sent"
            ? "Sözleşme yazara gönderildi"
            : "Sözleşme taslağı güncellendi",
        type: "contract_requested",
      },
    });

    await writeLegacyAudit(transaction, {
      actorId: input.userId,
      entityId: contract.id,
      entityType: "PublishingContract",
      metadata: {
        contractId: contract.id,
        publisherId: membership.publisherId,
        source: "publisher_contract_updated",
        status: input.status,
        submissionId: locked.id,
        version: contract.version,
      },
    });

    await transaction.notification.create({
      data: {
        message: `${submission.work.title} eseriniz için sözleşme ${input.status === "sent" ? "size gönderildi" : "taslağı güncellendi"}.`,
        relatedEntityId: locked.id,
        relatedEntityType: "publisher_submission",
        title:
          input.status === "sent"
            ? "Sözleşme gönderildi"
            : "Sözleşme güncellendi",
        type: "system",
        userId: submission.authorId,
      },
    });

    return {
      author: submission.author,
      contract,
      work: submission.work,
    };
  });
}

export async function upsertPublicationPlanSecure(input: {
  coverStatus: "not_started" | "in_progress" | "completed";
  isbn: string | null;
  layoutStatus: "not_started" | "in_progress" | "completed";
  notes: string | null;
  printRun: number | null;
  status: "planning" | "preproduction" | "production" | "distribution" | "published";
  submissionId: string;
  targetPublicationDate: Date | null;
  userId: string;
}) {
  const membership = await requirePublisherMembershipPermission(
    input.userId,
    "manage_publication_plan",
  );
  if (!membership) return null;

  return prisma.$transaction(async (transaction) => {
    const locked = await lockSubmission(
      transaction,
      input.submissionId,
      membership.publisherId,
    );
    if (!locked || locked.status !== "accepted") return null;

    const submission = await transaction.publisherSubmission.findUnique({
      where: { id: locked.id },
      select: {
        authorId: true,
        work: { select: { title: true } },
      },
    });
    if (!submission) return null;

    const plan = await transaction.publicationPlan.upsert({
      where: { submissionId: locked.id },
      create: {
        coverStatus: input.coverStatus,
        isbn: input.isbn,
        layoutStatus: input.layoutStatus,
        notes: input.notes,
        printRun: input.printRun,
        status: input.status,
        submissionId: locked.id,
        targetPublicationDate: input.targetPublicationDate,
      },
      update: {
        coverStatus: input.coverStatus,
        isbn: input.isbn,
        layoutStatus: input.layoutStatus,
        notes: input.notes,
        printRun: input.printRun,
        status: input.status,
        targetPublicationDate: input.targetPublicationDate,
      },
    });

    await writeLegacyAudit(transaction, {
      actorId: input.userId,
      entityId: plan.id,
      entityType: "PublicationPlan",
      metadata: {
        publisherId: membership.publisherId,
        source: "publisher_publication_plan_updated",
        status: input.status,
        submissionId: locked.id,
      },
    });

    await transaction.notification.create({
      data: {
        message: `${submission.work.title} eseriniz için yayın planı güncellendi.`,
        relatedEntityId: locked.id,
        relatedEntityType: "publisher_submission",
        title: "Yayın planı güncellendi",
        type: "system",
        userId: submission.authorId,
      },
    });

    return plan;
  });
}

export async function auditPublisherFileDownload(input: {
  fileId: string;
  publisherId: string;
  userId: string;
}) {
  await prisma.auditLog.create({
    data: {
      action: "publisher_status_changed",
      actorId: input.userId,
      entityId: input.fileId,
      entityType: "PublisherFile",
      metadata: JSON.stringify({
        publisherId: input.publisherId,
        source: "publisher_file_downloaded",
      }),
    },
  });
}
