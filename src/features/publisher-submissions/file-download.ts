import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  getPublisherMembership,
  isPublisherAdminReadOnlyMembership,
} from "@/features/publisher-workspace/repository";
import { hasPublisherPermission } from "@/features/publisher-workspace/permissions";
import { prisma } from "@/lib/prisma";

type LockedPublisherFile = {
  fileId: string;
  fileName: string;
  publisherId: string;
  storageUrl: string;
  submissionId: string;
  workId: string;
};

async function lockDownloadPermission(
  transaction: Prisma.TransactionClient,
  input: {
    membershipId: string;
    publisherId: string;
    userId: string;
  },
) {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM PublisherMembership
    WHERE id = ${input.membershipId}
      AND publisherId = ${input.publisherId}
      AND userId = ${input.userId}
      AND active = 1
    LIMIT 1
    FOR UPDATE
  `;

  if (!rows[0]) return false;

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
        "download_files",
        membership.permissionOverrides,
      ),
  );
}

async function lockPublisherFile(
  transaction: Prisma.TransactionClient,
  fileId: string,
) {
  const rows = await transaction.$queryRaw<LockedPublisherFile[]>`
    SELECT
      pf.id AS fileId,
      pf.fileName AS fileName,
      pf.storageUrl AS storageUrl,
      ps.id AS submissionId,
      ps.publisherId AS publisherId,
      ps.workId AS workId
    FROM PublisherFile pf
    INNER JOIN PublisherSubmission ps
      ON ps.id = pf.submissionId
    WHERE pf.id = ${fileId}
      AND pf.archivedAt IS NULL
      AND ps.archivedAt IS NULL
    LIMIT 1
    FOR UPDATE
  `;

  return rows[0] ?? null;
}

function validatedDestination(storageUrl: string) {
  try {
    const destination = new URL(storageUrl);
    return destination.protocol === "https:" || destination.protocol === "http:"
      ? destination
      : null;
  } catch {
    return null;
  }
}

export async function authorizeAuditedPublisherFileDownload(input: {
  fileId: string;
  userId: string;
}) {
  const membership = await getPublisherMembership(input.userId);

  if (
    !membership ||
    isPublisherAdminReadOnlyMembership(membership) ||
    !hasPublisherPermission(
      membership.role,
      "download_files",
      membership.permissionOverrides,
    )
  ) {
    return { status: "forbidden" as const };
  }

  return prisma.$transaction(async (transaction) => {
    const authorized = await lockDownloadPermission(transaction, {
      membershipId: membership.id,
      publisherId: membership.publisherId,
      userId: input.userId,
    });

    if (!authorized) {
      return { status: "forbidden" as const };
    }

    const file = await lockPublisherFile(transaction, input.fileId);

    if (!file || file.publisherId !== membership.publisherId) {
      return { status: "not_found" as const };
    }

    const destination = validatedDestination(file.storageUrl);
    if (!destination) {
      return { status: "invalid_url" as const };
    }

    await transaction.auditLog.create({
      data: {
        action: "work_status_changed",
        actorId: input.userId,
        entityId: file.workId,
        entityType: "Work",
        metadata: JSON.stringify({
          publisherFileId: file.fileId,
          publisherId: file.publisherId,
          publisherSubmissionId: file.submissionId,
          source: "publisher_submission_file_downloaded",
        }),
      },
    });

    return {
      destination: destination.toString(),
      fileName: file.fileName,
      status: "authorized" as const,
    };
  });
}
