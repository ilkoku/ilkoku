"use server";

import { revalidatePath } from "next/cache";

import type {
  PublisherContractActionState,
} from "@/features/publisher-workspace/types";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  sendPublisherContractEmail,
} from "@/lib/email/publisher-emails";

import {
  savePublicationPlanLifecycle,
  savePublisherContractLifecycle,
} from "./lifecycle";

async function requirePublisherActor() {
  const user = await getCurrentUser();

  if (!user || user.role === "admin") {
    return null;
  }

  return user;
}

function revalidateContractSurfaces(submissionId: string) {
  revalidatePath(`/yayinevi/basvurular/${submissionId}`);
  revalidatePath("/yayinevi");
  revalidatePath("/yayinevleri");
}

export async function saveSecurePublisherContractAction(
  _state: PublisherContractActionState,
  formData: FormData,
): Promise<PublisherContractActionState> {
  const user = await requirePublisherActor();

  if (!user) {
    return {
      message: "Bu işlem için giriş yapmalısınız.",
      status: "error",
    };
  }

  const submissionId = String(
    formData.get("submissionId") ?? "",
  ).trim();
  const territory = String(
    formData.get("territory") ?? "",
  ).trim();
  const notes = String(
    formData.get("notes") ?? "",
  ).trim() || null;
  const royaltyPercentage = Number(
    formData.get("royaltyPercentage"),
  );
  const advanceRaw = String(
    formData.get("advanceAmount") ?? "",
  ).trim();
  const advanceAmount = advanceRaw
    ? Number(advanceRaw)
    : null;
  const rightsPeriodMonths = Number(
    formData.get("rightsPeriodMonths"),
  );
  const intent = String(
    formData.get("intent") ?? "draft",
  );

  if (
    !submissionId ||
    !territory ||
    territory.length > 180 ||
    (notes?.length ?? 0) > 10000 ||
    (intent !== "draft" && intent !== "send")
  ) {
    return {
      message: "Sözleşme bilgileri geçersiz veya eksik.",
      status: "error",
    };
  }

  if (
    !Number.isFinite(royaltyPercentage) ||
    royaltyPercentage < 0 ||
    royaltyPercentage > 100
  ) {
    return {
      message: "Telif oranı 0 ile 100 arasında olmalı.",
      status: "error",
    };
  }

  if (
    !Number.isInteger(rightsPeriodMonths) ||
    rightsPeriodMonths < 1 ||
    rightsPeriodMonths > 240
  ) {
    return {
      message: "Hak süresi 1–240 ay arasında olmalı.",
      status: "error",
    };
  }

  if (
    advanceAmount !== null &&
    (
      !Number.isFinite(advanceAmount) ||
      advanceAmount < 0
    )
  ) {
    return {
      message: "Avans tutarı geçersiz.",
      status: "error",
    };
  }

  const result = await savePublisherContractLifecycle({
    advanceAmount,
    notes,
    rightsPeriodMonths,
    royaltyPercentage,
    status: intent === "send" ? "sent" : "draft",
    submissionId,
    territory,
    userId: user.id,
  });

  if (result.status === "forbidden") {
    return {
      message: "Sözleşme yönetme yetkiniz bulunmuyor.",
      status: "error",
    };
  }

  if (result.status === "invalid_submission") {
    return {
      message:
        "Sözleşme yalnızca kabul edilmiş ve yayınevinize ait aktif başvuruda yönetilebilir.",
      status: "error",
    };
  }

  if (result.status === "contract_terminal") {
    return {
      message:
        "Bu sözleşme nihai duruma ulaştığı için yayınevi tarafından değiştirilemez.",
      status: "error",
    };
  }

  if (result.status === "sent_to_draft_forbidden") {
    return {
      message:
        "Yazara gönderilmiş sözleşme tekrar taslağa alınamaz. Değişiklik gerekiyorsa yeni sürümü doğrudan yazara gönderin.",
      status: "error",
    };
  }

  let emailDelivered = true;

  if (result.emailRequired) {
    try {
      await sendPublisherContractEmail({
        email: result.author.email,
        fullName: result.author.fullName,
        idempotencyKey: result.idempotencyKey,
        submissionId,
        workTitle: result.work.title,
      });
    } catch (error) {
      emailDelivered = false;
      console.error("PUBLISHER_CONTRACT_EMAIL_FAILED", {
        contractId: result.contract.id,
        error:
          error instanceof Error
            ? error.message
            : "UNKNOWN_ERROR",
        submissionId,
        version: result.contract.version,
      });
    }
  }

  revalidateContractSurfaces(submissionId);

  if (intent === "send") {
    return {
      message: emailDelivered
        ? (
            result.changed
              ? `Sözleşme sürüm ${result.contract.version} yazara gönderildi.`
              : "Bu sözleşme sürümü zaten kaydedilmişti; e-posta teslimi idempotent olarak doğrulandı."
          )
        : "Sözleşme kaydedildi; e-posta teslimi başarısız oldu ve E-posta Operasyonları üzerinden izlenebilir.",
      status: "success",
    };
  }

  return {
    message: result.changed
      ? "Sözleşme taslağı kaydedildi."
      : "Sözleşme taslağında değişiklik yok.",
    status: "success",
  };
}

