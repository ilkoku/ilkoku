import "server-only";

import type {
  Prisma,
  PublisherMemberRole,
  PublisherSubmissionStatus,
} from "@/generated/prisma/client";
import {
  getPublisherMembership,
  isPublisherAdminReadOnlyMembership,
} from "@/features/publisher-workspace/repository";
import {
  hasPublisherPermission,
  type PublisherPermission,
} from "@/features/publisher-workspace/permissions";
import { prisma } from "@/lib/prisma";

const ACTIVE_SUBMISSION_STATUSES = [
  "pending",
  "reviewing",
  "accepted",
  "rejected",
] as const satisfies readonly PublisherSubmissionStatus[];

type LockedUserRow = {
  deletedAt: Date | string | null;
  id: string;
  isBanned: boolean | number;
  role: string;
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
  status: PublisherSubmissionStatus;
  workId: string;
};

type MembershipSnapshot = {
  adminReadOnly?: true;
  id: string;
  permissionOverrides: unknown;
  publisherId: string;
  role: PublisherMemberRole;
  userId: string;
};

function auditMetadata(input: Record<string, unknown>) {
  return JSON.stringify(input);
}

async function lockLiveUser(
  transaction: Prisma.TransactionClient,
  userId: string,
) {
  const rows = await transaction.$queryRaw<LockedUserRow[]>`
    SELECT id, role, status, isBanned, deletedAt
    FROM User
    WHERE id = ${userId}
    LIMIT 1
    FOR UPDATE
  `;

  const user = rows[0] ?? null;

  if (
    !user ||
    user.status !== "active" ||
    Boolean(user.isBanned) ||
    user.deletedAt
  ) {
    return null;
  }

  return user;
}

async function lockLivePublisher(
  transaction: Prisma.TransactionClient,
  publisherId: string,
  options: { acceptsSubmissions?: boolean } = {},
) {
  const rows = options.acceptsSubmissions
    ? await transaction.$queryRaw<LockedPublisherRow[]>`
        SELECT id, active, verified, archivedAt
        FROM Publisher
        WHERE id = ${publisherId}
          AND active = 1
          AND verified = 1
          AND acceptsSubmissions = 1
          AND archivedAt IS NULL
        LIMIT 1
        FOR UPDATE
      `
    : await transaction.$queryRaw<LockedPublisherRow[]>`
        SELECT id, active, verified, archivedAt
        FROM Publisher
        WHERE id = ${publisherId}
        LIMIT 1
        FOR UPDATE
      `;

  const publisher = rows[0] ?? null;

  if (
    !publisher ||
    !Boolean(publisher.active) ||
    !Boolean(publisher.verified) ||
    publisher.archivedAt
  ) {
    return null;
  }

  return publisher;
}

