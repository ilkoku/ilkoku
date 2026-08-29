import "server-only";

import { adultContentWorkVisibility, getAdultContentAccess } from "@/lib/adult-content-access";
import { prisma } from "@/lib/prisma";
import {
  getPublisherSharedItems,
  type PublisherSharedItem,
} from "./sharing-repository";

function publicWorkWhere(canAccessAdultContent: boolean) {
  return {
    archivedAt: null,
    ...adultContentWorkVisibility(canAccessAdultContent),
    publishedAt: { not: null },
    status: "published" as const,
    visibility: "public" as const,
  };
}

function publicAuthorName(author: {
  displayName: string | null;
  publicId: string;
  username: string | null;
}) {
  return (
    author.displayName?.trim() ||
    author.username?.trim() ||
    author.publicId
  );
}

export async function getPublisherSharedItemsCurrentPublic(
  userId: string,
): Promise<{
  adminReadOnly: boolean;
  companyName: string;
  items: PublisherSharedItem[];
} | null> {
  const data = await getPublisherSharedItems(userId);
  if (!data) return null;

  const canAccessAdultContent = data.adminReadOnly
    ? true
    : (await getAdultContentAccess(userId)).canAccessAdultContent;
  const workScope = publicWorkWhere(canAccessAdultContent);
  const workIds = Array.from(
    new Set(
      data.items
        .map((item) => item.work?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const authorIds = Array.from(
    new Set(
      data.items
        .map((item) => item.author?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const [works, authors] = await Promise.all([
    workIds.length
      ? prisma.work.findMany({
          where: {
            ...workScope,
            id: { in: workIds },
            author: {
              is: {
                deletedAt: null,
                role: "writer",
                status: "active",
              },
            },
          },
          select: { id: true, slug: true, title: true },
        })
      : [],
    authorIds.length
      ? prisma.user.findMany({
          where: {
            deletedAt: null,
            id: { in: authorIds },
            role: "writer",
            status: "active",
            works: { some: publicWorkWhere(false) },
          },
          select: {
            displayName: true,
            id: true,
            publicId: true,
            username: true,
          },
        })
      : [],
  ]);

  const workById = new Map(works.map((work) => [work.id, work]));
  const authorById = new Map(authors.map((author) => [author.id, author]));

  return {
    ...data,
    items: data.items
      .map((item) => {
        const work = item.work
          ? workById.get(item.work.id) ?? null
          : null;
        const author = item.author
          ? authorById.get(item.author.id) ?? null
          : null;

        return {
          ...item,
          author: author
            ? {
                id: author.id,
                name: publicAuthorName(author),
                publicId: author.publicId,
              }
            : null,
          work: work
            ? {
                id: work.id,
                slug: work.slug,
                title: work.title,
              }
            : null,
        };
      })
      .filter((item) => item.work !== null || item.author !== null),
  };
}
