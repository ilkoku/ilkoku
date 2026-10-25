import "server-only";

import { prisma } from "@/lib/prisma";
import { resolveEffectiveCommerceState, shouldEnforcePaidChapterAccess } from "./effective-state";

export type CommerceAccessDecision =
  | { allowed: true; reason: "checkout_disabled" | "provider_unavailable" | "free_work" | "staged_paid_work" | "preview" | "entitled" }
  | { allowed: false; reason: "purchase_required" | "chapter_not_found" };

export async function getCommerceChapterAccessDecision(input: {
  chapterId: string;
  readerId: string | null;
  workId: string;
}): Promise<CommerceAccessDecision> {
  const work = await prisma.work.findUnique({
    where: { id: input.workId },
    select: {
      saleConfiguration: {
        select: {
          saleModel: true,
          priceAmount: true,
          currency: true,
          status: true,
          activatedAt: true,
        },
      },
      publicationConsents: {
        orderBy: { confirmedAt: "desc" },
        take: 1,
        select: {
          publicationModel: true,
          priceAmount: true,
          currency: true,
          accessPlanSnapshot: true,
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
    },
  });

  const chapter = work?.chapters[0];
  if (!work || !chapter) {
    return { allowed: false, reason: "chapter_not_found" };
  }

  const configuration = work.saleConfiguration;
  const latestConsent = work.publicationConsents[0] ?? null;
  const effective = resolveEffectiveCommerceState({
    configuration,
    latestConsent,
  });

  if (!configuration || effective.saleModel === "free") {
    return { allowed: true, reason: "free_work" };
  }

  // Reader protection is independent of contract approval and payment
  // availability. A confirmed/ready paid chapter must not leak content simply
  // because checkout is temporarily unable to issue an entitlement.
  const enforcePaidChapterAccess = shouldEnforcePaidChapterAccess({
    activatedAt: configuration.activatedAt,
    saleModel: effective.saleModel,
    status: effective.status,
  });
  if (!enforcePaidChapterAccess) {
    return { allowed: true, reason: "staged_paid_work" };
  }

  const chapterAccessType = effective.useConfirmedSnapshot
    ? effective.accessPlan[chapter.id] ?? "locked"
    : chapter.commerceAccess?.accessType;

  if (chapterAccessType === "preview") {
    return { allowed: true, reason: "preview" };
  }

  if (input.readerId) {
    const entitlement = await prisma.workEntitlement.findUnique({
      where: {
        readerId_workId: {
          readerId: input.readerId,
          workId: input.workId,
        },
      },
      select: {
        status: true,
      },
    });

    if (entitlement?.status === "active") {
      return { allowed: true, reason: "entitled" };
    }
  }

  return { allowed: false, reason: "purchase_required" };
}
