"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { sendPublisherSubmissionDecisionEmail } from "@/lib/email/publisher-emails";
import type {
  PublisherDecisionActionState,
  PublisherInternalNoteActionState,
  PublisherWorkspaceSubmissionStatus,
} from "@/features/publisher-workspace/types";

import {
  addLegacyPublisherInternalNote,
  updateLegacyPublisherSubmissionDecision,
} from "./legacy-security";

const allowedStatuses = new Set<PublisherWorkspaceSubmissionStatus>([
  "pending",
  "reviewing",
  "accepted",
  "rejected",
]);

async function getPublisherWriteUser() {
  const user = await getCurrentUser();

  if (!user || user.role === "admin") {
    return null;
  }

  return user;
}

export async function updateSecurePublisherDecisionAction(
  _state: PublisherDecisionActionState,
  formData: FormData,
): Promise<PublisherDecisionActionState> {
  const user = await getPublisherWriteUser();

  if (!user) {
    return {
      message: "Bu işlem için giriş yapmalısınız.",
      status: "error",
    };
  }

  const submissionId = String(
    formData.get("submissionId") ?? "",
  ).trim();
  const status = String(
    formData.get("status") ?? "",
  ).trim() as PublisherWorkspaceSubmissionStatus;
  const noteValue = String(
    formData.get("publisherNote") ?? "",
  ).trim();

  if (!submissionId || !allowedStatuses.has(status)) {
    return {
      message: "Başvuru veya karar bilgisi geçersiz.",
      status: "error",
    };
  }

  if (
    (status === "accepted" || status === "rejected") &&
    noteValue.length < 10
  ) {
    return {
      message:
        "Kabul veya red kararında en az 10 karakterlik karar notu yazın.",
      status: "error",
    };
  }

  const result = await updateLegacyPublisherSubmissionDecision({
    note: noteValue || null,
    status: status as Exclude<
      PublisherWorkspaceSubmissionStatus,
      "withdrawn"
    >,
    submissionId,
    userId: user.id,
  });

  if (result.status === "forbidden") {
    return {
      message: "Bu başvuru üzerinde karar verme yetkiniz bulunmuyor.",
      status: "error",
    };
  }

  if (result.status === "not_found") {
    return {
      message:
        "Başvuru bulunamadı, geri çekildi veya artık bu yayınevine açık değil.",
      status: "error",
    };
  }

  if (result.status === "invalid_transition") {
    return {
      message:
        "Bu başvuru daha önce nihai karara bağlandı. Kabul veya red kararı tekrar açılamaz.",
      status: "error",
    };
  }

  let emailSent = true;

  if (
    result.statusChanged &&
    (
      status === "reviewing" ||
      status === "accepted" ||
      status === "rejected"
    )
  ) {
    try {
      await sendPublisherSubmissionDecisionEmail({
        email: result.author.email,
        fullName: result.author.fullName,
        note: noteValue || null,
        status,
        submissionId,
        workTitle: result.work.title,
      });
    } catch (error) {
      emailSent = false;

      console.error(
        "PUBLISHER_SUBMISSION_EMAIL_FAILED",
        {
          error:
            error instanceof Error
              ? error.message
              : "UNKNOWN_ERROR",
          status,
          submissionId,
        },
      );
    }
  }

  revalidatePath("/yayinevi");
  revalidatePath(
    `/yayinevi/basvurular/${submissionId}`,
  );

  return {
    message: emailSent
      ? "Başvuru kararı güncellendi ve geçmişe kaydedildi."
      : "Başvuru kararı güncellendi; e-posta gönderilemedi.",
    status: "success",
  };
}

export async function addSecurePublisherInternalNoteAction(
  _state: PublisherInternalNoteActionState,
  formData: FormData,
): Promise<PublisherInternalNoteActionState> {
  const user = await getPublisherWriteUser();

  if (!user) {
    return {
      message: "Bu işlem için giriş yapmalısınız.",
      status: "error",
    };
  }

  const submissionId = String(
    formData.get("submissionId") ?? "",
  ).trim();
  const note = String(
    formData.get("internalNote") ?? "",
  ).trim();

  if (!submissionId) {
    return {
      message: "Başvuru bilgisi eksik.",
      status: "error",
    };
  }

  if (note.length < 3) {
    return {
      message: "İç not en az 3 karakter olmalı.",
      status: "error",
    };
  }

  if (note.length > 3000) {
    return {
      message: "İç not 3000 karakteri geçemez.",
      status: "error",
    };
  }

  const result = await addLegacyPublisherInternalNote({
    note,
    submissionId,
    userId: user.id,
  });

  if (result.status !== "created") {
    return {
      message:
        result.status === "forbidden"
          ? "Bu başvuruya iç not ekleme yetkiniz bulunmuyor."
          : "Başvuru bulunamadı veya artık erişilebilir değil.",
      status: "error",
    };
  }

  revalidatePath(
    `/yayinevi/basvurular/${submissionId}`,
  );

  return {
    message: "İç not geçmişe eklendi.",
    status: "success",
  };
}
