"use server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { completeFirstEditorReviewStateAction } from "./first-editor-review-state.actions";
import type { EditorActionState } from "./types";

function setCompletionIntent(
  formData: FormData,
  intent: "complete" | "second",
) {
  formData.set("intent", intent);
  return formData;
}

async function writeFirstReviewAuditSafely(input: {
  intent: "complete" | "second";
  workId: string;
}) {
  const editor = await getCurrentUser();
  if (!editor) return;

  try {
    await prisma.auditLog.create({
      data: {
        action: "work_status_changed",
        actorId: editor.id,
        entityId: input.workId,
        entityType: "Work",
        metadata: JSON.stringify({
          newStatus:
            input.intent === "second"
              ? "awaiting_second_editor"
              : "completed",
          oldStatus: "in_progress",
          source:
            input.intent === "second"
              ? "editor_first_review_completed_for_second"
              : "editor_first_review_completed",
        }),
      },
    });
  } catch (error) {
    console.error("EDITOR_AUDIT_LOG_FAILED", {
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      source: "first_review_submit",
      workId: input.workId,
    });
  }
}

async function completeFirstReview(
  state: EditorActionState,
  formData: FormData,
  intent: "complete" | "second",
): Promise<EditorActionState> {
  const workId = String(formData.get("workId") ?? "").trim();
  const result = await completeFirstEditorReviewStateAction(
    state,
    setCompletionIntent(formData, intent),
  );

  if (result.status === "success" && workId) {
    await writeFirstReviewAuditSafely({ intent, workId });
  }

  return result;
}

export async function completeFirstEditorReviewAction(
  state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  return completeFirstReview(state, formData, "complete");
}

export async function sendFirstEditorReviewToSecondAction(
  state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  return completeFirstReview(state, formData, "second");
}