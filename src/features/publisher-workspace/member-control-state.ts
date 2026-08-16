import "server-only";

import type {
  Prisma,
  PublisherMemberRole,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCustomizablePublisherPermissions,
  hasPublisherPermission,
  type PublisherPermission,
} from "./permissions";

export type EditablePublisherMemberRole = Exclude<PublisherMemberRole, "owner">;

type LockedUserRow = {
  deletedAt: Date | string | null;
  id: string;
  isBanned: boolean | number;
  status: "active" | "suspended" | "disabled";
};

type LockedPublisherRow = {
  active: boolean | number;
  archivedAt: Date | string | null;
  companyName: string;
  id: string;
  verified: boolean | number;
};

type LockedMembershipRow = {
  active: boolean | number;
  id: string;
  permissionOverrides: unknown;
  publisherId: string;
  role: PublisherMemberRole;
  userId: string;
};

type LockedInvitationRow = {
  id: string;
  invitedEmail: string;
  publisherId: string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
};

const editableMemberRoles = new Set<EditablePublisherMemberRole>([
  "manager",
  "submissions_manager",
  "editorial",
  "contract_manager",
  "reviewer",
  "viewer",
]);

function normalizePermissions(
  role: EditablePublisherMemberRole,
  permissions: PublisherPermission[],
) {
  const normalized = getCustomizablePublisherPermissions(role, permissions);
  const requested = Array.from(new Set(permissions));

  if (
    requested.length === 0 ||
    normalized.length !== requested.length ||
    requested.some((permission) => !normalized.includes(permission))
  ) {
    return null;
  }

  return normalized;
}

