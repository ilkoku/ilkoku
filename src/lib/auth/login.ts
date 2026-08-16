import { prisma } from "@/lib/prisma";
import { issueLoginSession } from "./login-session-state";
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

  let isNewDevice = false;

  if (input.deviceHash) {
    try {
      const knownDevice =
        await prisma.auditLog.findFirst({
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
        });

      isNewDevice = !knownDevice;
    } catch (deviceLookupError) {
      console.error(
        "KNOWN_DEVICE_LOOKUP_FAILED",
        deviceLookupError,
      );

      // Cihaz tanıma yardımcı bir güvenlik katmanıdır;
      // başarılı şifre doğrulamasını ve kullanıcı girişini engellemez.
      isNewDevice = false;
    }
  }

  const loggedInAt = new Date();
  const token =
    generateSessionToken();
  const tokenHash =
    hashSessionToken(token);
  const expiresAt = new Date(
    Date.now() +
      1000 * 60 * 60 * 24 * 30,
  );

  // Session issuance is serialized on the live User row so account disable,
  // credential reset and login cannot leave a session behind after revocation.
  const issuance = await issueLoginSession({
    expiresAt,
    password: input.password,
    preverifiedPasswordHash:
      user.passwordHash,
    tokenHash,
    userId: user.id,
  });

  if (issuance.status === "invalid_credentials") {
    throw new Error(
      "INVALID_CREDENTIALS",
    );
  }

  if (issuance.status !== "issued") {
    throw new Error(
      "ACCOUNT_DISABLED",
    );
  }

  const authenticatedUser = issuance.user;

  // Son giriş tarihi ve audit kaydı yardımcı telemetridir.
  // Bunlardan biri başarısız olursa geçerli oturum geri alınmaz.
  try {
    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: authenticatedUser.id,
        },
        data: {
          lastLoginAt: loggedInAt,
        },
      }),
      prisma.auditLog.create({
        data: {
          action: "login",
          actorId: authenticatedUser.id,
          entityId: authenticatedUser.id,
          entityType: "User",
          ipAddress:
            input.ipAddress || null,
          metadata: JSON.stringify({
            deviceHash:
              input.deviceHash || null,
            isNewDevice,
            role: authenticatedUser.role,
          }),
          userAgent:
            input.userAgent || null,
        },
      }),
    ]);
  } catch (securityTelemetryError) {
    console.error(
      "LOGIN_SECURITY_TELEMETRY_FAILED",
      securityTelemetryError,
    );
  }

  return {
    isNewDevice,
    loggedInAt,
    token,
    user: authenticatedUser,
  };
}
