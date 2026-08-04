"use server";

import {
  createHash,
  randomBytes,
} from "node:crypto";
import { redirect } from "next/navigation";
import {
  notificationContent,
  validationContent,
} from "@/content";
import {
  clearSessionCookie,
} from "@/lib/auth/cookies";
import {
  hashPassword,
} from "@/lib/auth/password";
import {
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
} from "@/lib/email/auth-emails";
import { prisma } from "@/lib/prisma";

export type PasswordSecurityActionState = {
  message: string;
  status:
    | "idle"
    | "error"
    | "success";
};

function error(
  message: string,
): PasswordSecurityActionState {
  return {
    message,
    status: "error",
  };
}

function success(
  message: string,
): PasswordSecurityActionState {
  return {
    message,
    status: "success",
  };
}

function getText(
  formData: FormData,
  key: string,
) {
  return String(
    formData.get(key) ?? "",
  ).trim();
}

function validPassword(
  password: string,
) {
  return (
    password.length >= 8 &&
    /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(
      password,
    ) &&
    /\d/.test(password)
  );
}

export async function resetPasswordAction(
  _state: PasswordSecurityActionState,
  formData: FormData,
): Promise<PasswordSecurityActionState> {
  const email = getText(
    formData,
    "email",
  ).toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return error(
      validationContent.invalidEmail,
    );
  }

  try {
    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          fullName: true,
          id: true,
        },
      });

    if (user) {
      const token =
        randomBytes(32).toString(
          "base64url",
        );
      const tokenHash =
        createHash("sha256")
          .update(token)
          .digest("hex");

      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({
          where: {
            usedAt: null,
            userId: user.id,
          },
        }),
        prisma.passwordResetToken.create({
          data: {
            expiresAt: new Date(
              Date.now() +
                60 * 60 * 1000,
            ),
            tokenHash,
            userId: user.id,
          },
        }),
        prisma.auditLog.create({
          data: {
            action:
              "password_reset_requested",
            actorId: user.id,
            entityId: user.id,
            entityType: "User",
          },
        }),
      ]);

      try {
        await sendPasswordResetEmail({
          email,
          fullName: user.fullName,
          token,
        });
      } catch (emailError) {
        console.error(
          "PASSWORD_RESET_DELIVERY_FAILED",
          emailError,
        );
      }
    }
  } catch {
    return error(
      validationContent.genericFailure,
    );
  }

  return success(
    notificationContent.passwordResetSent,
  );
}

export async function updatePasswordAction(
  _state: PasswordSecurityActionState,
  formData: FormData,
): Promise<PasswordSecurityActionState> {
  const password = getText(
    formData,
    "password",
  );
  const confirmation = getText(
    formData,
    "password-confirmation",
  );
  const token = getText(
    formData,
    "token",
  );

  if (!validPassword(password)) {
    return error(
      validationContent.invalidPassword,
    );
  }

  if (password !== confirmation) {
    return error(
      validationContent.passwordsDoNotMatch,
    );
  }

  if (!token) {
    return error(
      validationContent.expiredResetLink,
    );
  }

  const tokenHash =
    createHash("sha256")
      .update(token)
      .digest("hex");
  const now = new Date();

  let account:
    | {
        email: string;
        fullName: string;
      }
    | null = null;

  try {
    const resetToken =
      await prisma.passwordResetToken.findUnique({
        where: {
          tokenHash,
        },
        select: {
          expiresAt: true,
          id: true,
          usedAt: true,
          user: {
            select: {
              email: true,
              fullName: true,
            },
          },
          userId: true,
        },
      });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt <= now
    ) {
      return error(
        validationContent.expiredResetLink,
      );
    }

    account = resetToken.user;
    const passwordHash =
      await hashPassword(password);

    await prisma.$transaction(
      async (transaction) => {
        const claimed =
          await transaction.passwordResetToken.updateMany({
            where: {
              expiresAt: {
                gt: now,
              },
              id: resetToken.id,
              usedAt: null,
            },
            data: {
              usedAt: now,
            },
          });

        if (claimed.count !== 1) {
          throw new Error(
            "INVALID_RESET_TOKEN",
          );
        }

        await transaction.user.update({
          where: {
            id: resetToken.userId,
          },
          data: {
            passwordHash,
          },
        });

        await transaction.session.deleteMany({
          where: {
            userId: resetToken.userId,
          },
        });

        await transaction.passwordResetToken.deleteMany({
          where: {
            id: {
              not: resetToken.id,
            },
            usedAt: null,
            userId: resetToken.userId,
          },
        });

        await transaction.auditLog.create({
          data: {
            action: "password_changed",
            actorId: resetToken.userId,
            entityId: resetToken.userId,
            entityType: "User",
            metadata: JSON.stringify({
              otherSessionsClosed: true,
              source: "password_reset",
            }),
          },
        });
      },
    );
  } catch {
    return error(
      validationContent.expiredResetLink,
    );
  }

  if (account) {
    try {
      await sendPasswordChangedEmail({
        changedAt: now,
        email: account.email,
        fullName: account.fullName,
        otherSessionsClosed: true,
        source: "password_reset",
      });
    } catch (emailError) {
      console.error(
        "PASSWORD_CHANGED_DELIVERY_FAILED",
        emailError,
      );
    }
  }

  await clearSessionCookie();
  redirect(
    "/giris?durum=sifre-guncellendi",
  );
}
