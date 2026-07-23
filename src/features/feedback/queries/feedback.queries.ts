import { cache } from "react";
import { getAuthorFeedbackRows, getUnreadFeedbackCount } from "../repository/feedback.repository";
import type { FeedbackCategory, FeedbackItem, FeedbackStatsData } from "../types";

export const getAuthorFeedback = cache(
  async (authorId: string): Promise<FeedbackItem[]> => {
    const rows = await getAuthorFeedbackRows(authorId);

    return rows.map((item) => ({
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
      editorName: item.editor.fullName || "İlkOku Editörü",
      id: item.id,
      priority: item.priority,
      readAt: item.readAt?.toISOString() ?? null,
      status: item.status,
      title: item.title,
      work: item.work,
    }));
  },
);

export function getFeedbackStats(items: FeedbackItem[]): FeedbackStatsData {
  return {
    archived: items.filter((item) => item.status === "archived").length,
    important: items.filter(
      (item) => item.priority === "important" && item.status !== "archived",
    ).length,
    total: items.filter((item) => item.status !== "archived").length,
    unread: items.filter((item) => item.status === "unread").length,
  };
}

export const getDashboardFeedback = cache(async (authorId?: string) => {
  if (!authorId) return { items: [], unreadCount: 0 };

  const [rows, unreadCount] = await Promise.all([
    getAuthorFeedbackRows(authorId, { excludeArchived: true, limit: 3 }),
    getUnreadFeedbackCount(authorId),
  ]);

  const items: FeedbackItem[] = rows.map((item) => ({
    archivedAt: item.archivedAt?.toISOString() ?? null,
    category: item.category as FeedbackCategory,
    chapter: item.chapter
      ? { id: item.chapter.id, slug: `bolum-${item.chapter.position}`, title: item.chapter.title }
      : null,
    content: item.content,
    createdAt: item.createdAt.toISOString(),
    editorId: item.editorId,
    editorName: item.editor.fullName || "İlkOku Editörü",
    id: item.id,
    priority: item.priority,
    readAt: item.readAt?.toISOString() ?? null,
    status: item.status,
    title: item.title,
    work: item.work,
  }));

  return { items, unreadCount };
});
