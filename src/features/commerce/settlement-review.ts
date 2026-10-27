import {
  calculateIllustrativeSettlement,
} from "./settlement-preview";
import { resolveLatestAuthorTaxReview } from "./tax-review-policy";

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
  paidAt: Date | null;
  currency: string;
  originalAmount: bigint;
  discountAmount: bigint;
  finalAmount: bigint;
  couponCodeSnapshot: string | null;
  refundedAt: Date | null;
  hasOpenOrProcessedRefund: boolean;
  sellerMode: string | null;
  priceQuote: {
    calculationVersion: string;
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
  commissionRateSnapshot?: {
    commissionRateBps: number;
    serviceFeeRateBps: number;
    source: string;
    sourceEventId: string | null;
    calculationVersion: string;
  } | null;
  taxReview?: {
    documentKind: string;
    decision: string;
    reviewedAt: Date;
    validUntil: Date | null;
  } | null;
};

const AUTHOR_SELLER_ROLE_NOTICE =
  "Satıcı eser sahibi yazardır; İlkOku aracı platformdur. Doğrudan satıcıya özgü hakediş ve vergi senaryoları bu siparişe uygulanmaz.";

export function reviewCommerceOrderSettlement(input: OrderReviewInput) {
  const blockers: string[] = [];
  const tax = resolveLatestAuthorTaxReview(input.taxReview ?? null, input.paidAt ?? new Date(0));
  const rate = input.commissionRateSnapshot;
  if (!rate || rate.calculationVersion !== "rate-v1" ||
      !["global", "author", "work"].includes(rate.source) ||
      !Number.isSafeInteger(rate.commissionRateBps) ||
      rate.commissionRateBps < 0 || rate.commissionRateBps > 9000 ||
      rate.serviceFeeRateBps !== 500 ||
      (rate.source === "global" && (rate.sourceEventId !== null || rate.commissionRateBps !== 1500)) ||
      (rate.source !== "global" && !rate.sourceEventId)) {
    blockers.push("Sipariş anına ait değişmez komisyon oranı kayıtlı değil veya tutarsız.");
  }
  if (!input.paidAt) blockers.push("Siparişin kesin tahsil tarihi bulunamadı.");
  if (tax.state !== "verified") {
    blockers.push("Yazarın sipariş ödeme anındaki mali belge incelemesi eksik, geçersiz veya geri çekilmiş.");
  } else if (tax.documentKind === "self_employed_receipt") {
    blockers.push("e-Serbest meslek makbuzu için ayrı stopaj ve KDV kuralları hesaplanmalı.");
  }

  if (input.status !== "paid") blockers.push("Sipariş kesinleşmiş paid durumda değil.");
  if (input.currency !== "TRY") blockers.push("Örnek hesap yalnız TRY siparişlerine uygundur.");
  if (input.finalAmount <= BigInt(0)) blockers.push("0 TL edinimde tahsilat ve ödenebilir telif oluşturulmaz.");
  if (input.refundedAt !== null || input.hasOpenOrProcessedRefund ||
      input.bookedEntryTypes.includes("refund")) {
    blockers.push("İade talebi veya işlenmiş kısmi/tam iade bulunan siparişin tam tutarı üzerinden hakediş hesaplanmaz.");
  }
  if (input.sellerMode === "third_party") {
    // The author being seller is expected, not an identity-verification failure.
    // Platform-direct settlement formulae must not be reused for intermediaries.
    blockers.push(AUTHOR_SELLER_ROLE_NOTICE);
  } else if (input.sellerMode !== "platform_direct") {
    blockers.push("Siparişin hukukî satıcı modeli kayıtlı değil veya belirsiz.");
  }
  if (!input.priceQuote || input.priceQuote.calculationVersion !== "quote-v1" ||
      input.priceQuote.taxTreatment !== "net_plus_vat") {
    blockers.push("Sipariş anına ait doğrulanabilir KDV hariç fiyat kaydı yok.");
  }
  if (input.couponCodeSnapshot || input.discountAmount !== BigInt(0)) {
    blockers.push("Kuponun ekonomik yükü ve indirim sonrası vergi matrahı ayrıca incelenmeli.");
  }
  // Exactly one captured payment must reconcile with the frozen order.
  // A second successful capture is an overpayment/duplicate-capture risk,
  // even when one of the payments has the expected amount.
  const successfulPayments = input.payments.filter((payment) => payment.status === "succeeded");
  if (successfulPayments.length !== 1 ||
      successfulPayments[0].currency !== input.currency ||
      successfulPayments[0].amount !== input.finalAmount) {
    blockers.push("Sipariş için tam bir başarılı ve tutarı eşleşen tahsilat kaydı gerekli; mükerrer tahsilat incelenmeli.");
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
        quote.listVatAmount !== (quote.listNetAmount * BigInt(2000) + BigInt(5000)) / BigInt(10000) ||
        quote.listNetAmount + quote.listVatAmount !== quote.listGrossAmount ||
        quote.discountGrossAmount < BigInt(0) ||
        quote.discountGrossAmount > quote.listGrossAmount ||
        quote.listGrossAmount - quote.discountGrossAmount !== quote.payableGrossAmount ||
        quote.listGrossAmount !== input.originalAmount ||
        quote.payableGrossAmount !== input.finalAmount ||
        quote.discountGrossAmount !== input.discountAmount ||
        input.originalAmount - input.discountAmount !== input.finalAmount) {
      blockers.push("Siparişin fiyat, KDV ve iskonto snapshot tutarları tutarsız.");
    }
  }

  // An author-owned sale may show neutral revenue-share illustrations even
  // though platform-direct tax/cash settlement is categorically disallowed.
  // Require ALL other preflight checks to pass. Never infer withholding,
  // post a ledger movement, or authorize a payout from this view.
  const authorPreviewEligible = input.sellerMode === "third_party" &&
    blockers.length === 1 && blockers[0] === AUTHOR_SELLER_ROLE_NOTICE &&
    quote !== null && rate !== null &&
    (tax.documentKind === "commercial_invoice" ||
      tax.documentKind === "gvk18_expense_receipt");
  const authorSellerCommission = authorPreviewEligible
    ? (quote!.listNetAmount * BigInt(rate!.commissionRateBps) + BigInt(5000)) / BigInt(10000)
    : null;
  const intermediaryRateBps = tax.documentKind === "gvk18_expense_receipt"
    ? rate?.serviceFeeRateBps ?? 0 : 0;
  const intermediaryPreview = authorPreviewEligible ? {
    sellerMode: "third_party" as const,
    documentKind: tax.documentKind,
    netSaleMinor: quote!.listNetAmount,
    saleVatMinor: quote!.listVatAmount,
    grossSaleMinor: input.finalAmount,
    commissionRateBps: rate!.commissionRateBps,
    commissionNetMinor: authorSellerCommission!,
    intermediaryFeeRateBps: intermediaryRateBps,
    intermediaryFeeNetMinor:
      (quote!.listNetAmount * BigInt(intermediaryRateBps) + BigInt(5000)) / BigInt(10000),
    withholdingMinor: null as bigint | null,
    status: "ACCOUNTING_PREVIEW_ONLY" as const,
  } : null;

  if (blockers.length > 0 || !quote) {
    return {
      blockers,
      scenarios: null,
      intermediaryPreview,
      approvalStatus: "accounting_verification_required" as const,
    };
  }

  // Neither scenario authorizes payment. Author tax category (commercial
  // invoice versus verified GVK18 expense receipt) must be checked manually.
  const invoiced = calculateIllustrativeSettlement(quote.listNetAmount, "invoice", rate!.commissionRateBps, rate!.serviceFeeRateBps);
  const expenseReceipt = calculateIllustrativeSettlement(quote.listNetAmount, "expense_receipt", rate!.commissionRateBps, rate!.serviceFeeRateBps);

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
      intermediaryPreview: null,
      approvalStatus: "accounting_verification_required" as const,
    };
  }

  return {
    blockers: [],
    intermediaryPreview: null,
    scenarios: {
      invoiced: tax.documentKind === "commercial_invoice" ? invoiced : null,
      expenseReceipt: tax.documentKind === "gvk18_expense_receipt" ? expenseReceipt : null,
    },
    approvalStatus: "accounting_verification_required" as const,
  };
}
