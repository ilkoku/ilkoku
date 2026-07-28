import { cache } from "react";
import { getAuthorSubmissions, getEligibleWorks, getPublishers } from "./repository";
import type { PublisherDashboardData, PublisherItem, SubmissionItem, SubmissionWork } from "./types";

async function hydrateSubmissions(authorId: string, limit?: number): Promise<SubmissionItem[]> {
  const rows = await getAuthorSubmissions(authorId, limit);
  return rows.map((item) => ({
    coverLetter: item.coverLetter,
    id: item.id,
    publisher: item.publisher,
    publisherNote: item.publisherNote,
    status: item.status,
    submittedAt: item.submittedAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    work: item.work,
  }));
}

export const getPublishersWorkspace = cache(async (authorId: string): Promise<{
  publishers: PublisherItem[];
  submissions: SubmissionItem[];
  works: SubmissionWork[];
}> => {
  const [publishers, works, submissions] = await Promise.all([
    getPublishers(),
    getEligibleWorks(authorId),
    hydrateSubmissions(authorId),
  ]);

  return {
    publishers: publishers.map((item) => ({
      acceptsSubmissions: item.acceptsSubmissions,
      companyName: item.companyName,
      description: item.description,
      id: item.id,
      logoUrl: item.logoUrl,
      slug: item.slug,
      verified: item.verified,
      websiteUrl: item.websiteUrl,
    })),
    submissions,
    works,
  };
});

export const getPublisherDashboard = cache(async (authorId: string): Promise<PublisherDashboardData> => {
  const all = await hydrateSubmissions(authorId);
  return {
    accepted: all.filter((item) => item.status === "accepted").length,
    items: all.slice(0, 3),
    pending: all.filter((item) => item.status === "pending").length,
    reviewing: all.filter((item) => item.status === "reviewing").length,
  };
});
