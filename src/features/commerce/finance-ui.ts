export function formatFinanceMoney(value: bigint, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
  }).format(Number(value) / 100);
}

export function formatFinanceDate(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

export const ledgerTypeLabels = {
  sale_gross: "Brüt satış",
  author_coupon_discount: "Yazar kupon indirimi",
  platform_coupon_discount: "İlkOku kupon maliyeti",
  payment_provider_fee: "Ödeme sağlayıcı ücreti",
  platform_commission: "İlkOku hizmet payı",
  author_earning: "Yazar hakedişi",
  refund: "İade",
  tax_withholding: "Vergi / stopaj",
  adjustment: "Düzeltme",
  payout: "Yazar ödemesi",
} as const;

export const payoutStatusLabels = {
  pending: "Bekliyor",
  processing: "İşleniyor",
  paid: "Ödendi",
  failed: "Başarısız",
  held: "Bloke",
} as const;
