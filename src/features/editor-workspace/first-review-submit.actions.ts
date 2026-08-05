"use server";

import { completeProfessionalReviewAction } from "./editor-workflow.actions";
import type { EditorActionState } from "./types";

function setCompletionIntent(
  formData: FormData,
  intent: "complete" | "second",
) {
  formData.set("intent", intent);
  return formData;
}

export async function completeFirstEditorReviewAction(
  state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  return completeProfessionalReviewAction(
    state,
    setCompletionIntent(formData, "complete"),
  );
}

export async function sendFirstEditorReviewToSecondAction(
  state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  return completeProfessionalReviewAction(
    state,
    setCompletionIntent(formData, "second"),
  );
}
