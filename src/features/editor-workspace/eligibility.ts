import type { Prisma } from "@/generated/prisma/client";

export const completedPublishedWorkWhere = {
  archivedAt: null,
  publishedAt: {
    not: null,
  },
  status: "published",
  visibility: "public",
  chapters: {
    some: {
      archivedAt: null,
      publishedAt: {
        not: null,
      },
      status: "published",
    },
    none: {
      archivedAt: null,
      OR: [
        {
          publishedAt: null,
        },
        {
          status: {
            not: "published",
          },
        },
      ],
    },
  },
} satisfies Prisma.WorkWhereInput;

export function countWords(content: string) {
  const normalized = content.trim();

  return normalized ? normalized.split(/\s+/u).length : 0;
}
