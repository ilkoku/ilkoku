import "server-only";

import { prisma } from "@/lib/prisma";
import type { VerifiedProviderWebhookEvent } from "./payment-providers";

export type VerifiedProviderPaymentEvent = VerifiedProviderWebhookEvent & {
  providerCode: string;
};

export type ProviderPaymentCompletionResult =
  | { ok: true; orderId: string; status: "paid" | "failed" | "cancelled"; idempotent: boolean }
  | {
      ok: false;
      reason:
        | "payment_not_found"
        | "amount_mismatch"
        | "currency_mismatch"
        | "state_conflict";
    };

export async function applyVerifiedProviderPaymentEvent(
  event: VerifiedProviderPaymentEvent,
): Promise<ProviderPaymentCompletionResult> {
  const payment = await prisma.payment.findUnique({
    where: {
      provider_providerTransactionId: {
        provider: event.providerCode,
        providerTransactionId: event.providerTransactionId,
      },
    },
    select: { id: true, orderId: true },
  });

  if (!payment) {
    return { ok: false, reason: "payment_not_found" };
  }

  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      SELECT id
      FROM Payment
      WHERE id = ${payment.id}
      FOR UPDATE
    `;
    await transaction.$queryRaw`
      SELECT id
      FROM \`Order\`
      WHERE id = ${payment.orderId}
      FOR UPDATE
    `;

    const current = await transaction.payment.findUnique({
      where: { id: payment.id },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        order: {
          select: {
            id: true,
            readerId: true,
            workId: true,
            authorId: true,
            couponId: true,
            couponOwnerSnapshot: true,
            originalAmount: true,
            discountAmount: true,
            finalAmount: true,
            authorEarningBaseAmount: true,
            currency: true,
            status: true,
            couponRedemption: {
              select: {
                id: true,
                couponId: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!current) {
      return { ok: false, reason: "payment_not_found" } as const;
    }

    if (current.status === "succeeded" && event.outcome === "succeeded") {
      return {
        ok: true,
        orderId: current.order.id,
        status: "paid",
        idempotent: true,
      } as const;
    }

    if (
      (current.status === "failed" && event.outcome === "failed") ||
      (current.status === "cancelled" && event.outcome === "cancelled")
    ) {
      return {
        ok: true,
        orderId: current.order.id,
        status: event.outcome,
        idempotent: true,
      } as const;
    }

    if (current.status !== "pending") {
      return { ok: false, reason: "state_conflict" } as const;
    }

    if (current.amount !== event.amount) {
      await transaction.payment.update({
        where: { id: current.id },
        data: {
          failureCode: "PROVIDER_AMOUNT_MISMATCH",
          failureMessage: `Expected ${current.amount.toString()} but provider reported ${event.amount.toString()}.`,
        },
      });
      return { ok: false, reason: "amount_mismatch" } as const;
    }

    if (current.currency !== event.currency) {
      await transaction.payment.update({
        where: { id: current.id },
        data: {
          failureCode: "PROVIDER_CURRENCY_MISMATCH",
          failureMessage: `Expected ${current.currency} but provider reported ${event.currency}.`,
        },
      });
      return { ok: false, reason: "currency_mismatch" } as const;
    }

    const now = new Date();

    if (event.outcome === "failed" || event.outcome === "cancelled") {
      await transaction.payment.update({
        where: { id: current.id },
        data: {
          status: event.outcome,
          failureCode: event.failureCode ?? null,
          failureMessage: event.failureMessage?.slice(0, 500) ?? null,
          completedAt: now,
        },
      });

      await transaction.order.updateMany({
        where: {
          id: current.order.id,
          status: "pending_payment",
        },
        data: {
          status: event.outcome === "failed" ? "failed" : "cancelled",
          cancelledAt: event.outcome === "cancelled" ? now : undefined,
        },
      });

      await transaction.couponRedemption.updateMany({
        where: {
          orderId: current.order.id,
          status: "reserved",
        },
        data: {
          status: "released",
          releasedAt: now,
        },
      });

      return {
        ok: true,
        orderId: current.order.id,
        status: event.outcome,
        idempotent: false,
      } as const;
    }

    if (current.order.status !== "pending_payment") {
      return { ok: false, reason: "state_conflict" } as const;
    }

    if (current.order.couponRedemption) {
      await transaction.$queryRaw`
        SELECT id
        FROM Coupon
        WHERE id = ${current.order.couponRedemption.couponId}
        FOR UPDATE
      `;

      if (current.order.couponRedemption.status !== "used") {
        await transaction.couponRedemption.update({
          where: { id: current.order.couponRedemption.id },
          data: {
            status: "used",
            redeemedAt: now,
            releasedAt: null,
          },
        });
        await transaction.coupon.update({
          where: { id: current.order.couponRedemption.couponId },
          data: { usageCount: { increment: 1 } },
        });
      }
    }

    await transaction.payment.update({
      where: { id: current.id },
      data: {
        status: "succeeded",
        failureCode: null,
        failureMessage: null,
        completedAt: now,
      },
    });

    await transaction.order.update({
      where: { id: current.order.id },
      data: {
        status: "paid",
        paidAt: now,
        cancelledAt: null,
      },
    });

    await transaction.workEntitlement.upsert({
      where: {
        readerId_workId: {
          readerId: current.order.readerId,
          workId: current.order.workId,
        },
      },
      create: {
        readerId: current.order.readerId,
        workId: current.order.workId,
        orderId: current.order.id,
        source: "purchase",
        status: "active",
        grantedAt: now,
      },
      update: {
        orderId: current.order.id,
        source: "purchase",
        status: "active",
        grantedAt: now,
        revokedAt: null,
      },
    });

    await transaction.financialLedger.upsert({
      where: { idempotencyKey: current.order.id + ":sale_gross" },
      create: {
        idempotencyKey: current.order.id + ":sale_gross",
        entryType: "sale_gross",
        amount: current.order.originalAmount,
        currency: current.order.currency,
        orderId: current.order.id,
        workId: current.order.workId,
        authorId: current.order.authorId,
        couponId: current.order.couponId,
        metadata: {
          finalAmount: current.order.finalAmount.toString(),
          provider: event.providerCode,
        },
      },
      update: {},
    });

    if (current.order.discountAmount > BigInt(0) && current.order.couponOwnerSnapshot) {
      const suffix =
        current.order.couponOwnerSnapshot === "platform"
          ? ":platform_coupon_discount"
          : ":author_coupon_discount";
      const entryType =
        current.order.couponOwnerSnapshot === "platform"
          ? "platform_coupon_discount"
          : "author_coupon_discount";

      await transaction.financialLedger.upsert({
        where: { idempotencyKey: current.order.id + suffix },
        create: {
          idempotencyKey: current.order.id + suffix,
          entryType,
          amount: current.order.discountAmount,
          currency: current.order.currency,
          orderId: current.order.id,
          workId: current.order.workId,
          authorId: current.order.authorId,
          couponId: current.order.couponId,
          metadata: {
            authorEarningBaseAmount:
              current.order.authorEarningBaseAmount.toString(),
            provider: event.providerCode,
          },
        },
        update: {},
      });
    }

    return {
      ok: true,
      orderId: current.order.id,
      status: "paid",
      idempotent: false,
    } as const;
  });
}
