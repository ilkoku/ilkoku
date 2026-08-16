"use server";

import {
  createHash,
  randomBytes,
} from "node:crypto";
import { redirect } from "next/navigation";
import {
  issueEmailVerification,
  revokeIssuedEmailVerification,
} from "@/features/auth/email-verification-state";
import {
  getCurrentUser,
} from "@/lib/auth/current-user";
import {
  sendVerificationEmail,
} from "@/lib/email/auth-emails";
import type {
  ProfileActionState,
} from "./state";

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

export async function resendVerificationEmailAction(
  _state: ProfileActionState,
): Promise<ProfileActionState> {
  void _state;

  const user = await getCurrentUser();

  if (!user) {
    redirect(
      "/giris?sonraki=/hesabim",
    );
  }

  const token =
    randomBytes(32).toString(
      "base64url",
    );
  const tokenHash =
    createHash("sha256")
      .update(token)
      .digest("hex");

  let issued:
    | Awaited<ReturnType<typeof issueEmailVerification>>
    | null = null;

  try {
    issued = await issueEmailVerification({
      tokenHash,
      userId: user.id,
    });
  } catch {
    return failure(
      "Doğrulama bağlantısı oluşturulamadı. Lütfen tekrar deneyin.",
    );
  }

  if (issued.status === "account_unavailable") {
    return failure(
      "Hesap bilgileri bulunamadı.",
    );
  }

  if (issued.status === "already_verified") {
    return success(
      "E-posta adresiniz zaten doğrulanmış.",
    );
  }

  if (issued.status === "cooldown") {
    return failure(
      `Yeni e-posta göndermek için ${issued.retryAfterSeconds} saniye bekleyin.`,
    );
  }

  try {
    await sendVerificationEmail({
      email: issued.email,
      fullName: issued.fullName,
      token,
    });
  } catch (emailError) {
    console.error(
      "EMAIL_VERIFICATION_RESEND_FAILED",
      emailError,
    );

    try {
      await revokeIssuedEmailVerification({
        tokenHash,
        userId: issued.userId,
      });
    } catch (cleanupError) {
      console.error(
        "EMAIL_VERIFICATION_TOKEN_CLEANUP_FAILED",
        cleanupError,
      );
    }

    return failure(
      "Doğrulama e-postası gönderilemedi. Lütfen tekrar deneyin.",
    );
  }

  return success(
    "Doğrulama e-postası gönderildi. Bağlantı 24 saat geçerlidir.",
  );
}
