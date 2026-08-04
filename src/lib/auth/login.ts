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

  // Oturum oluşturma giriş için tek kritik yazma işlemidir.
  await prisma.session.create({
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

  // Son giriş tarihi ve audit kaydı yardımcı telemetridir.
  // Bunlardan biri başarısız olursa geçerli oturum geri alınmaz.
  try {
    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          lastLoginAt: loggedInAt,
        },
      }),
      prisma.auditLog.create({
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
    user,
  };
}
