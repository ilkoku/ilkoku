import "server-only";

import type {
  Prisma,
  PublicationPlanStatus,
  ProductionTaskStatus,
  PublisherPermission,
  PublishingContractStatus,
} from "@/generated/prisma/client";
import {
  getPublisherMembership,
  isPublisherAdminReadOnlyMembership,
} from "@/features/publisher-workspace/repository";
import {
  hasPublisherPermission,
} from "@/features/publisher-workspace/permissions";
import { prisma } from "@/lib/prisma";

type LockedSubmission = {
  archivedAt: Date | null;
  authorId: string;
  id: string;
  publisherId: string;
  status: "pending" | "reviewing" | "accepted" | "rejected" | "withdrawn";
  workId: string;
};

type ContractInput = {
  advanceAmount: number | null;
  notes: string | null;
  rightsPeriodMonths: number;
  royaltyPercentage: number;
  status: "draft" | "sent";
  submissionId: string;
  territory: string;
  userId: string;
};

type PublicationPlanInput = {
  coverStatus: ProductionTaskStatus;
  isbn: string | null;
  layoutStatus: ProductionTaskStatus;
  notes: string | null;
  printRun: number | null;
  status: PublicationPlanStatus;
  submissionId: string;
  targetPublicationDate: Date | null;
  userId: string;
};

