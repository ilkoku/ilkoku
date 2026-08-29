import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  completedPublishedWorkWhere,
  countWords,
} from "./eligibility";
import type {
  EditorWorkCardData,
  EditorWorkTableData,
} from "./types";

export type EditorDiscoveryFilters = {
  genre?: string;
  language?: string;
  reviewStatus?: string;
  wordCount?: string;
};

function mapWork(
  work: {
    assignedEditorId: string | null;
    author: {
      displayName: string | null;
      fullName: string;
    };
    chapters: { content: string }[];
    contentRating: EditorWorkCardData["contentRating"];
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
    contentRating: work.contentRating,
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

function mapDiscoveryWork(
  work: {
    assignedEditorId: string | null;
    author: {
      displayName: string | null;
      fullName: string;
      username: string | null;
    };
    chapters: { content: string }[];
    contentRating: EditorWorkCardData["contentRating"];
    coverUrl: string | null;
    editorFavorites: { id: string }[];
    editorReviewStatus: EditorWorkCardData["editorReviewStatus"];
    genre: string | null;
    id: string;
    language: string;
    publishedAt: Date | null;
    slug: string;
    title: string;
    _count: {
      comments: number;
      favorites: number;
      readingProgress: number;
    };
  },
): EditorWorkTableData {
  const base = mapWork(work);

  return {
    ...base,
    authorUsername: work.author.username,
    commentCount: work._count.comments,
    favoriteCount: work._count.favorites,
    publishedAt: work.publishedAt,
    readerCount: work._count.readingProgress,
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
      authorId: {
        not: editorId,
      },
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
    .map(mapDiscoveryWork)
    .filter((work) => matchesWordCount(work.totalWords, filters.wordCount));
}

export async function getEditorReviewRequests(editorId: string) {
  const works = await prisma.work.findMany({
    where: {
      ...completedPublishedWorkWhere,
      authorId: {
        not: editorId,
      },
      assignedEditorId: null,
      editorReviewAssignments: {
        some: {
          editorId: null,
          source: "pool",
          stage: "first",
          status: "waiting",
        },
      },
      editorReviewStatus: "requested",
    },
    include: {
      _count: {
        select: {
          comments: { where: { deletedAt: null, status: "visible" } },
          favorites: true,
          readingProgress: true,
        },
      },
      author: {
        select: { displayName: true, fullName: true, username: true },
      },
      chapters: {
        where: { archivedAt: null, status: "published" },
        select: { content: true },
      },
      editorFavorites: {
        where: { editorId },
        select: { id: true },
      },
    },
    orderBy: { updatedAt: "asc" },
  });

  return works.map(mapDiscoveryWork);
}

export async function getSecondEditorPoolRequests(
  editorId: string,
) {
  const assignments =
    await prisma.editorReviewAssignment.findMany({
      where: {
        editorId: null,
        source: "pool",
        stage: "second",
        status: "waiting",
        work: {
          assignedEditorId: {
            not: editorId,
          },
          authorId: {
            not: editorId,
          },
          editorReviewStatus: "awaiting_second_editor",
        },
      },
      include: {
        work: {
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
        createdAt: "asc",
      },
    });

  return assignments.map(({ work }) =>
    mapDiscoveryWork(work),
  );
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

type EditorReviewWorkResult = Prisma.WorkGetPayload<{
  include: {
    author: {
      select: {
        displayName: true;
        fullName: true;
        username: true;
      };
    };
    chapters: {
      select: {
        content: true;
        position: true;
        title: true;
      };
    };
    editorReviewAssignments: {
      select: {
        assignedAt: true;
        completedAt: true;
        id: true;
        stage: true;
        status: true;
      };
    };
    editorFeedback: true;
  };
}>;

export type EditorReviewListStatus = "active" | "completed";

export async function getEditorReviews(
  editorId: string,
  status: EditorReviewListStatus = "active",
): Promise<EditorReviewWorkResult[]> {
  const works = await prisma.work.findMany({
    where:
      status === "completed"
        ? {
            editorReviewStatus: "completed",
            OR: [
              {
                assignedEditorId: editorId,
              },
              {
                editorReviewAssignments: {
                  some: {
                    editorId,
                    stage: "second",
                    status: "completed",
                  },
                },
              },
            ],
          }
        : {
            OR: [
              {
                assignedEditorId: editorId,
                editorReviewStatus: {
                  in: [
                    "in_progress",
                    "awaiting_second_editor",
                    "second_in_progress",
                  ],
                },
              },
              {
                editorReviewStatus: "second_in_progress",
                editorReviewAssignments: {
                  some: {
                    editorId,
                    stage: "second",
                    status: {
                      in: ["assigned", "in_progress"],
                    },
                  },
                },
              },
            ],
          },
    include: {
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
      editorReviewAssignments: {
        where: {
          editorId,
        },
        select: {
          assignedAt: true,
          completedAt: true,
          id: true,
          stage: true,
          status: true,
        },
      },
      editorFeedback: {
        where: {
          editorId,
          isProfessionalReview: true,
          reportStatus:
            status === "completed"
              ? "completed"
              : "draft",
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return works as EditorReviewWorkResult[];
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
          username: true,
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

export async function getAvailableSecondEditors(
  currentEditorId: string,
) {
  return prisma.user.findMany({
    where: {
      id: {
        not: currentEditorId,
      },
      role: "editor",
      status: "active",
    },
    select: {
      displayName: true,
      fullName: true,
      id: true,
    },
    orderBy: {
      fullName: "asc",
    },
    take: 100,
  });
}

export async function getEditorReviewDetail(
  editorId: string,
  workId: string,
): Promise<EditorReviewWorkResult | null> {
  const work = await prisma.work.findFirst({
    where: {
      id: workId,
      editorReviewStatus: "completed",
      OR: [
        {
          assignedEditorId: editorId,
        },
        {
          editorReviewAssignments: {
            some: {
              editorId,
              stage: "second",
              status: "completed",
            },
          },
        },
      ],
    },
    include: {
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
      editorReviewAssignments: {
        where: {
          editorId,
        },
        select: {
          assignedAt: true,
          completedAt: true,
          id: true,
          stage: true,
          status: true,
        },
      },
      editorFeedback: {
        where: {
          isProfessionalReview: true,
          reportStatus: "completed",
          OR: [
            { editorId },
            {
              work: {
                is: {
                  assignedEditorId: editorId,
                },
              },
              assignment: {
                is: {
                  stage: "second",
                  status: "completed",
                },
              },
            },
          ],
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
  });

  return work as EditorReviewWorkResult | null;
}
