export type CouponRuleInput = {
  authorId: string | null;
  authorScopeMatch: boolean;
  endsAt: Date | null;
  owner: "author" | "platform";
  perUserUsageLimit: number;
  scope: "all_paid_works" | "selected_works" | "selected_authors";
  startsAt: Date | null;
  status: "draft" | "active" | "paused" | "expired";
  totalUsageLimit: number | null;
  usageCount: number;
  userUsageCount: number;
  workAuthorId: string;
  workScopeMatch: boolean;
};

export type CouponRuleResult =
  | { valid: true }
  | {
      valid: false;
      reason:
        | "inactive"
        | "not_started"
        | "expired"
        | "total_limit"
        | "user_limit"
        | "scope";
    };

export function validateCouponRules(
  input: CouponRuleInput,
  now = new Date(),
): CouponRuleResult {
  if (input.status !== "active") {
    return { valid: false, reason: "inactive" };
  }

  if (input.startsAt && input.startsAt > now) {
    return { valid: false, reason: "not_started" };
  }

  if (input.endsAt && input.endsAt < now) {
    return { valid: false, reason: "expired" };
  }

  if (
    input.totalUsageLimit !== null &&
    input.usageCount >= input.totalUsageLimit
  ) {
    return { valid: false, reason: "total_limit" };
  }

  if (input.userUsageCount >= input.perUserUsageLimit) {
    return { valid: false, reason: "user_limit" };
  }

  const applies =
    input.owner === "author"
      ? input.authorId === input.workAuthorId && input.workScopeMatch
      : input.scope === "all_paid_works" ||
        (input.scope === "selected_works" && input.workScopeMatch) ||
        (input.scope === "selected_authors" && input.authorScopeMatch);

  return applies
    ? { valid: true }
    : { valid: false, reason: "scope" };
}
