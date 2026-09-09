import "server-only";

import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";
import {
  BOOK_PUBLICATION_VERSION,
  specialBookPageSubtitle,
  type BookPublicationLayoutSubmission,
  type PublishedBookItem,
  type PublishedBookSnapshot,
} from "./book-publication";
import {
  bookSectionDetails,
  isSpecialBookSectionKind,
} from "./book-structure";
import {
  encodePublicationVersionDescription,
  parsePublicationLayout,
  type PublicationLayoutSnapshot,
} from "./publication-layout";
import type { WorkPublicationEvent } from "./publish-work-event";
import type { ChapterDraftInput } from "./validators";

type StructureRow = {
  id: string;
  chapterId: string | null;
  chapterPosition: number | null;
  kind: string;
  title: string | null;
  content: string | null;
  position: number;
};

function hasMeaningfulText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .length > 0;
}

export async function publishFullBookWithEvent(
  authorId: string,
  input: ChapterDraftInput,
  activePublicationLayout: PublicationLayoutSnapshot,
  bookLayouts: BookPublicationLayoutSubmission,
) {
  return prisma.$transaction(async (transaction) => {
    const locked = await transaction.$queryRaw<Array<{
      contentRating: "unrated" | "all_ages" | "teen_13" | "young_adult_16" | "adult_18";
      contentRatingConfirmedAt: Date | null;
      id: string;
      publicId: string;
      title: string;
    }>>`
      SELECT id, publicId, title, contentRating, contentRatingConfirmedAt
      FROM Work
      WHERE id = ${input.workId}
        AND authorId = ${authorId}
      LIMIT 1
      FOR UPDATE
    `;

    const lockedWork = locked[0];
    if (!lockedWork) {
      throw new Error("Yayınlanacak eser bulunamadı.");
    }

    if (
      lockedWork.contentRating === "unrated" ||
      !lockedWork.contentRatingConfirmedAt
    ) {
      throw new Error(
        "Eseri yayınlamadan önce içerik ve yaş sınıfını doğrulamalısın.",
      );
    }

    const structureRows = await transaction.$queryRaw<StructureRow[]>`
      SELECT
        structureItem.id,
        structureItem.chapterId,
        chapter.position AS chapterPosition,
        structureItem.kind,
        CASE
          WHEN structureItem.chapterId IS NULL THEN structureItem.title
          ELSE chapter.title
        END AS title,
        CASE
          WHEN structureItem.chapterId IS NULL THEN structureItem.content
          ELSE chapter.content
        END AS content,
        structureItem.position
      FROM BookStructureItem AS structureItem
      LEFT JOIN Chapter AS chapter
        ON chapter.id = structureItem.chapterId
      WHERE structureItem.workId = ${input.workId}
        AND structureItem.authorId = ${authorId}
        AND (
          structureItem.chapterId IS NULL
          OR (
            chapter.authorId = ${authorId}
            AND chapter.workId = ${input.workId}
            AND chapter.archivedAt IS NULL
          )
        )
      ORDER BY structureItem.position ASC
      FOR UPDATE
    `;

    if (structureRows.length === 0) {
      throw new Error("Yayınlanacak kitap yapısı bulunamadı.");
    }

    if (!structureRows.some((row) => row.chapterId === input.chapterId)) {
      throw new Error("Yayınlanacak bölüm kitap yapısında bulunamadı.");
    }

    if (activePublicationLayout.contentLength !== input.content.length) {
      throw new Error(
        "Yayın sayfa düzeni mevcut bölüm metniyle eşleşmiyor. Sayfalar yeniden oluştuktan sonra tekrar yayınla.",
      );
    }

    const layoutByItemId = new Map(
      bookLayouts.items.map((item) => [item.id, item.layout] as const),
    );

    if (
      layoutByItemId.size !== structureRows.length ||
      structureRows.some((row) => !layoutByItemId.has(row.id))
    ) {
      throw new Error(
        "Kitabın yayın sayfaları kitap sırasıyla eşleşmiyor. Sayfaları yeniden hazırlayıp tekrar yayınla.",
      );
    }

    const publishedItems: PublishedBookItem[] = [];

    for (const row of structureRows) {
      const isActiveChapter = row.chapterId === input.chapterId;
      const content = isActiveChapter ? input.content : (row.content ?? "");
      const title = (isActiveChapter ? input.title : row.title)?.trim() ||
        (row.chapterId ? `Bölüm ${row.chapterPosition ?? row.position}` : "Kitap Sayfası");
      const submittedLayout = layoutByItemId.get(row.id);
      const layout = isActiveChapter
        ? activePublicationLayout
        : parsePublicationLayout(JSON.stringify(submittedLayout), content);

      if (!layout) {
        throw new Error(
          `${title} için yazarın fiziksel sayfa düzeni doğrulanamadı.`,
        );
      }

      if (row.chapterId) {
        if (!row.chapterPosition || !hasMeaningfulText(content)) {
          throw new Error(
            `${title} boş olduğu için tam eser yayını tamamlanamadı.`,
          );
        }

        publishedItems.push({
          type: "chapter",
          structureItemId: row.id,
          position: row.position,
          chapterId: row.chapterId,
          chapterPosition: row.chapterPosition,
          title,
          subtitle: bookSectionDetails.chapter.description,
          content,
          layout,
        });
        continue;
      }

      if (!isSpecialBookSectionKind(row.kind)) {
        throw new Error("Kitap yapısında tanınmayan bir ek sayfa bulundu.");
      }

      publishedItems.push({
        type: "special",
        structureItemId: row.id,
        position: row.position,
        kind: row.kind,
        title,
        subtitle: specialBookPageSubtitle(row.kind),
        content,
        layout,
      });
    }

    const totalPages = publishedItems.reduce(
      (total, item) => total + item.layout.pageEnds.length,
      0,
    );
    const bookPublication = {
      version: BOOK_PUBLICATION_VERSION,
      workTitle: lockedWork.title,
      totalPages,
      items: publishedItems,
    } satisfies PublishedBookSnapshot;

    const previousPublications = await transaction.auditLog.findMany({
      where: {
        action: "work_published",
        entityId: input.workId,
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

    const previousPublicationAt = previousPublications[0]?.createdAt ?? null;
    const publishedAt = new Date();
    const latestVersion = await transaction.workVersion.findFirst({
      where: {
        workId: input.workId,
      },
      orderBy: {
        versionNumber: "desc",
      },
      select: {
        versionNumber: true,
      },
    });

    let nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;
    let activePublicationVersion: Awaited<
      ReturnType<typeof transaction.workVersion.create>
    > | null = null;

    for (const item of publishedItems) {
      if (item.type !== "chapter") continue;

      const publicationVersion = await transaction.workVersion.create({
        data: {
          chapterId: item.chapterId,
          content: item.content,
          contentHash: createHash("sha256")
            .update(item.content)
            .digest("hex"),
          description: encodePublicationVersionDescription(item.layout),
          title: item.title,
          versionNumber: nextVersionNumber,
          workId: input.workId,
        },
      });
      nextVersionNumber += 1;

      if (item.chapterId === input.chapterId) {
        activePublicationVersion = publicationVersion;
      }

      await transaction.chapter.update({
        where: {
          id: item.chapterId,
        },
        data: {
          archivedAt: null,
          content: item.content,
          publishedAt,
          status: "published",
          title: item.title,
        },
      });
    }

    if (!activePublicationVersion) {
      throw new Error("Aktif bölümün yayın sürümü oluşturulamadı.");
    }

    const work = await transaction.work.update({
      where: {
        id: input.workId,
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
          bookPublication,
          chapterId: input.chapterId,
          contentRating: work.contentRating,
          pageCount: bookPublication.totalPages,
          publicId: work.publicId,
          publicationVersion: activePublicationVersion.versionNumber,
          publishedAt: publishedAt.toISOString(),
          publishedChapterCount: publishedItems.filter(
            (item) => item.type === "chapter",
          ).length,
          title: work.title,
        }),
      },
    });

    return {
      bookPublication,
      publicationEvent: {
        isFirstPublication: previousPublicationAt === null,
        previousPublicationAt,
        publishedAt,
      } satisfies WorkPublicationEvent,
      publicationVersion: activePublicationVersion,
      work,
    };
  });
}
