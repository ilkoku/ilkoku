import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createPublishersRepository } from "./repository";
import type { PublisherDashboardData, PublisherItem, SubmissionItem, SubmissionWork } from "./types";

async function hydrateSubmissions(authorId: string, limit?: number): Promise<SubmissionItem[]> {
  const client = await createClient();
  const repository = createPublishersRepository(client);
  const { data, error } = await repository.getAuthorSubmissions(authorId, limit);
  const submissionRows = data ?? [];
  if (error) {
    if (error.code === "PGRST205") return [];
    throw error;
  }
  const publisherIds = [...new Set(submissionRows.map((item) => item.publisher_id))];
  const workIds = [...new Set(submissionRows.map((item) => item.work_id))];
  const [{ data: publishers = [], error: publisherError }, { data: works = [], error: workError }] = await Promise.all([
    repository.getPublishersByIds(publisherIds), repository.getWorksByIds(authorId, workIds),
  ]);
  if (publisherError) throw publisherError;
  if (workError) throw workError;
  const publisherRows = publishers ?? [];
  const workRows = works ?? [];
  const publisherMap = new Map(publisherRows.map((item) => [item.id, item]));
  const workMap = new Map(workRows.map((item) => [item.id, item]));
  return submissionRows.map((item) => ({
    coverLetter: item.cover_letter,
    id: item.id,
    publisher: { companyName: publisherMap.get(item.publisher_id)?.company_name ?? "Yayınevi", id: item.publisher_id, logoUrl: publisherMap.get(item.publisher_id)?.logo_url ?? null },
    publisherNote: item.publisher_note,
    status: item.status,
    submittedAt: item.submitted_at,
    updatedAt: item.updated_at,
    work: { id: item.work_id, title: workMap.get(item.work_id)?.title ?? "Eser" },
  }));
}

export const getPublishersWorkspace = cache(async (authorId: string): Promise<{ publishers: PublisherItem[]; submissions: SubmissionItem[]; works: SubmissionWork[] }> => {
  const client = await createClient();
  const repository = createPublishersRepository(client);
  const [{ data: publishers = [], error: publisherError }, { data: works = [], error: workError }, submissions] = await Promise.all([
    repository.getPublishers(), repository.getEligibleWorks(authorId), hydrateSubmissions(authorId),
  ]);
  if (publisherError && publisherError.code !== "PGRST205") throw publisherError;
  if (workError) throw workError;
  return {
    publishers: (publishers ?? []).map((item) => ({ acceptsSubmissions: item.accepts_submissions, companyName: item.company_name, description: item.description, id: item.id, logoUrl: item.logo_url, slug: item.slug, verified: item.verified, websiteUrl: item.website_url })),
    submissions,
    works: works ?? [],
  };
});

export const getPublisherDashboard = cache(async (authorId: string): Promise<PublisherDashboardData> => {
  const items = await hydrateSubmissions(authorId, 3);
  const all = await hydrateSubmissions(authorId);
  return { accepted: all.filter((x) => x.status === "accepted").length, items, pending: all.filter((x) => x.status === "pending").length, reviewing: all.filter((x) => x.status === "reviewing").length };
});
