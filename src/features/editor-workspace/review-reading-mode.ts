import "server-only";

import { prisma } from "@/lib/prisma";

export async function getActiveEditorReviewAssignment(input: {
  editorId: string;
  workId: string;
}) {
  const work = await prisma.work.findUnique({
    where: {
      id: input.workId,
    },
    select: {
      assignedEditorId: true,
      editorReviewStatus: true,
    },
  });

  if (!work) return null;

  if (
    work.assignedEditorId === input.editorId &&
    work.editorReviewStatus === "in_progress"
  ) {
    const assignment =
      await prisma.editorReviewAssignment.findFirst({
        where: {
          editorId: input.editorId,
          stage: "first",
          status: {
            in: ["assigned", "in_progress"],
          },
          workId: input.workId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
        },
      });

    return {
      id: assignment?.id ?? null,
      stage: "first" as const,
    };
  }

  if (work.editorReviewStatus === "second_in_progress") {
    const assignment =
      await prisma.editorReviewAssignment.findFirst({
        where: {
          editorId: input.editorId,
          stage: "second",
          status: {
            in: ["assigned", "in_progress"],
          },
          workId: input.workId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
        },
      });

    if (assignment) {
      return {
        id: assignment.id,
        stage: "second" as const,
      };
    }
  }

  return null;
}

export function getEditorReviewReturnPath(
  stage: "first" | "second",
) {
  return stage === "second"
    ? "/editor/incelemeler?asama=ikinci"
    : "/editor/incelemeler?asama=birinci";
}
