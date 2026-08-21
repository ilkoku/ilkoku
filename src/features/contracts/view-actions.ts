"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { markUserContractViewed } from "./repository";

export async function markContractViewedAction(contractId: string) {
  const user = await getCurrentUser();
  const normalizedContractId = String(contractId ?? "").trim().slice(0, 36);

  if (!user || !normalizedContractId) {
    return { status: "forbidden" as const };
  }

  const result = await markUserContractViewed({
    contractId: normalizedContractId,
    recipientUserId: user.id,
  });

  if (result.status === "viewed") {
    revalidatePath("/sozlesmelerim");
    revalidatePath(`/sozlesmelerim/${normalizedContractId}`);
    revalidatePath("/sozlesme");
    revalidatePath("/sozlesme/takip");
  }

  return result;
}
