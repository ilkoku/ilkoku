import "server-only";

import { prisma } from "@/lib/prisma";

function uniqueIds(values: readonly string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

export async function getPublisherWorkLikeIds(
  publisherId: string,
  workIds: readonly string[],
) {
  const ids = uniqueIds(workIds);

  if (!publisherId || ids.length === 0) {
    return [];
  }

  const records =
    await prisma.publisherWorkLike.findMany({
      where: {
        publisherId,
        workId: {
          in: ids,
        },
      },
      select: {
        workId: true,
      },
    });

  return records.map((record) => record.workId);
}

export async function getPublisherAuthorFollowIds(
  publisherId: string,
  authorIds: readonly string[],
) {
  const ids = uniqueIds(authorIds);

  if (!publisherId || ids.length === 0) {
    return [];
  }

  const records =
    await prisma.publisherAuthorFollow.findMany({
      where: {
        authorId: {
          in: ids,
        },
        publisherId,
      },
      select: {
        authorId: true,
      },
    });

  return records.map((record) => record.authorId);
}
