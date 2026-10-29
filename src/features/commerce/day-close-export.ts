import { createHash } from "node:crypto";

export const DAY_CLOSE_TIME_ZONE = "Europe/Istanbul";
export const DAY_CLOSE_VERSION = "day-close-v1";
export const DAY_CLOSE_MAX_ROWS = 5000;

export class DayCloseDataIntegrityError extends Error {
  constructor(public readonly recordType: string, public readonly issue: "EMPTY" | "DUPLICATE") {
    super("DAY_CLOSE_" + issue + "_" + recordType + "_REFERENCE");
    this.name = "DayCloseDataIntegrityError";
  }
}

/** A closed Istanbul business day. Türkiye uses UTC+03:00 throughout 2026. */
export function istanbulBusinessDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DAY_CLOSE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return [get("year"), get("month"), get("day")].join("-");
}

export function closedDayRange(day: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(day)) return null;
  const startMs = Date.parse(day + "T00:00:00.000+03:00");
  if (!Number.isFinite(startMs) || new Date(startMs + 3 * 3600000).toISOString().slice(0, 10) !== day) return null;
  if (day >= istanbulBusinessDate(now)) return null; // Never export an open/future day.
  return { start: new Date(startMs), end: new Date(startMs + 86400000), day };
}

export type CsvField = string | number | bigint | null | undefined;
export function safeCsvDelimited(rows: readonly CsvField[][], delimiter: "," | ";") {
  const cell = (value: CsvField): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "number" || typeof value === "bigint") return String(value);
    // Spreadsheet formula injection protection on ALL untrusted text fields.
    const text = /^[\s]*[=+@-]/u.test(value) || /^[\t\r\n]/u.test(value) ? "'" + value : value;
    return '"' + text.replace(/"/gu, '""') + '"';
  };
  return "\uFEFF" + rows.map((row) => row.map(cell).join(delimiter)).join("\r\n") + "\r\n";
}

export function safeCsv(rows: readonly CsvField[][]) {
  return safeCsvDelimited(rows, ",");
}

/** Human/accountant-facing Turkish-locale amount; exact bigint arithmetic, no floating point. */
export function minorToTurkishLira(minor: bigint): string {
  const sign = minor < BigInt(0) ? "-" : "";
  const absolute = minor < BigInt(0) ? -minor : minor;
  return sign + (absolute / BigInt(100)).toString() + "," +
    (absolute % BigInt(100)).toString().padStart(2,"0");
}

