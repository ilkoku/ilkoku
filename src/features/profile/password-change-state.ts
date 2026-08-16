import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

type LockedPasswordUserRow = {
  deletedAt: Date | string | null;
  email: string;
  fullName: string;
  id: string;
  isBanned: boolean | number;
  passwordHash: string;
  status: "active" | "suspended" | "disabled";
};

type LockedSessionRow = {
  expiresAt: Date | string;
  id: string;
  userId: string;
};

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function availableUser(user: LockedPasswordUserRow | null) {
  return Boolean(
    user &&
      user.status === "active" &&
      !Boolean(user.isBanned) &&
      !user.deletedAt,
  );
}

async function lockCurrentSession(
  transaction: Prisma.TransactionClient,
  input: { sessionId: string; userId: string },
) {
  const sessions = await transaction.$queryRaw<LockedSessionRow[]>`
    SELECT id, userId, expiresAt
    FROM Session
    WHERE id = ${input.sessionId}
      AND userId = ${input.userId}
    LIMIT 1
    FOR UPDATE
  `;

  return sessions[0] ?? null;
}

export async function changeProfilePassword(input: {
  closeOtherSessions: boolean;
  currentPassword: string;
  passwordHash: string;
  sessionId: string;
  userId: string;
}) {
  const changedAt = new Date();

  return prisma.$transaction(async (transaction) => {
    const users = await transaction.$queryRaw<LockedPasswordUserRow[]>`
      SELECT id, email, fullName, passwordHash, status, isBanned, deletedAt
      FROM User
      WHERE id = ${input.userId}
      LIMIT 1
      FOR UPDATE
    `;
    const user = users[0] ?? null;

    if (!availableUser(user)) {
      return { status: "account_unavailable" as const };
    }

    const session = await lockCurrentSession(transaction, {
      sessionId: input.sessionId,
      userId: user.id,
    });

    if (!session || asDate(session.expiresAt).getTime() <= changedAt.getTime()) {
      return { status: "session_unavailable" as const };
    }

    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      return { status: "invalid_current_password" as const };
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
        usedAt: null,
        userId: user.id,
      },
    });

    if (input.closeOtherSessions) {
      await transaction.session.deleteMany({
        where: {
          id: {
            not: session.id,
          },
          userId: user.id,
        },
      });
    }

    await transaction.auditLog.create({
      data: {
        action: "password_changed",
        actorId: user.id,
        entityId: user.id,
        entityType: "User",
        metadata: JSON.stringify({
          otherSessionsClosed: input.closeOtherSessions,
          source: "profile",
        }),
      },
    });

    return {
      changedAt,
      email: user.email,
      fullName: user.fullName,
      status: "changed" as const,
      userId: user.id,
    };
  });
}
