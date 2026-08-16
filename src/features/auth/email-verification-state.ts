import "server-only";

import { prisma } from "@/lib/prisma";

const EMAIL_VERIFICATION_COOLDOWN_MS = 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

type LockedVerificationUserRow = {
  deletedAt: Date | string | null;
  email: string;
  emailVerified: Date | string | null;
  fullName: string;
  id: string;
  isBanned: boolean | number;
  status: "active" | "suspended" | "disabled";
};

type VerificationTokenRow = {
  createdAt: Date | string;
  expiresAt: Date | string;
  id: string;
  tokenHash: string;
  usedAt: Date | string | null;
  userId: string;
};

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function availableUser(user: LockedVerificationUserRow | null) {
  return Boolean(
    user &&
      user.status === "active" &&
      !Boolean(user.isBanned) &&
      !user.deletedAt,
  );
}

export async function issueEmailVerification(input: {
  tokenHash: string;
  userId: string;
}) {
  const now = new Date();

  return prisma.$transaction(async (transaction) => {
    const users = await transaction.$queryRaw<LockedVerificationUserRow[]>`
      SELECT id, email, fullName, emailVerified, status, isBanned, deletedAt
      FROM User
      WHERE id = ${input.userId}
      LIMIT 1
      FOR UPDATE
    `;
    const user = users[0] ?? null;

    if (!availableUser(user)) {
      return { status: "account_unavailable" as const };
    }

    if (user.emailVerified) {
      return { status: "already_verified" as const };
    }

    const latestTokens = await transaction.$queryRaw<VerificationTokenRow[]>`
      SELECT id, userId, tokenHash, createdAt, expiresAt, usedAt
      FROM EmailVerificationToken
      WHERE userId = ${user.id}
        AND usedAt IS NULL
      ORDER BY createdAt DESC
      LIMIT 1
      FOR UPDATE
    `;
    const latestToken = latestTokens[0] ?? null;

    if (latestToken) {
      const retryAt =
        asDate(latestToken.createdAt).getTime() +
        EMAIL_VERIFICATION_COOLDOWN_MS;

      if (retryAt > now.getTime()) {
        return {
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((retryAt - now.getTime()) / 1000),
          ),
          status: "cooldown" as const,
        };
      }
    }

    await transaction.emailVerificationToken.deleteMany({
      where: {
        usedAt: null,
        userId: user.id,
      },
    });

    await transaction.emailVerificationToken.create({
      data: {
        expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS),
        tokenHash: input.tokenHash,
        userId: user.id,
      },
    });

    return {
      email: user.email,
      fullName: user.fullName,
      status: "issued" as const,
      userId: user.id,
    };
  });
}

export async function revokeIssuedEmailVerification(input: {
  tokenHash: string;
  userId: string;
}) {
  await prisma.emailVerificationToken.deleteMany({
    where: {
      tokenHash: input.tokenHash,
      usedAt: null,
      userId: input.userId,
    },
  });
}
