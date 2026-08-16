import { prisma } from "@/lib/prisma";
import {
  customizablePublisherPermissionKeys,
  getCustomizablePublisherPermissions,
  hasPublisherPermission,
  publisherPermissionLabels,
  type PublisherPermission,
} from "@/features/publisher-workspace/permissions";
import {
  getPublisherMembership,
  isPublisherAdminReadOnlyMembership,
} from "@/features/publisher-workspace/repository";
import type { Prisma } from "@/generated/prisma/client";
import type {
  PublisherPermissionCenterData,
  PublisherPermissionRequestData,
} from "./types";

const requestablePermissionSet = new Set<PublisherPermission>(
  customizablePublisherPermissionKeys,
);

function displayName(user: {
  displayName: string | null;
  fullName: string;
}) {
  return user.displayName?.trim() || user.fullName;
}

export function isRequestablePublisherPermission(
  value: string,
): value is PublisherPermission {
  return requestablePermissionSet.has(value as PublisherPermission);
}

function serializeRequest(request: {
  createdAt: Date;
  id: string;
  permission: string;
  requestNote: string | null;
  requestedBy: { displayName: string | null; fullName: string };
  reviewNote: string | null;
  reviewedAt: Date | null;
  reviewedBy: { displayName: string | null; fullName: string } | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
}): PublisherPermissionRequestData | null {
  if (!isRequestablePublisherPermission(request.permission)) return null;

  return {
    createdAt: request.createdAt.toISOString(),
    id: request.id,
    permission: request.permission,
    requestNote: request.requestNote,
    requestedByName: displayName(request.requestedBy),
    reviewNote: request.reviewNote,
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    reviewedByName: request.reviewedBy
      ? displayName(request.reviewedBy)
      : null,
    status: request.status,
  };
}

