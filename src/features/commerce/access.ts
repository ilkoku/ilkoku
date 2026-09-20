import "server-only";

import { prisma } from "@/lib/prisma";
import { hasOperationalPaymentProvider } from "./payment-providers";
import { isCommerceCheckoutEnabled } from "./runtime";

export type CommerceAccessDecision =
  | { allowed: true; reason: "checkout_disabled" | "provider_unavailable" | "free_work" | "staged_paid_work" | "preview" | "entitled" }
  | { allowed: false; reason: "purchase_required" | "chapter_not_found" };

export async function getCommerceChapterAccessDecision(input: {
  chapterId: string;
  readerId: string | null;
  workId: string;
}): Promise<CommerceAccessDecision> {
  const checkoutEnabled = isCommerceCheckoutEnabled();
  const paymentProviderReady = hasOperationalPaymentProvider();

  const work = await prisma.work.findUnique({
    where: { id: input.workId },
    select: {
      saleConfiguration: {
        select: {
          saleModel: true,
          status: true,
          activatedAt: true,
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
  if (!configuration || configuration.saleModel === "free") {
    return { allowed: true, reason: "free_work" };
  }

  const previouslyActivatedPaid = Boolean(configuration.activatedAt);
  if (!previouslyActivatedPaid && !checkoutEnabled) {
    return { allowed: true, reason: "checkout_disabled" };
  }

  if (!previouslyActivatedPaid && !paymentProviderReady) {
    return { allowed: true, reason: "provider_unavailable" };
  }

  if (!previouslyActivatedPaid && configuration.status !== "active") {
    return { allowed: true, reason: "staged_paid_work" };
  }

  if (chapter.commerceAccess?.accessType === "preview") {
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