function auditMetadata(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

function decimalCents(value: { toString(): string } | number | null) {
  if (value === null) return null;
  return Math.round(Number(value.toString()) * 100);
}

function sameDate(left: Date | null, right: Date | null) {
  return left?.getTime() === right?.getTime();
}

async function lockAuthorizedMembership(
  transaction: Prisma.TransactionClient,
  input: {
    membershipId: string;
    permission: PublisherPermission;
    publisherId: string;
    userId: string;
  },
) {
  const locked = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM PublisherMembership
    WHERE id = ${input.membershipId}
      AND publisherId = ${input.publisherId}
      AND userId = ${input.userId}
      AND active = 1
    LIMIT 1
    FOR UPDATE
  `;

  if (!locked[0]) return false;

  const membership = await transaction.publisherMembership.findUnique({
    where: { id: input.membershipId },
    select: {
      permissionOverrides: true,
      role: true,
    },
  });

  return Boolean(
    membership &&
      hasPublisherPermission(
        membership.role,
        input.permission,
        membership.permissionOverrides,
      ),
  );
}

async function lockAcceptedSubmission(
  transaction: Prisma.TransactionClient,
  submissionId: string,
) {
  const rows = await transaction.$queryRaw<LockedSubmission[]>`
    SELECT
      id,
      publisherId,
      workId,
      authorId,
      status,
      archivedAt
    FROM PublisherSubmission
    WHERE id = ${submissionId}
    LIMIT 1
    FOR UPDATE
  `;

  const submission = rows[0] ?? null;

  return submission &&
    !submission.archivedAt &&
    submission.status === "accepted"
      ? submission
      : null;
}

async function submissionContext(
  transaction: Prisma.TransactionClient,
  submission: LockedSubmission,
) {
  return transaction.publisherSubmission.findUnique({
    where: { id: submission.id },
    select: {
      author: {
        select: {
          email: true,
          fullName: true,
        },
      },
      work: {
        select: {
          title: true,
        },
      },
    },
  });
}

export async function savePublisherContractLifecycle(
  input: ContractInput,
) {
  const membership = await getPublisherMembership(input.userId);

  if (
    !membership ||
    isPublisherAdminReadOnlyMembership(membership) ||
    !hasPublisherPermission(
      membership.role,
      "manage_contract",
      membership.permissionOverrides,
    )
  ) {
    return { status: "forbidden" as const };
  }

  return prisma.$transaction(async (transaction) => {
    const authorized = await lockAuthorizedMembership(
      transaction,
      {
        membershipId: membership.id,
        permission: "manage_contract",
        publisherId: membership.publisherId,
        userId: input.userId,
      },
    );

    if (!authorized) {
      return { status: "forbidden" as const };
    }

    const submission = await lockAcceptedSubmission(
      transaction,
      input.submissionId,
    );

    if (
      !submission ||
      submission.publisherId !== membership.publisherId
    ) {
      return { status: "invalid_submission" as const };
    }

    const context = await submissionContext(
      transaction,
      submission,
    );

    if (!context) {
      return { status: "invalid_submission" as const };
    }

    const existing = await transaction.publishingContract.findUnique({
      where: { submissionId: submission.id },
    });

    if (
      existing?.status === "accepted" ||
      existing?.status === "rejected"
    ) {
      return {
        contractStatus: existing.status,
        status: "contract_terminal" as const,
      };
    }

    if (
      existing?.status === "sent" &&
      input.status === "draft"
    ) {
      return {
        status: "sent_to_draft_forbidden" as const,
      };
    }

    const changedFields: string[] = [];

    if (!existing) {
      changedFields.push(
        "advanceAmount",
        "notes",
        "rightsPeriodMonths",
        "royaltyPercentage",
        "status",
        "territory",
      );
    } else {
      if (
        decimalCents(existing.advanceAmount) !==
        decimalCents(input.advanceAmount)
      ) changedFields.push("advanceAmount");
      if (existing.notes !== input.notes) changedFields.push("notes");
      if (
        existing.rightsPeriodMonths !==
        input.rightsPeriodMonths
      ) changedFields.push("rightsPeriodMonths");
      if (
        decimalCents(existing.royaltyPercentage) !==
        decimalCents(input.royaltyPercentage)
      ) changedFields.push("royaltyPercentage");
      if (existing.status !== input.status) changedFields.push("status");
      if (existing.territory !== input.territory) changedFields.push("territory");
    }

    if (existing && changedFields.length === 0) {
      return {
        author: context.author,
        changed: false,
        contract: existing,
        emailRequired: existing.status === "sent",
        idempotencyKey:
          `publisher-contract:${existing.id}:v${existing.version}`,
        status: "saved" as const,
        work: context.work,
      };
    }

    const now = new Date();
    const contract = existing
      ? await transaction.publishingContract.update({
          where: { id: existing.id },
          data: {
            advanceAmount: input.advanceAmount,
            notes: input.notes,
            rightsPeriodMonths: input.rightsPeriodMonths,
            royaltyPercentage: input.royaltyPercentage,
            sentAt:
              input.status === "sent"
                ? now
                : existing.sentAt,
            status: input.status,
            territory: input.territory,
            version: { increment: 1 },
          },
        })
      : await transaction.publishingContract.create({
          data: {
            advanceAmount: input.advanceAmount,
            createdById: input.userId,
            notes: input.notes,
            rightsPeriodMonths: input.rightsPeriodMonths,
            royaltyPercentage: input.royaltyPercentage,
            sentAt: input.status === "sent" ? now : null,
            status: input.status,
            submissionId: submission.id,
            territory: input.territory,
          },
        });

    await transaction.publisherSubmissionEvent.create({
      data: {
        actorId: input.userId,
        detail: input.notes,
        metadata: auditMetadata({
          changedFields,
          contractId: contract.id,
          fromStatus: existing?.status ?? null,
          toStatus: contract.status,
          version: contract.version,
        }),
        submissionId: submission.id,
        title:
          contract.status === "sent"
            ? "Sözleşme yazara gönderildi"
            : "Sözleşme taslağı güncellendi",
        type: "contract_requested",
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "work_status_changed",
        actorId: input.userId,
        entityId: submission.workId,
        entityType: "Work",
        metadata: auditMetadata({
          changedFields,
          contractId: contract.id,
          from: existing?.status ?? null,
          publisherId: submission.publisherId,
          publisherSubmissionId: submission.id,
          source:
            contract.status === "sent"
              ? "publisher_contract_sent"
              : existing
                ? "publisher_contract_updated"
                : "publisher_contract_created",
          to: contract.status,
          version: contract.version,
        }),
      },
    });

    if (contract.status === "sent") {
      await transaction.notification.create({
        data: {
          message:
            `${context.work.title} eseriniz için yayınevi sözleşmesi gönderildi.`,
          relatedEntityId: submission.id,
          relatedEntityType: "publisher_submission",
          title: "Sözleşme gönderildi",
          type: "system",
          userId: submission.authorId,
        },
      });
    }

    return {
      author: context.author,
      changed: true,
      contract,
      emailRequired: contract.status === "sent",
      idempotencyKey:
        `publisher-contract:${contract.id}:v${contract.version}`,
      status: "saved" as const,
      work: context.work,
    };
  });
}

export async function savePublicationPlanLifecycle(
  input: PublicationPlanInput,
) {
  const membership = await getPublisherMembership(input.userId);

  if (
    !membership ||
    isPublisherAdminReadOnlyMembership(membership) ||
    !hasPublisherPermission(
      membership.role,
      "manage_publication_plan",
      membership.permissionOverrides,
    )
  ) {
    return { status: "forbidden" as const };
  }

  return prisma.$transaction(async (transaction) => {
    const authorized = await lockAuthorizedMembership(
      transaction,
      {
        membershipId: membership.id,
        permission: "manage_publication_plan",
        publisherId: membership.publisherId,
        userId: input.userId,
      },
    );

    if (!authorized) {
      return { status: "forbidden" as const };
    }

    const submission = await lockAcceptedSubmission(
      transaction,
      input.submissionId,
    );

    if (
      !submission ||
      submission.publisherId !== membership.publisherId
    ) {
      return { status: "invalid_submission" as const };
    }

    const context = await submissionContext(
      transaction,
      submission,
    );

    if (!context) {
      return { status: "invalid_submission" as const };
    }

    const existing = await transaction.publicationPlan.findUnique({
      where: { submissionId: submission.id },
    });

    const changedFields: string[] = [];

    if (!existing) {
      changedFields.push(
        "coverStatus",
        "isbn",
        "layoutStatus",
        "notes",
        "printRun",
        "status",
        "targetPublicationDate",
      );
    } else {
      if (existing.coverStatus !== input.coverStatus) changedFields.push("coverStatus");
      if (existing.isbn !== input.isbn) changedFields.push("isbn");
      if (existing.layoutStatus !== input.layoutStatus) changedFields.push("layoutStatus");
      if (existing.notes !== input.notes) changedFields.push("notes");
      if (existing.printRun !== input.printRun) changedFields.push("printRun");
      if (existing.status !== input.status) changedFields.push("status");
      if (
        !sameDate(
          existing.targetPublicationDate,
          input.targetPublicationDate,
        )
      ) changedFields.push("targetPublicationDate");
    }

    if (existing && changedFields.length === 0) {
      return {
        changed: false,
        plan: existing,
        status: "saved" as const,
      };
    }

    const plan = await transaction.publicationPlan.upsert({
      where: { submissionId: submission.id },
      create: {
        coverStatus: input.coverStatus,
        isbn: input.isbn,
        layoutStatus: input.layoutStatus,
        notes: input.notes,
        printRun: input.printRun,
        status: input.status,
        submissionId: submission.id,
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

    await transaction.auditLog.create({
      data: {
        action: "work_status_changed",
        actorId: input.userId,
        entityId: submission.workId,
        entityType: "Work",
        metadata: auditMetadata({
          changedFields,
          from: existing?.status ?? null,
          publicationPlanId: plan.id,
          publisherId: submission.publisherId,
          publisherSubmissionId: submission.id,
          source: existing
            ? "publisher_publication_plan_updated"
            : "publisher_publication_plan_created",
          to: plan.status,
        }),
      },
    });

    await transaction.notification.create({
      data: {
        message:
          `${context.work.title} eseriniz için yayın planı güncellendi.`,
        relatedEntityId: submission.id,
        relatedEntityType: "publisher_submission",
        title: "Yayın planı güncellendi",
        type: "system",
        userId: submission.authorId,
      },
    });

    return {
      changed: true,
      plan,
      status: "saved" as const,
    };
  });
}
