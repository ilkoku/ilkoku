import { cache } from "react";

import { worksRepository } from "./repository";
import type {
  ChapterSummary,
  PublicChapterDetail,
  PublicWorkDetail,
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

      const chapterCount =
        await worksRepository.getPublishedChapterCount(
          work.id,
        );

      return {
        ...work,
        authorName:
          work.author.displayName ??
          work.author.fullName,
        chapterCount,
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

    const position =
      Number(chapterNumber);

    if (
      Number.isNaN(position)
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

    return {
      ...chapter,
      work,
    };
  },
);