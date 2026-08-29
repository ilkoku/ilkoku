import "server-only";

import { requirePublisherMembershipPermission } from "@/features/publisher-workspace/repository";
import {
  adultContentWorkVisibility,
  getAdultContentAccess,
} from "@/lib/adult-content-access";
import { prisma } from "@/lib/prisma";
import type { PublisherEngagementResult } from "./engagement-repository";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

const publicWorkWhere = {
  archivedAt: null,
  publishedAt: { not: null },
  status: "published" as const,
  visibility: "public" as const,
};

async function findPublicWork(workId: string, userId: string) {
  const adultAccess = await getAdultContentAccess(userId);
  return prisma.work.findFirst({
    where: {
      ...publicWorkWhere,
      ...adultContentWorkVisibility(adultAccess.canAccessAdultContent),
      author: {
        is: {
          deletedAt: null,
          role: "writer",
          status: "active",
        },
      },
      id: workId,
    },
    select: { id: true, slug: true },
  });
}

async function findPublicAuthor(authorId: string) {
  return prisma.user.findFirst({
    where: {
      deletedAt: null,
      id: authorId,
      role: "writer",
      status: "active",
      works: { some: publicWorkWhere },
    },
    select: { id: true },
  });
}

export async function setPublisherWorkFavorite(input: {
  active: boolean;
  userId: string;
  workId: string;
}): Promise<PublisherEngagementResult> {
  const membership = await requirePublisherMembershipPermission(
    input.userId,
    "favorite_work",
  );

  if (!membership) return { status: "forbidden" };

  const work = await findPublicWork(input.workId, input.userId);
  if (!work) return { status: "not_found" };

  try {
    return await prisma.$transaction(async (transaction) => {
      const existing = await transaction.publisherWorkFavorite.findUnique({
        where: {
          publisherId_workId: {
            publisherId: membership.publisherId,
            workId: work.id,
          },
        },
        select: { id: true },
      });

      if (input.active) {
        if (existing) {
          return {
            active: true,
            changed: false,
            slug: work.slug,
            status: "ok" as const,
          };
        }

        const created = await transaction.publisherWorkFavorite.create({
          data: {
            createdById: input.userId,
            publisherId: membership.publisherId,
            workId: work.id,
          },
          select: { id: true },
        });

        await transaction.auditLog.create({
          data: {
            action: "publisher_work_favorited",
            actorId: input.userId,
            entityId: created.id,
            entityType: "PublisherWorkFavorite",
            metadata: JSON.stringify({
              active: true,
              publisherId: membership.publisherId,
              workId: work.id,
            }),
          },
        });

        return {
          active: true,
          changed: true,
          slug: work.slug,
          status: "ok" as const,
        };
      }

      if (!existing) {
        return {
          active: false,
          changed: false,
          slug: work.slug,
          status: "ok" as const,
        };
      }

      const removed = await transaction.publisherWorkFavorite.deleteMany({
        where: {
          id: existing.id,
          publisherId: membership.publisherId,
          workId: work.id,
        },
      });

      if (removed.count === 1) {
        await transaction.auditLog.create({
          data: {
            action: "publisher_work_favorited",
            actorId: input.userId,
            entityId: existing.id,
            entityType: "PublisherWorkFavorite",
            metadata: JSON.stringify({
              active: false,
              publisherId: membership.publisherId,
              workId: work.id,
            }),
          },
        });
      }

      return {
        active: false,
        changed: removed.count === 1,
        slug: work.slug,
        status: "ok" as const,
      };
    });
  } catch (error) {
    if (input.active && isUniqueConstraintError(error)) {
      return {
        active: true,
        changed: false,
        slug: work.slug,
        status: "ok",
      };
    }
    throw error;
  }
}

async function setAuthorEngagement(
  kind: "like" | "favorite",
  input: { active: boolean; authorId: string; userId: string },
): Promise<PublisherEngagementResult> {
  const permission = kind === "like" ? "like_author" : "favorite_author";
  const membership = await requirePublisherMembershipPermission(
    input.userId,
    permission,
  );
  if (!membership) return { status: "forbidden" };

  const author = await findPublicAuthor(input.authorId);
  if (!author) return { status: "not_found" };

  try {
    return await prisma.$transaction(async (transaction) => {
      const existing =
        kind === "like"
          ? await transaction.publisherAuthorLike.findUnique({
              where: {
                publisherId_authorId: {
                  authorId: author.id,
                  publisherId: membership.publisherId,
                },
              },
              select: { id: true },
            })
          : await transaction.publisherAuthorFavorite.findUnique({
              where: {
                publisherId_authorId: {
                  authorId: author.id,
                  publisherId: membership.publisherId,
                },
              },
              select: { id: true },
            });

      if (input.active && existing) {
        return { active: true, changed: false, status: "ok" as const };
      }

      if (input.active) {
        const created =
          kind === "like"
            ? await transaction.publisherAuthorLike.create({
                data: {
                  authorId: author.id,
                  createdById: input.userId,
                  publisherId: membership.publisherId,
                },
                select: { id: true },
              })
            : await transaction.publisherAuthorFavorite.create({
                data: {
                  authorId: author.id,
                  createdById: input.userId,
                  publisherId: membership.publisherId,
                },
                select: { id: true },
              });

        await transaction.auditLog.create({
          data: {
            action:
              kind === "like"
                ? "publisher_author_liked"
                : "publisher_author_favorited",
            actorId: input.userId,
            entityId: created.id,
            entityType:
              kind === "like"
                ? "PublisherAuthorLike"
                : "PublisherAuthorFavorite",
            metadata: JSON.stringify({
              active: true,
              authorId: author.id,
              publisherId: membership.publisherId,
            }),
          },
        });

        return { active: true, changed: true, status: "ok" as const };
      }

      if (!existing) {
        return { active: false, changed: false, status: "ok" as const };
      }

      const removed =
        kind === "like"
          ? await transaction.publisherAuthorLike.deleteMany({
              where: {
                authorId: author.id,
                id: existing.id,
                publisherId: membership.publisherId,
              },
            })
          : await transaction.publisherAuthorFavorite.deleteMany({
              where: {
                authorId: author.id,
                id: existing.id,
                publisherId: membership.publisherId,
              },
            });

      if (removed.count === 1) {
        await transaction.auditLog.create({
          data: {
            action:
              kind === "like"
                ? "publisher_author_liked"
                : "publisher_author_favorited",
            actorId: input.userId,
            entityId: existing.id,
            entityType:
              kind === "like"
                ? "PublisherAuthorLike"
                : "PublisherAuthorFavorite",
            metadata: JSON.stringify({
              active: false,
              authorId: author.id,
              publisherId: membership.publisherId,
            }),
          },
        });
      }

      return {
        active: false,
        changed: removed.count === 1,
        status: "ok" as const,
      };
    });
  } catch (error) {
    if (input.active && isUniqueConstraintError(error)) {
      return { active: true, changed: false, status: "ok" };
    }
    throw error;
  }
}

export async function setPublisherAuthorLike(input: {
  active: boolean;
  authorId: string;
  userId: string;
}) {
  return setAuthorEngagement("like", input);
}

export async function setPublisherAuthorFavorite(input: {
  active: boolean;
  authorId: string;
  userId: string;
}) {
  return setAuthorEngagement("favorite", input);
}
