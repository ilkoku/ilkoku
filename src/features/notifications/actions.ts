"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const notificationReturnPaths = new Set([
  "/bildirimler",
  "/editor/bildirimler",
]);

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function toggleNotificationReadAction(
  formData: FormData,
): Promise<void> {
  const user = await getCurrentUser();
  const notificationId = text(formData, "notificationId");

  if (!user || !notificationId) {
    throw new Error("NOTIFICATION_PERMISSION_REQUIRED");
  }

  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId: user.id,
    },
    select: {
      readAt: true,
    },
  });

  if (!notification) {
    throw new Error("NOTIFICATION_NOT_FOUND");
  }

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: user.id,
      ...(notification.readAt
        ? { readAt: { not: null } }
        : { readAt: null }),
    },
    data: {
      readAt: notification.readAt ? null : new Date(),
    },
  });

  revalidatePath("/bildirimler");
  revalidatePath("/editor/bildirimler");

  const returnPath = text(formData, "returnPath");
  if (notificationReturnPaths.has(returnPath)) {
    revalidatePath(returnPath);
  }
}