async function lockLiveUser(
  transaction: Prisma.TransactionClient,
  userId: string,
) {
  const rows = await transaction.$queryRaw<LockedUserRow[]>`
    SELECT id, status, isBanned, deletedAt
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
) {
  const rows = await transaction.$queryRaw<LockedPublisherRow[]>`
    SELECT id, companyName, active, verified, archivedAt
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

async function lockMemberships(
  transaction: Prisma.TransactionClient,
  membershipIds: string[],
) {
  const ids = Array.from(new Set(membershipIds)).sort();
  const rows: LockedMembershipRow[] = [];

  // Lock in a deterministic order so two member-management requests cannot
  // deadlock by selecting caller/target memberships in opposite order.
  for (const membershipId of ids) {
    const locked = await transaction.$queryRaw<LockedMembershipRow[]>`
      SELECT id, publisherId, userId, role, active, permissionOverrides
      FROM PublisherMembership
      WHERE id = ${membershipId}
      LIMIT 1
      FOR UPDATE
    `;
    if (locked[0]) rows.push(locked[0]);
  }

  return rows;
}

async function locateCaller(userId: string) {
  return prisma.publisherMembership.findFirst({
    where: {
      active: true,
      userId,
      publisher: {
        active: true,
        archivedAt: null,
        verified: true,
      },
    },
    select: {
      id: true,
      publisherId: true,
      userId: true,
    },
  });
}

async function lockAuthorizedCaller(
  transaction: Prisma.TransactionClient,
  candidate: { id: string; publisherId: string; userId: string },
) {
  const user = await lockLiveUser(transaction, candidate.userId);
  if (!user) return null;

  const publisher = await lockLivePublisher(transaction, candidate.publisherId);
  if (!publisher) return null;

  const memberships = await lockMemberships(transaction, [candidate.id]);
  const caller = memberships[0] ?? null;

  if (
    !caller ||
    caller.id !== candidate.id ||
    caller.publisherId !== publisher.id ||
    caller.userId !== user.id ||
    !Boolean(caller.active) ||
    !hasPublisherPermission(
      caller.role,
      "manage_members",
      caller.permissionOverrides,
    )
  ) {
    return null;
  }

  return { caller, publisher, user };
}

export async function updatePublisherMemberLocked(input: {
  active: boolean;
  memberId: string;
  permissions: PublisherPermission[];
  role: EditablePublisherMemberRole;
  userId: string;
}) {
  if (!editableMemberRoles.has(input.role)) return null;
  const permissions = normalizePermissions(input.role, input.permissions);
  if (!permissions) return null;

  const candidate = await locateCaller(input.userId);
  if (!candidate) return null;

  return prisma.$transaction(async (transaction) => {
    const user = await lockLiveUser(transaction, candidate.userId);
    if (!user) return null;

    const publisher = await lockLivePublisher(transaction, candidate.publisherId);
    if (!publisher) return null;

    const membershipRows = await lockMemberships(transaction, [
      candidate.id,
      input.memberId,
    ]);
    const caller = membershipRows.find((row) => row.id === candidate.id) ?? null;
    const target = membershipRows.find((row) => row.id === input.memberId) ?? null;

    if (
      !caller ||
      caller.publisherId !== publisher.id ||
      caller.userId !== user.id ||
      !Boolean(caller.active) ||
      !hasPublisherPermission(
        caller.role,
        "manage_members",
        caller.permissionOverrides,
      ) ||
      !target ||
      target.publisherId !== publisher.id ||
      target.role === "owner" ||
      target.userId === user.id
    ) {
      return null;
    }

    const oldActive = Boolean(target.active);
    const oldPermissions = getCustomizablePublisherPermissions(
      target.role,
      target.permissionOverrides,
    );

    const updated = await transaction.publisherMembership.update({
      where: { id: target.id },
      data: {
        active: input.active,
        permissionOverrides: permissions,
        role: input.role,
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "publisher_status_changed",
        actorId: user.id,
        entityId: publisher.id,
        entityType: "publisher",
        metadata: JSON.stringify({
          memberId: target.id,
          memberUserId: target.userId,
          newActive: input.active,
          newPermissions: permissions,
          newRole: input.role,
          oldActive,
          oldPermissions,
          oldRole: target.role,
          source: "publisher_member_updated",
        }),
      },
    });

    return updated;
  });
}

export async function createPublisherInvitationLocked(input: {
  email: string;
  expiresAt: Date;
  permissions: PublisherPermission[];
  role: EditablePublisherMemberRole;
  tokenHash: string;
  userId: string;
}) {
  if (!editableMemberRoles.has(input.role)) {
    return { status: "forbidden" as const };
  }
  const permissions = normalizePermissions(input.role, input.permissions);
  if (!permissions) return { status: "forbidden" as const };

  const candidate = await locateCaller(input.userId);
  if (!candidate) return { status: "forbidden" as const };

  const email = input.email.trim().toLowerCase();
  const now = new Date();

  return prisma.$transaction(async (transaction) => {
    const authorization = await lockAuthorizedCaller(transaction, candidate);
    if (!authorization) return { status: "forbidden" as const };

    const { caller, publisher, user } = authorization;

    // Publisher is locked above. That serializes invitation creation for this
    // publisher so duplicate pending invitations cannot both pass the checks.
    await transaction.publisherInvitation.updateMany({
      where: {
        expiresAt: { lte: now },
        invitedEmail: email,
        publisherId: publisher.id,
        status: "pending",
      },
      data: { status: "expired" },
    });

    const existingUser = await transaction.user.findUnique({
      where: { email },
      select: {
        deletedAt: true,
        id: true,
        isBanned: true,
        status: true,
      },
    });

    if (
      existingUser &&
      existingUser.status === "active" &&
      !existingUser.isBanned &&
      !existingUser.deletedAt
    ) {
      const existingMembership = await transaction.publisherMembership.findUnique({
        where: {
          publisherId_userId: {
            publisherId: publisher.id,
            userId: existingUser.id,
          },
        },
        select: { id: true },
      });

      if (existingMembership) {
        return { status: "already_member" as const };
      }
    }

    const pendingInvitation = await transaction.publisherInvitation.findFirst({
      where: {
        expiresAt: { gt: now },
        invitedEmail: email,
        publisherId: publisher.id,
        status: "pending",
      },
      select: { id: true },
    });

    if (pendingInvitation) {
      return { status: "already_pending" as const };
    }

    const invitation = await transaction.publisherInvitation.create({
      data: {
        expiresAt: input.expiresAt,
        invitedById: user.id,
        invitedEmail: email,
        permissionOverrides: permissions,
        publisherId: publisher.id,
        role: input.role,
        tokenHash: input.tokenHash,
      },
      select: {
        createdAt: true,
        expiresAt: true,
        id: true,
        invitedEmail: true,
        permissionOverrides: true,
        role: true,
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "publisher_status_changed",
        actorId: user.id,
        entityId: publisher.id,
        entityType: "publisher",
        metadata: JSON.stringify({
          invitedEmail: email,
          invitationId: invitation.id,
          invitedRole: input.role,
          source: "publisher_invitation_created",
        }),
      },
    });

    return {
      existingUserId:
        existingUser &&
        existingUser.status === "active" &&
        !existingUser.isBanned &&
        !existingUser.deletedAt
          ? existingUser.id
          : null,
      invitation,
      publisherName: publisher.companyName,
      sourceMembershipId: caller.id,
      status: "created" as const,
    };
  });
}

export async function cancelPublisherInvitationLocked(input: {
  invitationId: string;
  userId: string;
}) {
  const candidate = await locateCaller(input.userId);
  if (!candidate) return false;

  return prisma.$transaction(async (transaction) => {
    const authorization = await lockAuthorizedCaller(transaction, candidate);
    if (!authorization) return false;

    const { publisher, user } = authorization;
    const rows = await transaction.$queryRaw<LockedInvitationRow[]>`
      SELECT id, publisherId, invitedEmail, status
      FROM PublisherInvitation
      WHERE id = ${input.invitationId}
        AND publisherId = ${publisher.id}
      LIMIT 1
      FOR UPDATE
    `;
    const invitation = rows[0] ?? null;

    if (!invitation || invitation.status !== "pending") return false;

    const cancelledAt = new Date();
    const result = await transaction.publisherInvitation.updateMany({
      where: {
        id: invitation.id,
        publisherId: publisher.id,
        status: "pending",
      },
      data: {
        cancelledAt,
        status: "cancelled",
      },
    });

    if (result.count !== 1) return false;

    await transaction.auditLog.create({
      data: {
        action: "publisher_status_changed",
        actorId: user.id,
        entityId: publisher.id,
        entityType: "publisher",
        metadata: JSON.stringify({
          invitedEmail: invitation.invitedEmail,
          invitationId: invitation.id,
          source: "publisher_invitation_cancelled",
        }),
      },
    });

    return true;
  });
}
