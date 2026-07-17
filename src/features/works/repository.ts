import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { WorkInsert, WorkUpdate } from "./types";

type Client = SupabaseClient<Database>;
type ChapterInsert = Database["public"]["Tables"]["chapters"]["Insert"];
type ChapterUpdate = Database["public"]["Tables"]["chapters"]["Update"];

export function createWorksRepository(client: Client) {
  return {
    async archiveWork(authorId: string, workId: string) {
      return client
        .from("works")
        .update({
          is_public: false,
          is_publisher_visible: false,
          status: "archived",
        })
        .eq("id", workId)
        .eq("author_id", authorId)
        .select()
        .single();
    },

    async createChapter(input: ChapterInsert) {
      return client.from("chapters").insert(input).select().single();
    },

    async createWork(input: WorkInsert) {
      return client.from("works").insert(input).select().single();
    },

    async findAuthorWorkBySlug(authorId: string, slug: string) {
      return client
        .from("works")
        .select("id")
        .eq("author_id", authorId)
        .eq("slug", slug)
        .maybeSingle();
    },

    async getAuthorWorks(authorId: string, includeArchived = false) {
      let query = client
        .from("works")
        .select("*")
        .eq("author_id", authorId);
      if (!includeArchived) query = query.neq("status", "archived");
      return query.order("updated_at", { ascending: false });
    },

    async getChaptersForWorks(authorId: string, workIds: string[]) {
      if (workIds.length === 0) return { data: [], error: null };
      return client
        .from("chapters")
        .select("id, work_id, title, slug, position, status, word_count, content, updated_at")
        .eq("author_id", authorId)
        .in("work_id", workIds)
        .neq("status", "archived")
        .order("position", { ascending: true });
    },

    async getAuthorChapterById(authorId: string, workId: string, chapterId: string) {
      return client
        .from("chapters")
        .select("id, work_id, title, slug, position, status, word_count, content, updated_at")
        .eq("id", chapterId)
        .eq("work_id", workId)
        .eq("author_id", authorId)
        .neq("status", "archived")
        .maybeSingle();
    },

    async getPublicChapter(workId: string, chapterSlug: string) {
      return client
        .from("chapters")
        .select("*")
        .eq("work_id", workId)
        .eq("slug", chapterSlug)
        .eq("status", "published")
        .not("published_at", "is", null)
        .maybeSingle();
    },

    async getPublicWork(slug: string) {
      return client
        .from("works")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .eq("is_public", true)
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    },

    async getPublishedChapterCount(workId: string) {
      return client
        .from("chapters")
        .select("id", { count: "exact", head: true })
        .eq("work_id", workId)
        .eq("status", "published");
    },

    async getLatestChapterPosition(authorId: string, workId: string) {
      return client
        .from("chapters")
        .select("position")
        .eq("author_id", authorId)
        .eq("work_id", workId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
    },

    async publishChapter(authorId: string, chapterId: string) {
      return client
        .from("chapters")
        .update({ published_at: new Date().toISOString(), status: "published" })
        .eq("id", chapterId)
        .eq("author_id", authorId)
        .select()
        .single();
    },

    async publishWork(authorId: string, workId: string) {
      return client
        .from("works")
        .update({
          is_public: true,
          published_at: new Date().toISOString(),
          status: "published",
        })
        .eq("id", workId)
        .eq("author_id", authorId)
        .select()
        .single();
    },

    async restoreWork(authorId: string, workId: string) {
      return client
        .from("works")
        .update({ status: "draft" })
        .eq("id", workId)
        .eq("author_id", authorId)
        .eq("status", "archived")
        .select()
        .single();
    },

    async updateChapter(authorId: string, chapterId: string, input: ChapterUpdate) {
      return client
        .from("chapters")
        .update(input)
        .eq("id", chapterId)
        .eq("author_id", authorId)
        .select()
        .single();
    },

    async updateWork(authorId: string, workId: string, input: WorkUpdate) {
      return client
        .from("works")
        .update(input)
        .eq("id", workId)
        .eq("author_id", authorId)
        .select()
        .single();
    },
  };
}
