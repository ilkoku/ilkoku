import "server-only";

import { adultContentWorkVisibility } from "@/lib/adult-content-access";
import { prisma } from "@/lib/prisma";
import { BLOCKED_PUBLIC_WORK_SLUGS } from "@/lib/public-content-safety";

import { getOwnershipPassport } from "./queries";

export async function getPublicOwnershipPassportBySlug(
  slug: string,
  canAccessAdultContent = false,
) {
  const work = await prisma.work.findFirst({
    where: {
      archivedAt: null,
      ...adultContentWorkVisibility(canAccessAdultContent),
      author: {
        is: {
          deletedAt: null,
          role: "writer",
          status: "active",
        },
      },
      publishedAt: { not: null },
      slug,
      status: "published",
      visibility: "public",
      NOT: {
        slug: { in: [...BLOCKED_PUBLIC_WORK_SLUGS] },
      },
    },
    select: { id: true },
  });

  if (!work) return null;

  return getOwnershipPassport(work.id, {
    kind: "publisher_discovery",
    publisherId: "public-passport",
    userId: "public-passport",
  });
}
