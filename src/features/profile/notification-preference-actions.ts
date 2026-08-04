"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notification-preferences";
import { prisma } from "@/lib/prisma";
import type { ProfileActionState } from "./state";

function checkbox(
  formData: FormData,
  name: keyof NotificationPreferences,
) {
  return formData.get(name) === "on";
}

export async function updateNotificationPreferencesAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/giris?sonraki=/hesabim");
  }

  const preferences: NotificationPreferences = {
    socialEmail: checkbox(formData, "socialEmail"),
    followedContentEmail: checkbox(formData, "followedContentEmail"),
    editorWorkflowEmail: checkbox(formData, "editorWorkflowEmail"),
    publisherWorkflowEmail: checkbox(formData, "publisherWorkflowEmail"),
    dailySummaryEmail: checkbox(formData, "dailySummaryEmail"),
    weeklySummaryEmail: checkbox(formData, "weeklySummaryEmail"),
    productUpdatesEmail: checkbox(formData, "productUpdatesEmail"),
  };

  try {
    await saveNotificationPreferences(
      user.id,
      preferences,
    );

    await prisma.auditLog.create({
      data: {
        action: "profile_updated",
        actorId: user.id,
        entityId: user.id,
        entityType: "NotificationPreference",
        metadata: JSON.stringify({
          preferences,
          securityEmail: true,
        }),
      },
    });
  } catch (error) {
    console.error(
      "NOTIFICATION_PREFERENCES_UPDATE_FAILED",
      {
        error:
          error instanceof Error
            ? error.message
            : "UNKNOWN_ERROR",
        userId: user.id,
      },
    );

    return {
      message:
        "Bildirim tercihleri kaydedilemedi. Lütfen tekrar deneyin.",
      status: "error",
    };
  }

  revalidatePath("/hesabim");

  return {
    message:
      "Bildirim tercihleriniz kaydedildi.",
    status: "success",
  };
}
