import "server-only";

import type { UserRole, UserStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const standardRoles = new Set<UserRole>(["reader", "writer"]);

type LockedUserRow = {
  deletedAt: Date | null;
  id: string;
  publicId: string;
  role: UserRole;
  status: UserStatus;
};

type ActiveAdminRow = {
  id: string;
};

async function lockAdminControlPlane(
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  actorId: string,
  targetId: string,
) {
  const activeAdmins = await transaction.$queryRaw<ActiveAdminRow[]>`
    SELECT id
    FROM User
    WHERE role = 'admin'
      AND status = 'active'
      AND deletedAt IS NULL
    ORDER BY id
    FOR UPDATE
  `;

  const users = await transaction.$queryRaw<LockedUserRow[]>`
    SELECT id, publicId, role, status, deletedAt
    FROM User
    WHERE id IN (${actorId}, ${targetId})
    ORDER BY id
    FOR UPDATE
  `;

  const actor = users.find((row) => row.id === actorId) ?? null;
  const target = users.find((row) => row.id === targetId) ?? null;
  const actorIsActiveAdmin =
    Boolean(actor) &&
    actor?.role === "admin" &&
    actor.status === "active" &&
    actor.deletedAt === null &&
    activeAdmins.some((admin) => admin.id === actorId);

  return {
    activeAdminIds: new Set(activeAdmins.map((admin) => admin.id)),
    activeAdminCount: activeAdmins.length,
    actorIsActiveAdmin,
    target,
  };
}

export async function updateStandardUserRoleFromAdmin(input: {
  actorId: string;
  role: UserRole;
  targetId: string;
}) {
  if (!standardRoles.has(input.role) || input.actorId === input.targetId) {
    return null;
  }

  return prisma.$transaction(async (transaction) => {
    const control = await lockAdminControlPlane(
      transaction,
      input.actorId,
      input.targetId,
    );

    if (!control.actorIsActiveAdmin || !control.target) {
      return null;
    }

    const target = control.target;

    // Generic user management may only switch the two standard roles.
    // Editor, publisher and admin transitions belong to their canonical
    // approval/lifecycle flows and must not be bypassed from this surface.
    if (!standardRoles.has(target.role) || target.deletedAt) {
      return null;
    }

    if (target.role === input.role) {
      return { publicId: target.publicId };
    }

    await transaction.user.update({
      where: { id: target.id },
      data: { role: input.role },
    });

    await transaction.auditLog.create({
      data: {
        action: "user_status_changed",
        actorId: input.actorId,
        entityId: target.id,
        entityType: "user",
        metadata: JSON.stringify({
          newRole: input.role,
          oldRole: target.role,
          publicId: target.publicId,
          source: "admin_user_role_changed",
        }),
      },
    });

    return { publicId: target.publicId };
  });
}

export async function updateUserStatusFromAdmin(input: {
  actorId: string;
  status: UserStatus;
  targetId: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const control = await lockAdminControlPlane(
      transaction,
      input.actorId,
      input.targetId,
    );

    if (!control.actorIsActiveAdmin || !control.target) {
      return null;
    }

    const target = control.target;

    if (target.id === input.actorId && input.status !== "active") {
      return null;
    }

    if (
      target.role === "admin" &&
      control.activeAdminIds.has(target.id) &&
      input.status !== "active" &&
      control.activeAdminCount <= 1
    ) {
      return null;
    }

    if (
      target.status === input.status &&
      !(input.status === "active" && target.deletedAt)
    ) {
      return { publicId: target.publicId };
    }

    await transaction.user.update({
      where: { id: target.id },
      data: {
        status: input.status,
        ...(input.status === "active" ? { deletedAt: null } : {}),
      },
    });

    if (input.status !== "active") {
      await transaction.session.deleteMany({
        where: { userId: target.id },
      });
    }

    await transaction.auditLog.create({
      data: {
        action: "user_status_changed",
        actorId: input.actorId,
        entityId: target.id,
        entityType: "user",
        metadata: JSON.stringify({
          newStatus: input.status,
          oldStatus: target.status,
          publicId: target.publicId,
          sessionsRevoked: input.status !== "active",
          source: "admin_user_status_changed",
        }),
      },
    });

    return { publicId: target.publicId };
  });
}
