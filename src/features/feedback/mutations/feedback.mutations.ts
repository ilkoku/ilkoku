import { prisma } from "@/lib/prisma";
import {
  updateAuthorFeedbackStatus,
} from "../repository/feedback.repository";

const readableProfessionalReviewStatuses = [
  "awaiting_second_editor",
  "second_in_progress",
  "completed",
] as const;

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

  if (
    uniqueIds.length < 1 ||
    uniqueIds.length > 2
  ) {
    throw new Error(
      "INVALID_PROFESSIONAL_REVIEW_GROUP",
    );
  }

  return prisma.$transaction(
    async (transaction) => {
      const reports =
        await transaction.editorFeedback.findMany({
          where: {
            assignmentId: {
              not: null,
            },
            authorId,
            isProfessionalReview: true,
            reportStatus: "completed",
            workId,
            work: {
              editorReviewStatus: {
                in: [...readableProfessionalReviewStatuses],
              },
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
            work: {
              select: {
                editorReviewStatus: true,
              },
            },
          },
        });

      if (
        reports.length < 1 ||
        reports.length > 2 ||
        reports.length !== uniqueIds.length ||
        reports.some(
          (report) => !uniqueIds.includes(report.id),
        )
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
        stages.has("first") &&
        (
          reports.length === 1 ||
          stages.has("second")
        );

      if (!assignmentsAreValid) {
        throw new Error(
          "INVALID_PROFESSIONAL_REVIEW_ASSIGNMENTS",
        );
      }

      const reviewStatus =
        reports[0]?.work.editorReviewStatus;

      const lifecycleIsValid =
        reports.length === 1
          ? reviewStatus === "awaiting_second_editor" ||
            reviewStatus === "second_in_progress" ||
            reviewStatus === "completed"
          : reviewStatus === "completed";

      if (!lifecycleIsValid) {
        throw new Error(
          "INVALID_PROFESSIONAL_REVIEW_LIFECYCLE",
        );
      }

      const now = new Date();
      const allowedStatuses =
        reports.length === 1
          ? [...readableProfessionalReviewStatuses]
          : ["completed" as const];

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
              editorReviewStatus: {
                in: allowedStatuses,
              },
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

      if (updated.count !== uniqueIds.length) {
        throw new Error(
          "PROFESSIONAL_REVIEW_GROUP_CHANGED",
        );
      }

      return updated;
    },
  );
}
