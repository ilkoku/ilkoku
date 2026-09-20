export function formatCommerceMoney(value: bigint, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
  }).format(Number(value) / 100);
}

export function formatCommerceDate(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

export const orderStatusLabels = {
  draft: "Taslak",
  pending_payment: "Ödeme bekliyor",
  paid: "Ödendi",
  failed: "Başarısız",
  cancelled: "İptal",
  refunded: "İade edildi",
} as const;

export const paymentStatusLabels = {
  pending: "Bekliyor",
  succeeded: "Başarılı",
  failed: "Başarısız",
  cancelled: "İptal",
  refunded: "İade edildi",
} as const;

export const refundStatusLabels = {
  requested: "Talep edildi",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  processing: "İşleniyor",
  processed: "Tamamlandı",
} as const;

export const paymentMethodLabels = {
  test: "Test",
  card: "Kredi / Banka Kartı",
  carrier: "Telefon Faturası",
} as const;
