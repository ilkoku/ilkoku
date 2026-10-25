import "server-only";

import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { validateCouponRules } from "./coupon-rules";
import { resolveEffectiveCommerceState } from "./effective-state";
import { buildCommerceOrderSnapshot } from "./order-snapshot";
import { resolveOrderCommissionRate } from "./commission-rates-repository";
import { quoteCommercePrice } from "./price-quote";
import { getPaymentProviderAdapter, type CommercePaymentMethod } from "./payment-providers";
import { isCommerceCheckoutEnabled } from "./runtime";
import { getVerifiedWorkSeller } from "./verified-seller";

export type PaidCheckoutStartResult =
  | {
      ok: true;
      amount: bigint;
      currency: string;
      orderId: string;
      orderNo: string;
      paymentId: string;
      providerCode: string;
      providerTransactionId: string;
      redirectUrl: string;
    }
  | {
      ok: false;
      orderNo?: string;
      reason:
        | "checkout_disabled"
        | "provider_unavailable"
        | "work_unavailable"
        | "seller_unverified"
        | "already_entitled"
        | "order_pending"
        | "coupon_invalid"
        | "zero_total_required"
        | "provider_error";
    };

function orderNumber() {
  return "ILK-" + randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase();
}

async function failPreparedPayment(input: {
  orderId: string;
  paymentId: string;
  failureCode: string;
  failureMessage: string;
}) {
  const now = new Date();
  await prisma.$transaction(async (transaction) => {
    await transaction.payment.updateMany({
      where: { id: input.paymentId, status: "pending" },
      data: {
        status: "failed",
        failureCode: input.failureCode,
        failureMessage: input.failureMessage.slice(0, 500),
        completedAt: now,
      },
    });

    await transaction.order.updateMany({
      where: { id: input.orderId, status: "pending_payment" },
      data: { status: "failed" },
    });

    await transaction.couponRedemption.updateMany({
      where: { orderId: input.orderId, status: "reserved" },
      data: { status: "released", releasedAt: now },
    });
  });
}

