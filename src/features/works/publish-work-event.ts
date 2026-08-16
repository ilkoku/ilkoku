import "server-only";

import { prisma } from "@/lib/prisma";

export type WorkPublicationEvent = {
  isFirstPublication: boolean;
  previousPublicationAt: Date | null;
  publishedAt: Date;
};

export async function publishWorkWithEvent(
  authorId: string,
  workId: string,
) {
  return prisma.$transaction(async (transaction) => {
    const locked = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM Work
      WHERE id = ${workId}
        AND authorId = ${authorId}
      LIMIT 1
      FOR UPDATE
    `;

    if (!locked[0]) {
      throw new Error("Yayınlanacak eser bulunamadı.");
    }

    const previousPublications = await transaction.auditLog.findMany({
      where: {
        action: "work_published",
        entityId: workId,
        entityType: "Work",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
      },
      take: 1,
    });

    const previousPublicationAt =
      previousPublications[0]?.createdAt ?? null;
    const publishedAt = new Date();

    const work = await transaction.work.update({
      where: {
        id: workId,
      },
      data: {
        archivedAt: null,
        publishedAt,
        status: "published",
        visibility: "public",
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "work_published",
        actorId: authorId,
        entityId: work.id,
        entityType: "Work",
        metadata: JSON.stringify({
          publicId: work.publicId,
          publishedAt: publishedAt.toISOString(),
          title: work.title,
        }),
      },
    });

    return {
      publicationEvent: {
        isFirstPublication:
          previousPublicationAt === null,
        previousPublicationAt,
        publishedAt,
      } satisfies WorkPublicationEvent,
      work,
    };
  });
}
