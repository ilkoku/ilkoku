import "server-only";

import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { validateCouponRules } from "./coupon-rules";
import { resolveEffectiveCommerceState } from "./effective-state";
import { buildCommerceOrderSnapshot } from "./order-snapshot";
import { calculateCommercePricing } from "./pricing";
import { isCommerceCheckoutEnabled } from "./runtime";

export type ZeroTotalCheckoutResult =
  | { ok: true; orderId: string; orderNo: string }
  | {
      ok: false;
      reason:
        | "checkout_disabled"
        | "work_unavailable"
        | "already_entitled"
        | "coupon_invalid"
        | "not_zero_total";
    };

function orderNumber() {
  return "ILK-" + randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase();
}

export async function completeZeroTotalCheckout(input: {
  consent: {
    documentHash: string;
    documentVersion: string;
    ipAddress: string | null;
    userAgent: string | null;
  };
  couponCode: string;
  readerId: string;
  workId: string;
}): Promise<ZeroTotalCheckoutResult> {
  const normalizedCode = input.couponCode.trim().toUpperCase();

  return prisma.$transaction(async (transaction) => {
    const work = await transaction.work.findFirst({
      where: {
        id: input.workId,
        archivedAt: null,
        isActive: true,
        publishedAt: { not: null },
        status: "published",
        visibility: "public",
        author: {
          is: {
            deletedAt: null,
            status: "active",
          },
        },
      },
      select: {
        id: true,
        authorId: true,
        saleConfiguration: {
          select: {
            currency: true,
            priceAmount: true,
            saleModel: true,
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
      },
    });

    const configuration = work?.saleConfiguration;
    const effectiveCommerce = resolveEffectiveCommerceState({
      configuration,
      latestConsent: work?.publicationConsents[0] ?? null,
    });

    const stagedZeroPurchase =
      Boolean(work && configuration) &&
      !configuration?.activatedAt &&
      effectiveCommerce.saleModel === "paid" &&
      effectiveCommerce.status === "ready" &&
      effectiveCommerce.priceAmount === BigInt(0);
    const couponZeroPurchaseCandidate =
      Boolean(work && configuration) &&
      effectiveCommerce.saleModel === "paid" &&
      effectiveCommerce.status === "active" &&
      effectiveCommerce.priceAmount !== null &&
      effectiveCommerce.priceAmount > BigInt(0);

    if (!work || !configuration || (!stagedZeroPurchase && !couponZeroPurchaseCandidate)) {
      return { ok: false, reason: "work_unavailable" } as const;
    }

    const entitlement = await transaction.workEntitlement.findUnique({
      where: {
        readerId_workId: {
          readerId: input.readerId,
          workId: work.id,
        },
      },
      select: { status: true },
    });

    if (entitlement?.status === "active") {
      return { ok: false, reason: "already_entitled" } as const;
    }

    if (stagedZeroPurchase) {
      const pricing = calculateCommercePricing(
        effectiveCommerce.priceAmount ?? BigInt(0),
        null,
      );
      const now = new Date();
      const order = await transaction.order.create({
        data: {
          ...buildCommerceOrderSnapshot({
            authorId: work.authorId,
            coupon: null,
            currency: effectiveCommerce.currency,
            pricing,
            readerId: input.readerId,
            workId: work.id,
          }),
          orderNo: orderNumber(),
          status: "paid",
          paidAt: now,
        },
      });

      await transaction.orderConsent.create({
        data: {
          orderId: order.id,
          readerId: input.readerId,
          consentType: "digital_content_purchase",
          documentVersion: input.consent.documentVersion,
          documentHash: input.consent.documentHash,
          acceptedAt: now,
          ipAddress: input.consent.ipAddress,
          userAgent: input.consent.userAgent,
        },
      });

      await transaction.workEntitlement.upsert({
        where: {
          readerId_workId: {
            readerId: input.readerId,
            workId: work.id,
          },
        },
        create: {
          readerId: input.readerId,
          workId: work.id,
          orderId: order.id,
          source: "purchase",
          status: "active",
          grantedAt: now,
        },
        update: {
          orderId: order.id,
          source: "purchase",
          status: "active",
          grantedAt: now,
          revokedAt: null,
        },
      });

      await transaction.financialLedger.create({
        data: {
          idempotencyKey: order.id + ":sale_gross",
          entryType: "sale_gross",
          amount: BigInt(0),
          currency: effectiveCommerce.currency,
          orderId: order.id,
          workId: work.id,
          authorId: work.authorId,
          couponId: null,
          metadata: {
            finalAmount: "0",
            stagedZeroPricePurchase: true,
            zeroTotalCheckout: true,
          },
        },
      });

      return {
        ok: true,
        orderId: order.id,
        orderNo: order.orderNo,
      } as const;
    }

    if (!isCommerceCheckoutEnabled()) {
      return { ok: false, reason: "checkout_disabled" } as const;
    }

    if (!normalizedCode) {
      return { ok: false, reason: "coupon_invalid" } as const;
    }

    const candidate = await transaction.coupon.findUnique({
      where: { code: normalizedCode },
      select: { id: true },
    });

    if (!candidate) {
      return { ok: false, reason: "coupon_invalid" } as const;
    }

    await transaction.$queryRaw`
      SELECT id
      FROM Coupon
      WHERE id = ${candidate.id}
      FOR UPDATE
    `;

    const coupon = await transaction.coupon.findUnique({
      where: { id: candidate.id },
      select: {
        id: true,
        code: true,
        owner: true,
        authorId: true,
        discountType: true,
        discountValue: true,
        scope: true,
        status: true,
        startsAt: true,
        endsAt: true,
        totalUsageLimit: true,
        perUserUsageLimit: true,
        usageCount: true,
        workScopes: {
          where: { workId: work.id },
          select: { workId: true },
        },
        authorScopes: {
          where: { authorId: work.authorId },
          select: { authorId: true },
        },
      },
    });

    if (!coupon) {
      return { ok: false, reason: "coupon_invalid" } as const;
    }

    const [userUsageCount, reservedCount] = await Promise.all([
      transaction.couponRedemption.count({
        where: {
          couponId: coupon.id,
          readerId: input.readerId,
          status: { in: ["reserved", "used"] },
        },
      }),
      transaction.couponRedemption.count({
        where: {
          couponId: coupon.id,
          status: "reserved",
        },
      }),
    ]);

    const validation = validateCouponRules({
      authorId: coupon.authorId,
      authorScopeMatch: coupon.authorScopes.length > 0,
      endsAt: coupon.endsAt,
      owner: coupon.owner,
      perUserUsageLimit: coupon.perUserUsageLimit,
      scope: coupon.scope,
      startsAt: coupon.startsAt,
      status: coupon.status,
      totalUsageLimit: coupon.totalUsageLimit,
      usageCount: coupon.usageCount + reservedCount,
      userUsageCount,
      workAuthorId: work.authorId,
      workScopeMatch: coupon.workScopes.length > 0,
    });

    if (!validation.valid) {
      return { ok: false, reason: "coupon_invalid" } as const;
    }

    const pricing = calculateCommercePricing(effectiveCommerce.priceAmount, {
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      owner: coupon.owner,
    });

    if (pricing.finalAmount !== BigInt(0)) {
      return { ok: false, reason: "not_zero_total" } as const;
    }

    const now = new Date();
    const order = await transaction.order.create({
      data: {
        ...buildCommerceOrderSnapshot({
          authorId: work.authorId,
          coupon: {
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            id: coupon.id,
            owner: coupon.owner,
          },
          currency: effectiveCommerce.currency,
          pricing,
          readerId: input.readerId,
          workId: work.id,
        }),
        orderNo: orderNumber(),
        status: "paid",
        paidAt: now,
      },
    });

    await transaction.orderConsent.create({
      data: {
        orderId: order.id,
        readerId: input.readerId,
        consentType: "digital_content_purchase",
        documentVersion: input.consent.documentVersion,
        documentHash: input.consent.documentHash,
        acceptedAt: now,
        ipAddress: input.consent.ipAddress,
        userAgent: input.consent.userAgent,
      },
    });

    await transaction.couponRedemption.create({
      data: {
        couponId: coupon.id,
        readerId: input.readerId,
        orderId: order.id,
        discountAmount: pricing.discountAmount,
        status: "used",
        redeemedAt: now,
      },
    });

    await transaction.coupon.update({
      where: { id: coupon.id },
      data: { usageCount: { increment: 1 } },
    });

    await transaction.workEntitlement.upsert({
      where: {
        readerId_workId: {
          readerId: input.readerId,
          workId: work.id,
        },
      },
      create: {
        readerId: input.readerId,
        workId: work.id,
        orderId: order.id,
        source: "purchase",
        status: "active",
        grantedAt: now,
      },
      update: {
        orderId: order.id,
        source: "purchase",
        status: "active",
        grantedAt: now,
        revokedAt: null,
      },
    });

    await transaction.financialLedger.create({
      data: {
        idempotencyKey: order.id + ":sale_gross",
        entryType: "sale_gross",
        amount: pricing.originalAmount,
        currency: effectiveCommerce.currency,
        orderId: order.id,
        workId: work.id,
        authorId: work.authorId,
        couponId: coupon.id,
        metadata: {
          finalAmount: pricing.finalAmount.toString(),
          zeroTotalCheckout: true,
        },
      },
    });

    if (pricing.discountAmount > BigInt(0)) {
      await transaction.financialLedger.create({
        data: {
          idempotencyKey:
            order.id +
            (coupon.owner === "platform"
              ? ":platform_coupon_discount"
              : ":author_coupon_discount"),
          entryType:
            coupon.owner === "platform"
              ? "platform_coupon_discount"
              : "author_coupon_discount",
          amount: pricing.discountAmount,
          currency: configuration.currency,
          orderId: order.id,
          workId: work.id,
          authorId: work.authorId,
          couponId: coupon.id,
          metadata: {
            authorEarningBaseAmount:
              pricing.authorEarningBaseAmount.toString(),
            platformCouponSubsidyAmount:
              pricing.platformCouponSubsidyAmount.toString(),
          },
        },
      });
    }

    return {
      ok: true,
      orderId: order.id,
      orderNo: order.orderNo,
    } as const;
  });
}
