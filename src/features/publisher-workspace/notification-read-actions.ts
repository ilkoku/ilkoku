"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  markAllPublisherNotificationsAndSharesRead,
  markPublisherNotificationAndShareRead,
} from "./notification-read-state";

export async function markPublisherNotificationReadAction(
  formData: FormData,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role === "admin") {
    throw new Error("PUBLISHER_PERMISSION_REQUIRED");
  }

  const notificationId = String(
    formData.get("notificationId") ?? "",
  ).trim();
  if (!notificationId) {
    throw new Error("NOTIFICATION_REQUIRED");
  }

  await markPublisherNotificationAndShareRead({
    notificationId,
    userId: user.id,
  });

  revalidatePath("/yayinevi/bildirimler");
  revalidatePath("/yayinevi/paylasilanlar");
}

export async function markAllPublisherNotificationsReadAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role === "admin") {
    throw new Error("PUBLISHER_PERMISSION_REQUIRED");
  }

  await markAllPublisherNotificationsAndSharesRead(user.id);

  revalidatePath("/yayinevi/bildirimler");
  revalidatePath("/yayinevi/paylasilanlar");
}
