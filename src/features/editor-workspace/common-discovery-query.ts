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
          readingProgress: true,
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
          publishedAt: {
            not: null,
          },
          status: "published",
        },
        select: {
          content: true,
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
    .map((work): EditorWorkTableData => ({
      assignedEditorId: work.assignedEditorId,
      authorName: work.author.displayName ?? work.author.fullName,
      authorUsername: work.author.username,
      chapterCount: work.chapters.length,
      commentCount: work._count.comments,
      contentRating: work.contentRating,
      coverUrl: work.coverUrl,
      editorReviewStatus: work.editorReviewStatus,
      favoriteCount: work._count.favorites,
      genre: work.genre,
      id: work.id,
      isFavorite: work.editorFavorites.length > 0,
      language: work.language,
      publishedAt: work.publishedAt,
      readerCount: work._count.readingProgress,
      slug: work.slug,
      title: work.title,
      totalWords: work.chapters.reduce(
        (total, chapter) => total + countWords(chapter.content),
        0,
      ),
    }))
    .filter((work) => matchesWordCount(work.totalWords, filters.wordCount));
}
