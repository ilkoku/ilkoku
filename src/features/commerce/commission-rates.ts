/**
 * Bps are 1/100th of a percent: 1500 = 15%, 500 = 5%.
 * The 5% is a SEPARATE illustrative invoiceable service for eligible GVK18
 * authors only, not an extra charge to the reader or commercial invoice author.
 */
export const DEFAULT_COMMISSION_BPS = 1500;
export const GVK18_SERVICE_FEE_BPS = 500;
export const MAX_SPECIAL_COMMISSION_BPS = 9000;

export type RateEvent = {
  id: string;
  rateBps: number;
  active: boolean;
};
export type ResolvedCommissionRate = {
  commissionRateBps: number;
  serviceFeeRateBps: number;
  source: "global" | "author" | "work";
  sourceEventId: string | null;
};

export function readRateBasisPoints(value: string) {
  const input = value.trim().replace(",", ".");
  if (!/^(?:0|[1-9]\d?)(?:\.\d{1,2})?$|^90(?:\.0{1,2})?$/u.test(input)) return null;
  const [whole, fraction = ""] = input.split(".");
  const rate = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return Number.isInteger(rate) && rate >= 0 && rate <= MAX_SPECIAL_COMMISSION_BPS ? rate : null;
}

export function resolveCommissionRate(input: {
  workEvent?: RateEvent | null;
  authorEvent?: RateEvent | null;
}): ResolvedCommissionRate {
  if (input.workEvent?.active) {
    return {
      commissionRateBps: input.workEvent.rateBps,
      serviceFeeRateBps: GVK18_SERVICE_FEE_BPS,
      source: "work",
      sourceEventId: input.workEvent.id,
    };
  }
  if (input.authorEvent?.active) {
    return {
      commissionRateBps: input.authorEvent.rateBps,
      serviceFeeRateBps: GVK18_SERVICE_FEE_BPS,
      source: "author",
      sourceEventId: input.authorEvent.id,
    };
  }
  return {
    commissionRateBps: DEFAULT_COMMISSION_BPS,
    serviceFeeRateBps: GVK18_SERVICE_FEE_BPS,
    source: "global",
    sourceEventId: null,
  };
}
