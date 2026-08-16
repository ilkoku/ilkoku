"use server";

import { redirect } from "next/navigation";
import {
  getCurrentSessionContext,
} from "@/lib/auth/current-user";
import {
  hashPassword,
} from "@/lib/auth/password";
import {
  sendPasswordChangedEmail,
} from "@/lib/email/auth-emails";
import {
  changeProfilePassword,
} from "./password-change-state";
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

  let result:
    | Awaited<ReturnType<typeof changeProfilePassword>>
    | null = null;

  try {
    const passwordHash =
      await hashPassword(newPassword);

    result = await changeProfilePassword({
      closeOtherSessions,
      currentPassword,
      passwordHash,
      sessionId: context.sessionId,
      userId: context.user.id,
    });
  } catch {
    return failure(
      "Şifre güncellenemedi. Lütfen tekrar deneyin.",
    );
  }

  if (result.status === "invalid_current_password") {
    return failure(
      "Mevcut şifre doğru değil.",
    );
  }

  if (result.status !== "changed") {
    return failure(
      "Şifre güncellenemedi. Lütfen tekrar giriş yapıp deneyin.",
    );
  }

  try {
    await sendPasswordChangedEmail({
      changedAt: result.changedAt,
      email: result.email,
      fullName: result.fullName,
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
