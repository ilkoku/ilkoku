import type { CommercePricingBreakdown } from "./pricing";
import { buildOrderPriceQuoteSnapshot, type quoteCommercePrice } from "./price-quote";
import type { ResolvedCommissionRate } from "./commission-rates";

export type CommerceOrderCouponSnapshot = {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: bigint;
  id: string;
  owner: "author" | "platform";
};

export function buildCommerceOrderSnapshot(input: {
  authorId: string;
  coupon?: CommerceOrderCouponSnapshot | null;
  currency: string;
  pricing: CommercePricingBreakdown;
  commissionRate: ResolvedCommissionRate;
  priceQuote?: ReturnType<typeof quoteCommercePrice>;
  readerId: string;
  workId: string;
}) {
  return {
    readerId: input.readerId,
    workId: input.workId,
    authorId: input.authorId,
    couponId: input.coupon?.id ?? null,
    originalAmount: input.pricing.originalAmount,
    discountAmount: input.pricing.discountAmount,
    finalAmount: input.pricing.finalAmount,
    authorEarningBaseAmount: input.pricing.authorEarningBaseAmount,
    ...(input.priceQuote && buildOrderPriceQuoteSnapshot(input.priceQuote)
      ? { priceQuoteSnapshot: { create: buildOrderPriceQuoteSnapshot(input.priceQuote)! } }
      : {}),
    commissionRateSnapshot: {
      create: {
        commissionRateBps: input.commissionRate.commissionRateBps,
        serviceFeeRateBps: input.commissionRate.serviceFeeRateBps,
        source: input.commissionRate.source,
        sourceEventId: input.commissionRate.sourceEventId,
        calculationVersion: "rate-v1",
      },
    },
    currency: input.currency,
    couponCodeSnapshot: input.coupon?.code ?? null,
    couponOwnerSnapshot: input.coupon?.owner ?? null,
    discountTypeSnapshot: input.coupon?.discountType ?? null,
    discountValueSnapshot: input.coupon?.discountValue ?? null,
  };
}
