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
  if (discount <= 0n) return 0n;
  return discount > originalAmount ? originalAmount : discount;
}

export function calculateCommercePricing(
  originalAmount: bigint,
  coupon?: CommerceCouponPricing | null,
): CommercePricingBreakdown {
  if (originalAmount < 0n) {
    throw new Error("Original amount cannot be negative.");
  }

  if (!coupon) {
    return {
      authorEarningBaseAmount: originalAmount,
      discountAmount: 0n,
      finalAmount: originalAmount,
      originalAmount,
      platformCouponSubsidyAmount: 0n,
    };
  }

  if (coupon.discountValue <= 0n) {
    throw new Error("Coupon discount value must be positive.");
  }

  let rawDiscount: bigint;

  if (coupon.discountType === "percent") {
    if (coupon.discountValue > 100n) {
      throw new Error("Percentage discount cannot exceed 100.");
    }

    rawDiscount = (originalAmount * coupon.discountValue) / 100n;
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
      coupon.owner === "platform" ? discountAmount : 0n,
  };
}