export async function saveSecurePublicationPlanAction(
  _state: PublisherContractActionState,
  formData: FormData,
): Promise<PublisherContractActionState> {
  const user = await requirePublisherActor();

  if (!user) {
    return {
      message: "Bu işlem için giriş yapmalısınız.",
      status: "error",
    };
  }

  const submissionId = String(
    formData.get("submissionId") ?? "",
  ).trim();
  const targetRaw = String(
    formData.get("targetPublicationDate") ?? "",
  ).trim();
  const printRunRaw = String(
    formData.get("printRun") ?? "",
  ).trim();
  const printRun = printRunRaw
    ? Number(printRunRaw)
    : null;
  const allowedPlanStatuses = new Set([
    "planning",
    "preproduction",
    "production",
    "distribution",
    "published",
  ] as const);
  const allowedTaskStatuses = new Set([
    "not_started",
    "in_progress",
    "completed",
  ] as const);
  const status = String(
    formData.get("planStatus") ?? "planning",
  );
  const coverStatus = String(
    formData.get("coverStatus") ?? "not_started",
  );
  const layoutStatus = String(
    formData.get("layoutStatus") ?? "not_started",
  );
  const isbn = String(
    formData.get("isbn") ?? "",
  ).trim() || null;
  const notes = String(
    formData.get("planNotes") ?? "",
  ).trim() || null;

  if (
    !submissionId ||
    !allowedPlanStatuses.has(
      status as Parameters<typeof allowedPlanStatuses.has>[0],
    ) ||
    !allowedTaskStatuses.has(
      coverStatus as Parameters<typeof allowedTaskStatuses.has>[0],
    ) ||
    !allowedTaskStatuses.has(
      layoutStatus as Parameters<typeof allowedTaskStatuses.has>[0],
    ) ||
    (isbn?.length ?? 0) > 32 ||
    (notes?.length ?? 0) > 10000
  ) {
    return {
      message: "Yayın planı bilgileri geçersiz.",
      status: "error",
    };
  }

  if (
    printRun !== null &&
    (!Number.isInteger(printRun) || printRun < 1)
  ) {
    return {
      message: "Baskı adedi pozitif tam sayı olmalı.",
      status: "error",
    };
  }

  const targetPublicationDate = targetRaw
    ? new Date(`${targetRaw}T12:00:00`)
    : null;

  if (
    targetPublicationDate &&
    Number.isNaN(targetPublicationDate.getTime())
  ) {
    return {
      message: "Yayın tarihi geçersiz.",
      status: "error",
    };
  }

  const result = await savePublicationPlanLifecycle({
    coverStatus: coverStatus as "not_started" | "in_progress" | "completed",
    isbn,
    layoutStatus: layoutStatus as "not_started" | "in_progress" | "completed",
    notes,
    printRun,
    status: status as
      | "planning"
      | "preproduction"
      | "production"
      | "distribution"
      | "published",
    submissionId,
    targetPublicationDate,
    userId: user.id,
  });

  if (result.status === "forbidden") {
    return {
      message: "Yayın planı yönetme yetkiniz bulunmuyor.",
      status: "error",
    };
  }

  if (result.status === "invalid_submission") {
    return {
      message:
        "Yayın planı yalnızca kabul edilmiş ve yayınevinize ait aktif başvuruda yönetilebilir.",
      status: "error",
    };
  }

  revalidateContractSurfaces(submissionId);

  return {
    message: result.changed
      ? "Yayın planı kaydedildi ve yazara bildirildi."
      : "Yayın planında değişiklik yok.",
    status: "success",
  };
}
