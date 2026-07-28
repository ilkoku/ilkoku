import type { EditorReviewStatus } from "@/generated/prisma/enums";

export function EditorReviewBadge({
  status,
}: {
  status: EditorReviewStatus;
}) {
  const labels: Partial<Record<EditorReviewStatus, string>> = {
    in_progress: "Profesyonel Editör İncelemesinde",
    awaiting_second_editor: "İkinci Editör Bekleniyor",
    second_in_progress: "İkinci Editör İncelemesinde",
    completed: "Profesyonel Editörler Tarafından İncelendi",
  };
  const label = labels[status];

  if (!label) return null;

  return (
    <span className="editor-review-badge" data-status={status}>
      <span aria-hidden="true">✦</span>
      {label}
    </span>
  );
}
