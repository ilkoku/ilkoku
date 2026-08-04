"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  createPublisherPermissionRequest,
  reviewPublisherPermissionRequest,
} from "./repository";
import type { PublisherPermissionActionState } from "./types";

function cleanNote(value: FormDataEntryValue | null) {
  const note = String(value ?? "").trim();
  return note || null;
}

async function getPublisherWriteUser() {
  const user = await getCurrentUser();

  if (!user || user.role === "admin") {
    return null;
  }

  return user;
}

function revalidatePermissionViews() {
  revalidatePath("/yayinevi/yetkilerim");
  revalidatePath("/yayinevi/bildirimler");
  revalidatePath("/yayinevi/uyeler");
  revalidatePath("/admin/audit-log");
}

export async function requestPublisherPermissionAction(
  _state: PublisherPermissionActionState,
  formData: FormData,
): Promise<PublisherPermissionActionState> {
  const user = await getPublisherWriteUser();
  if (!user) {
    return { message: "Bu işlem için giriş yapmalısınız.", status: "error" };
  }

  const permission = String(formData.get("permission") ?? "").trim();
  const requestNote = cleanNote(formData.get("requestNote"));

  if (requestNote && requestNote.length > 500) {
    return {
      message: "Talep açıklaması en fazla 500 karakter olabilir.",
      status: "error",
    };
  }

  const result = await createPublisherPermissionRequest({
    permission,
    requestNote,
    userId: user.id,
  });

  if (result === "created") {
    revalidatePermissionViews();
    return {
      message: "Yetki talebiniz yayınevi yöneticisine iletildi.",
      status: "success",
    };
  }

  const messages = {
    already_granted: "Bu yetki hesabınızda zaten bulunuyor.",
    already_pending: "Bu yetki için bekleyen bir talebiniz zaten var.",
    invalid: "Bu yetki talep edilebilir yetkiler arasında değil.",
    membership_not_found: "Aktif yayınevi üyeliğiniz bulunamadı.",
  } as const;

  return { message: messages[result], status: "error" };
}

export async function reviewPublisherPermissionRequestAction(
  _state: PublisherPermissionActionState,
  formData: FormData,
): Promise<PublisherPermissionActionState> {
  const user = await getPublisherWriteUser();
  if (!user) {
    return { message: "Bu işlem için giriş yapmalısınız.", status: "error" };
  }

  const requestId = String(formData.get("requestId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const reviewNote = cleanNote(formData.get("reviewNote"));

  if (!requestId || (decision !== "approved" && decision !== "rejected")) {
    return { message: "Talep veya karar bilgisi geçersiz.", status: "error" };
  }

  if (reviewNote && reviewNote.length > 500) {
    return {
      message: "Karar notu en fazla 500 karakter olabilir.",
      status: "error",
    };
  }

  const result = await reviewPublisherPermissionRequest({
    decision,
    requestId,
    reviewNote,
    userId: user.id,
  });

  if (result === "approved" || result === "rejected") {
    revalidatePermissionViews();
    return {
      message:
        result === "approved"
          ? "Yetki talebi onaylandı."
          : "Yetki talebi reddedildi.",
      status: "success",
    };
  }

  const messages = {
    forbidden: "Bu talebi sonuçlandırma yetkiniz yok.",
    invalid: "Talep edilen yetki güvenli kapsamda değil.",
    not_found: "Bekleyen talep bulunamadı veya daha önce sonuçlandırıldı.",
    self_review: "Kendi yetki talebinizi sonuçlandıramazsınız.",
    target_inactive: "Talep sahibinin yayınevi üyeliği aktif değil.",
  } as const;

  return { message: messages[result], status: "error" };
}
