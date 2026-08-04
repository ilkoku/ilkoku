"use server";

import { redirect } from "next/navigation";
import {
  getCurrentSessionContext,
} from "@/lib/auth/current-user";
import {
  hashPassword,
  verifyPassword,
} from "@/lib/auth/password";
import {
  sendPasswordChangedEmail,
} from "@/lib/email/auth-emails";
import { prisma } from "@/lib/prisma";
import type {
  ProfileActionState,
} from "./state";

function getText(
  formData: FormData,
  key: string,
) {
  return String(
    formData.get(key) ?? "",
  ).trim();
}

function failure(
  message: string,
): ProfileActionState {
  return {
    message,
    status: "error",
  };
}

function success(
  message: string,
): ProfileActionState {
  return {
    message,
    status: "success",
  };
}

function isValidPassword(
  value: string,
) {
  return (
    value.length >= 8 &&
    /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(
      value,
    ) &&
    /\d/.test(value)
  );
}

export async function changePasswordAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const context =
    await getCurrentSessionContext();

  if (!context) {
    redirect(
      "/giris?sonraki=/hesabim",
    );
  }

  const user = context.user;
  const currentPassword = getText(
    formData,
    "currentPassword",
  );
  const newPassword = getText(
    formData,
    "newPassword",
  );
  const confirmation = getText(
    formData,
    "confirmation",
  );
  const closeOtherSessions =
    formData.get(
      "closeOtherSessions",
    ) === "yes";

  if (!currentPassword) {
    return failure(
      "Mevcut şifrenizi girin.",
    );
  }

  if (!isValidPassword(newPassword)) {
    return failure(
      "Yeni şifre en az 8 karakter, en az bir harf ve bir rakam içermelidir.",
    );
  }

  if (newPassword !== confirmation) {
    return failure(
      "Yeni şifreler eşleşmiyor.",
    );
  }

  if (currentPassword === newPassword) {
    return failure(
      "Yeni şifre mevcut şifreden farklı olmalıdır.",
    );
  }

  const account =
    await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        email: true,
        fullName: true,
        passwordHash: true,
      },
    });

  if (
    !account ||
    !(await verifyPassword(
      currentPassword,
      account.passwordHash,
    ))
  ) {
    return failure(
      "Mevcut şifre doğru değil.",
    );
  }

  const changedAt = new Date();

  try {
    const passwordHash =
      await hashPassword(newPassword);

    await prisma.$transaction(
      async (transaction) => {
        await transaction.user.update({
          where: {
            id: user.id,
          },
          data: {
            passwordHash,
          },
        });

        await transaction.passwordResetToken.deleteMany({
          where: {
            usedAt: null,
            userId: user.id,
          },
        });

        if (closeOtherSessions) {
          await transaction.session.deleteMany({
            where: {
              id: {
                not: context.sessionId,
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
              otherSessionsClosed:
                closeOtherSessions,
              source: "profile",
            }),
          },
        });
      },
    );
  } catch {
    return failure(
      "Şifre güncellenemedi. Lütfen tekrar deneyin.",
    );
  }

  try {
    await sendPasswordChangedEmail({
      changedAt,
      email: account.email,
      fullName: account.fullName,
      otherSessionsClosed:
        closeOtherSessions,
      source: "profile",
    });
  } catch (emailError) {
    console.error(
      "PASSWORD_CHANGED_DELIVERY_FAILED",
      emailError,
    );
  }

  return success(
    closeOtherSessions
      ? "Şifreniz değiştirildi ve diğer cihazlardaki oturumlar kapatıldı."
      : "Şifreniz başarıyla değiştirildi.",
  );
}
