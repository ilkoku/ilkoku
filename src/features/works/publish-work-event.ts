import "server-only";

import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";
import {
  encodePublicationVersionDescription,
  type PublicationLayoutSnapshot,
} from "./publication-layout";

export type WorkPublicationEvent = {
  isFirstPublication: boolean;
  previousPublicationAt: Date | null;
  publishedAt: Date;
};

export async function publishWorkWithEvent(
  authorId: string,
  workId: string,
  chapterId: string,
  publicationLayout: PublicationLayoutSnapshot,
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

    const chapter = await transaction.chapter.findFirst({
      where: {
        authorId,
        id: chapterId,
        workId,
      },
      select: {
        content: true,
        id: true,
        title: true,
        workId: true,
      },
    });

    if (!chapter) {
      throw new Error("Yayınlanacak bölüm bulunamadı.");
    }

    if (publicationLayout.contentLength !== chapter.content.length) {
      throw new Error(
        "Yayın sayfa düzeni mevcut bölüm metniyle eşleşmiyor. Sayfalar yeniden oluştuktan sonra tekrar yayınla.",
      );
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

    const latestVersion = await transaction.workVersion.findFirst({
      where: {
        workId,
      },
      orderBy: {
        versionNumber: "desc",
      },
      select: {
        versionNumber: true,
      },
    });

    const publicationVersion = await transaction.workVersion.create({
      data: {
        chapterId: chapter.id,
        content: chapter.content,
        contentHash: createHash("sha256")
          .update(chapter.content)
          .digest("hex"),
        description: encodePublicationVersionDescription(publicationLayout),
        title: chapter.title,
        versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
        workId,
      },
    });

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
          contentRating: work.contentRating,
          pageCount: publicationLayout.pageEnds.length,
          publicId: work.publicId,
          publicationVersion: publicationVersion.versionNumber,
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
      publicationVersion,
      work,
    };
  });
}
