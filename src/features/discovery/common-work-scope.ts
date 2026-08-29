import type { Prisma } from "@/generated/prisma/client";

/**
 * Ortak Keşfet havuzu.
 *
 * Okuyucu, editör ve yayınevi aynı yayımlanmış/public eser kümesini görür.
 * Rol bazlı farklar yalnızca bu eserler üzerinde yapılabilen işlemlerdir.
 */
export const commonDiscoveryWorkWhere = {
  archivedAt: null,
  contentRating: {
    not: "adult_18",
  },
  publishedAt: {
    not: null,
  },
  status: "published",
  visibility: "public",
  author: {
    is: {
      deletedAt: null,
      status: "active",
    },
  },
} satisfies Prisma.WorkWhereInput;
