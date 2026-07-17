import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createPublishersRepository } from "./repository";

export async function createSubmission(client: SupabaseClient<Database>, input: { coverLetter: string; publisherId: string; workId: string }) {
  const { data, error } = await createPublishersRepository(client).createSubmission(input);
  if (error) throw error;
  return data;
}

export async function withdrawSubmission(client: SupabaseClient<Database>, id: string) {
  const { error } = await createPublishersRepository(client).withdrawSubmission(id);
  if (error) throw error;
}
