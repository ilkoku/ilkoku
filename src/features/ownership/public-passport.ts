import "server-only";

import { prisma } from "@/lib/prisma";
import { BLOCKED_PUBLIC_WORK_SLUGS } from "@/lib/public-content-safety";

import { getOwnershipPassport } from "./queries";

export async function getPublicOwnershipPassportBySlug(
  slug: string,
) {
  const work = await prisma.work.findFirst({
    where: {
      archivedAt: null,
      author: {
        is: {
          deletedAt: null,
          role: "writer",
          status: "active",
        },
      },
      contentRating: {
        not: "adult_18",
      },
      publishedAt: {
        not: null,
      },
      slug,
      status: "published",
      visibility: "public",
      NOT: {
        slug: {
          in: [...BLOCKED_PUBLIC_WORK_SLUGS],
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!work) {
    return null;
  }

  const passport = await getOwnershipPassport(work.id, {
    kind: "publisher_discovery",
    publisherId: "public-passport",
    userId: "public-passport",
  });

  if (!passport || passport.work.contentRating === "adult_18") {
    return null;
  }

  return passport;
}
