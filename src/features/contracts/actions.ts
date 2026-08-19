"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  cancelAdminContract,
  createContractTemplate,
  respondToUserContract,
  sendAdminContract,
  updateContractTemplate,
} from "./repository";
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

export async function sendContractFromAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/erisim-reddedildi?kaynak=contract_management");

  const templateId = text(formData, "templateId", 36);
  const recipientUserId = text(formData, "recipientUserId", 36);
  const relatedWorkId = text(formData, "relatedWorkId", 36) || null;
  const adminNote = text(formData, "adminNote", 5000) || null;

  if (!templateId || !recipientUserId) {
    redirect(contractCenterResult("eksik_bilgi"));
  }

  const result = await sendAdminContract({
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
    .toLocaleUpperCase("tr-TR")
    .replace(/[^A-Z0-9_]/gu, "_")
    .replace(/_+/gu, "_")
    .replace(/^_|_$/gu, "");

  if (!title || !body || !role || !code) {
    redirect("/sozlesme/sablonlar/yeni?durum=eksik_bilgi");
  }

  const result = await createContractTemplate({
    actorId: admin.id,
    body,
    code,
    description,
    targetRole: role,
    title,
  });

  revalidatePath("/sozlesme");
  if (result.status === "created") {
    redirect(`/sozlesme/sablonlar/${result.id}?durum=olusturuldu`);
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
  const active = formData.get("active") === "on";

  if (!templateId || !title || !body || !role) {
    redirect(`/sozlesme/sablonlar/${templateId}?durum=eksik_bilgi`);
  }

  const result = await updateContractTemplate({
    active,
    actorId: admin.id,
    body,
    description,
    targetRole: role,
    templateId,
    title,
  });

  revalidatePath("/sozlesme");
  revalidatePath(`/sozlesme/sablonlar/${templateId}`);
  redirect(`/sozlesme/sablonlar/${templateId}?durum=${encodeURIComponent(result.status)}`);
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
