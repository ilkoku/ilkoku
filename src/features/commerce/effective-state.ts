export type EffectiveSaleConfiguration = {
  activatedAt: Date | null;
  currency: string;
  priceAmount: bigint | null;
  priceTaxTreatment?: string;
  saleModel: "free" | "paid";
  status: "draft" | "ready" | "active" | "paused";
};

export type ConfirmedCommerceSnapshot = {
  accessPlanSnapshot: unknown;
  currency: string;
  priceAmount: bigint | null;
  priceTaxTreatment?: string;
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
      priceTaxTreatment: "legacy_inclusive",
      saleModel: "free" as const,
      status: "draft" as const,
      useConfirmedSnapshot: false,
    };
  }

  const useConfirmedSnapshot = shouldUseConfirmedPaidSnapshot(input);
  if (!useConfirmedSnapshot || !input.latestConsent) {
    return {
      accessPlan: {} as Record<string, "preview" | "locked">,
      currency: configuration.currency,
      priceAmount: configuration.priceAmount,
      priceTaxTreatment: configuration.priceTaxTreatment ?? "legacy_inclusive",
      saleModel: configuration.saleModel,
      status: configuration.status,
      useConfirmedSnapshot: false,
    };
  }

  return {
    accessPlan: parseAccessPlanSnapshot(input.latestConsent.accessPlanSnapshot),
    currency: input.latestConsent.currency,
    priceAmount: input.latestConsent.priceAmount,
    priceTaxTreatment: input.latestConsent.priceTaxTreatment ?? "legacy_inclusive",
    saleModel: input.latestConsent.publicationModel,
    status: "active" as const,
    useConfirmedSnapshot: true,
  };
}

/**
 * A submitted/ready paid work protects its explicitly locked chapters before
 * sale activation. Purchase readiness is a separate concern: missing seller,
 * contract or provider must never turn a locked chapter into free content.
 * Draft-only paid plans stay in preparation; historically activated plans stay
 * protected even while paused or edited.
 */
export function shouldEnforcePaidChapterAccess(input: {
  activatedAt: Date | null | undefined;
  saleModel: "free" | "paid";
  status: "draft" | "ready" | "active" | "paused";
}) {
  return (
    input.saleModel === "paid" &&
    (Boolean(input.activatedAt) ||
      input.status === "ready" ||
      input.status === "active")
  );
}

/** Shared read-only disclosure; buying and reading remain server-authorized. */
export function describeWorkSaleModel(input: {
  configuration: EffectiveSaleConfiguration | null | undefined;
  latestConsent: ConfirmedCommerceSnapshot | null | undefined;
}): { label: string; detail: string } {
  if (!input.configuration) return { label: "Ayarlanmadı", detail: "Yazar henüz yayın modeli seçmedi." };
  const current = resolveEffectiveCommerceState(input);
  if (current.useConfirmedSnapshot) {
    return { label: "Ücretli · Son onaylı", detail: "Taslak değişiklikler okurlara uygulanmadı; son onaylı ücretli erişim korunuyor." };
  }
  if (current.saleModel === "free") {
    return { label: "Ücretsiz", detail: "Eserin kayıtlı yayın modeli ücretsiz." };
  }
  if (current.status === "active") {
    return { label: "Ücretli", detail: "Ücretli erişim aktif. Satın alma uygunluğu eser sayfasında gösterilir." };
  }
  if (current.status === "ready") {
    return { label: "Ücretli · Hazırlıkta", detail: "Ücretli model kaydedildi. 0 TL hazırlık gerçek satış değildir; satın alma uygunluğu eser sayfasında kontrol edilir." };
  }
  return {
    label: current.status === "paused" ? "Ücretli · Duraklatıldı" : "Ücretli · Taslak",
    detail: "Bu eser henüz yeni ücretli satışa açılmadı.",
  };
}
