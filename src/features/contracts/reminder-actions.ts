"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { sendAdminContractReminder } from "./reminders";

function text(formData: FormData, key: string, maxLength: number) {
  return String(formData.get(key) ?? "").trim().slice(0, maxLength);
}

export async function sendContractReminderAction(formData: FormData) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") {
    redirect("/erisim-reddedildi?kaynak=contract_management");
  }

  const contractId = text(formData, "contractId", 36);
  const reminderConfirmed = formData.get("reminderConfirmed") === "confirmed";

  if (!contractId) redirect("/sozlesme/takip?durum=eksik_bilgi");
  if (!reminderConfirmed) {
    redirect(`/sozlesme/${contractId}?durum=hatirlatma_onayi_gerekli`);
  }

  const result = await sendAdminContractReminder({
    actorId: admin.id,
    contractId,
  });

  revalidatePath("/sozlesme");
  revalidatePath("/sozlesme/takip");
  revalidatePath(`/sozlesme/${contractId}`);
  revalidatePath("/sozlesmelerim");
  revalidatePath(`/sozlesmelerim/${contractId}`);

  redirect(`/sozlesme/${contractId}?durum=${encodeURIComponent(result.status)}`);
}
