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
  chapterId: string,
) {
  return prisma.$transaction(async (transaction) => {
    const locked = await transaction.$queryRaw<Array<{
      contentRating: "unrated" | "all_ages" | "teen_13" | "young_adult_16" | "adult_18";
      contentRatingConfirmedAt: Date | null;
      id: string;
    }>>`
      SELECT id, contentRating, contentRatingConfirmedAt
      FROM Work
      WHERE id = ${workId}
        AND authorId = ${authorId}
      LIMIT 1
      FOR UPDATE
    `;

    if (!locked[0]) {
      throw new Error("Yayınlanacak eser bulunamadı.");
    }

    if (
      locked[0].contentRating === "unrated" ||
      !locked[0].contentRatingConfirmedAt
    ) {
      throw new Error(
        "Eseri yayınlamadan önce içerik ve yaş sınıfını doğrulamalısın.",
      );
    }

    if (locked[0].contentRating === "adult_18") {
      throw new Error(
        "18+ eserlerin herkese açık yayını, doğrulanmış yaş erişimi etkinleşene kadar kullanılamaz. Eseri taslak olarak saklayabilirsin.",
      );
    }

    const chapter = await transaction.chapter.findFirst({
      where: {
        authorId,
        id: chapterId,
        workId,
      },
      select: {
        id: true,
      },
    });

    if (!chapter) {
      throw new Error("Yayınlanacak bölüm bulunamadı.");
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

    await transaction.chapter.update({
      where: {
        id: chapter.id,
      },
      data: {
        archivedAt: null,
        publishedAt,
        status: "published",
      },
    });

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
          chapterId,
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
