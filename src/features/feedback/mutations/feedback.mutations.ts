import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createFeedbackRepository } from "../repository/feedback.repository";
import type { CreateEditorFeedbackInput } from "../validators/feedback.validators";

export async function markFeedbackRead(client: SupabaseClient<Database>, authorId: string, feedbackId: string) {
  const { data, error } = await createFeedbackRepository(client).updateAuthorStatus(authorId, feedbackId, "read");
  if (error) throw error;
  return data;
}

export async function archiveFeedback(client: SupabaseClient<Database>, authorId: string, feedbackId: string) {
  const { data, error } = await createFeedbackRepository(client).updateAuthorStatus(authorId, feedbackId, "archived");
  if (error) throw error;
  return data;
}

export async function createEditorFeedback(client: SupabaseClient<Database>, input: CreateEditorFeedbackInput) {
  const { data, error } = await createFeedbackRepository(client).createEditorFeedback({
    ...input,
    chapterId: input.chapterId || null,
  });
  if (error) throw error;
  return data;
}