export async function startPaidCheckout(input: {
  consent: {
    documentHash: string;
    documentVersion: string;
    ipAddress: string | null;
    userAgent: string | null;
  };
  couponCode?: string | null;
  method: CommercePaymentMethod;
  readerId: string;
  returnUrl: string;
  workId: string;
}): Promise<PaidCheckoutStartResult> {
  if (!isCommerceCheckoutEnabled()) {
    return { ok: false, reason: "checkout_disabled" };
  }

  const adapter = getPaymentProviderAdapter(input.method);
  if (!adapter) {
    return { ok: false, reason: "provider_unavailable" };
  }

  const normalizedCouponCode = input.couponCode?.trim().toUpperCase() || null;

  const prepared = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      SELECT id
      FROM User
      WHERE id = ${input.readerId}
      FOR UPDATE
    `;

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
            priceTaxTreatment: true,
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
            priceTaxTreatment: true,
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

    if (
      !work ||
      !configuration ||
      effectiveCommerce.saleModel !== "paid" ||
      effectiveCommerce.status !== "active" ||
      effectiveCommerce.priceAmount === null ||
      effectiveCommerce.priceAmount <= BigInt(0)
    ) {
      return { ok: false, reason: "work_unavailable" } as const;
    }

    // Provider-backed checkouts must satisfy the same legal seller/rights
    // precondition as provider-free 0 TL acquisitions. This is checked
    // before creating any order, payment, consent, or coupon reservation.
    const verifiedSeller = await getVerifiedWorkSeller(work.id, transaction);
    if (!verifiedSeller) {
      return { ok: false, reason: "seller_unverified" } as const;
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

    const pendingOrder = await transaction.order.findFirst({
      where: {
        readerId: input.readerId,
        workId: work.id,
        status: "pending_payment",
      },
      orderBy: { createdAt: "desc" },
      select: { orderNo: true },
    });

    if (pendingOrder) {
      return {
        ok: false,
        orderNo: pendingOrder.orderNo,
        reason: "order_pending",
      } as const;
    }

    let coupon:
      | {
          code: string;
          discountType: "percent" | "fixed";
          discountValue: bigint;
          id: string;
          owner: "author" | "platform";
        }
      | null = null;

    if (normalizedCouponCode) {
      const candidate = await transaction.coupon.findUnique({
        where: { code: normalizedCouponCode },
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

      const record = await transaction.coupon.findUnique({
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

      if (!record) {
        return { ok: false, reason: "coupon_invalid" } as const;
      }

      const [userUsageCount, reservedCount] = await Promise.all([
        transaction.couponRedemption.count({
          where: {
            couponId: record.id,
            readerId: input.readerId,
            status: { in: ["reserved", "used"] },
          },
        }),
        transaction.couponRedemption.count({
          where: { couponId: record.id, status: "reserved" },
        }),
      ]);

      const validation = validateCouponRules({
        authorId: record.authorId,
        authorScopeMatch: record.authorScopes.length > 0,
        endsAt: record.endsAt,
        owner: record.owner,
        perUserUsageLimit: record.perUserUsageLimit,
        scope: record.scope,
        startsAt: record.startsAt,
        status: record.status,
        totalUsageLimit: record.totalUsageLimit,
        usageCount: record.usageCount + reservedCount,
        userUsageCount,
        workAuthorId: work.authorId,
        workScopeMatch: record.workScopes.length > 0,
      });

      if (!validation.valid) {
        return { ok: false, reason: "coupon_invalid" } as const;
      }

      coupon = {
        code: record.code,
        discountType: record.discountType,
        discountValue: record.discountValue,
        id: record.id,
        owner: record.owner,
      };
    }

    const priceQuote = quoteCommercePrice({
      configuredPriceAmount: effectiveCommerce.priceAmount,
      taxTreatment: effectiveCommerce.priceTaxTreatment,
      coupon: coupon
        ? {
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            owner: coupon.owner,
          }
        : null,
    });
    const { pricing } = priceQuote;

    if (pricing.finalAmount === BigInt(0)) {
      return { ok: false, reason: "zero_total_required" } as const;
    }

    const now = new Date();
    const commissionRate = await resolveOrderCommissionRate(transaction, work.authorId, work.id);
    const order = await transaction.order.create({
      data: {
        ...buildCommerceOrderSnapshot({
          authorId: work.authorId,
          coupon,
          currency: effectiveCommerce.currency,
          pricing,
          priceQuote,
          commissionRate,
          readerId: input.readerId,
          workId: work.id,
        }),
        orderNo: orderNumber(),
        status: "pending_payment",
      },
    });

    // Freeze the approved seller and work rights at order creation. Later
    // amendments/revocations must not silently rewrite the historical seller.
    await transaction.orderLegalSnapshot.create({
      data: {
        orderId: order.id,
        legalPartyId: verifiedSeller.party.id,
        sellerAssignmentId: verifiedSeller.assignmentId,
        authorizationId: verifiedSeller.rights.id,
        sellerMode: verifiedSeller.mode,
        sellerName: verifiedSeller.party.legalName!,
        sellerTaxIdentifier: verifiedSeller.party.taxIdentifier!,
        sellerAddress: verifiedSeller.party.legalAddress!,
        sellerEmail: verifiedSeller.party.contactEmail!,
        sellerPhone: verifiedSeller.party.contactPhone,
        rightsDocumentHash: verifiedSeller.rights.documentHash!,
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

    if (coupon) {
      await transaction.couponRedemption.create({
        data: {
          couponId: coupon.id,
          readerId: input.readerId,
          orderId: order.id,
          discountAmount: pricing.discountAmount,
          status: "reserved",
        },
      });
    }

    const payment = await transaction.payment.create({
      data: {
        orderId: order.id,
        method: input.method,
        provider: adapter.code,
        amount: pricing.finalAmount,
        currency: effectiveCommerce.currency,
        status: "pending",
      },
    });

    return {
      ok: true,
      amount: pricing.finalAmount,
      currency: effectiveCommerce.currency,
      orderId: order.id,
      orderNo: order.orderNo,
      paymentId: payment.id,
      workId: work.id,
    } as const;
  }, { isolationLevel: "ReadCommitted" });

  if (!prepared.ok) return prepared;

  try {
    const providerResult = await adapter.createPayment({
      amount: prepared.amount,
      currency: prepared.currency,
      orderId: prepared.orderId,
      orderNo: prepared.orderNo,
      paymentId: prepared.paymentId,
      readerId: input.readerId,
      returnUrl: input.returnUrl,
      workId: prepared.workId,
    });

    await prisma.payment.update({
      where: { id: prepared.paymentId },
      data: {
        providerTransactionId: providerResult.providerTransactionId,
      },
    });

    return {
      ok: true,
      amount: prepared.amount,
      currency: prepared.currency,
      orderId: prepared.orderId,
      orderNo: prepared.orderNo,
      paymentId: prepared.paymentId,
      providerCode: adapter.code,
      providerTransactionId: providerResult.providerTransactionId,
      redirectUrl: providerResult.redirectUrl,
    };
  } catch (error) {
    console.error("COMMERCE_PROVIDER_CREATE_PAYMENT_ERROR", {
      error,
      orderId: prepared.orderId,
      paymentId: prepared.paymentId,
      provider: adapter.code,
    });

    await failPreparedPayment({
      orderId: prepared.orderId,
      paymentId: prepared.paymentId,
      failureCode: "PROVIDER_INIT_FAILED",
      failureMessage: "Payment provider initialization failed.",
    });

    return { ok: false, reason: "provider_error" };
  }
}
