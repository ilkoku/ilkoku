"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getCurrentSessionContext,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { hashPassword } from "@/lib/auth/password";
import { sendPasswordChangedEmail } from "@/lib/email/auth-emails";
import { prisma } from "@/lib/prisma";
import { changeProfilePassword } from "./password-change-state";
import type { ProfileActionState } from "./state";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function failure(message: string): ProfileActionState {
  return { message, status: "error" };
}

function success(message: string): ProfileActionState {
  return { message, status: "success" };
}

function isValidUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidPassword(value: string) {
  return value.length >= 8 && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(value) && /\d/.test(value);
}

export async function updateProfileAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/giris?sonraki=/hesabim");

  const firstName = getText(formData, "firstName");
  const lastName = getText(formData, "lastName");
  const username = getText(formData, "username").replace(/^@/, "");
  const bio = getText(formData, "bio");
  const website = getText(formData, "website");
  const avatarUrl = getText(formData, "avatarUrl");

  if (firstName.length < 2) return failure("Ad alanı en az 2 karakter olmalıdır.");
  if (lastName.length < 2) return failure("Soyad alanı en az 2 karakter olmalıdır.");
  if (!/^[\p{L}\p{N}._-]{3,30}$/u.test(username)) {
    return failure("Rumuz 3–30 karakter olmalı; harf, rakam, nokta, tire veya alt çizgi içerebilir.");
  }
  if (bio.length > 600) return failure("Kısa biyografi en fazla 600 karakter olabilir.");
  if (!isValidUrl(website)) return failure("Web sitesi adresi http:// veya https:// ile başlamalıdır.");
  if (!isValidUrl(avatarUrl)) return failure("Profil fotoğrafı adresi geçerli bir bağlantı olmalıdır.");

  const duplicate = await prisma.user.findFirst({
    where: { username, id: { not: user.id } },
    select: { id: true },
  });
  if (duplicate) return failure("Bu rumuz başka bir kullanıcı tarafından kullanılıyor.");

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: user.id },
        data: {
          avatarUrl: avatarUrl || null,
          bio: bio || null,
          displayName: username,
          fullName: `${firstName} ${lastName}`.trim(),
          username,
        },
      });

      await transaction.profile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          website: website || null,
          completionPercentage: 100,
        },
        update: {
          website: website || null,
          completionPercentage: 100,
        },
      });

      await transaction.auditLog.create({
        data: {
          action: "profile_updated",
          actorId: user.id,
          entityId: user.id,
          entityType: "User",
          metadata: JSON.stringify({
            fields: [
              "avatarUrl",
              "bio",
              "displayName",
              "fullName",
              "username",
              "website",
            ],
          }),
        },
      });
    });
  } catch {
    return failure("Profil kaydedilemedi. Lütfen tekrar deneyin.");
  }

  revalidatePath("/profilim");
  revalidatePath("/hesabim");
  revalidatePath("/yazar");
  return success("Profil bilgileriniz kaydedildi.");
}

export async function changePasswordAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const context = await getCurrentSessionContext();
  if (!context) redirect("/giris?sonraki=/hesabim");

  const currentPassword = getText(formData, "currentPassword");
  const newPassword = getText(formData, "newPassword");
  const confirmation = getText(formData, "confirmation");

  if (!currentPassword) return failure("Mevcut şifrenizi girin.");
  if (!isValidPassword(newPassword)) {
    return failure("Yeni şifre en az 8 karakter, en az bir harf ve bir rakam içermelidir.");
  }
  if (newPassword !== confirmation) return failure("Yeni şifreler eşleşmiyor.");
  if (currentPassword === newPassword) return failure("Yeni şifre mevcut şifreden farklı olmalıdır.");

  let result: Awaited<ReturnType<typeof changeProfilePassword>> | null = null;

  try {
    const passwordHash = await hashPassword(newPassword);
    result = await changeProfilePassword({
      closeOtherSessions: false,
      currentPassword,
      passwordHash,
      sessionId: context.sessionId,
      userId: context.user.id,
    });
  } catch {
    return failure("Şifre güncellenemedi. Lütfen tekrar deneyin.");
  }

  if (result.status === "invalid_current_password") {
    return failure("Mevcut şifre doğru değil.");
  }
  if (result.status !== "changed") {
    return failure("Şifre güncellenemedi. Lütfen tekrar giriş yapıp deneyin.");
  }

  try {
    await sendPasswordChangedEmail({
      changedAt: result.changedAt,
      email: result.email,
      fullName: result.fullName,
      otherSessionsClosed: false,
      source: "profile",
    });
  } catch (emailError) {
    console.error("PASSWORD_CHANGED_DELIVERY_FAILED", emailError);
  }

  return success("Şifreniz başarıyla değiştirildi.");
}
