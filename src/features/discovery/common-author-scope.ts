import type { Prisma } from "@/generated/prisma/client";
import { commonDiscoveryWorkWhereFor } from "./common-work-scope";

/**
 * Ortak Yazar Havuzu sınırı.
 *
 * Bir yazar ancak aktif bir writer hesabıysa ve ortak Eser Havuzu içinde en az
 * bir görünür eseri varsa keşif/koleksiyon yüzeylerine girer. Rol ve sayfa
 * bazlı filtreler bu sınırın üstüne eklenir; yeni bir yazar havuzu üretilmez.
 */
export function commonDiscoveryAuthorWhereFor(
  canAccessAdultContent = false,
  workFilters: Prisma.WorkWhereInput = {},
): Prisma.UserWhereInput {
  const workWhere: Prisma.WorkWhereInput = {
    ...commonDiscoveryWorkWhereFor(canAccessAdultContent),
    ...workFilters,
  };

  return {
    deletedAt: null,
    role: "writer",
    status: "active",
    works: {
      some: workWhere,
    },
  };
}

/**
 * Özel bir rol görünürlüğü kullanan yüzeyler için aynı Yazar Havuzu kuralını
 * verilen eser sınırından türetir.
 */
export function discoveryAuthorWhereFromWorkPool(
  workWhere: Prisma.WorkWhereInput,
): Prisma.UserWhereInput {
  return {
    deletedAt: null,
    role: "writer",
    status: "active",
    works: {
      some: workWhere,
    },
  };
}
