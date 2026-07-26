import type { EditorReviewStatus } from "@/generated/prisma/enums";

export function EditorReviewBadge({
  status,
}: {
  status: EditorReviewStatus;
}) {
  if (status !== "in_progress" && status !== "completed") return null;

  return (
    <span className="editor-review-badge" data-status={status}>
      <span aria-hidden="true">✦</span>
      {status === "in_progress"
        ? "Profesyonel Editör İncelemesinde"
        : "Profesyonel Editör Tarafından İncelendi"}
    </span>
  );
}
