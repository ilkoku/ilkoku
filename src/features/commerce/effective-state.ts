export type EffectiveSaleConfiguration = {
  activatedAt: Date | null;
  currency: string;
  priceAmount: bigint | null;
  saleModel: "free" | "paid";
  status: "draft" | "ready" | "active" | "paused";
};

export type ConfirmedCommerceSnapshot = {
  accessPlanSnapshot: unknown;
  currency: string;
  priceAmount: bigint | null;
  publicationModel: "free" | "paid";
};

export function parseAccessPlanSnapshot(value: unknown) {
  const result: Record<string, "preview" | "locked"> = {};

  if (!Array.isArray(value)) return result;

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const chapterId =
      "chapterId" in item && typeof item.chapterId === "string"
        ? item.chapterId
        : null;
    const accessType =
      "accessType" in item &&
      (item.accessType === "preview" || item.accessType === "locked")
        ? item.accessType
        : null;

    if (chapterId && accessType) {
      result[chapterId] = accessType;
    }
  }

  return result;
}

export function shouldUseConfirmedPaidSnapshot(input: {
  configuration: EffectiveSaleConfiguration | null | undefined;
  latestConsent: ConfirmedCommerceSnapshot | null | undefined;
}) {
  return Boolean(
    input.configuration?.activatedAt &&
      input.configuration.status !== "active" &&
      input.latestConsent?.publicationModel === "paid",
  );
}

export function resolveEffectiveCommerceState(input: {
  configuration: EffectiveSaleConfiguration | null | undefined;
  latestConsent: ConfirmedCommerceSnapshot | null | undefined;
}) {
  const configuration = input.configuration;
  if (!configuration) {
    return {
      accessPlan: {} as Record<string, "preview" | "locked">,
      currency: "TRY",
      priceAmount: null,
      saleModel: "free" as const,
      useConfirmedSnapshot: false,
    };
  }

  const useConfirmedSnapshot = shouldUseConfirmedPaidSnapshot(input);
  if (!useConfirmedSnapshot || !input.latestConsent) {
    return {
      accessPlan: {} as Record<string, "preview" | "locked">,
      currency: configuration.currency,
      priceAmount: configuration.priceAmount,
      saleModel: configuration.saleModel,
      useConfirmedSnapshot: false,
    };
  }

  return {
    accessPlan: parseAccessPlanSnapshot(input.latestConsent.accessPlanSnapshot),
    currency: input.latestConsent.currency,
    priceAmount: input.latestConsent.priceAmount,
    saleModel: input.latestConsent.publicationModel,
    useConfirmedSnapshot: true,
  };
}
