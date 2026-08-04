import { createHash } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type {
  OwnershipPassportData,
  OwnershipPassportScope,
} from "./types";

function normalizeText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(value: string) {
  const normalized = normalizeText(value);

  return normalized
    ? normalized.split(" ").length
    : 0;
}

function createCurrentHash(input: {
  description: string | null;
  genre: string | null;
  language: string;
  subtitle: string | null;
  title: string;
  chapters: Array<{
    content: string;
    position: number;
    status: string;
    title: string;
  }>;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        description: input.description,
        genre: input.genre,
        language: input.language,
        subtitle: input.subtitle,
        title: input.title,
        chapters: input.chapters.map((chapter) => ({
          content: chapter.content,
          position: chapter.position,
          status: chapter.status,
          title: chapter.title,
        })),
      }),
    )
    .digest("hex");
}

function createPassportWhere(
  workId: string,
  scope: OwnershipPassportScope,
): Prisma.WorkWhereInput {
  switch (scope.kind) {
    case "admin":
      return {
        id: workId,
      };

    case "author":
      return {
        authorId: scope.userId,
        id: workId,
      };

    case "editor":
      return {
        id: workId,
        OR: [
          {
            assignedEditorId: scope.userId,
            editorReviewStatus: {
              in: [
                "in_progress",
                "awaiting_second_editor",
                "second_in_progress",
                "completed",
              ],
            },
          },
          {
            editorReviewAssignments: {
              some: {
                editorId: scope.userId,
                status: {
                  in: [
                    "assigned",
                    "in_progress",
                    "completed",
                  ],
                },
              },
            },
          },
        ],
      };

    case "publisher":
      return {
        id: workId,
        publisherSubmissions: {
          some: {
            archivedAt: null,
            id: scope.submissionId,
            status: {
              not: "withdrawn",
            },
            publisher: {
              active: true,
              archivedAt: null,
              members: {
                some: {
                  active: true,
                  userId: scope.userId,
                },
              },
            },
          },
        },
      };

    case "publisher_discovery":
      return {
        archivedAt: null,
        author: {
          is: {
            deletedAt: null,
            role: "writer",
            status: "active",
          },
        },
        id: workId,
        publishedAt: {
          not: null,
        },
        status: "published",
        visibility: "public",
      };
  }
}

