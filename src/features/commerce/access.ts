import "server-only";

import { prisma } from "@/lib/prisma";
import { isCommerceCheckoutEnabled } from "./runtime";

export type CommerceAccessDecision =
  | { allowed: true; reason: "checkout_disabled" | "free_work" | "staged_paid_work" | "preview" | "entitled" }
  | { allowed: false; reason: "purchase_required" | "chapter_not_found" };

export async function getCommerceChapterAccessDecision(input: {
  chapterId: string;
  readerId: string | null;
  workId: string;
}): Promise<CommerceAccessDecision> {
  if (!isCommerceCheckoutEnabled()) {
    return { allowed: true, reason: "checkout_disabled" };
  }

  const work = await prisma.work.findUnique({
    where: { id: input.workId },
    select: {
      saleConfiguration: {
        select: {
          saleModel: true,
          status: true,
        },
      },
      chapters: {
        where: {
          id: input.chapterId,
          archivedAt: null,
        },
        select: {
          id: true,
          commerceAccess: {
            select: {
              accessType: true,
            },
          },
        },
        take: 1,
      },
      entitlements: input.readerId
        ? {
            where: {
              readerId: input.readerId,
              status: "active",
            },
            select: { id: true },
            take: 1,
          }
        : false,
    },
  });

  const chapter = work?.chapters[0];
  if (!work || !chapter) {
    return { allowed: false, reason: "chapter_not_found" };
  }

  const configuration = work.saleConfiguration;
  if (!configuration || configuration.saleModel === "free") {
    return { allowed: true, reason: "free_work" };
  }

  if (configuration.status !== "active") {
    return { allowed: true, reason: "staged_paid_work" };
  }

  if (chapter.commerceAccess?.accessType === "preview") {
    return { allowed: true, reason: "preview" };
  }

  if (input.readerId && Array.isArray(work.entitlements) && work.entitlements.length > 0) {
    return { allowed: true, reason: "entitled" };
  }

  return { allowed: false, reason: "purchase_required" };
}
