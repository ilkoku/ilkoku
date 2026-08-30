import "server-only";

import {
  adultContentWorkVisibility,
  getAdultContentAccess,
} from "@/lib/adult-content-access";
import { prisma } from "@/lib/prisma";
import { requirePublisherMembershipPermission } from "@/features/publisher-workspace/repository";

export type PublisherEngagementResult =
  | {
      active: boolean;
      changed: boolean;
      slug?: string;
      status: "ok";
    }
  | {
      status: "forbidden" | "not_found";
    };

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

export async function setPublisherWorkLikeV2(input: {
  active: boolean;
  userId: string;
  workId: string;
}): Promise<PublisherEngagementResult> {
  const membership = await requirePublisherMembershipPermission(
    input.userId,
    "like_work",
  );

  if (!membership) return { status: "forbidden" };

  const adultAccess = await getAdultContentAccess(input.userId);
  const work = await prisma.work.findFirst({
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
      id: input.workId,
    },
    select: { id: true, slug: true },
  });

  if (!work) return { status: "not_found" };

  try {
    return await prisma.$transaction(async (transaction) => {
      const existing = await transaction.publisherWorkLike.findUnique({
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

        const created = await transaction.publisherWorkLike.create({
          data: {
            createdById: input.userId,
            publisherId: membership.publisherId,
            workId: work.id,
          },
          select: { id: true },
        });

        await transaction.auditLog.create({
          data: {
            action: "publisher_work_liked",
            actorId: input.userId,
            entityId: created.id,
            entityType: "PublisherWorkLike",
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

      const removed = await transaction.publisherWorkLike.deleteMany({
        where: {
          id: existing.id,
          publisherId: membership.publisherId,
          workId: work.id,
        },
      });

      if (removed.count === 1) {
        await transaction.auditLog.create({
          data: {
            action: "publisher_work_liked",
            actorId: input.userId,
            entityId: existing.id,
            entityType: "PublisherWorkLike",
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

export async function setPublisherAuthorFollowV2(input: {
  active: boolean;
  authorId: string;
  userId: string;
}): Promise<PublisherEngagementResult> {
  const membership = await requirePublisherMembershipPermission(
    input.userId,
    "follow_author",
  );

  if (!membership) return { status: "forbidden" };

  const author = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      id: input.authorId,
      role: "writer",
      status: "active",
      works: { some: publicWorkWhere },
    },
    select: { id: true },
  });

  if (!author) return { status: "not_found" };

  try {
    return await prisma.$transaction(async (transaction) => {
      const existing = await transaction.publisherAuthorFollow.findUnique({
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

        const created = await transaction.publisherAuthorFollow.create({
          data: {
            authorId: author.id,
            createdById: input.userId,
            publisherId: membership.publisherId,
          },
          select: { id: true },
        });

        await transaction.auditLog.create({
          data: {
            action: "publisher_author_followed",
            actorId: input.userId,
            entityId: created.id,
            entityType: "PublisherAuthorFollow",
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

      const removed = await transaction.publisherAuthorFollow.deleteMany({
        where: {
          authorId: author.id,
          id: existing.id,
          publisherId: membership.publisherId,
        },
      });

      if (removed.count === 1) {
        await transaction.auditLog.create({
          data: {
            action: "publisher_author_followed",
            actorId: input.userId,
            entityId: existing.id,
            entityType: "PublisherAuthorFollow",
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