export function sha256(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Small, dependency-free ZIP (STORE method). Avoids archiving on disk. */
export function zipFiles(files: { name: string; data: string }[]): Buffer {
  const parts: Buffer[] = [], central: Buffer[] = [];
  let offset = 0;
  // Fixed valid MS-DOS date (1980-01-01). Keeps ZIP bytes reproducible without invalid 00/00 dates.
  const fixedDosDate = 0x0021;
  for (const { name, data } of files) {
    if (!/^[a-z0-9._-]+$/u.test(name)) throw new Error("Unsafe ZIP filename");
    const filename = Buffer.from(name, "utf8");
    const body = Buffer.from(data, "utf8");
    if (body.length > 8 * 1024 * 1024) throw new Error("Day-close file exceeds size limit");
    const crc = crc32(body);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 filenames
    local.writeUInt16LE(fixedDosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(body.length, 22);
    local.writeUInt16LE(filename.length, 26);
    parts.push(local, filename, body);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(fixedDosDate, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(body.length, 20);
    dir.writeUInt32LE(body.length, 24);
    dir.writeUInt16LE(filename.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, filename);
    offset += local.length + filename.length + body.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, ...central, end]);
}

export type DayCloseOrder = {
  orderNo: string;
  paidAt: Date | null;
  status: string;
  sellerMode: string | null;
  authorPublicId: string;
  workTitle: string;
  currency: string;
  originalAmount: bigint;
  discountAmount: bigint;
  finalAmount: bigint;
  couponCode: string | null;
  commission: {
    commissionRateBps: number; serviceFeeRateBps: number;
    source: string; calculationVersion: string; sourceEventId: string | null;
  } | null;
  quote: {
    calculationVersion: string; taxTreatment: string; vatRateBasisPoints: number;
    listNetAmount: bigint; listVatAmount: bigint; listGrossAmount: bigint;
    discountGrossAmount: bigint; payableGrossAmount: bigint;
  } | null;
  payments: { status: string; amount: bigint; currency: string; completedAt?: Date | null }[];
  taxReview: {
    documentKind: string; decision: string; validUntil: Date | null; reviewedAt: Date;
  } | null;
};

/**
 * Internal admin tax-document review, only as known at payment time.
 * It is not government validation and never issues or approves an invoice.
 * Missing, later, revoked or expired reviews fail closed.
 */
export function taxDocumentFeePreview(order: DayCloseOrder) {
  const event = order.taxReview;
  if (!event || !order.paidAt || event.reviewedAt > order.paidAt ||
      event.decision !== "verified" ||
      (event.validUntil !== null && event.validUntil <= order.paidAt)) {
    return { documentKind: "BELIRSIZ", appliedServiceFeeBps: null as number | null,
      status: "YAZAR_MALI_BELGE_DOGRULANAMADI" };
  }
  if (event.documentKind === "commercial_invoice" ||
      event.documentKind === "self_employed_receipt") {
    return { documentKind: event.documentKind, appliedServiceFeeBps: 0,
      status: "IC_KAYIT_INCELEMESI_GECTI" };
  }
  if (event.documentKind === "gvk18_expense_receipt") {
    return { documentKind: event.documentKind, appliedServiceFeeBps: order.commission?.serviceFeeRateBps ?? null,
      status: "IC_KAYIT_INCELEMESI_GECTI" };
  }
  return { documentKind: "BELIRSIZ", appliedServiceFeeBps: null as number | null,
    status: "YAZAR_MALI_BELGE_DOGRULANAMADI" };
}

export type DayCloseLedger = {
  id: string; entryType: string; amount: bigint; currency: string;
  createdAt: Date; orderNo: string | null; authorPublicId: string | null;
};

export type DayCloseRefund = {
  id: string; orderNo: string; amount: bigint; currency: string;
  processedAt: Date; status: string;
  orderCurrency?: string;
  orderFinalAmount?: bigint;
  orderPaidAt?: Date | null;
  /** Sum of processed refunds for this order on/before business-day end. */
  cumulativeProcessedAmount?: bigint;
  /** Currency disagreement in any processed refund through closing time. */
  historicalCurrencyMismatch?: boolean;
};

export function buildDayCloseFiles(input: {
  day: string; orders: DayCloseOrder[]; ledger: DayCloseLedger[]; refunds: DayCloseRefund[];
  reconciliationLedger?: DayCloseLedger[];
}) {
  const closeStartMs = Date.parse(input.day + "T00:00:00.000+03:00");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(input.day) ||
      !Number.isFinite(closeStartMs) ||
      new Date(closeStartMs + 3 * 3600000).toISOString().slice(0,10) !== input.day)
    throw new Error("Invalid Istanbul business date");
  const closeStart = new Date(closeStartMs);
  const closeEnd = new Date(closeStartMs + 86400000);
  const isOnBusinessDay = (time: Date | null | undefined) =>
    time !== null && time !== undefined && time >= closeStart && time < closeEnd;
  // Check the input streams independently. A ledger entry may legitimately
  // appear both in the business-day ledger and the per-order reconciliation
  // stream; repetition WITHIN either stream must never double-count money.
  const assertUnique = (kind: string, refs: readonly string[]) => {
    const seen = new Set<string>();
    for (const ref of refs) {
      if (!ref || !ref.trim()) throw new DayCloseDataIntegrityError(kind, "EMPTY");
      if (seen.has(ref)) throw new DayCloseDataIntegrityError(kind, "DUPLICATE");
      seen.add(ref);
    }
  };
  assertUnique("ORDER", input.orders.map((order) => order.orderNo));
  assertUnique("REFUND", input.refunds.map((refund) => refund.id));
  assertUnique("LEDGER", input.ledger.map((entry) => entry.id));
  assertUnique("RECONCILIATION_LEDGER",
    (input.reconciliationLedger ?? input.ledger).map((entry) => entry.id));
  const sales: CsvField[][] = [[
    "siparis_no","odeme_tarihi_utc","durum","yazar_kodu","eser",
    "para_birimi","liste_brut_kurus","indirim_kurus","tahsilat_kurus",
    "net_fiyat_kurus","satis_kdv_kurus","komisyon_bps",
    "komisyon_kaynagi","aracilik_snapshot_bps","aracilik_uygulanan_bps",
    "yazar_mali_belge_turu","kupon","kontrol","hukuki_satici_modeli",
    "yazar_satici_komisyon_net_ornek_kurus","yazar_satici_aracilik_net_ornek_kurus",
    "yazar_satici_stopaj_durumu","yazar_satici_stopaj_tutari_kurus",
    "yazar_satici_on_inceleme_durumu",
  ]];
  const issues: CsvField[][] = [["kaynak","referans","uyari","islem"]];
  const reconciliation: CsvField[][] = [[
    "siparis_no","beklenen_satis_brut_kurus","ledger_satis_brut_kurus",
    "ledger_satis_brut_kayit_sayisi","basarili_tahsilat_kurus",
    "basarili_tahsilat_sayisi","ledger_mutabakati","tahsilat_mutabakati","genel_mutabakat",
  ]];
  // Accountants can map this neutral pre-transfer view into the actual
  // external software template. This is NOT a fiscal document payload.
  const preparation: CsvField[][] = [[
    "referans_siparis_no","satis_tarihi_utc","yazar_kodu","eser",
    "para_birimi","satis_net_kurus","satis_kdv_kurus","satis_brut_kurus",
    "komisyon_bps","komisyon_net_ornek_kurus","aracilik_bps_uygulanan",
    "aracilik_net_ornek_kurus","yazar_mali_belge_turu",
    "kayit_durumu","mali_belge_durumu",
    "komisyon_kdv_ornek_kurus","komisyon_brut_ornek_kurus",
    "aracilik_kdv_ornek_kurus","aracilik_brut_ornek_kurus",
    "yazar_telif_matrahi_ornek_kurus","yazar_belge_kdv_ornek_kurus",
  ]];
  // A partial or full refund processed on the sale's own business day must
  // never let the original full sale enter commission/service preparation.
  // Preserve both source records and flag for accountant review instead.
  const refundedOrderNosOnClosingDay = new Set(input.refunds
    .filter((refund) => refund.status === "processed" && isOnBusinessDay(refund.processedAt))
    .map((refund) => refund.orderNo));
  const grossLedger = new Map<string, DayCloseLedger[]>();
  for (const entry of input.reconciliationLedger ?? input.ledger) {
    if (entry.entryType !== "sale_gross" || entry.orderNo === null) continue;
    const entries = grossLedger.get(entry.orderNo) ?? [];
    entries.push(entry);
    grossLedger.set(entry.orderNo, entries);
  }
  // This is a PERIOD-BASED bridge, not a cohort margin or accounting P&L:
  // sales are grouped by paidAt while refunds are grouped by processedAt.
  // They may relate to purchases completed on entirely different days.
  type DayBridgeGroup = {
    currency: string; saleRows: number; reviewedSaleRows: number;
    flaggedSaleRows: number; candidateSalesMinor: bigint; reviewedSalesMinor: bigint;
    refundRows: number; reviewedRefundRows: number; flaggedRefundRows: number;
    processedRefundMinor: bigint; reviewedRefundMinor: bigint;
  };
  const dayBridge = new Map<string,DayBridgeGroup>();
  const groupFor = (currency: string) => {
    const group = dayBridge.get(currency);
    if (group) return group;
    const created: DayBridgeGroup = {
      currency, saleRows: 0, reviewedSaleRows: 0, flaggedSaleRows: 0,
      candidateSalesMinor: BigInt(0), reviewedSalesMinor: BigInt(0),
      refundRows: 0, reviewedRefundRows: 0, flaggedRefundRows: 0,
      processedRefundMinor: BigInt(0), reviewedRefundMinor: BigInt(0),
    };
    dayBridge.set(currency, created);
    return created;
  };
  const details = { ready: 0, review: 0, zero: 0 };
  let grossMinor = BigInt(0), vatMinor = BigInt(0);
  let commissionPreviewMinor = BigInt(0), serviceFeePreviewMinor = BigInt(0);
  let commissionVatPreviewMinor = BigInt(0), serviceVatPreviewMinor = BigInt(0);
  let authorRoyaltyNetPreviewMinor = BigInt(0), authorDocumentVatPreviewMinor = BigInt(0);
  let invoiceDocumentSales = 0, gvk18DocumentSales = 0;
  const byAuthor = new Map<string,{
    author: string; kind: string; currency: string; count: number;
    net: bigint; vat: bigint; gross: bigint;
    commission: bigint; service: bigint; commissionVat: bigint; serviceVat: bigint;
    royaltyNet: bigint; authorDocumentVat: bigint;
  }>();

  for (const order of input.orders) {
    const warnings: string[] = [];
    const rate = order.commission, quote = order.quote;
    const tax = taxDocumentFeePreview(order);
    // Columns being present does not prove their required VALUES exist.
    // Fail closed for accounting review rather than exporting anonymous
    // writer lines or empty item descriptions as verified sale rows.
    if (!order.authorPublicId.trim()) warnings.push("YAZAR_KODU_EKSIK");
    if (!order.workTitle.trim()) warnings.push("ESER_ADI_EKSIK");
    if (!isOnBusinessDay(order.paidAt)) warnings.push("ODEME_TARIHI_IS_GUNU_DISINDA");
    if (tax.status !== "IC_KAYIT_INCELEMESI_GECTI" ||
        tax.appliedServiceFeeBps === null) warnings.push("YAZAR_MALI_BELGE_DOGRULANAMADI");
    if (order.currency !== "TRY") warnings.push("TRY_DISINDA_PARA_BIRIMI");
    // An author-seller is an expected intermediary model, not failed identity.
    // Keep financial posting closed until author-seller accounting is separately reviewed.
    if (order.sellerMode === "third_party") {
      warnings.push("YAZAR_SATICI_ARACILIK_MALI_INCELEME");
    } else if (order.sellerMode !== "platform_direct") {
      warnings.push("SATICI_MODU_EKSIK_GECERSIZ");
    }
    if (order.finalAmount < BigInt(0) || order.originalAmount - order.discountAmount !== order.finalAmount) {
      warnings.push("TUTAR_MUTABAKATSIZ");
    }
    if (!rate || rate.calculationVersion !== "rate-v1" ||
        !Number.isInteger(rate.commissionRateBps) || rate.commissionRateBps < 0 ||
        rate.commissionRateBps > 9000 || rate.serviceFeeRateBps !== 500 ||
        !["global","author","work"].includes(rate.source) ||
        (rate.source === "global" && (rate.sourceEventId !== null || rate.commissionRateBps !== 1500)) ||
        (rate.source !== "global" && !rate.sourceEventId)) warnings.push("KOMISYON_SNAPSHOT_EKSIK_GECERSIZ");
    if (!quote || quote.calculationVersion !== "quote-v1" || quote.taxTreatment !== "net_plus_vat" ||
        quote.vatRateBasisPoints !== 2000 ||
        quote.listNetAmount < BigInt(0) ||
        quote.listVatAmount !== (quote.listNetAmount * BigInt(2000) + BigInt(5000)) / BigInt(10000) ||
        quote.listNetAmount + quote.listVatAmount !== quote.listGrossAmount ||
        quote.listGrossAmount !== order.originalAmount ||
        quote.discountGrossAmount !== order.discountAmount ||
        quote.payableGrossAmount !== order.finalAmount) {
      warnings.push("FIYAT_KDV_SNAPSHOT_EKSIK_GECERSIZ");
    }
    if (order.couponCode || order.discountAmount !== BigInt(0)) warnings.push("KUPON_VERGI_MATRAHI_INCELEME");
    if (order.status === "refunded") warnings.push("IADE_SONRASI_SIPARIS");
    if (refundedOrderNosOnClosingDay.has(order.orderNo))
      warnings.push("SATIS_GUNU_IADE_MALI_INCELEME");
    // A captured payment may later become "refunded". Its original
    // completedAt is the historical capture evidence; the CURRENT status
    // alone must not erase a valid payment from an earlier day's sale.
    const isHistoricalCapture = (payment: DayCloseOrder["payments"][number]) =>
      (payment.status === "succeeded" || payment.status === "refunded") &&
      payment.completedAt !== null && payment.completedAt !== undefined &&
      order.paidAt !== null && payment.completedAt <= order.paidAt &&
      payment.completedAt < closeEnd;
    const claimedCaptures = order.payments.filter((payment) =>
      payment.status === "succeeded" || payment.status === "refunded");
    const captures = claimedCaptures.filter(isHistoricalCapture);
    if (claimedCaptures.length !== captures.length)
      warnings.push("TAHSILAT_TARIH_KANITI_EKSIK_GECERSIZ");
    const ledgerEntries = grossLedger.get(order.orderNo) ?? [];
    const ledgerGross = ledgerEntries.reduce((sum,entry) => sum + entry.amount, BigInt(0));
    const ledgerMatches = ledgerEntries.length === 1 &&
      ledgerEntries[0].currency === order.currency &&
      ledgerEntries[0].amount === order.originalAmount;
    if (!ledgerMatches) warnings.push("LEDGER_BRUT_SATIS_MUTABAKATSIZ");
    const capturedTotal = captures.reduce((sum,payment) => sum + payment.amount, BigInt(0));
    // A completed 0 TL order must pass the SAME order/ledger reconciliation
    // without inventing a bank/card Payment. Missing capture is expected
    // ONLY when zero is actually owed and NO capture was claimed.
    const noCharge = order.finalAmount === BigInt(0);
    const captureMatches = noCharge
      ? claimedCaptures.length === 0
      : captures.length === 1 &&
        captures[0].amount === order.finalAmount &&
        captures[0].currency === order.currency;
    if (!noCharge && !captureMatches)
      warnings.push("TAHSILAT_KAYDI_MUTABAKATSIZ");
    if (noCharge && claimedCaptures.length > 0)
      warnings.push("SIFIR_TL_GEREKSIZ_TAHSILAT");
    const financialReconciliationPassed = ledgerMatches && captureMatches;
    reconciliation.push([
      order.orderNo,order.originalAmount,ledgerGross,ledgerEntries.length,
      capturedTotal,captures.length,
      ledgerMatches ? "LEDGER_KONTROLU_GECTI" : "INCELEME_GEREKLI",
      !captureMatches ? "INCELEME_GEREKLI" :
        noCharge ? "TAHSILAT_GEREKMEZ_0_TL" : "TAHSILAT_KONTROLU_GECTI",
      !financialReconciliationPassed ? "INCELEME_GEREKLI" :
        noCharge ? "SIFIR_TL_TEKNIK_MUTABAKAT_GECTI" : "TEMEL_MUTABAKAT_GECTI",
    ]);
    if (order.finalAmount === BigInt(0)) {
      details.zero++;
      warnings.push("SIFIR_TL_MALI_BELGE_DEGIL");
    }
    const review = warnings.length > 0 ? "INCELEME_GEREKLI" : "VERI_KONTROLU_GECTI";
    if (isOnBusinessDay(order.paidAt)) {
      const group = groupFor(order.currency);
      group.saleRows++;
      if (order.finalAmount > BigInt(0)) group.candidateSalesMinor += order.finalAmount;
      if (warnings.length) group.flaggedSaleRows++;
      else {
        group.reviewedSaleRows++;
        group.reviewedSalesMinor += order.finalAmount;
      }
    }
    if (warnings.length) {
      details.review++;
      for (const warning of warnings) issues.push(["siparis",order.orderNo,warning,"Muhasebe kontrolu gerekli"]);
    } else {
      details.ready++;
      grossMinor += order.finalAmount;
      vatMinor += quote!.listVatAmount;
    }
    // Intermediary-only informational figures for a clean, reconciled
    // author-owned sale. Not a payment instruction, VAT document, withholding
    // determination, or a row in the accounting import-preparation sheet.
    // Reuse the immutable rate and price snapshots; never use the current rate.
    const authorSellerPreflight =
      order.sellerMode === "third_party" &&
      order.status === "paid" &&
      warnings.length === 1 &&
      warnings[0] === "YAZAR_SATICI_ARACILIK_MALI_INCELEME" &&
      order.finalAmount > BigInt(0) && quote !== null && rate !== null &&
      tax.appliedServiceFeeBps !== null;
    const authorSellerCommission = authorSellerPreflight
      ? (quote!.listNetAmount * BigInt(rate!.commissionRateBps) + BigInt(5000)) / BigInt(10000)
      : null;
    const authorSellerService = authorSellerPreflight
      ? (quote!.listNetAmount * BigInt(tax.appliedServiceFeeBps!) + BigInt(5000)) / BigInt(10000)
      : null;
    // Under the author-as-seller model the party responsible for withholding,
    // applicable tax base and rate need their own accounting determination.
    // An earlier platform-direct simulation must not be reused as if approved.
    const authorSellerWithholdingStatus = order.sellerMode === "third_party"
      ? (authorSellerPreflight ? "STOPAJ_YUKUMLULUGU_MATRAHI_ORANI_INCELEMEDE"
        : "STOPAJ_ON_INCELEME_ICIN_KAYNAK_KAYDI_EKSIK")
      : null;

    sales.push([
      order.orderNo, order.paidAt?.toISOString() ?? null,order.status,
      order.authorPublicId,order.workTitle,order.currency,order.originalAmount,
      order.discountAmount,order.finalAmount,quote?.listNetAmount,
      quote?.listVatAmount,rate?.commissionRateBps,rate?.source,
      rate?.serviceFeeRateBps,tax.appliedServiceFeeBps,
      tax.documentKind,order.couponCode,review,
      order.sellerMode === "third_party" ? "YAZAR_SATICI" :
        order.sellerMode === "platform_direct" ? "ILKOKU_DOGRUDAN_SATICI" : "BELIRSIZ",
      authorSellerCommission, authorSellerService, authorSellerWithholdingStatus,
      null, // Withholding amount is not determined by an unapproved simulation.
      order.sellerMode === "third_party"
        ? (authorSellerPreflight ? "SADECE_ARACILIK_ORNEGI_MALI_INCELEME"
          : "HESAPLAMA_ENGELLENDI_KAYNAK_INCELEME")
        : null,
    ]);
    if (review === "VERI_KONTROLU_GECTI" && quote && rate) {
      // This is only the net commission illustration at the frozen order
      // rate, not a platform invoice, ledger posting or tax determination.
      const commissionPreview = (quote.listNetAmount * BigInt(rate.commissionRateBps) +
        BigInt(5000)) / BigInt(10000);
      const serviceFeePreview = (quote.listNetAmount * BigInt(tax.appliedServiceFeeBps!) +
        BigInt(5000)) / BigInt(10000);
      // In platform_direct, retained commission is not a separately
      // VAT-invoiced service to the author.
      const commissionVatPreview = BigInt(0);
      const royaltyNetPreview = quote.listNetAmount - commissionPreview;
      // Show possible author document VAT ONLY for commercial_invoice.
      // It is a hypothetical 20% rate and not an approved tax document.
      // GVK18 and e-SMM VAT are undetermined: null, NOT a zero-rate claim.
      const authorDocumentVatPreview = tax.documentKind === "commercial_invoice"
        ? (royaltyNetPreview * BigInt(2000) + BigInt(5000)) / BigInt(10000)
        : null;
      const serviceVatPreview = (serviceFeePreview * BigInt(quote.vatRateBasisPoints) +
        BigInt(5000)) / BigInt(10000);
      commissionPreviewMinor += commissionPreview;
      serviceFeePreviewMinor += serviceFeePreview;
      commissionVatPreviewMinor += commissionVatPreview;
      serviceVatPreviewMinor += serviceVatPreview;
      authorRoyaltyNetPreviewMinor += royaltyNetPreview;
      authorDocumentVatPreviewMinor += authorDocumentVatPreview ?? BigInt(0);
      if (tax.documentKind === "gvk18_expense_receipt") gvk18DocumentSales++;
      else invoiceDocumentSales++;
      const authorKey = [order.authorPublicId, tax.documentKind, order.currency].join("\u001f");
      const authorGroup = byAuthor.get(authorKey) ?? {
        author: order.authorPublicId, kind: tax.documentKind, currency: order.currency,
        count: 0, net: BigInt(0), vat: BigInt(0), gross: BigInt(0),
        commission: BigInt(0), service: BigInt(0),
        commissionVat: BigInt(0), serviceVat: BigInt(0),
        royaltyNet: BigInt(0), authorDocumentVat: BigInt(0),
      };
      authorGroup.count++;
      authorGroup.net += quote.listNetAmount;
      authorGroup.vat += quote.listVatAmount;
      authorGroup.gross += order.finalAmount;
      authorGroup.commission += commissionPreview;
      authorGroup.service += serviceFeePreview;
      authorGroup.commissionVat += commissionVatPreview;
      authorGroup.serviceVat += serviceVatPreview;
      authorGroup.royaltyNet += royaltyNetPreview;
      authorGroup.authorDocumentVat += authorDocumentVatPreview ?? BigInt(0);
      byAuthor.set(authorKey, authorGroup);
      preparation.push([
        order.orderNo,order.paidAt?.toISOString() ?? null,
        order.authorPublicId,order.workTitle,order.currency,
        quote.listNetAmount,quote.listVatAmount,order.finalAmount,
        rate.commissionRateBps,commissionPreview,tax.appliedServiceFeeBps,
        serviceFeePreview,tax.documentKind,
        review,"DIS_MUHASEBE_BELGE_KONTROLU_GEREKLI",
        commissionVatPreview, commissionPreview + commissionVatPreview,
        serviceVatPreview, serviceFeePreview + serviceVatPreview,
        royaltyNetPreview, authorDocumentVatPreview,
      ]);
    }
  }
  // Additional semicolon-delimited, comma-decimal worksheet for external
  // accountant review. It is NEVER a vendor-certified import or invoice.
  const liraWorksheet: CsvField[][] = [[
    "siparis_no","odeme_tarihi_utc","yazar_kodu","eser","para_birimi",
    "satis_net_tl","satis_kdv_tl","tahsilat_brut_tl","komisyon_net_ornek_tl",
    "aracilik_net_ornek_tl","mali_belge_turu","durum",
    "komisyon_kdv_ornek_tl","komisyon_brut_ornek_tl",
    "aracilik_kdv_ornek_tl","aracilik_brut_ornek_tl",
    "yazar_telif_matrahi_ornek_tl","yazar_belge_kdv_ornek_tl",
  ]];
  for (const row of preparation.slice(1)) {
    const net = row[5], vat = row[6], gross = row[7];
    const commission = row[9], service = row[11];
    const commissionVat = row[15], commissionGross = row[16];
    const serviceVat = row[17], serviceGross = row[18];
    const royaltyNet = row[19], authorDocumentVat = row[20];
    if (typeof net !== "bigint" || typeof vat !== "bigint" ||
        typeof gross !== "bigint" || typeof commission !== "bigint" ||
        typeof service !== "bigint" || typeof commissionVat !== "bigint" ||
        typeof commissionGross !== "bigint" || typeof serviceVat !== "bigint" ||
        typeof serviceGross !== "bigint" ||
        typeof royaltyNet !== "bigint" ||
        (authorDocumentVat !== null && typeof authorDocumentVat !== "bigint"))
      throw new Error("Accounting worksheet missing reviewed money amount");
    liraWorksheet.push([
      row[0],row[1],row[2],row[3],row[4],
      minorToTurkishLira(net),minorToTurkishLira(vat),minorToTurkishLira(gross),
      minorToTurkishLira(commission),minorToTurkishLira(service),row[12],
      "ON_INCELEME_FATURA_DEGIL",
      minorToTurkishLira(commissionVat),minorToTurkishLira(commissionGross),
      minorToTurkishLira(serviceVat),minorToTurkishLira(serviceGross),
      minorToTurkishLira(royaltyNet),
      authorDocumentVat === null ? null : minorToTurkishLira(authorDocumentVat),
    ]);
  }
  const authorRows: CsvField[][] = [[
    "yazar_kodu","yazar_mali_belge_turu","para_birimi","siparis_adedi",
    "net_satis_kurus","satis_kdv_kurus","tahsilat_brut_kurus",
    "komisyon_net_ornek_kurus","aracilik_net_ornek_kurus","mali_belge_durumu",
    "komisyon_kdv_ornek_kurus","komisyon_brut_ornek_kurus",
    "aracilik_kdv_ornek_kurus","aracilik_brut_ornek_kurus",
    "yazar_telif_matrahi_ornek_kurus","yazar_belge_kdv_ornek_kurus",
  ]];
  for (const group of [...byAuthor.values()].sort((a,b) =>
    a.author.localeCompare(b.author) || a.kind.localeCompare(b.kind) ||
    a.currency.localeCompare(b.currency))) {
    authorRows.push([
      group.author,group.kind,group.currency,group.count,
      group.net,group.vat,group.gross,group.commission,group.service,
      "DIS_MUHASEBE_BELGE_KONTROLU_GEREKLI",
      group.commissionVat, group.commission + group.commissionVat,
      group.serviceVat, group.service + group.serviceVat,
      group.royaltyNet,
      group.kind === "commercial_invoice" ? group.authorDocumentVat : null,
    ]);
  }
  const movements: CsvField[][] = [[
    "hareket_id","olusturulma_utc","tur","siparis_no","yazar_kodu","para_birimi","tutar_kurus",
  ]];
  for (const entry of input.ledger) {
    if (!isOnBusinessDay(entry.createdAt))
      issues.push(["ledger",entry.id,"HAREKET_TARIHI_IS_GUNU_DISINDA",
        "Dönem mutabakatı incelemesi gerekli"]);
    movements.push([
      entry.id,entry.createdAt.toISOString(),entry.entryType,entry.orderNo,
      entry.authorPublicId,entry.currency,entry.amount,
    ]);
  }
  // Ledger entryType is not an income/expense determination. Reconcile
  // daily movement totals by their exact source type and currency only.
  const byMovement = new Map<string,{ type: string; currency: string; count: number; total: bigint }>();
  for (const entry of input.ledger) {
    const key = entry.entryType + ":" + entry.currency;
    const group = byMovement.get(key) ?? {
      type: entry.entryType, currency: entry.currency, count: 0, total: BigInt(0),
    };
    group.count += 1;
    group.total += entry.amount;
    byMovement.set(key,group);
  }
  const summary: CsvField[][] = [[
    "hareket_turu","para_birimi","hareket_adedi","kayitli_tutar_toplami_kurus","siniflandirma",
  ]];
  for (const group of [...byMovement.values()].sort((a,b) =>
    a.type.localeCompare(b.type) || a.currency.localeCompare(b.currency))) {
    summary.push([
      group.type,group.currency,group.count,group.total,
      "LEDGER_TURU_TOPLAMI_MUHASEBE_GELIRI_DEGIL",
    ]);
  }
  const refundRows: CsvField[][] = [[
    "iade_id","islem_tarihi_utc","siparis_no","durum","para_birimi","tutar_kurus",
    "siparis_tahsilati_kurus","gun_sonuna_kadar_toplam_iade_kurus","mali_kontrol",
  ]];
  let flaggedRefundCount = 0;
  let reviewedRefundMinor = BigInt(0);
  for (const refund of input.refunds) {
    const warnings: string[] = [];
    if (!refund.orderNo.trim()) warnings.push("IADE_SIPARIS_BAGI_EKSIK");
    if (refund.status !== "processed" || !refund.orderPaidAt)
      warnings.push("IADE_ORIJINAL_ODEME_DURUMU_DOGRULANAMADI");
    if (!isOnBusinessDay(refund.processedAt))
      warnings.push("IADE_TARIHI_IS_GUNU_DISINDA");
    if (refund.orderPaidAt && refund.processedAt < refund.orderPaidAt)
      warnings.push("IADE_ODEMEDEN_ONCE");
    if (!refund.orderCurrency || refund.currency !== refund.orderCurrency ||
        refund.historicalCurrencyMismatch)
      warnings.push("IADE_PARA_BIRIMI_UYUSMAZLIGI");
    if (refund.amount <= BigInt(0) || refund.orderFinalAmount === undefined ||
        refund.orderFinalAmount <= BigInt(0))
      warnings.push("IADE_TUTARI_GECERSIZ");
    if (refund.cumulativeProcessedAmount === undefined ||
        refund.cumulativeProcessedAmount < refund.amount ||
        (refund.orderFinalAmount !== undefined &&
          refund.cumulativeProcessedAmount > refund.orderFinalAmount))
      warnings.push("KUMULATIF_IADE_TAHSILATI_ASIYOR");
    const state = warnings.length ? "INCELEME_GEREKLI" : "TEMEL_KONTROL_GECTI";
    if (refund.status === "processed" && isOnBusinessDay(refund.processedAt)) {
      const group = groupFor(refund.currency);
      group.refundRows++;
      if (refund.amount > BigInt(0)) group.processedRefundMinor += refund.amount;
      if (warnings.length) group.flaggedRefundRows++;
      else {
        group.reviewedRefundRows++;
        group.reviewedRefundMinor += refund.amount;
      }
    }
    if (warnings.length) {
      flaggedRefundCount++;
      for (const warning of warnings) {
        issues.push(["iade",refund.id,warning,"Harici muhasebe ve tahsilat kontrolu gerekli"]);
      }
    } else {
      reviewedRefundMinor += refund.amount;
    }
    refundRows.push([
      refund.id,refund.processedAt.toISOString(),refund.orderNo,refund.status,
      refund.currency,refund.amount,
      refund.orderFinalAmount,refund.cumulativeProcessedAmount,state,
    ]);
  }
  // Reconcile processed refund records to same-business-day financial refund
  // movements by order and currency. Ledger posting may occur in another
  // business day; an absent entry means ACCOUNTANT REVIEW, NOT refund failure.
  type RefundGroup = {
    orderNo: string; currency: string; refundCount: number; ledgerCount: number;
    processedAmount: bigint; ledgerSignedAmount: bigint;
    ledgerAbsoluteAmount: bigint; ledgerPositive: boolean; ledgerNegative: boolean;
    refundIds: string[]; ledgerIds: string[]; badRefundDates: boolean; badLedgerDates: boolean;
  };
  const refundGroups = new Map<string, RefundGroup>();
  const getRefundGroup = (orderNo: string, currency: string) => {
    const key = orderNo + "\u001f" + currency;
    const existing = refundGroups.get(key);
    if (existing) return existing;
    const created: RefundGroup = {
      orderNo, currency, refundCount: 0, ledgerCount: 0,
      processedAmount: BigInt(0), ledgerSignedAmount: BigInt(0),
      ledgerAbsoluteAmount: BigInt(0), ledgerPositive: false, ledgerNegative: false,
      refundIds: [], ledgerIds: [], badRefundDates: false, badLedgerDates: false,
    };
    refundGroups.set(key, created);
    return created;
  };
  for (const refund of input.refunds) {
    if (refund.status !== "processed") continue;
    const group = getRefundGroup(refund.orderNo, refund.currency);
    group.refundCount++;
    group.processedAmount += refund.amount;
    group.refundIds.push(refund.id);
    if (!isOnBusinessDay(refund.processedAt)) group.badRefundDates = true;
  }
  for (const entry of input.ledger) {
    if (entry.entryType !== "refund") continue;
    const group = getRefundGroup(entry.orderNo ?? "", entry.currency);
    group.ledgerCount++;
    group.ledgerSignedAmount += entry.amount;
    group.ledgerAbsoluteAmount += entry.amount < BigInt(0) ? -entry.amount : entry.amount;
    if (entry.amount > BigInt(0)) group.ledgerPositive = true;
    if (entry.amount < BigInt(0)) group.ledgerNegative = true;
    group.ledgerIds.push(entry.id);
    if (!isOnBusinessDay(entry.createdAt)) group.badLedgerDates = true;
  }
  const refundReconciliation: CsvField[][] = [[
    "siparis_no","para_birimi","islenen_iade_adedi","iade_tutari_toplam_kurus",
    "refund_ledger_hareket_adedi","ledger_imzali_toplam_kurus",
    "ledger_mutlak_toplam_kurus","sonuc","inceleme_notu",
  ]];
  let refundLedgerMatchedGroups = 0, refundLedgerReviewGroups = 0;
  for (const group of [...refundGroups.values()].sort((a,b) =>
    a.orderNo.localeCompare(b.orderNo) || a.currency.localeCompare(b.currency))) {
    const matched = group.orderNo.length > 0 && !group.badRefundDates && !group.badLedgerDates &&
      group.refundCount > 0 && group.ledgerCount > 0 &&
      group.processedAmount > BigInt(0) &&
      group.ledgerAbsoluteAmount === group.processedAmount &&
      (group.ledgerSignedAmount === group.processedAmount ||
       group.ledgerSignedAmount === -group.processedAmount) &&
      !(group.ledgerPositive && group.ledgerNegative);
    let warning = "";
    if (matched) refundLedgerMatchedGroups++;
    else {
      refundLedgerReviewGroups++;
      if (!group.orderNo) warning = "IADE_LEDGER_SIPARIS_BAGI_YOK";
      else if (group.refundCount === 0) warning = "DONEMDE_ISLENMIS_IADE_KAYDI_YOK";
      else if (group.ledgerCount === 0) warning = "DONEMDE_IADE_LEDGER_KARSILIGI_YOK";
      else if (group.badRefundDates) warning = "IADE_TARIHI_IS_GUNU_DISINDA";
      else if (group.badLedgerDates) warning = "HAREKET_TARIHI_IS_GUNU_DISINDA";
      else warning = "IADE_LEDGER_TOPLAM_TUTARSIZ";
      issues.push(["iade_ledger",group.orderNo || group.ledgerIds.join("+"),warning,
        "Muhasebe kayit tarihi, iade isleme zamani ve finans hareketini karsilastirin"]);
    }
    refundReconciliation.push([
      group.orderNo || null,group.currency,group.refundCount,group.processedAmount,
      group.ledgerCount,group.ledgerSignedAmount,group.ledgerAbsoluteAmount,
      matched ? "GUNLUK_TUTAR_ESLESTI" : "INCELEME_GEREKLI",
      matched ? "Eslesme muhasebe fisini dogrulamaz" : warning,
    ]);
  }
  // No deduction of commission, VAT, operating costs or withholding from
  // the difference below. Both amounts are dated period events, NOT
  // same-order cohorts and NOT actual bank cash-flow verification.
  const periodBridge: CsvField[][] = [[
    "para_birimi","donem_odeme_siparis_adedi","teknik_kontrolden_gecen_satis_adedi",
    "incelemeli_satis_adedi","pozitif_satis_tahsilat_adayi_kurus",
    "teknik_kontrolden_gecen_tahsilat_kurus",
    "donem_islenen_iade_adedi","teknik_kontrolden_gecen_iade_adedi",
    "incelemeli_iade_adedi","donem_pozitif_islenen_iade_kurus",
    "teknik_kontrolden_gecen_iade_kurus","donem_satis_eksi_iade_aday_farki_kurus",
    "on_inceleme_notu",
  ]];
  for (const group of [...dayBridge.values()].sort((a,b) =>
    a.currency.localeCompare(b.currency))) {
    periodBridge.push([
      group.currency,group.saleRows,group.reviewedSaleRows,
      group.flaggedSaleRows,group.candidateSalesMinor,group.reviewedSalesMinor,
      group.refundRows,group.reviewedRefundRows,group.flaggedRefundRows,
      group.processedRefundMinor,group.reviewedRefundMinor,
      group.candidateSalesMinor - group.processedRefundMinor,
      "Fark yalniz donem hareketlerinin aritmetik farkidir; net gelir, nakit, kar veya vergi degildir",
    ]);
  }
  const fieldMap = {
    version: "generic-accounting-map-v2",
    status: "UNVERIFIED_VENDOR_MAPPING",
    purpose: "External bookkeeping preparation; never issue invoices in IlkOku",
    currencyUnit: "kurus",
    timestamps: "UTC ISO-8601; batch grouped by Europe/Istanbul business day",
    batchReference: "ILK-DAY-" + input.day,
    exportFile: "muhasebe_on_hazirlik.csv",
    localeWorksheet: {
      file: "muhasebe_tl_inceleme.csv",
      delimiter: ";",
      decimalSeparator: ",",
      thousandsSeparator: "none",
      amountUnit: "TRY major units (2 decimal places)",
      status: "ACCOUNTANT_REVIEW_ONLY_NOT_VENDOR_CERTIFIED",
      source: "only reviewed rows from muhasebe_on_hazirlik.csv",
    },
    referenceField: "referans_siparis_no",
    // Canonical export columns; destination account codes and document fields
    // must be mapped by the accountant for the selected vendor/version.
    fields: {
      referans_siparis_no: { source: "Order.orderNo", meaning: "external reconciliation key", required: true },
      satis_tarihi_utc: { source: "Order.paidAt", meaning: "recorded payment completion date in UTC, not bank settlement", required: true },
      yazar_kodu: { source: "Order.author.publicId", meaning: "writer reference, not buyer tax number", required: true },
      eser: { source: "Order.work.title", meaning: "sale item description", required: true },
      para_birimi: { source: "Order.currency", meaning: "TRY for this profile", required: true },
      satis_net_kurus: { source: "OrderPriceQuoteSnapshot.listNetAmount", meaning: "net list amount", required: true },
      satis_kdv_kurus: { source: "OrderPriceQuoteSnapshot.listVatAmount", meaning: "20% VAT illustration, not declaration", required: true },
      satis_brut_kurus: { source: "Order.finalAmount", meaning: "recorded order payable gross; independent bank clearing not verified", required: true },
      komisyon_bps: { source: "OrderCommissionRateSnapshot.commissionRateBps", meaning: "frozen commission rate", required: true },
      komisyon_net_ornek_kurus: { source: "calculated from frozen net price and commission rate", meaning: "estimate, not posted income", required: false },
      aracilik_bps_uygulanan: { source: "Frozen OrderCommissionRateSnapshot plus AuthorTaxReviewEvent as-of paidAt", meaning: "0 for verified invoice/receipt, 500 for verified eligible GVK18; never auto-bill", required: false },
      aracilik_net_ornek_kurus: { source: "sale net multiplied by verified applicable rate", meaning: "illustrative separate service amount, not a ledger or invoice", required: false },
      komisyon_kdv_ornek_kurus: { source: "platform_direct direct-seller business model", meaning: "always zero; retained commission is NOT a separately VAT-invoiced service", required: false },
      komisyon_brut_ornek_kurus: { source: "commission net economic share; no commission service VAT", meaning: "legacy column equals commission net (no issued service invoice)", required: false },
      yazar_telif_matrahi_ornek_kurus: { source: "frozen net sale price minus frozen commission share", meaning: "author royalty document base preview; NOT an issued expense or invoice", required: false },
      yazar_belge_kdv_ornek_kurus: { source: "20% illustration on commission-net royalty ONLY for internally verified commercial_invoice", meaning: "null for GVK18/self-employed; tax treatment requires external accountant approval", required: false },
      aracilik_kdv_ornek_kurus: { source: "eligible service net illustration times frozen quote VAT bps, rounded per order", meaning: "separate intermediary service VAT illustration; zero when not eligible", required: false },
      aracilik_brut_ornek_kurus: { source: "eligible service net plus its VAT illustration", meaning: "net+VAT, not issued or collected", required: false },
      yazar_mali_belge_turu: { source: "latest valid verified AuthorTaxReviewEvent at paidAt", meaning: "internal review, not government validation", required: true },
      kayit_durumu: { source: "review flags", meaning: "technical record check, not fiscal approval", required: true },
      mali_belge_durumu: { source: "fixed fail-closed disclaimer", meaning: "accountant review required", required: true },
    },
    customerLegalIdentity: "NOT_EXPORTED_MUST_BE_VERIFIED_EXTERNALLY",
    documentType: "NOT_DETERMINED",
    fiscalApproval: "REQUIRED_EXTERNALLY",
    commissionField: "komisyon_net_ornek_kurus",
    commissionNotice: "Platform-direct retained sales share; NOT a separate writer commission service invoice",
    authorRoyaltyNotice: "Net royalty is sale net minus frozen retained share; author document VAT is conditional and accountant approval is required",
    optionalServiceFee: "Verified internal GVK18 review: 5% illustration; verified commercial invoice/self-employed receipt: 0%; unknown fails closed. All amounts require accountant approval.",
    vendors: {
      logo: {
        schemaVerified: false, automaticImportReady: false,
        researchedCapability: "Product/version-dependent Excel data import, not a verified accounting transaction template",
        referenceUrl: "https://polaris.logo.com.tr/docs/tiger-3-enterprise/detail/ZXh0ZXJuYWw_Y2lkPTkzZjJhODlkLWZmZGYtNGJiYS04ZjgyLTcyYzA0ZGI0OWJmYyZsaW5rPTJmZGMwMjNhLTM1NzgtNDQ3OC1iYjcxLTc5YzYyZmZmZDEwNiZ0ZW5hbnRJZD1jZGQ4N2UxMy0zMDA5LTRkZDEtYTViOC0yYTAwNWMwZTU4ZGEmaGlkZU5hbWU9VHJ1ZQ",
        needed: "Specific Logo product/version, supported transfer module and approved accountant account mapping",
      },
      mikro: {
        schemaVerified: false, automaticImportReady: false,
        researchedCapability: "Official accounting voucher API exists; it MUTATES records and is deliberately never called",
        referenceUrl: "https://apidocs.mikro.com.tr/apis/muhasebe",
        needed: "Specific Mikro product/version and its supported file-import template; no API token or voucher posting",
      },
      parasut: {
        schemaVerified: false, automaticImportReady: false,
        researchedCapability: "Official Excel import templates are separate for sales, contacts, expenses, and services",
        referenceUrl: "https://www.parasut.com/kullanim-kilavuzu/mevcut-verilerin-parasute-aktarilmasi",
        needed: "Current official template supplied by accountant, buyer identity and document category checked externally",
      },
    },
  };
  // Reconcile the independently assembled per-author group summaries back
  // to the reviewed sales in the generic accounting preparation. A future
  // change that accidentally drops or duplicates an author summary must
  // refuse to produce a misleading accounting archive.
  const authorTotals = [...byAuthor.values()].reduce((sum, group) => ({
    count: sum.count + group.count,
    gross: sum.gross + group.gross,
    vat: sum.vat + group.vat,
    commission: sum.commission + group.commission,
    service: sum.service + group.service,
    commissionVat: sum.commissionVat + group.commissionVat,
    serviceVat: sum.serviceVat + group.serviceVat,
    royaltyNet: sum.royaltyNet + group.royaltyNet,
    authorDocumentVat: sum.authorDocumentVat + group.authorDocumentVat,
  }), {
    count: 0, gross: BigInt(0), vat: BigInt(0),
    commission: BigInt(0), service: BigInt(0),
    commissionVat: BigInt(0), serviceVat: BigInt(0),
    royaltyNet: BigInt(0), authorDocumentVat: BigInt(0),
  });
  if (authorTotals.count !== preparation.length - 1 ||
      authorTotals.count !== details.ready ||
      authorTotals.gross !== grossMinor ||
      authorTotals.vat !== vatMinor ||
      authorTotals.commission !== commissionPreviewMinor ||
      authorTotals.service !== serviceFeePreviewMinor ||
      authorTotals.commissionVat !== commissionVatPreviewMinor ||
      authorTotals.serviceVat !== serviceVatPreviewMinor ||
      authorTotals.royaltyNet !== authorRoyaltyNetPreviewMinor ||
      authorTotals.authorDocumentVat !== authorDocumentVatPreviewMinor ||
      authorTotals.count !== invoiceDocumentSales + gvk18DocumentSales) {
    throw new Error("DAY_CLOSE_INTERNAL_AUTHOR_TOTALS_MISMATCH");
  }
  // Internal source-column coverage is verifiable without a vendor account.
  // It must never be confused with approval of any vendor's import template.
  const sourceColumns = preparation[0].map((column) => String(column));
  const declaredColumns = Object.keys(fieldMap.fields);
  const missingDeclaredColumns = declaredColumns.filter((column) => !sourceColumns.includes(column));
  const undeclaredColumns = sourceColumns.filter((column) => !declaredColumns.includes(column));
  if (missingDeclaredColumns.length || undeclaredColumns.length ||
      new Set(sourceColumns).size !== sourceColumns.length) {
    throw new Error("DAY_CLOSE_INTERNAL_MAPPING_INCONSISTENT");
  }
  const externalRequirements = {
    vendorProductVersion: false,
    officialDestinationTemplateReviewed: false,
    sourceToDestinationFieldsApproved: false,
    accountCodesApprovedByAccountant: false,
    customerOrCounterpartyIdentityVerified: false,
    documentTypeAndTaxTreatmentApproved: false,
    importDryRunVerifiedByAccountant: false,
  };
  const vendorGate = (sourceUrl: string, track: string, additionalBlockers: string[]) => ({
    sourceUrl,
    track,
    destinationSchemaVerified: false,
    automaticImportReady: false,
    postToVendorAllowed: false,
    readiness: "BLOCKED_REQUIRES_EXTERNAL_ACCOUNTANT_REVIEW",
    requirements: { ...externalRequirements },
    additionalBlockers,
  });
  const mappingAudit = {
    verificationScope: "ILKOKU_INTERNAL_COLUMN_NAMES_ONLY",
    internalSourceColumnsMatchDeclarations: true,
    internalSourceColumns: sourceColumns,
    declaredColumnCount: declaredColumns.length,
    dataRows: preparation.length - 1,
    validatedAuthorSummaryRows: authorTotals.count,
    authorTotalsReconciled: true,
    writerAndWorkReferencesRequired: true,
    refundOrderReferenceRequired: true,
    vendorImportReady: false,
    fiscalApproval: false,
    gate: "BLOCKED_UNTIL_VENDOR_ACCOUNTANT_TEMPLATE_VERIFICATION",
    vendors: {
      logo: vendorGate(
        "https://go3.logo.com.tr/logo-ekosistem-cozumleri/collector",
        "PRODUCT_SPECIFIC_FILE_OR_PARTNER_IMPORT_UNCONFIRMED",
        ["Logo product/version and transfer module not selected",
         "Account/branch/department codes and destination schema not approved"],
      ),
      mikro: vendorGate(
        "https://apidocs.mikro.com.tr/apis/muhasebe",
        "MUTATING_API_EXISTS_BUT_NOT_USED_NO_FILE_SCHEMA_VERIFIED",
        ["Mikro accounting API can create/update/delete vouchers; never call it",
         "Supported read-only file-import format and target ERP version not confirmed"],
      ),
      parasut: vendorGate(
        "https://www.parasut.com/kullanim-kilavuzu/mevcut-verilerin-parasute-aktarilmasi",
        "ACCOUNT_DOWNLOADED_EXCEL_TEMPLATE_REQUIRED",
        ["Sales invoices, contacts, expenses and services have distinct official templates",
         "Account download and accountant validation of actual Excel header/layout missing",
         "Existing issued document and customer identity data are not exported"],
      ),
    },
  };
  const documents = [
    { name: "siparisler.csv", data: safeCsv(sales) },
    { name: "finans_hareketleri.csv", data: safeCsv(movements) },
    { name: "iadeler.csv", data: safeCsv(refundRows) },
    { name: "iade_ledger_mutabakat.csv", data: safeCsv(refundReconciliation) },
    { name: "gunluk_satis_iade_koprusu.csv", data: safeCsv(periodBridge) },
    { name: "uyarilar.csv", data: safeCsv(issues) },
    { name: "mutabakat.csv", data: safeCsv(reconciliation) },
    { name: "gun_sonu_ozet.csv", data: safeCsv(summary) },
    { name: "muhasebe_on_hazirlik.csv", data: safeCsv(preparation) },
    { name: "yazar_hesap_ozeti.csv", data: safeCsv(authorRows) },
    { name: "muhasebe_tl_inceleme.csv", data: safeCsvDelimited(liraWorksheet,";") },
    { name: "alan_esleme.json", data: JSON.stringify({
      ...fieldMap, sourceColumnAudit: mappingAudit,
    },null,2)+"\n" },
  ];
  const manifest = {
    version: DAY_CLOSE_VERSION,
    day: input.day,
    timezone: DAY_CLOSE_TIME_ZONE,
    period: "00:00:00-23:59:59.999+03:00",
    batchKey: "ILK-DAY-" + input.day,
    classification: "ON_INCELEME_FATURA_DEGIL",
    note: "Fatura veya fis olusturmaz; genel CSV inceleme paketidir. Vergi belge uygunlugu ve alici verileri bu paketle dogrulanmaz. Dis sisteme aktarim muhasebe onayina baglidir.",
    counting: "Siparisler paidAt, iadeler processedAt, gunluk ledger createdAt tarihine gore gruplanir. Siparis mutabakati tum bagli sale_gross ledger kayitlarini kontrol eder; tarih farki dogal olabilir. Sonradan gelen duzeltmeler yeni indirmede fark yaratabilir.",
    salesCount: input.orders.length,
    authorSellerOrders: input.orders.filter((order) => order.sellerMode === "third_party").length,
    platformDirectSellerOrders: input.orders.filter((order) => order.sellerMode === "platform_direct").length,
    unknownSellerModeOrders: input.orders.filter((order) =>
      order.sellerMode !== "third_party" && order.sellerMode !== "platform_direct").length,
    readySalesCount: details.ready,
    flaggedSalesCount: details.review,
    zeroAmountCount: details.zero,
    refundsCount: input.refunds.length,
    flaggedRefundCount,
    refundLedgerMatchedGroups,
    refundLedgerReviewGroups,
    periodBridgeCurrencyGroups: dayBridge.size,
    sourceMappingVerified: mappingAudit.internalSourceColumnsMatchDeclarations,
    authorTotalsReconciled: mappingAudit.authorTotalsReconciled,
    vendorImportReady: false,
    reviewedRefundMinor: reviewedRefundMinor.toString(),
    ledgerCount: input.ledger.length,
    ledgerSummaryGroups: byMovement.size,
    preparationRows: preparation.length - 1,
    liraWorksheetRows: liraWorksheet.length - 1,
    reviewedAuthorSummaryGroups: byAuthor.size,
    unmatchedGrossLedgerOrderCount: reconciliation.slice(1).filter(row => row[6] !== "LEDGER_KONTROLU_GECTI").length,
    checkedGrossMinor: grossMinor.toString(),
    checkedVatMinor: vatMinor.toString(),
    reviewedCommissionIllustrationMinor: commissionPreviewMinor.toString(),
    reviewedServiceFeeIllustrationMinor: serviceFeePreviewMinor.toString(),
    reviewedCommissionVatIllustrationMinor: commissionVatPreviewMinor.toString(),
    reviewedCommissionGrossIllustrationMinor: (commissionPreviewMinor + commissionVatPreviewMinor).toString(),
    reviewedAuthorRoyaltyNetIllustrationMinor: authorRoyaltyNetPreviewMinor.toString(),
    reviewedAuthorDocumentVatIllustrationMinor: authorDocumentVatPreviewMinor.toString(),
    reviewedServiceFeeVatIllustrationMinor: serviceVatPreviewMinor.toString(),
    reviewedServiceFeeGrossIllustrationMinor: (serviceFeePreviewMinor + serviceVatPreviewMinor).toString(),
    reviewedInvoiceDocumentSales: invoiceDocumentSales,
    reviewedGvk18DocumentSales: gvk18DocumentSales,
    fileHashes: Object.fromEntries(documents.map((file) => [file.name,sha256(file.data)])),
  };
  const files = [...documents,{ name: "manifest.json", data: JSON.stringify(manifest,null,2)+"\n" }];
  return { files, manifest, zip: zipFiles(files) };
}