export async function getOwnershipPassport(
  workId: string,
  scope: OwnershipPassportScope,
): Promise<OwnershipPassportData | null> {
  const work = await prisma.work.findFirst({
    where: createPassportWhere(
      workId,
      scope,
    ),
    include: {
      author: {
        select: {
          displayName: true,
          fullName: true,
          publicId: true,
          username: true,
        },
      },
      chapters: {
        where: {
          archivedAt: null,
        },
        orderBy: {
          position: "asc",
        },
        select: {
          content: true,
          id: true,
          position: true,
          status: true,
          title: true,
        },
      },
      editorReviewAssignments: {
        include: {
          editor: {
            select: {
              displayName: true,
              fullName: true,
              publicId: true,
              username: true,
            },
          },
        },
        orderBy: {
          assignedAt: "asc",
        },
      },
      ownershipStamps: {
        orderBy: {
          stampedAt: "asc",
        },
        select: {
          contentHash: true,
          id: true,
          stampCode: true,
          stampedAt: true,
          status: true,
          version: true,
        },
      },
      publisherSubmissions: {
        where: {
          archivedAt: null,
        },
        include: {
          publisher: {
            select: {
              companyName: true,
            },
          },
        },
        orderBy: {
          submittedAt: "asc",
        },
      },
      versions: {
        orderBy: {
          versionNumber: "asc",
        },
        select: {
          chapterId: true,
          contentHash: true,
          createdAt: true,
          id: true,
          title: true,
          versionNumber: true,
        },
      },
      _count: {
        select: {
          comments: true,
          favorites: true,
          publisherSubmissions: true,
          readingProgress: true,
        },
      },
    },
  });

  if (!work) {
    return null;
  }

  const proof =
    work.ownershipStamps.find(
      (stamp) => stamp.status === "active",
    ) ??
    work.ownershipStamps[0] ??
    null;

  const firstMetadataVersion =
    work.versions.find(
      (version) => version.chapterId === null,
    ) ?? null;

  const lastStoredVersion =
    work.versions.length > 0
      ? work.versions[work.versions.length - 1]
      : null;

  const proofEntityIds =
    work.ownershipStamps.map((stamp) => stamp.id);

  const auditTrail = await prisma.auditLog.findMany({
    where: {
      OR: [
        {
          entityId: work.id,
          entityType: "Work",
        },
        ...(proofEntityIds.length
          ? [
              {
                entityId: {
                  in: proofEntityIds,
                },
                entityType: "OwnershipStamp",
              },
            ]
          : []),
      ],
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      action: true,
      createdAt: true,
      id: true,
    },
  });

  return {
    auditTrail,
    editors: work.editorReviewAssignments.map(
      (assignment) => ({
        assignedAt: assignment.assignedAt,
        completedAt: assignment.completedAt,
        editorName:
          scope.kind === "publisher_discovery"
            ? (
                assignment.editor?.displayName?.trim() ||
                assignment.editor?.username?.trim() ||
                "İlkOku Editörü"
              )
            : (
                assignment.editor?.displayName?.trim() ||
                assignment.editor?.fullName ||
                "Henüz editör atanmamış"
              ),
        editorPublicId:
          assignment.editor?.publicId ?? "—",
        id: assignment.id,
        stage: assignment.stage,
        status: assignment.status,
      }),
    ),
    integrity: {
      currentHash: createCurrentHash({
        chapters: work.chapters,
        description: work.description,
        genre: work.genre,
        language: work.language,
        subtitle: work.subtitle,
        title: work.title,
      }),
      firstHash: proof?.contentHash ?? null,
      initialHashMatches:
        proof && firstMetadataVersion
          ? proof.contentHash ===
            firstMetadataVersion.contentHash
          : null,
      lastStoredHash:
        lastStoredVersion?.contentHash ?? null,
    },
    metrics: {
      chapterCount: work.chapters.length,
      commentCount: work._count.comments,
      favoriteCount: work._count.favorites,
      publisherSubmissionCount:
        work._count.publisherSubmissions,
      readerCount: work._count.readingProgress,
      totalWords: work.chapters.reduce(
        (total, chapter) =>
          total + countWords(chapter.content),
        0,
      ),
      versionCount: work.versions.length,
    },
    proof: proof
      ? {
          contentHash: proof.contentHash,
          isLegacy:
            proof.stampCode.startsWith(
              "ILKOKU-LEGACY-",
            ),
          recordedAt: proof.stampedAt,
          stampCode: proof.stampCode,
          status: proof.status,
          version: proof.version,
        }
      : null,
    publishers:
      scope.kind === "publisher_discovery"
        ? []
        : work.publisherSubmissions.map(
            (submission) => ({
              id: submission.id,
              publisherName:
                submission.publisher.companyName,
              status: submission.status,
              submittedAt:
                submission.submittedAt,
              updatedAt:
                submission.updatedAt,
            }),
          ),
    versions: work.versions.map((version) => ({
      contentHash: version.contentHash,
      createdAt: version.createdAt,
      id: version.id,
      scope:
        version.chapterId === null
          ? "work"
          : "chapter",
      title: version.title,
      versionNumber: version.versionNumber,
    })),
    work: {
      authorName:
        scope.kind === "publisher_discovery"
          ? (
              work.author.displayName?.trim() ||
              work.author.username?.trim() ||
              "İlkOku Yazarı"
            )
          : (
              work.author.displayName?.trim() ||
              work.author.fullName
            ),
      authorPublicId: work.author.publicId,
      createdAt: work.createdAt,
      editorReviewStatus:
        work.editorReviewStatus,
      genre: work.genre,
      id: work.id,
      language: work.language,
      publicId: work.publicId,
      publishedAt: work.publishedAt,
      status: work.status,
      title: work.title,
      updatedAt: work.updatedAt,
      visibility: work.visibility,
    },
  };
}
