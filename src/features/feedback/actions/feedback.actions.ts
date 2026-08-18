"use server";

import { refresh, revalidatePath } from "next/cache";
import { feedbackContent } from "@/content";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  archiveFeedback,
  markFeedbackRead,
  updateFeedbackGroupStatus,
} from "../mutations/feedback.mutations";
import type {
  FeedbackActionState,
} from "../types";
import {
  feedbackGroupSchema,
  feedbackIdSchema,
} from "../validators/feedback.validators";

async function authenticatedUser(
  requiredRole: "writer" | "editor",
) {
  const user = await getCurrentUser();

  if (!user || user.role !== requiredRole) {
    return null;
  }

  return user;
}

function result(
  status: FeedbackActionState["status"],
  message: string,
): FeedbackActionState {
  return {
    message,
    status,
  };
}

function revalidateFeedback() {
  revalidatePath("/geri-bildirimler");
  revalidatePath("/yazar");
  refresh();
}

export async function markFeedbackReadAction(
  feedbackId: string,
): Promise<FeedbackActionState> {
  const parsed =
    feedbackIdSchema.safeParse(feedbackId);

  if (!parsed.success) {
    return result(
      "error",
      feedbackContent.errors.invalid,
    );
  }

  const user = await authenticatedUser("writer");

  if (!user) {
    return result(
      "error",
      feedbackContent.errors.auth,
    );
  }

  try {
    await markFeedbackRead(
      user.id,
      parsed.data,
    );

    revalidateFeedback();

    return result(
      "success",
      feedbackContent.success.read,
    );
  } catch {
    return result(
      "error",
      feedbackContent.errors.update,
    );
  }
}

export async function archiveFeedbackAction(
  feedbackId: string,
): Promise<FeedbackActionState> {
  const parsed =
    feedbackIdSchema.safeParse(feedbackId);

  if (!parsed.success) {
    return result(
      "error",
      feedbackContent.errors.invalid,
    );
  }

  const user = await authenticatedUser("writer");

  if (!user) {
    return result(
      "error",
      feedbackContent.errors.auth,
    );
  }

  try {
    await archiveFeedback(
      user.id,
      parsed.data,
    );

    revalidateFeedback();

    return result(
      "success",
      feedbackContent.success.archived,
    );
  } catch {
    return result(
      "error",
      feedbackContent.errors.update,
    );
  }
}

async function updateFeedbackGroupAction(
  workId: string,
  feedbackIds: string[],
  status: "read" | "archived",
): Promise<FeedbackActionState> {
  const parsed = feedbackGroupSchema.safeParse({
    feedbackIds,
    workId,
  });

  if (!parsed.success) {
    return result(
      "error",
      parsed.error.issues[0]?.message ??
        feedbackContent.errors.invalid,
    );
  }

  const user = await authenticatedUser("writer");

  if (!user) {
    return result(
      "error",
      feedbackContent.errors.auth,
    );
  }

  try {
    await updateFeedbackGroupStatus(
      user.id,
      parsed.data.workId,
      parsed.data.feedbackIds,
      status,
    );

    revalidateFeedback();

    return result(
      "success",
      status === "read"
        ? "Profesyonel inceleme dosyası okundu olarak işaretlendi."
        : "Profesyonel inceleme dosyası arşivlendi.",
    );
  } catch {
    return result(
      "error",
      feedbackContent.errors.update,
    );
  }
}

export async function markFeedbackGroupReadAction(
  workId: string,
  feedbackIds: string[],
): Promise<FeedbackActionState> {
  return updateFeedbackGroupAction(
    workId,
    feedbackIds,
    "read",
  );
}

export async function archiveFeedbackGroupAction(
  workId: string,
  feedbackIds: string[],
): Promise<FeedbackActionState> {
  return updateFeedbackGroupAction(
    workId,
    feedbackIds,
    "archived",
  );
}
