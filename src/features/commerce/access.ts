import "server-only";

import { prisma } from "@/lib/prisma";
import { getActiveReaderPurchaseTerms } from "./checkout-terms";
import { resolveEffectiveCommerceState } from "./effective-state";
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

  const previouslyActivatedPaid = Boolean(configuration.activatedAt);
  const stagedZeroCandidate =
    !previouslyActivatedPaid &&
    effective.saleModel === "paid" &&
    effective.status === "ready" &&
    effective.priceAmount === BigInt(0);
  const stagedZeroPurchaseReady = stagedZeroCandidate
    ? Boolean(await getActiveReaderPurchaseTerms())
    : false;

  if (!previouslyActivatedPaid && !stagedZeroPurchaseReady && !checkoutEnabled) {
    return { allowed: true, reason: "checkout_disabled" };
  }

  if (
    !previouslyActivatedPaid &&
    !stagedZeroPurchaseReady &&
    !paymentProviderReady
  ) {
    return { allowed: true, reason: "provider_unavailable" };
  }

  if (
    !previouslyActivatedPaid &&
    !stagedZeroPurchaseReady &&
    configuration.status !== "active"
  ) {
    return { allowed: true, reason: "staged_paid_work" };
  }

  if (
    !previouslyActivatedPaid &&
    !stagedZeroPurchaseReady
  ) {
    const readerPurchaseTerms = await getActiveReaderPurchaseTerms();
    if (!readerPurchaseTerms) {
      return { allowed: true, reason: "staged_paid_work" };
    }
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
