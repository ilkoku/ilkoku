import { calculateCommercePricing, type CommerceCouponPricing } from "./pricing";

/**
 * legacy_inclusive: existing published prices are never silently raised.
 * net_plus_vat: explicit new list price is net; coupons always discount
 * the VAT-INCLUSIVE checkout total.
 *
 * This is an immutable price/checkout QUOTE, not a tax declaration.
 * Subsidized platform coupons need their own tax treatment reviewed.
 */
export type PriceTaxTreatment = "legacy_inclusive" | "net_plus_vat";
export const QUOTE_VAT_RATE_BASIS_POINTS = 2000;

function vatFromNet(amount: bigint): bigint {
  if (amount < BigInt(0)) throw new Error("Price cannot be negative");
  return (amount * BigInt(QUOTE_VAT_RATE_BASIS_POINTS) + BigInt(5000)) / BigInt(10000);
}

export function quoteCommercePrice(input: {
  configuredPriceAmount: bigint;
  taxTreatment: string | null | undefined;
  coupon?: CommerceCouponPricing | null;
}) {
  const taxTreatment: PriceTaxTreatment = input.taxTreatment === "net_plus_vat"
    ? "net_plus_vat" : "legacy_inclusive";
  const listNetAmount = taxTreatment === "net_plus_vat" ? input.configuredPriceAmount : null;
  const listVatAmount = listNetAmount === null ? null : vatFromNet(listNetAmount);
  const listGrossAmount = input.configuredPriceAmount + (listVatAmount ?? BigInt(0));
  const pricing = calculateCommercePricing(listGrossAmount, input.coupon);

  if (pricing.finalAmount + pricing.discountAmount !== pricing.originalAmount) {
    throw new Error("Commerce quote must reconcile to its gross list price.");
  }

  return {
    pricing,
    taxTreatment,
    listNetAmount,
    listVatAmount,
    listGrossAmount,
    vatRateBasisPoints: taxTreatment === "net_plus_vat"
      ? QUOTE_VAT_RATE_BASIS_POINTS : null,
  };
}

export function buildOrderPriceQuoteSnapshot(
  quote: ReturnType<typeof quoteCommercePrice>,
) {
  if (quote.taxTreatment !== "net_plus_vat" ||
      quote.listNetAmount === null || quote.listVatAmount === null ||
      quote.vatRateBasisPoints === null) return null;
  return {
    taxTreatment: quote.taxTreatment,
    calculationVersion: "quote-v1",
    vatRateBasisPoints: quote.vatRateBasisPoints,
    listNetAmount: quote.listNetAmount,
    listVatAmount: quote.listVatAmount,
    listGrossAmount: quote.pricing.originalAmount,
    discountGrossAmount: quote.pricing.discountAmount,
    payableGrossAmount: quote.pricing.finalAmount,
  };
}
