import { prisma } from "@/lib/prisma";
import { verifyPassword } from "./password";
import {
  generateSessionToken,
  hashSessionToken,
} from "./session";

export async function loginUser(input: {
  deviceHash?: string;
  email: string;
  ipAddress?: string | null;
  password: string;
  userAgent?: string;
}) {
  const email =
    input.email.trim().toLowerCase();

  const user =
    await prisma.user.findUnique({
      where: {
        email,
      },
    });

  if (!user) {
    throw new Error(
      "INVALID_CREDENTIALS",
    );
  }

  const valid = await verifyPassword(
    input.password,
    user.passwordHash,
  );

  if (!valid) {
    throw new Error(
      "INVALID_CREDENTIALS",
    );
  }

  if (
    user.status !== "active" ||
    user.isBanned ||
    user.deletedAt !== null
  ) {
    throw new Error(
      "ACCOUNT_DISABLED",
    );
  }

  const knownDevice =
    input.deviceHash
      ? await prisma.auditLog.findFirst({
          where: {
            action: "login",
            actorId: user.id,
            metadata: {
              contains:
                input.deviceHash,
            },
          },
          select: {
            id: true,
          },
        })
      : null;
  const isNewDevice = Boolean(
    input.deviceHash &&
      !knownDevice,
  );
  const loggedInAt = new Date();
  const token =
    generateSessionToken();

  await prisma.$transaction(
    async (transaction) => {
      await transaction.session.create({
        data: {
          expiresAt: new Date(
            Date.now() +
              1000 * 60 * 60 * 24 * 30,
          ),
          tokenHash:
            hashSessionToken(token),
          userId: user.id,
        },
      });

      await transaction.user.update({
        where: {
          id: user.id,
        },
        data: {
          lastLoginAt: loggedInAt,
        },
      });

      await transaction.auditLog.create({
        data: {
          action: "login",
          actorId: user.id,
          entityId: user.id,
          entityType: "User",
          ipAddress:
            input.ipAddress || null,
          metadata: JSON.stringify({
            deviceHash:
              input.deviceHash || null,
            isNewDevice,
            role: user.role,
          }),
          userAgent:
            input.userAgent || null,
        },
      });
    },
  );

  return {
    isNewDevice,
    loggedInAt,
    token,
    user,
  };
}
