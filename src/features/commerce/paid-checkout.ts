import "server-only";

import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { validateCouponRules } from "./coupon-rules";
import { buildCommerceOrderSnapshot } from "./order-snapshot";
import { calculateCommercePricing } from "./pricing";
import { getPaymentProviderAdapter, type CommercePaymentMethod } from "./payment-providers";
import { isCommerceCheckoutEnabled } from "./runtime";

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
            saleModel: true,
            status: true,
          },
        },
      },
    });

    const configuration = work?.saleConfiguration;
    if (
      !work ||
      !configuration ||
      configuration.saleModel !== "paid" ||
      configuration.status !== "active" ||
      configuration.priceAmount === null ||
      configuration.priceAmount <= BigInt(0)
    ) {
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

    const pricing = calculateCommercePricing(
      configuration.priceAmount,
      coupon
        ? {
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            owner: coupon.owner,
          }
        : null,
    );

    if (pricing.finalAmount === BigInt(0)) {
      return { ok: false, reason: "zero_total_required" } as const;
    }

    const now = new Date();
    const order = await transaction.order.create({
      data: {
        ...buildCommerceOrderSnapshot({
          authorId: work.authorId,
          coupon,
          currency: configuration.currency,
          pricing,
          readerId: input.readerId,
          workId: work.id,
        }),
        orderNo: orderNumber(),
        status: "pending_payment",
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
        currency: configuration.currency,
        status: "pending",
      },
    });

    return {
      ok: true,
      amount: pricing.finalAmount,
      currency: configuration.currency,
      orderId: order.id,
      orderNo: order.orderNo,
      paymentId: payment.id,
      workId: work.id,
    } as const;
  });

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
