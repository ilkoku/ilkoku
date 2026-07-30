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

  return prisma.$transaction(async (transaction) => {
    const submission = await transaction.publisherSubmission.create({ data: input });
    const recipients = await transaction.publisherMembership.findMany({
      where: { active: true, publisherId: input.publisherId },
      select: { userId: true },
    });
    if (recipients.length) {
      await transaction.notification.createMany({
        data: recipients.map(({ userId }) => ({
          message: "Yeni bir eser başvurusu yayınevi çalışma alanınıza ulaştı.",
          relatedEntityId: submission.id,
          relatedEntityType: "publisher_submission",
          title: "Yeni eser başvurusu",
          type: "system" as const,
          userId,
        })),
      });
    }
    return submission;
  });
}

export async function withdrawAuthorSubmission(authorId: string, id: string) {
  const submission = await prisma.publisherSubmission.findFirst({
    where: { id, authorId, archivedAt: null, status: { in: ["pending", "reviewing"] } },
    select: { id: true, publisherId: true, work: { select: { title: true } } },
  });
  if (!submission) return { count: 0 };
  return prisma.$transaction(async (transaction) => {
    const result = await transaction.publisherSubmission.updateMany({
      where: { id: submission.id, authorId, archivedAt: null, status: { in: ["pending", "reviewing"] } },
      data: { status: "withdrawn", archivedAt: new Date() },
    });
    if (!result.count) return result;
    const recipients = await transaction.publisherMembership.findMany({
      where: { active: true, publisherId: submission.publisherId },
      select: { userId: true },
    });
    if (recipients.length) await transaction.notification.createMany({
      data: recipients.map(({ userId }) => ({
        message: `${submission.work.title} başvurusu yazar tarafından geri çekildi.`,
        relatedEntityId: submission.id,
        relatedEntityType: "publisher_submission",
        title: "Başvuru güncellendi",
        type: "system" as const,
        userId,
      })),
    });
    return result;
  });
}
