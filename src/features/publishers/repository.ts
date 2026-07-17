import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export function createPublishersRepository(client: Client) {
  return {
    getPublishers() {
      return client.from("publishers").select("id, company_name, slug, description, website_url, logo_url, verified, accepts_submissions").eq("active", true).eq("verified", true).is("archived_at", null).order("company_name");
    },
    getAuthorSubmissions(authorId: string, limit?: number) {
      let query = client.from("publisher_submissions").select("id, publisher_id, work_id, cover_letter, publisher_note, status, submitted_at, updated_at").eq("author_id", authorId).is("archived_at", null).order("updated_at", { ascending: false });
      if (limit) query = query.limit(limit);
      return query;
    },
    getPublishersByIds(ids: string[]) {
      if (!ids.length) return Promise.resolve({ data: [], error: null });
      return client.from("publishers").select("id, company_name, logo_url").in("id", ids);
    },
    getWorksByIds(authorId: string, ids: string[]) {
      if (!ids.length) return Promise.resolve({ data: [], error: null });
      return client.from("works").select("id, title").eq("author_id", authorId).in("id", ids);
    },
    getEligibleWorks(authorId: string) {
      return client.from("works").select("id, title, status").eq("author_id", authorId).neq("status", "archived").order("updated_at", { ascending: false });
    },
    createSubmission(input: { coverLetter: string; publisherId: string; workId: string }) {
      return client.rpc("create_publisher_submission", { submission_cover_letter: input.coverLetter, target_publisher: input.publisherId, target_work: input.workId });
    },
    withdrawSubmission(id: string) {
      return client.rpc("withdraw_publisher_submission", { target_submission: id });
    },
  };
}
