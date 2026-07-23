import { cache } from "react";
import { worksRepository } from "./repository";
import type {
  PublicChapterDetail,
  PublicWorkDetail,
  WorkWithChapterSummary,
} from "./types";

function countWords(content: string) {
  return content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
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
}) {
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

export const getAuthorWorks = cache(
  async (authorId: string): Promise<WorkWithChapterSummary[]> => {
    const works = await worksRepository.getAuthorWorks(authorId);

    return works.map((work) => {
      const chapters = work.chapters ?? [];

      const latest =
        chapters.length === 0
          ? null
          : [...chapters].sort(
              (a, b) =>
                b.updatedAt.getTime() -
                a.updatedAt.getTime(),
            )[0];

      return {
        ...work,
        chapterCount: chapters.length,
        latestChapter: latest
          ? mapChapterSummary(latest)
          : null,
        totalWords: chapters.reduce(
          (sum, chapter) =>
            sum + countWords(chapter.content),
          0,
        ),
      };
    });
  },
);

export const getAuthorWorkspaceWorks = cache(
  async (
    authorId: string,
  ): Promise<WorkWithChapterSummary[]> => {
    const works =
      await worksRepository.getAuthorWorks(
        authorId,
        true,
      );

    return works.map((work) => {
      const chapters = work.chapters ?? [];

      const latest =
        chapters.length === 0
          ? null
          : [...chapters].sort(
              (a, b) =>
                b.updatedAt.getTime() -
                a.updatedAt.getTime(),
            )[0];

      return {
        ...work,
        chapterCount: chapters.length,
        latestChapter: latest
          ? mapChapterSummary(latest)
          : null,
        totalWords: chapters.reduce(
          (sum, chapter) =>
            sum + countWords(chapter.content),
          0,
        ),
      };
    });
  },
);

export async function getContinueWritingWork(
  authorId: string,
  workId?: string,
  chapterId?: string,
) {
  const works = await getAuthorWorks(authorId);

  const selected =
    (workId
      ? works.find((w) => w.id === workId)
      : works[0]) ??
    works[0] ??
    null;

  if (!selected) {
    return null;
  }

  if (
    !chapterId ||
    selected.latestChapter?.id === chapterId
  ) {
    return selected;
  }

  const chapter =
    await worksRepository.getAuthorChapterById(
      authorId,
      selected.id,
      chapterId,
    );

  if (!chapter) {
    return selected;
  }

  return {
    ...selected,
    latestChapter: mapChapterSummary(chapter),
  } satisfies WorkWithChapterSummary;
}

export const getPublicWorkBySlug = cache(
  async (
    slug: string,
  ): Promise<PublicWorkDetail | null> => {
    const work =
      await worksRepository.getPublicWork(slug);

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
      await getPublicWorkBySlug(workSlug);

    if (!work) {
      return null;
    }

    const position = Number(chapterNumber);

    if (Number.isNaN(position)) {
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