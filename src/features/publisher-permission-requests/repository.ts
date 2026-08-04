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

  if (
    hasPublisherPermission(
      membership.role,
      permission,
      membership.permissionOverrides,
    )
  ) {
    return "already_granted";
  }

  const pendingKey = `${membership.id}:${permission}`;
  const existing = await prisma.publisherPermissionRequest.findUnique({
    where: { pendingKey },
    select: { id: true },
  });
  if (existing) return "already_pending";

  try {
    await prisma.$transaction(async (transaction) => {
      const request = await transaction.publisherPermissionRequest.create({
        data: {
          membershipId: membership.id,
          pendingKey,
          permission: permission,
          publisherId: membership.publisherId,
          requestedById: input.userId,
          requestNote: input.requestNote,
        },
      });

      const candidates = await transaction.publisherMembership.findMany({
        where: {
          active: true,
          publisherId: membership.publisherId,
          userId: { not: input.userId },
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
            membershipId: membership.id,
            permission: permission,
            publisherId: membership.publisherId,
          }),
        },
      });
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

  return "created";
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
    !hasPublisherPermission(
      reviewerMembership.role,
      "manage_permissions",
      reviewerMembership.permissionOverrides,
    )
  ) {
    return "forbidden";
  }

  return prisma.$transaction(async (transaction) => {
    const request = await transaction.publisherPermissionRequest.findFirst({
      where: {
        id: input.requestId,
        publisherId: reviewerMembership.publisherId,
        status: "pending",
      },
      include: {
        membership: {
          select: {
            active: true,
            id: true,
            permissionOverrides: true,
            role: true,
            userId: true,
          },
        },
      },
    });

    if (!request) return "not_found";
    if (!isRequestablePublisherPermission(request.permission)) return "invalid";
    const permission = request.permission;
    if (request.requestedById === input.userId) return "self_review";
    if (!request.membership.active) return "target_inactive";

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

    if (claimed.count !== 1) return "not_found";

    if (input.decision === "approved") {
      const permissions = Array.from(
        new Set([
          ...getCustomizablePublisherPermissions(
            request.membership.role,
            request.membership.permissionOverrides,
          ),
          permission,
        ]),
      );

      await transaction.publisherMembership.update({
        where: { id: request.membership.id },
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
          permission: permission,
          publisherId: request.publisherId,
        }),
      },
    });

    return input.decision;
  });
}
