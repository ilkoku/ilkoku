import { cache } from "react";
import { getAuthorSubmissions, getEligibleWorks, getPublishers } from "./repository";
import type { PublisherDashboardData, PublisherItem, SubmissionItem, SubmissionWork } from "./types";

async function hydrateSubmissions(authorId: string, limit?: number): Promise<SubmissionItem[]> {
  const rows = await getAuthorSubmissions(authorId, limit);
  return rows.map((item) => ({
    contract:
      item.contract && item.contract.status !== "draft"
        ? {
            advanceAmount: item.contract.advanceAmount?.toString() ?? null,
            notes: item.contract.notes,
            rightsPeriodMonths: item.contract.rightsPeriodMonths,
            royaltyPercentage: item.contract.royaltyPercentage.toString(),
            sentAt: item.contract.sentAt?.toISOString() ?? null,
            status: item.contract.status,
            territory: item.contract.territory,
            version: item.contract.version,
          }
        : null,
    coverLetter: item.coverLetter,
    id: item.id,
    publicationPlan: item.publicationPlan
      ? {
          coverStatus: item.publicationPlan.coverStatus,
          isbn: item.publicationPlan.isbn,
          layoutStatus: item.publicationPlan.layoutStatus,
          notes: item.publicationPlan.notes,
          printRun: item.publicationPlan.printRun,
          status: item.publicationPlan.status,
          targetPublicationDate:
            item.publicationPlan.targetPublicationDate?.toISOString() ?? null,
        }
      : null,
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
