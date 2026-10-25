/**
 * Illustrative author settlement only. This is intentionally NOT connected to
 * order settlement, payouts, ledgers, invoices or tax declarations.
 * All inputs and outputs are integer minor units (kuruş).
 */
export type IllustrativeDocumentMode = "invoice" | "expense_receipt";

const percent = (amount: bigint, rate: bigint) =>
  (amount * rate + BigInt(50)) / BigInt(100);
const percentBps = (amount: bigint, basisPoints: number) =>
  (amount * BigInt(basisPoints) + BigInt(5000)) / BigInt(10000);

export function calculateIllustrativeSettlement(
  saleNetAmount: bigint,
  mode: IllustrativeDocumentMode,
  commissionRateBps = 1500,
  serviceFeeRateBps = 500,
) {
  if (!Number.isSafeInteger(commissionRateBps) ||
      commissionRateBps < 0 || commissionRateBps > 9000 ||
      serviceFeeRateBps !== 500) {
    throw new Error("Unsupported financial rate: accountant review required.");
  }
  if (saleNetAmount < BigInt(0)) {
    throw new Error("Sale amount must not be negative.");
  }

  const saleVat = percent(saleNetAmount, BigInt(20));
  const readerTotal = saleNetAmount + saleVat;
  const commissionNet = percentBps(saleNetAmount, commissionRateBps);

  if (mode === "invoice") {
    // Assumes a VAT-registered commercial invoice from the author and a
    // legally distinct commission service invoice from İlkOku.
    const commissionVat = percent(commissionNet, BigInt(20));
    const authorInvoiceVat = saleVat;
    const authorGross = saleNetAmount;
    const authorBankPayment =
      authorGross + authorInvoiceVat - commissionNet - commissionVat;
    const vat1Payment = saleVat + commissionVat - authorInvoiceVat;
    const vat2Payment = BigInt(0);
    const withholding = BigInt(0);
    const platformServiceNet = BigInt(0);
    const platformServiceVat = BigInt(0);
    const profitBeforeCorporateTax = commissionNet;
    const corporateTaxIllustration = percent(profitBeforeCorporateTax, BigInt(25));
    const profitAfterTax = profitBeforeCorporateTax - corporateTaxIllustration;
    return {
      mode, saleNetAmount, saleVat, readerTotal, commissionNet,
      commissionVat, platformServiceNet, platformServiceVat, authorGross,
      authorInvoiceVat, withholding, authorBankPayment, vat1Payment,
      vat2Payment, profitBeforeCorporateTax, corporateTaxIllustration,
      profitAfterTax,
    };
  }

  // Assumes eligible GVK 18 telif settlement: commission is an economic
  // revenue-share margin; the additional 5% is a separately invoiced
  // service (VAT excluded). 2 No VAT is paid and fully deducted in 1 No.
  const authorGross = saleNetAmount - commissionNet;
  const withholding = percent(authorGross, BigInt(17));
  const platformServiceNet = percentBps(saleNetAmount, serviceFeeRateBps);
  const platformServiceVat = percent(platformServiceNet, BigInt(20));
  const authorInvoiceVat = BigInt(0);
  const commissionVat = BigInt(0);
  const authorBankPayment =
    authorGross - withholding - platformServiceNet - platformServiceVat;
  const vat2Payment = percent(authorGross, BigInt(20));
  const vat1Payment = saleVat + platformServiceVat - vat2Payment;
  const profitBeforeCorporateTax =
    saleNetAmount - authorGross + platformServiceNet;
  const corporateTaxIllustration = percent(profitBeforeCorporateTax, BigInt(25));
  const profitAfterTax = profitBeforeCorporateTax - corporateTaxIllustration;

  return {
    mode, saleNetAmount, saleVat, readerTotal, commissionNet,
    commissionVat, platformServiceNet, platformServiceVat, authorGross,
    authorInvoiceVat, withholding, authorBankPayment, vat1Payment,
    vat2Payment, profitBeforeCorporateTax, corporateTaxIllustration,
    profitAfterTax,
  };
}
