export type CommerceCouponPricing = {
  discountType: "percent" | "fixed";
  discountValue: bigint;
  owner: "author" | "platform";
};

export type CommercePricingBreakdown = {
  authorEarningBaseAmount: bigint;
  discountAmount: bigint;
  finalAmount: bigint;
  originalAmount: bigint;
  platformCouponSubsidyAmount: bigint;
};

function clampDiscount(discount: bigint, originalAmount: bigint) {
  if (discount <= BigInt(0)) return BigInt(0);
  return discount > originalAmount ? originalAmount : discount;
}

export function calculateCommercePricing(
  originalAmount: bigint,
  coupon?: CommerceCouponPricing | null,
): CommercePricingBreakdown {
  if (originalAmount < BigInt(0)) {
    throw new Error("Original amount cannot be negative.");
  }

  if (!coupon) {
    return {
      authorEarningBaseAmount: originalAmount,
      discountAmount: BigInt(0),
      finalAmount: originalAmount,
      originalAmount,
      platformCouponSubsidyAmount: BigInt(0),
    };
  }

  if (coupon.discountValue <= BigInt(0)) {
    throw new Error("Coupon discount value must be positive.");
  }

  let rawDiscount: bigint;

  if (coupon.discountType === "percent") {
    if (coupon.discountValue > BigInt(100)) {
      throw new Error("Percentage discount cannot exceed 100.");
    }

    rawDiscount = (originalAmount * coupon.discountValue) / BigInt(100);
  } else {
    rawDiscount = coupon.discountValue;
  }

  const discountAmount = clampDiscount(rawDiscount, originalAmount);
  const finalAmount = originalAmount - discountAmount;

  return {
    authorEarningBaseAmount:
      coupon.owner === "author" ? finalAmount : originalAmount,
    discountAmount,
    finalAmount,
    originalAmount,
    platformCouponSubsidyAmount:
      coupon.owner === "platform" ? discountAmount : BigInt(0),
  };
}
