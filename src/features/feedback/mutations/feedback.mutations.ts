import { insertEditorFeedback, updateAuthorFeedbackStatus } from "../repository/feedback.repository";
import type { CreateEditorFeedbackInput } from "../validators/feedback.validators";

export async function markFeedbackRead(authorId: string, feedbackId: string) {
  const result = await updateAuthorFeedbackStatus(authorId, feedbackId, "read");
  if (result.count === 0) throw new Error("FEEDBACK_NOT_FOUND");
  return result;
}

export async function archiveFeedback(authorId: string, feedbackId: string) {
  const result = await updateAuthorFeedbackStatus(authorId, feedbackId, "archived");
  if (result.count === 0) throw new Error("FEEDBACK_NOT_FOUND");
  return result;
}

export function createEditorFeedback(editorId: string, input: CreateEditorFeedbackInput) {
  return insertEditorFeedback({
    ...input,
    chapterId: input.chapterId || null,
    editorId,
  });
}
