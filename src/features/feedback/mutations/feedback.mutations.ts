import { prisma } from "@/lib/prisma";
import {
  updateAuthorFeedbackStatus,
} from "../repository/feedback.repository";
export async function markFeedbackRead(
  authorId: string,
  feedbackId: string,
) {
  const result =
    await updateAuthorFeedbackStatus(
      authorId,
      feedbackId,
      "read",
    );

  if (result.count === 0) {
    throw new Error("FEEDBACK_NOT_FOUND");
  }

  return result;
}

export async function archiveFeedback(
  authorId: string,
  feedbackId: string,
) {
  const result =
    await updateAuthorFeedbackStatus(
      authorId,
      feedbackId,
      "archived",
    );

  if (result.count === 0) {
    throw new Error("FEEDBACK_NOT_FOUND");
  }

  return result;
}

export async function updateFeedbackGroupStatus(
  authorId: string,
  workId: string,
  feedbackIds: string[],
  status: "read" | "archived",
) {
  const uniqueIds = [...new Set(feedbackIds)];

  if (uniqueIds.length !== 2) {
    throw new Error(
      "INVALID_PROFESSIONAL_REVIEW_GROUP",
    );
  }

  return prisma.$transaction(
    async (transaction) => {
      const reports =
        await transaction.editorFeedback.findMany({
          where: {
            id: {
              in: uniqueIds,
            },
            assignmentId: {
              not: null,
            },
            authorId,
            isProfessionalReview: true,
            reportStatus: "completed",
            workId,
            work: {
              editorReviewStatus: "completed",
            },
          },
          select: {
            id: true,
            assignment: {
              select: {
                stage: true,
                status: true,
                workId: true,
              },
            },
          },
        });

      if (
        reports.length < 1 ||
        reports.length > 2
      ) {
        throw new Error(
          "PROFESSIONAL_REVIEW_GROUP_NOT_FOUND",
        );
      }

      const stages = new Set(
        reports.map(
          (report) => report.assignment?.stage,
        ),
      );

      const assignmentsAreValid =
        reports.every(
          (report) =>
            report.assignment?.status ===
              "completed" &&
            report.assignment.workId === workId &&
            (
              report.assignment.stage === "first" ||
              report.assignment.stage === "second"
            ),
        ) &&
        stages.size === reports.length &&
        stages.has("first");

      if (!assignmentsAreValid) {
        throw new Error(
          "INVALID_PROFESSIONAL_REVIEW_ASSIGNMENTS",
        );
      }

      const now = new Date();

      const updated =
        await transaction.editorFeedback.updateMany({
          where: {
            id: {
              in: uniqueIds,
            },
            assignmentId: {
              not: null,
            },
            authorId,
            isProfessionalReview: true,
            reportStatus: "completed",
            workId,
            work: {
              editorReviewStatus: "completed",
            },
          },
          data:
            status === "read"
              ? {
                  readAt: now,
                  status,
                }
              : {
                  archivedAt: now,
                  status,
                },
        });

      if (updated.count !== 2) {
        throw new Error(
          "PROFESSIONAL_REVIEW_GROUP_CHANGED",
        );
      }

      return updated;
    },
  );
}
