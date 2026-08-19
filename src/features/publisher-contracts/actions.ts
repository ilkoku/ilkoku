"use server";

import { revalidatePath } from "next/cache";

import type {
  PublisherContractActionState,
} from "@/features/publisher-workspace/types";
import { getCurrentUser } from "@/lib/auth/current-user";

import {
  savePublicationPlanLifecycle,
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
  _formData: FormData,
): Promise<PublisherContractActionState> {
  const user = await requirePublisherActor();

  if (!user) {
    return {
      message: "Bu işlem için yayınevi hesabıyla giriş yapmalısınız.",
      status: "error",
    };
  }

  return {
    message:
      "Yeni sözleşmeler yalnız İlkOku merkezi Sözleşme Yönetimi üzerinden Admin tarafından hazırlanır ve gönderilir.",
    status: "error",
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
  const allowedPlanStatuses = [
    "planning",
    "preproduction",
    "production",
    "distribution",
    "published",
  ] as const;
  const allowedTaskStatuses = [
    "not_started",
    "in_progress",
    "completed",
  ] as const;
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
    !allowedPlanStatuses.includes(
      status as (typeof allowedPlanStatuses)[number],
    ) ||
    !allowedTaskStatuses.includes(
      coverStatus as (typeof allowedTaskStatuses)[number],
    ) ||
    !allowedTaskStatuses.includes(
      layoutStatus as (typeof allowedTaskStatuses)[number],
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