async function lockLiveMembership(
  transaction: Prisma.TransactionClient,
  snapshot: MembershipSnapshot,
  permission: PublisherPermission,
) {
  const rows = await transaction.$queryRaw<LockedMembershipRow[]>`
    SELECT id, publisherId, userId, active
    FROM PublisherMembership
    WHERE id = ${snapshot.id}
      AND publisherId = ${snapshot.publisherId}
      AND userId = ${snapshot.userId}
    LIMIT 1
    FOR UPDATE
  `;
  const locked = rows[0] ?? null;

  if (!locked || !Boolean(locked.active)) {
    return null;
  }

  const membership = await transaction.publisherMembership.findUnique({
    where: { id: locked.id },
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
    membership.publisherId !== snapshot.publisherId ||
    membership.userId !== snapshot.userId ||
    !hasPublisherPermission(
      membership.role,
      permission,
      membership.permissionOverrides,
    )
  ) {
    return null;
  }

  return membership;
}

async function authorizePublisherRead(
  transaction: Prisma.TransactionClient,
  input: {
    allowAdminPreview: boolean;
    permission: "download_files" | "view_files";
    snapshot: MembershipSnapshot;
    userId: string;
  },
) {
  const user = await lockLiveUser(transaction, input.userId);
  if (!user) return null;

  const publisher = await lockLivePublisher(
    transaction,
    input.snapshot.publisherId,
  );
  if (!publisher) return null;

  if (input.snapshot.adminReadOnly) {
    if (
      !input.allowAdminPreview ||
      user.role !== "admin" ||
      !hasPublisherPermission(
        input.snapshot.role,
        input.permission,
        input.snapshot.permissionOverrides,
      )
    ) {
      return null;
    }

    return {
      publisherId: publisher.id,
      role: input.snapshot.role,
    };
  }

  const membership = await lockLiveMembership(
    transaction,
    input.snapshot,
    input.permission,
  );
  if (!membership) return null;

  return {
    publisherId: publisher.id,
    role: membership.role,
  };
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

export async function createLegacyPublisherSubmission(input: {
  authorId: string;
  coverLetter: string;
  publisherId: string;
  workId: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const author = await lockLiveUser(transaction, input.authorId);

    if (!author || author.role !== "writer") {
      throw new Error("AUTHOR_NOT_AVAILABLE");
    }

    const workRows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM Work
      WHERE id = ${input.workId}
        AND authorId = ${author.id}
        AND archivedAt IS NULL
        AND status <> 'archived'
      LIMIT 1
      FOR UPDATE
    `;

    if (!workRows[0]) {
      throw new Error("WORK_NOT_FOUND");
    }

    const publisher = await lockLivePublisher(
      transaction,
      input.publisherId,
      { acceptsSubmissions: true },
    );

    if (!publisher) {
      throw new Error("PUBLISHER_NOT_AVAILABLE");
    }

    const existing = await transaction.publisherSubmission.findFirst({
      where: {
        archivedAt: null,
        authorId: author.id,
        publisherId: publisher.id,
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
      data: {
        authorId: author.id,
        coverLetter: input.coverLetter,
        publisherId: publisher.id,
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
        actorId: author.id,
        entityId: input.workId,
        entityType: "Work",
        metadata: auditMetadata({
          publisherId: publisher.id,
          publisherSubmissionId: submission.id,
          source: "publisher_submission_created",
          status: "pending",
        }),
      },
    });

    const recipients = await getSubmissionNotificationRecipients(
      transaction,
      publisher.id,
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
    const author = await lockLiveUser(transaction, authorId);
    if (!author) return { count: 0 };

    const rows = await transaction.$queryRaw<LockedSubmissionRow[]>`
      SELECT id, publisherId, workId, authorId, status, archivedAt
      FROM PublisherSubmission
      WHERE id = ${submissionId}
      LIMIT 1
      FOR UPDATE
    `;
    const submission = rows[0] ?? null;

    if (
      !submission ||
      submission.authorId !== author.id ||
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
        actorId: author.id,
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

  const snapshot: MembershipSnapshot = {
    ...(isPublisherAdminReadOnlyMembership(membership)
      ? { adminReadOnly: true as const }
      : {}),
    id: membership.id,
    permissionOverrides: membership.permissionOverrides,
    publisherId: membership.publisherId,
    role: membership.role,
    userId,
  };

  return prisma.$transaction(async (transaction) => {
    const authorization = await authorizePublisherRead(transaction, {
      allowAdminPreview: true,
      permission: "view_files",
      snapshot,
      userId,
    });

    if (!authorization) return null;

    return transaction.publisherFile.findMany({
      where: {
        archivedAt: null,
        submission: {
          archivedAt: null,
          publisherId: authorization.publisherId,
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

  const snapshot: MembershipSnapshot = {
    id: membership.id,
    permissionOverrides: membership.permissionOverrides,
    publisherId: membership.publisherId,
    role: membership.role,
    userId,
  };

  return prisma.$transaction(async (transaction) => {
    const authorization = await authorizePublisherRead(transaction, {
      allowAdminPreview: false,
      permission: "download_files",
      snapshot,
      userId,
    });

    if (!authorization) return null;

    const files = await transaction.$queryRaw<
      Array<{
        archivedAt: Date | string | null;
        fileName: string;
        id: string;
        storageUrl: string;
        submissionId: string;
      }>
    >`
      SELECT id, submissionId, fileName, storageUrl, archivedAt
      FROM PublisherFile
      WHERE id = ${fileId}
      LIMIT 1
      FOR UPDATE
    `;
    const file = files[0] ?? null;

    if (!file || file.archivedAt) return null;

    const submissions = await transaction.$queryRaw<LockedSubmissionRow[]>`
      SELECT id, publisherId, workId, authorId, status, archivedAt
      FROM PublisherSubmission
      WHERE id = ${file.submissionId}
        AND publisherId = ${authorization.publisherId}
      LIMIT 1
      FOR UPDATE
    `;
    const submission = submissions[0] ?? null;

    if (!submission || submission.archivedAt) return null;

    return {
      fileName: file.fileName,
      storageUrl: file.storageUrl,
    };
  });
}
