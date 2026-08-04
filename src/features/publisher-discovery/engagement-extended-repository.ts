import "server-only";

import { requirePublisherMembershipPermission } from "@/features/publisher-workspace/repository";
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

async function findPublicWork(workId: string) {
  return prisma.work.findFirst({
    where: {
      ...publicWorkWhere,
      author: {
        is: {
          deletedAt: null,
          role: "writer",
          status: "active",
        },
      },
      id: workId,
    },
    select: {
      id: true,
      slug: true,
    },
  });
}

async function findPublicAuthor(authorId: string) {
  return prisma.user.findFirst({
    where: {
      deletedAt: null,
      id: authorId,
      role: "writer",
      status: "active",
      works: {
        some: publicWorkWhere,
      },
    },
    select: {
      id: true,
    },
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

  const work = await findPublicWork(input.workId);
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

export async function setPublisherAuthorLike(input: {
  active: boolean;
  authorId: string;
  userId: string;
}): Promise<PublisherEngagementResult> {
  const membership = await requirePublisherMembershipPermission(
    input.userId,
    "like_author",
  );

  if (!membership) return { status: "forbidden" };

  const author = await findPublicAuthor(input.authorId);
  if (!author) return { status: "not_found" };

  try {
    return await prisma.$transaction(async (transaction) => {
      const existing = await transaction.publisherAuthorLike.findUnique({
        where: {
          publisherId_authorId: {
            authorId: author.id,
            publisherId: membership.publisherId,
          },
        },
        select: { id: true },
      });

      if (input.active) {
        if (existing) {
          return {
            active: true,
            changed: false,
            status: "ok" as const,
          };
        }

        const created = await transaction.publisherAuthorLike.create({
          data: {
            authorId: author.id,
            createdById: input.userId,
            publisherId: membership.publisherId,
          },
          select: { id: true },
        });

        await transaction.auditLog.create({
          data: {
            action: "publisher_author_liked",
            actorId: input.userId,
            entityId: created.id,
            entityType: "PublisherAuthorLike",
            metadata: JSON.stringify({
              active: true,
              authorId: author.id,
              publisherId: membership.publisherId,
            }),
          },
        });

        return {
          active: true,
          changed: true,
          status: "ok" as const,
        };
      }

      if (!existing) {
        return {
          active: false,
          changed: false,
          status: "ok" as const,
        };
      }

      const removed = await transaction.publisherAuthorLike.deleteMany({
        where: {
          authorId: author.id,
          id: existing.id,
          publisherId: membership.publisherId,
        },
      });

      if (removed.count === 1) {
        await transaction.auditLog.create({
          data: {
            action: "publisher_author_liked",
            actorId: input.userId,
            entityId: existing.id,
            entityType: "PublisherAuthorLike",
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
      return {
        active: true,
        changed: false,
        status: "ok",
      };
    }
    throw error;
  }
}

export async function setPublisherAuthorFavorite(input: {
  active: boolean;
  authorId: string;
  userId: string;
}): Promise<PublisherEngagementResult> {
  const membership = await requirePublisherMembershipPermission(
    input.userId,
    "favorite_author",
  );

  if (!membership) return { status: "forbidden" };

  const author = await findPublicAuthor(input.authorId);
  if (!author) return { status: "not_found" };

  try {
    return await prisma.$transaction(async (transaction) => {
      const existing = await transaction.publisherAuthorFavorite.findUnique({
        where: {
          publisherId_authorId: {
            authorId: author.id,
            publisherId: membership.publisherId,
          },
        },
        select: { id: true },
      });

      if (input.active) {
        if (existing) {
          return {
            active: true,
            changed: false,
            status: "ok" as const,
          };
        }

        const created = await transaction.publisherAuthorFavorite.create({
          data: {
            authorId: author.id,
            createdById: input.userId,
            publisherId: membership.publisherId,
          },
          select: { id: true },
        });

        await transaction.auditLog.create({
          data: {
            action: "publisher_author_favorited",
            actorId: input.userId,
            entityId: created.id,
            entityType: "PublisherAuthorFavorite",
            metadata: JSON.stringify({
              active: true,
              authorId: author.id,
              publisherId: membership.publisherId,
            }),
          },
        });

        return {
          active: true,
          changed: true,
          status: "ok" as const,
        };
      }

      if (!existing) {
        return {
          active: false,
          changed: false,
          status: "ok" as const,
        };
      }

      const removed = await transaction.publisherAuthorFavorite.deleteMany({
        where: {
          authorId: author.id,
          id: existing.id,
          publisherId: membership.publisherId,
        },
      });

      if (removed.count === 1) {
        await transaction.auditLog.create({
          data: {
            action: "publisher_author_favorited",
            actorId: input.userId,
            entityId: existing.id,
            entityType: "PublisherAuthorFavorite",
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
      return {
        active: true,
        changed: false,
        status: "ok",
      };
    }
    throw error;
  }
}
