import { prisma } from "@/lib/prisma";

export function getPublishers() {
  return prisma.publisher.findMany({
    where: { active: true, verified: true, archivedAt: null },
    orderBy: { companyName: "asc" },
  });
}

export function getAuthorSubmissions(authorId: string, limit?: number) {
  return prisma.publisherSubmission.findMany({
    where: { authorId, archivedAt: null },
    include: {
      publisher: { select: { companyName: true, id: true, logoUrl: true } },
      work: { select: { id: true, title: true } },
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
