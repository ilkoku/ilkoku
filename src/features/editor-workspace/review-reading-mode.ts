import "server-only";

import { prisma } from "@/lib/prisma";

export async function getActiveEditorReviewAssignment(input: {
  editorId: string;
  workId: string;
}) {
  return prisma.editorReviewAssignment.findFirst({
    where: {
      editorId: input.editorId,
      workId: input.workId,
      OR: [
        {
          stage: "first",
          status: "in_progress",
          work: {
            assignedEditorId: input.editorId,
            editorReviewStatus: "in_progress",
          },
        },
        {
          stage: "second",
          status: {
            in: ["assigned", "in_progress"],
          },
          work: {
            assignedEditorId: {
              not: input.editorId,
            },
            editorReviewStatus: "second_in_progress",
          },
        },
      ],
    },
    select: {
      id: true,
      stage: true,
    },
  });
}

export function getEditorReviewReturnPath(
  stage: "first" | "second",
) {
  return stage === "second"
    ? "/editor/incelemeler?asama=ikinci"
    : "/editor/incelemeler?asama=birinci";
}
