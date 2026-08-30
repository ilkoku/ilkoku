import type { Prisma } from "@/generated/prisma/client";
import { adultContentWorkVisibility } from "@/lib/adult-content-access";

/**
 * Ortak Eser Havuzu.
 *
 * Okuyucu, editör ve yayınevi aynı yayımlanmış/public eser kümesini çağırır.
 * Rol bazlı farklar yalnızca bu havuzun üstündeki filtreler ve yapılabilen
 * işlemlerdir. 18+ eserler de aynı havuzdadır; görünürlük hesap yaşı + açık
 * onayla açılır.
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
        role: "writer",
        status: "active",
      },
    },
  };
}

/** Anonim / yaş onaysız güvenli varsayılan. */
export const commonDiscoveryWorkWhere = commonDiscoveryWorkWhereFor(false);
