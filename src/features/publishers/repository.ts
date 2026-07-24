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

export async function insertSubmission(input: {
  authorId: string;
  coverLetter: string;
  publisherId: string;
  workId: string;
}) {
  const [publisher, work, existing] = await Promise.all([
    prisma.publisher.findFirst({
      where: {
        id: input.publisherId,
        active: true,
        verified: true,
        acceptsSubmissions: true,
        archivedAt: null,
      },
      select: { id: true },
    }),
    prisma.work.findFirst({
      where: { id: input.workId, authorId: input.authorId, status: { not: "archived" } },
      select: { id: true },
    }),
    prisma.publisherSubmission.findFirst({
      where: {
        authorId: input.authorId,
        publisherId: input.publisherId,
        workId: input.workId,
        archivedAt: null,
        status: { not: "withdrawn" },
      },
      select: { id: true },
    }),
  ]);

  if (!publisher) throw new Error("PUBLISHER_NOT_AVAILABLE");
  if (!work) throw new Error("WORK_NOT_FOUND");
  if (existing) throw new Error("SUBMISSION_EXISTS");

  return prisma.publisherSubmission.create({
    data: input,
  });
}

export function withdrawAuthorSubmission(authorId: string, id: string) {
  return prisma.publisherSubmission.updateMany({
    where: { id, authorId, archivedAt: null, status: { in: ["pending", "reviewing"] } },
    data: { status: "withdrawn", archivedAt: new Date() },
  });
}
