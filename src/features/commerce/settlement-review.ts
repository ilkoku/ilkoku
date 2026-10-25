import {
  calculateIllustrativeSettlement,
} from "./settlement-preview";

/**
 * Order-linked accounting review, not a ledger posting.
 * Rates represent current proposal, never authoritative for historic orders.
 *
 * BLOCK all numerical projections unless the original order has an exact
 * net + VAT snapshot, no coupon/refund, a direct platform seller, a completed
 * nonzero payment and no already-booked author/commission tax ledger entries.
 */
export type OrderReviewInput = {
  status: string;
  currency: string;
  originalAmount: bigint;
  discountAmount: bigint;
  finalAmount: bigint;
  couponCodeSnapshot: string | null;
  refundedAt: Date | null;
  sellerMode: string | null;
  priceQuote: {
    taxTreatment: string;
    vatRateBasisPoints: number;
    listNetAmount: bigint;
    listVatAmount: bigint;
    listGrossAmount: bigint;
    discountGrossAmount: bigint;
    payableGrossAmount: bigint;
  } | null;
  payments: { status: string; amount: bigint; currency: string }[];
  bookedEntryTypes: string[];
};

export function reviewCommerceOrderSettlement(input: OrderReviewInput) {
  const blockers: string[] = [];

  if (input.status !== "paid") blockers.push("Sipariş kesinleşmiş paid durumda değil.");
  if (input.currency !== "TRY") blockers.push("Örnek hesap yalnız TRY siparişlerine uygundur.");
  if (input.finalAmount <= BigInt(0)) blockers.push("0 TL edinimde tahsilat ve ödenebilir telif oluşturulmaz.");
  if (input.refundedAt !== null) blockers.push("İade işlemine konu sipariş.");
  if (input.sellerMode !== "platform_direct") {
    blockers.push("Satıcının İlkOku olduğu hukukî kayıt doğrulanmalı.");
  }
  if (!input.priceQuote || input.priceQuote.taxTreatment !== "net_plus_vat") {
    blockers.push("Sipariş anına ait doğrulanabilir KDV hariç fiyat kaydı yok.");
  }
  if (input.couponCodeSnapshot || input.discountAmount !== BigInt(0)) {
    blockers.push("Kuponun ekonomik yükü ve indirim sonrası vergi matrahı ayrıca incelenmeli.");
  }
  if (!input.payments.some((payment) =>
    payment.status === "succeeded" &&
    payment.currency === input.currency &&
    payment.amount === input.finalAmount
  )) {
    blockers.push("Sipariş toplamıyla eşleşen başarılı tahsilat kaydı yok.");
  }
  if (input.bookedEntryTypes.some((type) =>
    ["author_earning", "platform_commission", "tax_withholding", "payout"].includes(type)
  )) {
    blockers.push("Bu sipariş için mevcut mali hareketler var; mükerrer kayıt riski incelenmeli.");
  }

  const quote = input.priceQuote;
  if (quote) {
    if (quote.vatRateBasisPoints !== 2000 ||
        quote.listNetAmount < BigInt(0) ||
        quote.listVatAmount < BigInt(0) ||
        quote.listNetAmount + quote.listVatAmount !== quote.listGrossAmount ||
        quote.listGrossAmount !== input.originalAmount ||
        quote.payableGrossAmount !== input.finalAmount ||
        quote.discountGrossAmount !== input.discountAmount) {
      blockers.push("Siparişin fiyat, KDV ve iskonto snapshot tutarları tutarsız.");
    }
  }

  if (blockers.length > 0 || !quote) {
    return {
      blockers,
      scenarios: null,
      approvalStatus: "accounting_verification_required" as const,
    };
  }

  // Neither scenario authorizes payment. Author tax category (commercial
  // invoice versus verified GVK18 expense receipt) must be checked manually.
  const invoiced = calculateIllustrativeSettlement(quote.listNetAmount, "invoice");
  const expenseReceipt = calculateIllustrativeSettlement(quote.listNetAmount, "expense_receipt");

  const reconcile = (p: typeof invoiced) =>
    p.readerTotal - p.authorBankPayment - p.withholding -
    p.vat1Payment - p.vat2Payment - p.corporateTaxIllustration === p.profitAfterTax;

  if (invoiced.readerTotal !== input.finalAmount ||
      expenseReceipt.readerTotal !== input.finalAmount ||
      !reconcile(invoiced) ||
      !reconcile(expenseReceipt)) {
    return {
      blockers: ["Örnek mali hesap ile sipariş tutarı mutabık değil."],
      scenarios: null,
      approvalStatus: "accounting_verification_required" as const,
    };
  }

  return {
    blockers: [],
    scenarios: { invoiced, expenseReceipt },
    approvalStatus: "accounting_verification_required" as const,
  };
}
