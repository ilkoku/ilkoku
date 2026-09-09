import { prisma } from "@/lib/prisma";

export function getPublishers() {
  return prisma.publisher.findMany({
    where: { active: true, verified: true, archivedAt: null },
    orderBy: { companyName: "asc" },
    select: {
      acceptsSubmissions: true,
      companyName: true,
      description: true,
      id: true,
      logoUrl: true,
      slug: true,
      verified: true,
      websiteUrl: true,
    },
  });
}

export function getAuthorSubmissions(authorId: string, limit?: number) {
  return prisma.publisherSubmission.findMany({
    where: { authorId, archivedAt: null },
    select: {
      contract: {
        select: {
          advanceAmount: true,
          notes: true,
          rightsPeriodMonths: true,
          royaltyPercentage: true,
          sentAt: true,
          status: true,
          territory: true,
          version: true,
        },
      },
      coverLetter: true,
      id: true,
      publicationPlan: {
        select: {
          coverStatus: true,
          isbn: true,
          layoutStatus: true,
          printRun: true,
          status: true,
          targetPublicationDate: true,
        },
      },
      publisher: {
        select: {
          companyName: true,
          id: true,
          logoUrl: true,
        },
      },
      publisherNote: true,
      status: true,
      submittedAt: true,
      updatedAt: true,
      work: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    ...(limit ? { take: limit } : {}),
  });
}

export function getEligibleWorks(authorId: string) {
  return prisma.work.findMany({
    where: { authorId, status: { not: "archived" } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, status: true, title: true },
  });
}
