import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { BLOCKED_PUBLIC_WORK_SLUGS } from "@/lib/public-content-safety";

/**
 * Okuyucu yazar keşfi ve yazar favorileri için ortak eser sınırı.
 *
 * Yazar keşfi yalnız public yazar vitriniyle uyumlu, güvenli eserlerden türetilir.
 * Bu yüzden yetişkin içerik, bloklu public slug ve Türkçe dışı eserler bu yazar
 * havuzunu tek başına oluşturmaz.
 */
export const readerAuthorDiscoveryWorkWhere: Prisma.WorkWhereInput = {
  archivedAt: null,
  contentRating: { not: "adult_18" },
  language: "tr",
  publishedAt: { not: null },
  slug: { notIn: [...BLOCKED_PUBLIC_WORK_SLUGS] },
  status: "published",
  visibility: "public",
};
