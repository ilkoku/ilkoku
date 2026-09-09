import { cache } from "react";

import {
  getLatestPublicationSnapshot,
  getLatestPublicationSnapshots,
  getLatestPublishedBookSnapshot,
} from "./publication-snapshots";
import { worksRepository } from "./repository";
import type {
  ChapterSummary,
  PublicChapterDetail,
  PublicWorkDetail,
  PublicWorkSummary,
  WorkWithChapterSummary,
} from "./types";

function countWords(content: string) {
  const normalized = content.trim();

  return normalized
    ? normalized.split(/\s+/u).length
    : 0;
}

function chapterSlug(position: number) {
  return `bolum-${position}`;
}

function mapChapterSummary(chapter: {
  id: string;
  title: string;
  content: string;
  position: number;
  status: "draft" | "published" | "archived";
  updatedAt: Date;
}): ChapterSummary {
  return {
    id: chapter.id,
    title: chapter.title,
    content: chapter.content,
    position: chapter.position,
    slug: chapterSlug(chapter.position),
    status: chapter.status,
    updatedAt: chapter.updatedAt.toISOString(),
    wordCount: countWords(chapter.content),
  };
}

function mapAuthorWork(
  work: Awaited<
    ReturnType<
      typeof worksRepository.getAuthorWorks
    >
  >[number],
): WorkWithChapterSummary {
  const chapters = (work.chapters ?? [])
    .map(mapChapterSummary)
    .sort(
      (left, right) =>
        left.position - right.position,
    );

  const latestChapter =
    chapters.length === 0
      ? null
      : [...chapters].sort(
          (left, right) =>
            new Date(
              right.updatedAt,
            ).getTime() -
            new Date(
              left.updatedAt,
            ).getTime(),
        )[0];

  return {
    ...work,
    chapters,
    chapterCount: chapters.length,
    latestChapter,
    totalWords: chapters.reduce(
      (sum, chapter) =>
        sum + chapter.wordCount,
      0,
    ),
  };
}

export const getAuthorWorks = cache(
  async (
    authorId: string,
  ): Promise<
    WorkWithChapterSummary[]
  > => {
    const works =
      await worksRepository.getAuthorWorks(
        authorId,
      );

    return works.map(mapAuthorWork);
  },
);

export const getAuthorWorkspaceWorks =
  cache(
    async (
      authorId: string,
    ): Promise<
      WorkWithChapterSummary[]
    > => {
      const works =
        await worksRepository.getAuthorWorks(
          authorId,
          true,
        );

      return works.map(mapAuthorWork);
    },
  );

export async function getContinueWritingWork(
  authorId: string,
  workId?: string,
  chapterId?: string,
): Promise<WorkWithChapterSummary | null> {
  const works =
    await getAuthorWorks(authorId);

  const selected =
    (workId
      ? works.find(
          (work) =>
            work.id === workId,
        )
      : works[0]) ??
    works[0] ??
    null;

  if (!selected) {
    return null;
  }

  if (!chapterId) {
    return selected;
  }

  const requestedChapter =
    selected.chapters.find(
      (chapter) =>
        chapter.id === chapterId,
    );

  if (!requestedChapter) {
    return selected;
  }

  return {
    ...selected,
    latestChapter: requestedChapter,
  };
}

export const getPublicWorkBySlug =
  cache(
    async (
      slug: string,
    ): Promise<PublicWorkDetail | null> => {
      const work =
        await worksRepository.getPublicWork(
          slug,
        );

      if (!work) {
        return null;
      }

      const [relatedWorks, publicationBook, snapshots] = await Promise.all([
        worksRepository.getRelatedPublicWorks(
          work.authorId,
          work.id,
          work.genre,
        ),
        getLatestPublishedBookSnapshot(work.id),
        getLatestPublicationSnapshots(
          work.chapters.map((chapter) => chapter.id),
        ),
      ]);
      const bookChapterSnapshots = new Map(
        (publicationBook?.items ?? [])
          .filter((item) => item.type === "chapter")
          .map((item) => [item.chapterId, item] as const),
      );

      const publishedChapters = work.chapters.map((chapter) => {
        const bookChapter = bookChapterSnapshots.get(chapter.id);
        if (bookChapter) {
          return {
            ...chapter,
            content: bookChapter.content,
            title: bookChapter.title,
          };
        }

        const snapshot = snapshots.get(chapter.id);
        return snapshot
          ? {
              ...chapter,
              content: snapshot.content,
              title: snapshot.title,
            }
          : chapter;
      });

      function mapRelatedWork(
        related: (typeof relatedWorks.sameAuthor)[number],
      ): PublicWorkSummary {
        return {
          authorName:
            related.author.displayName ??
            related.author.fullName,
          chapterCount: related._count.chapters,
          editorReviewStatus: related.editorReviewStatus,
          genre: related.genre,
          id: related.id,
          slug: related.slug,
          title: related.title,
        };
      }

      return {
        ...work,
        chapters: publishedChapters,
        authorName:
          work.author.displayName ??
          work.author.fullName,
        authorPublicId: work.author.publicId,
        chapterCount: publishedChapters.length,
        isCompleted:
          publishedChapters.length > 0 &&
          work._count.chapters === publishedChapters.length,
        publicationBook,
        sameAuthorWorks:
          relatedWorks.sameAuthor.map(mapRelatedWork),
        similarWorks:
          relatedWorks.similar.map(mapRelatedWork),
      };
    },
  );

export const getPublicChapter = cache(
  async (
    workSlug: string,
    chapterNumber: string,
  ): Promise<PublicChapterDetail | null> => {
    const work =
      await getPublicWorkBySlug(
        workSlug,
      );

    if (!work) {
      return null;
    }

    const normalizedChapterNumber = chapterNumber.replace(/^bolum-/u, "");
    const position = Number(normalizedChapterNumber);

    if (
      !Number.isInteger(position) ||
      position < 1
    ) {
      return null;
    }

    const chapter =
      await worksRepository.getPublicChapter(
        work.id,
        position,
      );

    if (!chapter) {
      return null;
    }

    const publication = await getLatestPublicationSnapshot(chapter.id);
    const bookChapter = work.publicationBook?.items.find(
      (item) => item.type === "chapter" && item.chapterId === chapter.id,
    );

    return {
      ...chapter,
      content: bookChapter?.content ?? publication?.content ?? chapter.content,
      publicationLayout: bookChapter?.layout ?? publication?.layout ?? null,
      publicationVersion: publication?.versionNumber ?? null,
      title: bookChapter?.title ?? publication?.title ?? chapter.title,
      work,
    };
  },
);
