import "server-only";

import { prisma } from "@/lib/prisma";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

type LockedResetUserRow = {
  deletedAt: Date | string | null;
  email: string;
  fullName: string;
  id: string;
  isBanned: boolean | number;
  status: "active" | "suspended" | "disabled";
};

type LockedResetTokenRow = {
  expiresAt: Date | string;
  id: string;
  usedAt: Date | string | null;
  userId: string;
};

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function availableUser(user: LockedResetUserRow | null) {
  return Boolean(
    user &&
      user.status === "active" &&
      !Boolean(user.isBanned) &&
      !user.deletedAt,
  );
}

export async function issuePasswordReset(input: {
  email: string;
  tokenHash: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const users = await transaction.$queryRaw<LockedResetUserRow[]>`
      SELECT id, email, fullName, status, isBanned, deletedAt
      FROM User
      WHERE email = ${input.email}
      LIMIT 1
      FOR UPDATE
    `;
    const user = users[0] ?? null;

    if (!availableUser(user)) {
      return null;
    }

    await transaction.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    await transaction.passwordResetToken.create({
      data: {
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        tokenHash: input.tokenHash,
        userId: user.id,
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "password_reset_requested",
        actorId: user.id,
        entityId: user.id,
        entityType: "User",
      },
    });

    return {
      email: user.email,
      fullName: user.fullName,
      userId: user.id,
    };
  });
}

export async function redeemPasswordReset(input: {
  passwordHash: string;
  tokenHash: string;
}) {
  const candidate = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash: input.tokenHash,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!candidate) {
    return null;
  }

  const changedAt = new Date();

  return prisma.$transaction(async (transaction) => {
    const users = await transaction.$queryRaw<LockedResetUserRow[]>`
      SELECT id, email, fullName, status, isBanned, deletedAt
      FROM User
      WHERE id = ${candidate.userId}
      LIMIT 1
      FOR UPDATE
    `;
    const user = users[0] ?? null;

    if (!availableUser(user)) {
      return null;
    }

    const tokens = await transaction.$queryRaw<LockedResetTokenRow[]>`
      SELECT id, userId, expiresAt, usedAt
      FROM PasswordResetToken
      WHERE id = ${candidate.id}
        AND tokenHash = ${input.tokenHash}
      LIMIT 1
      FOR UPDATE
    `;
    const resetToken = tokens[0] ?? null;

    if (
      !resetToken ||
      resetToken.userId !== user.id ||
      resetToken.usedAt ||
      asDate(resetToken.expiresAt).getTime() <= changedAt.getTime()
    ) {
      return null;
    }

    const claimed = await transaction.passwordResetToken.updateMany({
      where: {
        expiresAt: { gt: changedAt },
        id: resetToken.id,
        usedAt: null,
        userId: user.id,
      },
      data: {
        usedAt: changedAt,
      },
    });

    if (claimed.count !== 1) {
      return null;
    }

    await transaction.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash: input.passwordHash,
      },
    });

    await transaction.passwordResetToken.deleteMany({
      where: {
        id: { not: resetToken.id },
        userId: user.id,
        usedAt: null,
      },
    });

    await transaction.session.deleteMany({
      where: {
        userId: user.id,
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "password_changed",
        actorId: user.id,
        entityId: user.id,
        entityType: "User",
        metadata: JSON.stringify({
          otherSessionsClosed: true,
          source: "password_reset",
        }),
      },
    });

    return {
      changedAt,
      email: user.email,
      fullName: user.fullName,
      userId: user.id,
    };
  });
}
