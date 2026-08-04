import {
  getEditorReviews,
  type EditorReviewListStatus,
} from "./queries";

export type EditorReviewStage =
  | "all"
  | "first"
  | "second";

export async function getEditorReviewsByStage(
  editorId: string,
  status: EditorReviewListStatus,
  stage: EditorReviewStage,
) {
  const works = await getEditorReviews(
    editorId,
    status,
  );

  if (stage === "all") {
    return works;
  }

  return works.filter((work) => {
    if (stage === "first") {
      return work.assignedEditorId === editorId;
    }

    return work.editorReviewAssignments.some(
      (assignment) =>
        assignment.stage === "second",
    );
  });
}
