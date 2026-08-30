import type { Prisma } from "@/generated/prisma/client";
import { adultContentWorkVisibility } from "@/lib/adult-content-access";

/**
 * Ortak Keşfet havuzu.
 *
 * Okuyucu, editör ve yayınevi aynı yayımlanmış/public eser kümesini görür.
 * Rol bazlı farklar yalnızca bu eserler üzerinde yapılabilen işlemlerdir.
 * 18+ eserler de aynı havuzdadır; görünürlük yalnız hesap yaşı + açık onayla açılır.
 */
export function commonDiscoveryWorkWhereFor(
  canAccessAdultContent = false,
): Prisma.WorkWhereInput {
  return {
    archivedAt: null,
    ...adultContentWorkVisibility(canAccessAdultContent),
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
  };
}

/** Anonim / yaş onaysız güvenli varsayılan. */
export const commonDiscoveryWorkWhere = commonDiscoveryWorkWhereFor(false);
