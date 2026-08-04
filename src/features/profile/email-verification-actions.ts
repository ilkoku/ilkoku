"use server";

import {
  createHash,
  randomBytes,
} from "node:crypto";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
} from "@/lib/auth/current-user";
import {
  sendVerificationEmail,
} from "@/lib/email/auth-emails";
import { prisma } from "@/lib/prisma";
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

  const account =
    await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        email: true,
        emailVerificationTokens: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            createdAt: true,
          },
          take: 1,
          where: {
            usedAt: null,
          },
        },
        emailVerified: true,
        fullName: true,
      },
    });

  if (!account) {
    return failure(
      "Hesap bilgileri bulunamadı.",
    );
  }

  if (account.emailVerified) {
    return success(
      "E-posta adresiniz zaten doğrulanmış.",
    );
  }

  const latestToken =
    account.emailVerificationTokens[0];
  const retryAfter =
    latestToken
      ? latestToken.createdAt.getTime() +
        60 * 1000
      : 0;

  if (retryAfter > Date.now()) {
    const seconds = Math.max(
      1,
      Math.ceil(
        (retryAfter - Date.now()) /
          1000,
      ),
    );

    return failure(
      `Yeni e-posta göndermek için ${seconds} saniye bekleyin.`,
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
  const expiresAt = new Date(
    Date.now() +
      24 * 60 * 60 * 1000,
  );

  try {
    await prisma.$transaction([
      prisma.emailVerificationToken.deleteMany({
        where: {
          usedAt: null,
          userId: user.id,
        },
      }),
      prisma.emailVerificationToken.create({
        data: {
          expiresAt,
          tokenHash,
          userId: user.id,
        },
      }),
    ]);
  } catch {
    return failure(
      "Doğrulama bağlantısı oluşturulamadı. Lütfen tekrar deneyin.",
    );
  }

  try {
    await sendVerificationEmail({
      email: account.email,
      fullName: account.fullName,
      token,
    });
  } catch (emailError) {
    console.error(
      "EMAIL_VERIFICATION_RESEND_FAILED",
      emailError,
    );

    try {
      await prisma.emailVerificationToken.deleteMany({
        where: {
          tokenHash,
          usedAt: null,
        },
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
