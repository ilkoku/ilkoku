import { cache } from "react";
import { getAuthorFeedbackRows } from "../repository/feedback.repository";
import type {
  DashboardFeedbackItem,
  FeedbackCategory,
  FeedbackItem,
  FeedbackStatsData,
} from "../types";

type FeedbackRow = Awaited<
  ReturnType<typeof getAuthorFeedbackRows>
>[number];

function mapFeedbackItem(
  item: FeedbackRow,
): FeedbackItem {
  return {
    archivedAt: item.archivedAt?.toISOString() ?? null,
    category: item.category as FeedbackCategory,
    chapter: item.chapter
      ? {
          id: item.chapter.id,
          slug: `bolum-${item.chapter.position}`,
          title: item.chapter.title,
        }
      : null,
    content: item.content,
    createdAt: item.createdAt.toISOString(),
    editorId: item.editorId,
    editorName:
      item.editor.fullName || "İlkOku Editörü",
    id: item.id,
    isProfessionalReview:
      item.isProfessionalReview,
    priority: item.priority,
    readAt: item.readAt?.toISOString() ?? null,
    reviewStage: item.assignment?.stage ?? null,
    status: item.status,
    title: item.title,
    work: item.work,
  };
}

export const getAuthorFeedback = cache(
  async (
    authorId: string,
  ): Promise<FeedbackItem[]> => {
    const rows =
      await getAuthorFeedbackRows(authorId);

    return rows.map(mapFeedbackItem);
  },
);

export function getFeedbackStats(
  items: FeedbackItem[],
): FeedbackStatsData {
  return {
    archived: items.filter(
      (item) => item.status === "archived",
    ).length,
    important: items.filter(
      (item) =>
        item.priority === "important" &&
        item.status !== "archived",
    ).length,
    total: items.filter(
      (item) => item.status !== "archived",
    ).length,
    unread: items.filter(
      (item) => item.status === "unread",
    ).length,
  };
}

export const getDashboardFeedback = cache(
  async (authorId: string) => {
    const rows = await getAuthorFeedbackRows(
      authorId,
      {
        excludeArchived: true,
      },
    );

    const feedbackItems =
      rows.map(mapFeedbackItem);

    const normalItems = feedbackItems.filter(
      (item) => !item.isProfessionalReview,
    );

    const professionalByWork = new Map<
      string,
      FeedbackItem[]
    >();

    for (const item of feedbackItems) {
      if (!item.isProfessionalReview) continue;

      const reports =
        professionalByWork.get(item.work.id) ?? [];

      reports.push(item);
      professionalByWork.set(
        item.work.id,
        reports,
      );
    }

    const dashboardItems: DashboardFeedbackItem[] =
      normalItems.map((item) => ({
        createdAt: item.createdAt,
        editorName: item.editorName,
        id: item.id,
        isProfessionalGroup: false,
        status: item.status,
        title: item.title,
        work: item.work,
      }));

    for (const [workId, reports] of professionalByWork) {
      const newest = reports.reduce(
        (latest, report) =>
          report.createdAt > latest.createdAt
            ? report
            : latest,
      );

      dashboardItems.push({
        createdAt: newest.createdAt,
        editorName:
          "İlkOku Profesyonel İnceleme",
        id: `professional-${workId}`,
        isProfessionalGroup: true,
        status: reports.some(
          (report) => report.status === "unread",
        )
          ? "unread"
          : "read",
        title: reports.some(
          (report) =>
            report.reviewStage === "second",
        )
          ? "1. ve 2. editör raporu tamamlandı"
          : "1. editör raporu tamamlandı",
        work: newest.work,
      });
    }

    dashboardItems.sort((first, second) =>
      second.createdAt.localeCompare(
        first.createdAt,
      ),
    );

    return {
      items: dashboardItems.slice(0, 3),
      unreadCount: dashboardItems.filter(
        (item) => item.status === "unread",
      ).length,
    };
  },
);
