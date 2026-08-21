"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  cancelAdminContract,
  respondToUserContract,
} from "./repository";

function text(formData: FormData, key: string, maxLength: number) {
  return String(formData.get(key) ?? "").trim().slice(0, maxLength);
}

export async function respondToContractWithConfirmationAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/giris?sonraki=/sozlesmelerim");

  const contractId = text(formData, "contractId", 36);
  const decision = text(formData, "decision", 16);
  const responseNote = text(formData, "responseNote", 3000) || null;
  const responseConfirmed = formData.get("responseConfirmed") === "confirmed";

  if (!contractId || (decision !== "accepted" && decision !== "rejected")) {
    redirect(`/sozlesmelerim/${contractId}?durum=gecersiz_islem`);
  }
  if (!responseConfirmed) {
    redirect(`/sozlesmelerim/${contractId}?durum=onay_gerekli`);
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
  revalidatePath("/sozlesme/takip");
  redirect(`/sozlesmelerim/${contractId}?durum=${encodeURIComponent(result.status)}`);
}

export async function cancelContractWithConfirmationAction(formData: FormData) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") {
    redirect("/erisim-reddedildi?kaynak=contract_management");
  }

  const contractId = text(formData, "contractId", 36);
  const reason = text(formData, "reason", 1000) || null;
  const cancelConfirmed = formData.get("cancelConfirmed") === "confirmed";

  if (!contractId) redirect("/sozlesme?durum=eksik_bilgi");
  if (!cancelConfirmed) {
    redirect(`/sozlesme/${contractId}?durum=iptal_onayi_gerekli`);
  }

  const result = await cancelAdminContract({
    actorId: admin.id,
    contractId,
    reason,
  });

  revalidatePath("/sozlesme");
  revalidatePath("/sozlesme/takip");
  revalidatePath(`/sozlesme/${contractId}`);
  revalidatePath("/sozlesmelerim");
  redirect(`/sozlesme/${contractId}?durum=${encodeURIComponent(result.status)}`);
}