async function lockMemberships(
  transaction: Prisma.TransactionClient,
  membershipIds: string[],
) {
  const ids = Array.from(new Set(membershipIds)).sort();

  for (const membershipId of ids) {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM PublisherMembership
      WHERE id = ${membershipId}
      LIMIT 1
      FOR UPDATE
    `;

    if (!rows[0]) {
      return false;
    }
  }

  return true;
}

async function getLiveMembership(
  transaction: Prisma.TransactionClient,
  membershipId: string,
) {
  return transaction.publisherMembership.findUnique({
    where: { id: membershipId },
    select: {
      active: true,
      id: true,
      permissionOverrides: true,
      publisherId: true,
      role: true,
      userId: true,
      publisher: {
        select: {
          active: true,
          archivedAt: true,
          verified: true,
        },
      },
      user: {
        select: {
          deletedAt: true,
          status: true,
        },
      },
    },
  });
}

function isLiveMembership(
  membership: Awaited<ReturnType<typeof getLiveMembership>>,
) {
  return Boolean(
    membership &&
    membership.active &&
    membership.publisher.active &&
    membership.publisher.archivedAt === null &&
    membership.publisher.verified &&
    membership.user.deletedAt === null &&
    membership.user.status === "active",
  );
}

export async function getPublisherPermissionCenter(
  userId: string,
): Promise<PublisherPermissionCenterData | null> {
  const membership = await getPublisherMembership(userId);
  if (!membership) return null;

  const currentPermissions = getCustomizablePublisherPermissions(
    membership.role,
    membership.permissionOverrides,
  );
  const currentPermissionSet = new Set(currentPermissions);
  const canReview = hasPublisherPermission(
    membership.role,
    "manage_permissions",
    membership.permissionOverrides,
  );

  const [ownRecords, incomingRecords] = await Promise.all([
    prisma.publisherPermissionRequest.findMany({
      where: {
        membershipId: membership.id,
        requestedById: userId,
      },
      include: {
        requestedBy: {
          select: { displayName: true, fullName: true },
        },
        reviewedBy: {
          select: { displayName: true, fullName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    canReview
      ? prisma.publisherPermissionRequest.findMany({
          where: {
            publisherId: membership.publisherId,
            status: "pending",
            requestedById: { not: userId },
          },
          include: {
            requestedBy: {
              select: { displayName: true, fullName: true },
            },
            reviewedBy: {
              select: { displayName: true, fullName: true },
            },
          },
          orderBy: { createdAt: "asc" },
          take: 100,
        })
      : Promise.resolve([]),
  ]);

  const ownRequests = ownRecords
    .map(serializeRequest)
    .filter((item): item is PublisherPermissionRequestData => Boolean(item));
  const incomingRequests = incomingRecords
    .map(serializeRequest)
    .filter((item): item is PublisherPermissionRequestData => Boolean(item));
  const pendingPermissions = ownRequests
    .filter((request) => request.status === "pending")
    .map((request) => request.permission);

  return {
    canReview,
    companyName: membership.publisher.companyName,
    currentPermissions,
    incomingRequests,
    membershipRole: membership.role,
    missingPermissions: customizablePublisherPermissionKeys.filter(
      (permission) => !currentPermissionSet.has(permission),
    ),
    ownRequests,
    pendingPermissions,
  };
}

export type CreatePermissionRequestResult =
  | "created"
  | "already_pending"
  | "already_granted"
  | "invalid"
  | "membership_not_found";

export async function createPublisherPermissionRequest(input: {
  permission: string;
  requestNote: string | null;
  userId: string;
}): Promise<CreatePermissionRequestResult> {
  if (!isRequestablePublisherPermission(input.permission)) {
    return "invalid";
  }

  const permission = input.permission;
  const membership = await getPublisherMembership(input.userId);
  if (
    !membership ||
    isPublisherAdminReadOnlyMembership(membership)
  ) {
    return "membership_not_found";
  }

  try {
    return await prisma.$transaction(async (transaction) => {
      const locked = await lockMemberships(transaction, [membership.id]);
      if (!locked) return "membership_not_found" as const;

      const liveMembership = await getLiveMembership(transaction, membership.id);
      if (
        !isLiveMembership(liveMembership) ||
        !liveMembership ||
        liveMembership.userId !== input.userId ||
        liveMembership.publisherId !== membership.publisherId
      ) {
        return "membership_not_found" as const;
      }

      if (
        hasPublisherPermission(
          liveMembership.role,
          permission,
          liveMembership.permissionOverrides,
        )
      ) {
        return "already_granted" as const;
      }

      const pendingKey = `${liveMembership.id}:${permission}`;
      const existing = await transaction.publisherPermissionRequest.findUnique({
        where: { pendingKey },
        select: { id: true },
      });
      if (existing) return "already_pending" as const;

      const request = await transaction.publisherPermissionRequest.create({
        data: {
          membershipId: liveMembership.id,
          pendingKey,
          permission,
          publisherId: liveMembership.publisherId,
          requestedById: input.userId,
          requestNote: input.requestNote,
        },
      });

      const candidates = await transaction.publisherMembership.findMany({
        where: {
          active: true,
          publisherId: liveMembership.publisherId,
          userId: { not: input.userId },
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
          userId: true,
        },
      });

      const recipientIds = Array.from(
        new Set(
          candidates
            .filter((candidate) =>
              hasPublisherPermission(
                candidate.role,
                "manage_permissions",
                candidate.permissionOverrides,
              ),
            )
            .map((candidate) => candidate.userId),
        ),
      );

      if (recipientIds.length) {
        await transaction.notification.createMany({
          data: recipientIds.map((recipientId) => ({
            message: `${publisherPermissionLabels[permission]} yetkisi için yeni bir talep var.`,
            relatedEntityId: request.id,
            relatedEntityType: "publisher_permission_request",
            title: "Yeni yetki talebi",
            type: "system" as const,
            userId: recipientId,
          })),
        });
      }

      await transaction.auditLog.create({
        data: {
          action: "publisher_permission_requested",
          actorId: input.userId,
          entityId: request.id,
          entityType: "PublisherPermissionRequest",
          metadata: JSON.stringify({
            membershipId: liveMembership.id,
            permission,
            publisherId: liveMembership.publisherId,
          }),
        },
      });

      return "created" as const;
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return "already_pending";
    }
    throw error;
  }
}

export type ReviewPermissionRequestResult =
  | "approved"
  | "rejected"
  | "forbidden"
  | "not_found"
  | "self_review"
  | "target_inactive"
  | "invalid";

export async function reviewPublisherPermissionRequest(input: {
  decision: "approved" | "rejected";
  requestId: string;
  reviewNote: string | null;
  userId: string;
}): Promise<ReviewPermissionRequestResult> {
  const reviewerMembership = await getPublisherMembership(input.userId);
  if (
    !reviewerMembership ||
    isPublisherAdminReadOnlyMembership(reviewerMembership)
  ) {
    return "forbidden";
  }

  const requestHint = await prisma.publisherPermissionRequest.findUnique({
    where: { id: input.requestId },
    select: {
      membershipId: true,
      publisherId: true,
      status: true,
    },
  });

  if (!requestHint || requestHint.status !== "pending") {
    return "not_found";
  }

  return prisma.$transaction(async (transaction) => {
    const locked = await lockMemberships(transaction, [
      reviewerMembership.id,
      requestHint.membershipId,
    ]);
    if (!locked) return "not_found" as const;

    const [liveReviewer, liveTarget] = await Promise.all([
      getLiveMembership(transaction, reviewerMembership.id),
      getLiveMembership(transaction, requestHint.membershipId),
    ]);

    if (
      !isLiveMembership(liveReviewer) ||
      !liveReviewer ||
      liveReviewer.userId !== input.userId ||
      !hasPublisherPermission(
        liveReviewer.role,
        "manage_permissions",
        liveReviewer.permissionOverrides,
      )
    ) {
      return "forbidden" as const;
    }

    const lockedRequest = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM PublisherPermissionRequest
      WHERE id = ${input.requestId}
      LIMIT 1
      FOR UPDATE
    `;
    if (!lockedRequest[0]) return "not_found" as const;

    const request = await transaction.publisherPermissionRequest.findUnique({
      where: { id: input.requestId },
      select: {
        id: true,
        membershipId: true,
        permission: true,
        publisherId: true,
        requestedById: true,
        status: true,
      },
    });

    if (
      !request ||
      request.status !== "pending" ||
      request.publisherId !== liveReviewer.publisherId ||
      request.publisherId !== requestHint.publisherId ||
      request.membershipId !== requestHint.membershipId
    ) {
      return "not_found" as const;
    }

    if (!isRequestablePublisherPermission(request.permission)) return "invalid";
    const permission = request.permission;
    if (request.requestedById === input.userId) return "self_review";

    if (
      !isLiveMembership(liveTarget) ||
      !liveTarget ||
      liveTarget.id !== request.membershipId ||
      liveTarget.publisherId !== request.publisherId
    ) {
      return "target_inactive" as const;
    }

    const claimed = await transaction.publisherPermissionRequest.updateMany({
      where: {
        id: request.id,
        status: "pending",
      },
      data: {
        pendingKey: null,
        reviewNote: input.reviewNote,
        reviewedAt: new Date(),
        reviewedById: input.userId,
        status: input.decision,
      },
    });

    if (claimed.count !== 1) return "not_found" as const;

    if (input.decision === "approved") {
      const permissions = Array.from(
        new Set([
          ...getCustomizablePublisherPermissions(
            liveTarget.role,
            liveTarget.permissionOverrides,
          ),
          permission,
        ]),
      );

      await transaction.publisherMembership.update({
        where: { id: liveTarget.id },
        data: { permissionOverrides: permissions },
      });
    }

    await transaction.notification.create({
      data: {
        message:
          input.decision === "approved"
            ? `${publisherPermissionLabels[permission]} yetkiniz onaylandı.`
            : `${publisherPermissionLabels[permission]} yetki talebiniz reddedildi.`,
        relatedEntityId: request.id,
        relatedEntityType: "publisher_permission_request",
        title:
          input.decision === "approved"
            ? "Yetki talebi onaylandı"
            : "Yetki talebi reddedildi",
        type: "system",
        userId: request.requestedById,
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "publisher_permission_reviewed",
        actorId: input.userId,
        entityId: request.id,
        entityType: "PublisherPermissionRequest",
        metadata: JSON.stringify({
          decision: input.decision,
          membershipId: request.membershipId,
          permission,
          publisherId: request.publisherId,
        }),
      },
    });

    return input.decision;
  });
}
