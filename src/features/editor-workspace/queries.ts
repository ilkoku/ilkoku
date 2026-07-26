import { prisma } from "@/lib/prisma";
import {
  completedPublishedWorkWhere,
  countWords,
} from "./eligibility";
import type { EditorWorkCardData } from "./types";

export type EditorDiscoveryFilters = {
  genre?: string;
  language?: string;
  reviewStatus?: string;
  wordCount?: string;
};

function mapWork(
  work: {
    assignedEditorId: string | null;
    author: { displayName: string | null; fullName: string };
    chapters: { content: string }[];
    coverUrl: string | null;
    editorFavorites: { id: string }[];
    editorReviewStatus: EditorWorkCardData["editorReviewStatus"];
    genre: string | null;
    id: string;
    language: string;
    slug: string;
    title: string;
  },
): EditorWorkCardData {
  return {
    assignedEditorId: work.assignedEditorId,
    authorName: work.author.displayName ?? work.author.fullName,
    chapterCount: work.chapters.length,
    coverUrl: work.coverUrl,
    editorReviewStatus: work.editorReviewStatus,
    genre: work.genre,
    id: work.id,
    isFavorite: work.editorFavorites.length > 0,
    language: work.language,
    slug: work.slug,
    title: work.title,
    totalWords: work.chapters.reduce(
      (total, chapter) => total + countWords(chapter.content),
      0,
    ),
  };
}

function matchesWordCount(total: number, filter?: string) {
  if (filter === "short") return total < 30000;
  if (filter === "medium") return total >= 30000 && total <= 80000;
  if (filter === "long") return total > 80000;
  return true;
}

export async function getEditorDiscovery(
  editorId: string,
  filters: EditorDiscoveryFilters = {},
) {
  const works = await prisma.work.findMany({
    where: {
      ...completedPublishedWorkWhere,
      ...(filters.genre ? { genre: filters.genre } : {}),
      ...(filters.language ? { language: filters.language } : {}),
      ...(filters.reviewStatus
        ? {
            editorReviewStatus:
              filters.reviewStatus as EditorWorkCardData["editorReviewStatus"],
          }
        : {}),
    },
    include: {
      author: {
        select: {
          displayName: true,
          fullName: true,
        },
      },
      chapters: {
        where: {
          archivedAt: null,
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
    .map(mapWork)
    .filter((work) => matchesWordCount(work.totalWords, filters.wordCount));
}

export async function getEditorFavorites(editorId: string) {
  const favorites = await prisma.editorFavorite.findMany({
    where: {
      editorId,
      work: completedPublishedWorkWhere,
    },
    include: {
      work: {
        include: {
          author: {
            select: {
              displayName: true,
              fullName: true,
            },
          },
          chapters: {
            where: {
              archivedAt: null,
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
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return favorites.map(({ work }) => mapWork(work));
}

export async function getEditorReviews(editorId: string) {
  return prisma.work.findMany({
    where: {
      assignedEditorId: editorId,
      editorReviewStatus: {
        in: ["in_progress", "completed"],
      },
    },
    include: {
      author: {
        select: {
          displayName: true,
          fullName: true,
        },
      },
      chapters: {
        where: {
          archivedAt: null,
          status: "published",
        },
        orderBy: {
          position: "asc",
        },
        select: {
          content: true,
          position: true,
          title: true,
        },
      },
      editorFeedback: {
        where: {
          editorId,
          isProfessionalReview: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
  });
}

export async function getEditorRecommendations(editorId: string) {
  const recommendations = await prisma.editorRecommendation.findMany({
    where: {
      recipientEditorId: editorId,
    },
    include: {
      senderEditor: {
        select: {
          displayName: true,
          fullName: true,
        },
      },
      work: {
        include: {
          author: {
            select: {
              displayName: true,
              fullName: true,
            },
          },
          chapters: {
            where: {
              archivedAt: null,
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
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return recommendations.map((recommendation) => ({
    ...recommendation,
    work: mapWork(recommendation.work),
  }));
}

export async function getEditorNotifications(editorId: string) {
  return prisma.notification.findMany({
    where: {
      userId: editorId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });
}

export async function searchRegisteredEditors(
  currentEditorId: string,
  query: string,
) {
  const normalized = query.trim().toLowerCase();

  if (normalized.length < 2) return [];

  return prisma.user.findMany({
    where: {
      id: {
        not: currentEditorId,
      },
      role: "editor",
      status: "active",
      OR: [
        {
          email: {
            contains: normalized,
          },
        },
        {
          fullName: {
            contains: query.trim(),
          },
        },
        {
          displayName: {
            contains: query.trim(),
          },
        },
      ],
    },
    select: {
      displayName: true,
      email: true,
      fullName: true,
      id: true,
    },
    orderBy: {
      fullName: "asc",
    },
    take: 8,
  });
}
