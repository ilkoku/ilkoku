import "server-only";

import type {
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "./password";

type LockedLoginUserRow = {
  deletedAt: Date | string | null;
  email: string;
  fullName: string;
  id: string;
  isBanned: boolean | number;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
};

function availableUser(user: LockedLoginUserRow | null) {
  return Boolean(
    user &&
      user.status === "active" &&
      !Boolean(user.isBanned) &&
      !user.deletedAt,
  );
}

export async function issueLoginSession(input: {
  expiresAt: Date;
  password: string;
  preverifiedPasswordHash: string;
  tokenHash: string;
  userId: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const users = await transaction.$queryRaw<LockedLoginUserRow[]>`
      SELECT id, email, fullName, passwordHash, role, status, isBanned, deletedAt
      FROM User
      WHERE id = ${input.userId}
      LIMIT 1
      FOR UPDATE
    `;
    const user = users[0] ?? null;

    if (!availableUser(user)) {
      return { status: "account_unavailable" as const };
    }

    if (
      user.passwordHash !== input.preverifiedPasswordHash &&
      !(await verifyPassword(input.password, user.passwordHash))
    ) {
      return { status: "invalid_credentials" as const };
    }

    await transaction.session.create({
      data: {
        expiresAt: input.expiresAt,
        tokenHash: input.tokenHash,
        userId: user.id,
      },
    });

    return {
      status: "issued" as const,
      user: {
        email: user.email,
        fullName: user.fullName,
        id: user.id,
        role: user.role,
      },
    };
  });
}
