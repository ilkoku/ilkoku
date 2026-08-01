import { prisma } from "@/lib/prisma";
import type { FeedbackStatus } from "../types";

export function getAuthorFeedbackRows(
  authorId: string,
  options?: { excludeArchived?: boolean; limit?: number },
) {
  return prisma.editorFeedback.findMany({
    where: {
      authorId,
      reportStatus: "completed",
      OR: [
        {
          isProfessionalReview: false,
        },
        {
          isProfessionalReview: true,
          work: {
            editorReviewStatus: "completed",
          },
        },
      ],
      ...(options?.excludeArchived
        ? {
            status: {
              not: "archived",
            },
          }
        : {}),
    },
    include: {
      assignment: {
        select: {
          stage: true,
        },
      },
      chapter: {
        select: {
          id: true,
          position: true,
          title: true,
        },
      },
      editor: {
        select: {
          fullName: true,
        },
      },
      work: {
        select: {
          id: true,
          slug: true,
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    ...(options?.limit ? { take: options.limit } : {}),
  });
}

export function getUnreadFeedbackCount(authorId: string) {
  return prisma.editorFeedback.count({
    where: {
      authorId,
      reportStatus: "completed",
      status: "unread",
      OR: [
        {
          isProfessionalReview: false,
        },
        {
          isProfessionalReview: true,
          work: {
            editorReviewStatus: "completed",
          },
        },
      ],
    },
  });
}

export function updateAuthorFeedbackStatus(
  authorId: string,
  feedbackId: string,
  status: Exclude<FeedbackStatus, "unread">,
) {
  const now = new Date();

  return prisma.editorFeedback.updateMany({
    where: {
      id: feedbackId,
      authorId,
      reportStatus: "completed",
      OR: [
        {
          isProfessionalReview: false,
        },
        {
          isProfessionalReview: true,
          work: {
            editorReviewStatus: "completed",
          },
        },
      ],
    },
    data:
      status === "read"
        ? { readAt: now, status }
        : { archivedAt: now, status },
  });
}
