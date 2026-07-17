import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, FeedbackStatus } from "@/types/database";

type Client = SupabaseClient<Database>;

const feedbackColumns = "id, work_id, chapter_id, editor_id, author_id, title, content, category, status, priority, created_at, updated_at, read_at, archived_at";

export function createFeedbackRepository(client: Client) {
  return {
    getAuthorFeedback(authorId: string, options?: { excludeArchived?: boolean; limit?: number }) {
      let query = client
        .from("editor_feedback")
        .select(feedbackColumns)
        .eq("author_id", authorId)
        .order("created_at", { ascending: false });
      if (options?.excludeArchived) query = query.neq("status", "archived");
      if (options?.limit) query = query.limit(options.limit);
      return query;
    },

    getUnreadCount(authorId: string) {
      return client.from("editor_feedback").select("id", { count: "exact", head: true }).eq("author_id", authorId).eq("status", "unread");
    },

    getChaptersByIds(chapterIds: string[]) {
      if (chapterIds.length === 0) return Promise.resolve({ data: [], error: null });
      return client.from("chapters").select("id, work_id, title, slug").in("id", chapterIds);
    },

    getEditorNames(editorIds: string[]) {
      if (editorIds.length === 0) return Promise.resolve({ data: [], error: null });
      return client.rpc("get_feedback_editor_names", { editor_ids: editorIds });
    },

    getWorksByIds(workIds: string[]) {
      if (workIds.length === 0) return Promise.resolve({ data: [], error: null });
      return client.from("works").select("id, title, slug").in("id", workIds);
    },

    updateAuthorStatus(authorId: string, feedbackId: string, status: FeedbackStatus) {
      const now = new Date().toISOString();
      return client
        .from("editor_feedback")
        .update(status === "read" ? { read_at: now, status } : { archived_at: now, status })
        .eq("id", feedbackId)
        .eq("author_id", authorId)
        .select("id, status, read_at, archived_at")
        .single();
    },

    createEditorFeedback(input: {
      category: string;
      chapterId: string | null;
      content: string;
      priority: string;
      title: string;
      workId: string;
    }) {
      return client.rpc("create_editor_feedback", {
        feedback_category: input.category,
        feedback_content: input.content,
        feedback_priority: input.priority,
        feedback_title: input.title,
        target_chapter: input.chapterId,
        target_work: input.workId,
      });
    },
  };
}
