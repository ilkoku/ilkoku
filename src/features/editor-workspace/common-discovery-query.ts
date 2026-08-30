import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import {
  isMemberStoredWorkContentRating,
  type MemberStoredWorkContentRating,
} from "@/lib/work-content-classification";
import { getAdultContentAccess } from "@/lib/adult-content-access";
import { normalizeGenreLabel } from "@/lib/genre-system";
import { prisma } from "@/lib/prisma";
import { countWords } from "./eligibility";
import type {
  EditorWorkCardData,
  EditorWorkTableData,
} from "./types";

export type EditorDiscoveryFilters = {
  contentRating?: MemberStoredWorkContentRating;
  genre?: string;
  language?: string;
  reviewStatus?: string;
  search?: string;
  wordCount?: string;
};

function matchesWordCount(total: number, filter?: string) {
  if (filter === "short") return total < 30000;
  if (filter === "medium") return total >= 30000 && total <= 80000;
  if (filter === "long") return total > 80000;
  return true;
}

export async function getCommonEditorDiscovery(
  editorId: string,
  filters: EditorDiscoveryFilters = {},
): Promise<EditorWorkTableData[]> {
  const adultAccess = await getAdultContentAccess(editorId);
  const contentRating =
    filters.contentRating &&
    isMemberStoredWorkContentRating(filters.contentRating) &&
    (filters.contentRating !== "adult_18" || adultAccess.canAccessAdultContent)
      ? filters.contentRating
      : undefined;
  const genre = normalizeGenreLabel(filters.genre);

  const works = await prisma.work.findMany({
    where: {
      ...commonDiscoveryWorkWhereFor(adultAccess.canAccessAdultContent),
      ...(genre ? { genre } : {}),
      ...(filters.language ? { language: filters.language } : {}),
      ...(contentRating ? { contentRating } : {}),
      ...(filters.reviewStatus
        ? {
            editorReviewStatus:
              filters.reviewStatus as EditorWorkCardData["editorReviewStatus"],
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search } },
              { subtitle: { contains: filters.search } },
              {
                author: {
                  is: {
                    OR: [
                      { displayName: { contains: filters.search } },
                      { fullName: { contains: filters.search } },
                      { username: { contains: filters.search } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      _count: {
        select: {
          comments: {
            where: {
              deletedAt: null,
              status: "visible",
            },
          },
          favorites: true,
          ownershipStamps: true,
          readingProgress: true,
          versions: true,
        },
      },
      author: {
        select: {
          displayName: true,
          fullName: true,
          username: true,
        },
      },
      chapters: {
        where: {
          archivedAt: null,
        },
        select: {
          content: true,
          publishedAt: true,
          status: true,
        },
      },
      editorFavorites: {
        where: {
          editorId,
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return works
    .map((work): EditorWorkTableData => {
      const publishedChapters = work.chapters.filter(
        (chapter) =>
          chapter.status === "published" && chapter.publishedAt !== null,
      );
      const hasPendingChapter = work.chapters.some(
        (chapter) =>
          chapter.status !== "published" || chapter.publishedAt === null,
      );

      return {
        assignedEditorId: work.assignedEditorId,
        authorName: work.author.displayName ?? work.author.fullName,
        authorUsername: work.author.username,
        chapterCount: publishedChapters.length,
        commentCount: work._count.comments,
        completionStatus:
          publishedChapters.length > 0 && !hasPendingChapter
            ? "completed"
            : "ongoing",
        contentRating: work.contentRating,
        coverUrl: work.coverUrl,
        editorReviewStatus: work.editorReviewStatus,
        favoriteCount: work._count.favorites,
        genre: work.genre,
        hasPassport:
          work._count.ownershipStamps > 0 || work._count.versions > 0,
        id: work.id,
        isFavorite: work.editorFavorites.length > 0,
        language: work.language,
        publishedAt: work.publishedAt,
        readerCount: work._count.readingProgress,
        slug: work.slug,
        title: work.title,
        totalWords: publishedChapters.reduce(
          (total, chapter) => total + countWords(chapter.content),
          0,
        ),
        updatedAt: work.updatedAt,
        versionCount: work._count.versions,
      };
    })
    .filter((work) => matchesWordCount(work.totalWords, filters.wordCount));
}
