import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createFeedbackRepository } from "../repository/feedback.repository";
import type { FeedbackItem, FeedbackStatsData } from "../types";

function unique(values: (string | null)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

async function hydrateFeedback(repository: ReturnType<typeof createFeedbackRepository>, feedback: Awaited<ReturnType<ReturnType<typeof createFeedbackRepository>["getAuthorFeedback"]>>["data"]): Promise<FeedbackItem[]> {
  if (!feedback) return [];
  if (feedback.length === 0) return [];

  const [worksResult, chaptersResult, editorsResult] = await Promise.all([
    repository.getWorksByIds(unique(feedback.map((item) => item.work_id))),
    repository.getChaptersByIds(unique(feedback.map((item) => item.chapter_id))),
    repository.getEditorNames(unique(feedback.map((item) => item.editor_id))),
  ]);
  if (worksResult.error) throw worksResult.error;
  if (chaptersResult.error) throw chaptersResult.error;
  if (editorsResult.error) throw editorsResult.error;

  const works = new Map(worksResult.data.map((work) => [work.id, work]));
  const chapters = new Map(chaptersResult.data.map((chapter) => [chapter.id, chapter]));
  const editors = new Map(editorsResult.data.map((editor) => [editor.id, editor.full_name]));

  return feedback.flatMap((item) => {
    const work = works.get(item.work_id);
    if (!work) return [];
    const chapter = item.chapter_id ? chapters.get(item.chapter_id) ?? null : null;
    return [{
      archivedAt: item.archived_at,
      category: item.category,
      chapter: chapter ? { id: chapter.id, slug: chapter.slug, title: chapter.title } : null,
      content: item.content,
      createdAt: item.created_at,
      editorId: item.editor_id,
      editorName: editors.get(item.editor_id) || "İlkOku Editörü",
      id: item.id,
      priority: item.priority,
      readAt: item.read_at,
      status: item.status,
      title: item.title,
      work: { id: work.id, slug: work.slug, title: work.title },
    } satisfies FeedbackItem];
  });
}

export const getAuthorFeedback = cache(async (authorId: string): Promise<FeedbackItem[]> => {
  const client = await createClient();
  const repository = createFeedbackRepository(client);
  const { data: feedback, error } = await repository.getAuthorFeedback(authorId);
  if (error) throw error;
  return hydrateFeedback(repository, feedback);
});

export function getFeedbackStats(items: FeedbackItem[]): FeedbackStatsData {
  return {
    archived: items.filter((item) => item.status === "archived").length,
    important: items.filter((item) => item.priority === "important" && item.status !== "archived").length,
    total: items.filter((item) => item.status !== "archived").length,
    unread: items.filter((item) => item.status === "unread").length,
  };
}

export const getDashboardFeedback = cache(async (authorId: string) => {
  const client = await createClient();
  const repository = createFeedbackRepository(client);
  const [feedbackResult, countResult] = await Promise.all([
    repository.getAuthorFeedback(authorId, { excludeArchived: true, limit: 3 }),
    repository.getUnreadCount(authorId),
  ]);
  if (feedbackResult.error?.code === "PGRST205" || countResult.error?.code === "PGRST205") {
    return { items: [], unreadCount: 0 };
  }
  if (feedbackResult.error) throw feedbackResult.error;
  if (countResult.error) throw countResult.error;
  const items = await hydrateFeedback(repository, feedbackResult.data);
  return {
    items,
    unreadCount: countResult.count ?? 0,
  };
});
