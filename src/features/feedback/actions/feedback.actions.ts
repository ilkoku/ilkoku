"use server";

import { revalidatePath } from "next/cache";
import { feedbackContent } from "@/content";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";
import { archiveFeedback, createEditorFeedback, markFeedbackRead } from "../mutations/feedback.mutations";
import type { FeedbackActionState } from "../types";
import { createEditorFeedbackSchema, feedbackIdSchema } from "../validators/feedback.validators";

async function authenticatedClient(requiredRole: UserRole) {
  const user = await getCurrentUser();
  if (!user || user.role !== requiredRole) return null;

  const client = await createClient();
  return { client, userId: user.id };
}

function result(status: FeedbackActionState["status"], message: string): FeedbackActionState {
  return { message, status };
}

function revalidateFeedback() {
  revalidatePath("/geri-bildirimler");
  revalidatePath("/yazar");
}

export async function markFeedbackReadAction(feedbackId: string): Promise<FeedbackActionState> {
  const parsed = feedbackIdSchema.safeParse(feedbackId);
  if (!parsed.success) return result("error", feedbackContent.errors.invalid);
  const auth = await authenticatedClient("writer");
  if (!auth) return result("error", feedbackContent.errors.auth);
  try {
    await markFeedbackRead(auth.client, auth.userId, parsed.data);
    revalidateFeedback();
    return result("success", feedbackContent.success.read);
  } catch {
    return result("error", feedbackContent.errors.update);
  }
}

export async function archiveFeedbackAction(feedbackId: string): Promise<FeedbackActionState> {
  const parsed = feedbackIdSchema.safeParse(feedbackId);
  if (!parsed.success) return result("error", feedbackContent.errors.invalid);
  const auth = await authenticatedClient("writer");
  if (!auth) return result("error", feedbackContent.errors.auth);
  try {
    await archiveFeedback(auth.client, auth.userId, parsed.data);
    revalidateFeedback();
    return result("success", feedbackContent.success.archived);
  } catch {
    return result("error", feedbackContent.errors.update);
  }
}

export async function createEditorFeedbackAction(
  _state: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  const parsed = createEditorFeedbackSchema.safeParse({
    category: formData.get("category"),
    chapterId: formData.get("chapterId") || null,
    content: formData.get("content"),
    priority: formData.get("priority"),
    title: formData.get("title"),
    workId: formData.get("workId"),
  });
  if (!parsed.success) return result("error", parsed.error.issues[0]?.message ?? feedbackContent.errors.invalid);
  const auth = await authenticatedClient("editor");
  if (!auth) return result("error", feedbackContent.errors.permission);
  try {
    await createEditorFeedback(auth.client, parsed.data);
    revalidateFeedback();
    return result("success", feedbackContent.success.created);
  } catch {
    return result("error", feedbackContent.errors.create);
  }
}
