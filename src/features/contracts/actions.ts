"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  cancelAdminContract,
  respondToUserContract,
} from "./repository";
import { sendManualAdminContract } from "./manual-dispatch";
import {
  convertSoftDraftToManagedTemplate,
  createManagedContractTemplate,
  transitionContractTemplateLifecycle,
  updateManagedContractTemplate,
} from "./template-lifecycle";
import type { ContractTargetRole } from "./types";

const validTargetRoles = new Set<ContractTargetRole>([
  "any",
  "reader",
  "writer",
  "editor_pending",
  "editor",
  "publisher",
  "admin",
]);

function text(formData: FormData, key: string, maxLength: number) {
  return String(formData.get(key) ?? "").trim().slice(0, maxLength);
}

async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}

function targetRole(value: string) {
  return validTargetRoles.has(value as ContractTargetRole)
    ? (value as ContractTargetRole)
    : null;
}

function contractCenterResult(code: string, contractId?: string) {
  const params = new URLSearchParams({ durum: code });
  if (contractId) params.set("sozlesme", contractId);
  return `/sozlesme?${params.toString()}`;
}

function templateResult(templateId: string, status: string) {
  return `/sozlesme/sablonlar/${templateId}?durum=${encodeURIComponent(status)}`;
}

export async function sendContractFromAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/erisim-reddedildi?kaynak=contract_management");

  const templateId = text(formData, "templateId", 36);
  const recipientUserId = text(formData, "recipientUserId", 36);
  const relatedWorkId = text(formData, "relatedWorkId", 36) || null;
  const adminNote = text(formData, "adminNote", 5000) || null;
  const dispatchConfirmed = formData.get("dispatchConfirmed") === "confirmed";

  if (!templateId || !recipientUserId) {
    redirect(contractCenterResult("eksik_bilgi"));
  }
  if (!dispatchConfirmed) {
    redirect(contractCenterResult("onay_gerekli"));
  }

  const result = await sendManualAdminContract({
    actorId: admin.id,
    adminNote,
    recipientUserId,
    relatedWorkId,
    templateId,
  });

  revalidatePath("/sozlesme");
  revalidatePath("/sozlesmelerim");

  if (result.status === "sent") {
    redirect(contractCenterResult("gonderildi", result.contractId));
  }
  if (result.status === "duplicate_active") {
    redirect(contractCenterResult("aktif_sozlesme_var", result.contractId));
  }

  redirect(contractCenterResult(result.status));
}

export async function createContractTemplateAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/erisim-reddedildi?kaynak=contract_management");

  const title = text(formData, "title", 220);
  const description = text(formData, "description", 500) || null;
  const body = text(formData, "body", 100000);
  const role = targetRole(text(formData, "targetRole", 32));
  const code = text(formData, "code", 120)
    .toUpperCase()
    .replace(/[^A-Z0-9_]/gu, "_")
    .replace(/_+/gu, "_")
    .replace(/^_|_$/gu, "");

  if (!title || !body || !role || !code) {
    redirect("/sozlesme/sablonlar/yeni?durum=eksik_bilgi");
  }

  const result = await createManagedContractTemplate({
    actorId: admin.id,
    body,
    code,
    description,
    targetRole: role,
    title,
  });

  revalidatePath("/sozlesme");
  revalidatePath("/sozlesme/sablonlar");
  if (result.status === "created") {
    redirect(templateResult(result.id, "olusturuldu"));
  }

  redirect(`/sozlesme/sablonlar/yeni?durum=${encodeURIComponent(result.status)}`);
}

export async function updateContractTemplateAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/erisim-reddedildi?kaynak=contract_management");

  const templateId = text(formData, "templateId", 36);
  const title = text(formData, "title", 220);
  const description = text(formData, "description", 500) || null;
  const body = text(formData, "body", 100000);
  const role = targetRole(text(formData, "targetRole", 32));

  if (!templateId || !title || !body || !role) {
    redirect(templateResult(templateId, "eksik_bilgi"));
  }

  const result = await updateManagedContractTemplate({
    actorId: admin.id,
    body,
    description,
    targetRole: role,
    templateId,
    title,
  });

  revalidatePath("/sozlesme");
  revalidatePath("/sozlesme/sablonlar");
  revalidatePath("/sozlesme/taslaklar");
  revalidatePath(`/sozlesme/sablonlar/${templateId}`);
  redirect(templateResult(templateId, result.status));
}

export async function transitionContractTemplateAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/erisim-reddedildi?kaynak=contract_management");

  const templateId = text(formData, "templateId", 36);
  const transition = text(formData, "transition", 32);
  if (
    !templateId ||
    !["submit_review", "approve", "activate", "deactivate", "return_draft"].includes(transition)
  ) {
    redirect(templateResult(templateId, "gecersiz_gecis"));
  }

  const result = await transitionContractTemplateLifecycle({
    actorId: admin.id,
    templateId,
    transition: transition as "submit_review" | "approve" | "activate" | "deactivate" | "return_draft",
  });

  revalidatePath("/sozlesme");
  revalidatePath("/sozlesme/sablonlar");
  revalidatePath(`/sozlesme/sablonlar/${templateId}`);
  redirect(templateResult(templateId, result.status));
}

export async function convertSoftDraftToTemplateAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/erisim-reddedildi?kaynak=contract_management");

  const sourceTemplateId = text(formData, "sourceTemplateId", 36);
  if (!sourceTemplateId) redirect("/sozlesme/taslaklar?durum=eksik_bilgi");

  const result = await convertSoftDraftToManagedTemplate({
    actorId: admin.id,
    sourceTemplateId,
  });

  revalidatePath("/sozlesme/sablonlar");
  revalidatePath("/sozlesme/taslaklar");
  if (result.status === "converted" || result.status === "already_converted") {
    redirect(templateResult(result.id, result.status));
  }

  redirect(templateResult(sourceTemplateId, result.status));
}

export async function cancelContractFromAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/erisim-reddedildi?kaynak=contract_management");

  const contractId = text(formData, "contractId", 36);
  const reason = text(formData, "reason", 1000) || null;
  if (!contractId) redirect(contractCenterResult("eksik_bilgi"));

  const result = await cancelAdminContract({
    actorId: admin.id,
    contractId,
    reason,
  });

  revalidatePath("/sozlesme");
  revalidatePath(`/sozlesme/${contractId}`);
  revalidatePath("/sozlesmelerim");
  redirect(`/sozlesme/${contractId}?durum=${encodeURIComponent(result.status)}`);
}

export async function respondToContractAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/giris?sonraki=/sozlesmelerim");

  const contractId = text(formData, "contractId", 36);
  const decision = text(formData, "decision", 16);
  const responseNote = text(formData, "responseNote", 3000) || null;

  if (!contractId || (decision !== "accepted" && decision !== "rejected")) {
    redirect(`/sozlesmelerim/${contractId}?durum=gecersiz_islem`);
  }

  const result = await respondToUserContract({
    contractId,
    decision,
    recipientUserId: user.id,
    responseNote,
  });

  revalidatePath("/sozlesmelerim");
  revalidatePath(`/sozlesmelerim/${contractId}`);
  revalidatePath("/sozlesme");
  redirect(`/sozlesmelerim/${contractId}?durum=${encodeURIComponent(result.status)}`);
}
