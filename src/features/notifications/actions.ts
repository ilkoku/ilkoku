"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { resolveNotificationTargets } from "./targets";

const notificationReturnPaths = new Set([
  "/bildirimler",
  "/editor/bildirimler",
]);

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidateNotificationPaths(returnPath: string) {
  revalidatePath("/bildirimler");
  revalidatePath("/editor/bildirimler");

  if (notificationReturnPaths.has(returnPath)) {
    revalidatePath(returnPath);
  }
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

  revalidateNotificationPaths(text(formData, "returnPath"));
}

export async function openNotificationTargetAction(
  formData: FormData,
): Promise<void> {
  const user = await getCurrentUser();
  const notificationId = text(formData, "notificationId");
  const returnPath = text(formData, "returnPath");

  if (!user || !notificationId) {
    throw new Error("NOTIFICATION_PERMISSION_REQUIRED");
  }

  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId: user.id,
    },
    select: {
      id: true,
      readAt: true,
      relatedEntityId: true,
      relatedEntityType: true,
      type: true,
    },
  });

  if (!notification) {
    throw new Error("NOTIFICATION_NOT_FOUND");
  }

  const targets = await resolveNotificationTargets({
    notifications: [
      {
        id: notification.id,
        relatedEntityId: notification.relatedEntityId,
        relatedEntityType: notification.relatedEntityType,
        type: notification.type,
      },
    ],
    scope: user.role === "editor" ? "editor" : "default",
    userId: user.id,
  });
  const target = targets.get(notification.id);

  if (!target) {
    throw new Error("NOTIFICATION_TARGET_NOT_FOUND");
  }

  if (!notification.readAt) {
    await prisma.notification.updateMany({
      where: {
        id: notification.id,
        readAt: null,
        userId: user.id,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  revalidateNotificationPaths(returnPath);
  redirect(target);
}
