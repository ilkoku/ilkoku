"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  markPublisherSharedItemAndNotificationRead,
} from "./sharing-read-state";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function markPublisherSharedItemReadAction(
  formData: FormData,
): Promise<void> {
  const shareId = String(formData.get("shareId") ?? "").trim();

  if (!UUID_PATTERN.test(shareId)) {
    redirect("/yayinevi/paylasilanlar");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/giris?sonraki=/yayinevi/paylasilanlar");
  }

  await markPublisherSharedItemAndNotificationRead({
    shareId,
    userId: user.id,
  });

  revalidatePath("/yayinevi/paylasilanlar");
  revalidatePath("/yayinevi/bildirimler");
  redirect("/yayinevi/paylasilanlar");
}
