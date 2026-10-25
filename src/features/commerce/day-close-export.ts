import { createHash } from "node:crypto";

export const DAY_CLOSE_TIME_ZONE = "Europe/Istanbul";
export const DAY_CLOSE_VERSION = "day-close-v1";
export const DAY_CLOSE_MAX_ROWS = 5000;

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
      (event.validUntil !== null && event.validUntil < order.paidAt)) {
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
  const sales: CsvField[][] = [[
    "siparis_no","odeme_tarihi_utc","durum","yazar_kodu","eser",
    "para_birimi","liste_brut_kurus","indirim_kurus","tahsilat_kurus",
    "net_fiyat_kurus","satis_kdv_kurus","komisyon_bps",
    "komisyon_kaynagi","aracilik_snapshot_bps","aracilik_uygulanan_bps",
    "yazar_mali_belge_turu","kupon","kontrol",
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
  ]];
  const grossLedger = new Map<string, DayCloseLedger[]>();
  for (const entry of input.reconciliationLedger ?? input.ledger) {
    if (entry.entryType !== "sale_gross" || entry.orderNo === null) continue;
    const entries = grossLedger.get(entry.orderNo) ?? [];
    entries.push(entry);
    grossLedger.set(entry.orderNo, entries);
  }
  const details = { ready: 0, review: 0, zero: 0 };
  let grossMinor = BigInt(0), vatMinor = BigInt(0);
  let commissionPreviewMinor = BigInt(0), serviceFeePreviewMinor = BigInt(0);
  let invoiceDocumentSales = 0, gvk18DocumentSales = 0;
  const byAuthor = new Map<string,{
    author: string; kind: string; currency: string; count: number;
    net: bigint; vat: bigint; gross: bigint; commission: bigint; service: bigint;
  }>();

  for (const order of input.orders) {
    const warnings: string[] = [];
    const rate = order.commission, quote = order.quote;
    const tax = taxDocumentFeePreview(order);
    if (!isOnBusinessDay(order.paidAt)) warnings.push("ODEME_TARIHI_IS_GUNU_DISINDA");
    if (tax.status !== "IC_KAYIT_INCELEMESI_GECTI" ||
        tax.appliedServiceFeeBps === null) warnings.push("YAZAR_MALI_BELGE_DOGRULANAMADI");
    if (order.currency !== "TRY") warnings.push("TRY_DISINDA_PARA_BIRIMI");
    if (order.sellerMode !== "platform_direct") warnings.push("SATICI_ILKOKU_DOGRULANMADI");
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
    const captureMatches = order.finalAmount > BigInt(0) &&
      captures.length === 1 &&
      captures[0].amount === order.finalAmount &&
      captures[0].currency === order.currency;
    if (order.finalAmount > BigInt(0) && !captureMatches)
      warnings.push("TAHSILAT_KAYDI_MUTABAKATSIZ");
    if (order.finalAmount === BigInt(0) && captures.length > 0)
      warnings.push("SIFIR_TL_GEREKSIZ_TAHSILAT");
    reconciliation.push([
      order.orderNo,order.originalAmount,ledgerGross,ledgerEntries.length,
      capturedTotal,captures.length,
      ledgerMatches ? "LEDGER_KONTROLU_GECTI" : "INCELEME_GEREKLI",
      captureMatches ? "TAHSILAT_KONTROLU_GECTI" : "INCELEME_GEREKLI",
      ledgerMatches && captureMatches ? "TEMEL_MUTABAKAT_GECTI" : "INCELEME_GEREKLI",
    ]);
    if (order.finalAmount === BigInt(0)) {
      details.zero++;
      warnings.push("SIFIR_TL_MALI_BELGE_DEGIL");
    }
    const review = warnings.length > 0 ? "INCELEME_GEREKLI" : "VERI_KONTROLU_GECTI";
    if (warnings.length) {
      details.review++;
      for (const warning of warnings) issues.push(["siparis",order.orderNo,warning,"Muhasebe kontrolu gerekli"]);
    } else {
      details.ready++;
      grossMinor += order.finalAmount;
      vatMinor += quote!.listVatAmount;
    }
    sales.push([
      order.orderNo, order.paidAt?.toISOString() ?? null,order.status,
      order.authorPublicId,order.workTitle,order.currency,order.originalAmount,
      order.discountAmount,order.finalAmount,quote?.listNetAmount,
      quote?.listVatAmount,rate?.commissionRateBps,rate?.source,
      rate?.serviceFeeRateBps,tax.appliedServiceFeeBps,
      tax.documentKind,order.couponCode,review,
    ]);
    if (review === "VERI_KONTROLU_GECTI" && quote && rate) {
      // This is only the net commission illustration at the frozen order
      // rate, not a platform invoice, ledger posting or tax determination.
      const commissionPreview = (quote.listNetAmount * BigInt(rate.commissionRateBps) +
        BigInt(5000)) / BigInt(10000);
      const serviceFeePreview = (quote.listNetAmount * BigInt(tax.appliedServiceFeeBps!) +
        BigInt(5000)) / BigInt(10000);
      commissionPreviewMinor += commissionPreview;
      serviceFeePreviewMinor += serviceFeePreview;
      if (tax.documentKind === "gvk18_expense_receipt") gvk18DocumentSales++;
      else invoiceDocumentSales++;
      const authorKey = [order.authorPublicId, tax.documentKind, order.currency].join("\u001f");
      const authorGroup = byAuthor.get(authorKey) ?? {
        author: order.authorPublicId, kind: tax.documentKind, currency: order.currency,
        count: 0, net: BigInt(0), vat: BigInt(0), gross: BigInt(0),
        commission: BigInt(0), service: BigInt(0),
      };
      authorGroup.count++;
      authorGroup.net += quote.listNetAmount;
      authorGroup.vat += quote.listVatAmount;
      authorGroup.gross += order.finalAmount;
      authorGroup.commission += commissionPreview;
      authorGroup.service += serviceFeePreview;
      byAuthor.set(authorKey, authorGroup);
      preparation.push([
        order.orderNo,order.paidAt?.toISOString() ?? null,
        order.authorPublicId,order.workTitle,order.currency,
        quote.listNetAmount,quote.listVatAmount,order.finalAmount,
        rate.commissionRateBps,commissionPreview,tax.appliedServiceFeeBps,
        serviceFeePreview,tax.documentKind,
        review,"DIS_MUHASEBE_BELGE_KONTROLU_GEREKLI",
      ]);
    }
  }
  // Additional semicolon-delimited, comma-decimal worksheet for external
  // accountant review. It is NEVER a vendor-certified import or invoice.
  const liraWorksheet: CsvField[][] = [[
    "siparis_no","odeme_tarihi_utc","yazar_kodu","eser","para_birimi",
    "satis_net_tl","satis_kdv_tl","tahsilat_brut_tl","komisyon_net_ornek_tl",
    "aracilik_net_ornek_tl","mali_belge_turu","durum",
  ]];
  for (const row of preparation.slice(1)) {
    const net = row[5], vat = row[6], gross = row[7];
    const commission = row[9], service = row[11];
    if (typeof net !== "bigint" || typeof vat !== "bigint" ||
        typeof gross !== "bigint" || typeof commission !== "bigint" ||
        typeof service !== "bigint") throw new Error("Accounting worksheet missing reviewed money amount");
    liraWorksheet.push([
      row[0],row[1],row[2],row[3],row[4],
      minorToTurkishLira(net),minorToTurkishLira(vat),minorToTurkishLira(gross),
      minorToTurkishLira(commission),minorToTurkishLira(service),row[12],
      "ON_INCELEME_FATURA_DEGIL",
    ]);
  }
  const authorRows: CsvField[][] = [[
    "yazar_kodu","yazar_mali_belge_turu","para_birimi","siparis_adedi",
    "net_satis_kurus","satis_kdv_kurus","tahsilat_brut_kurus",
    "komisyon_net_ornek_kurus","aracilik_net_ornek_kurus","mali_belge_durumu",
  ]];
  for (const group of [...byAuthor.values()].sort((a,b) =>
    a.author.localeCompare(b.author) || a.kind.localeCompare(b.kind) ||
    a.currency.localeCompare(b.currency))) {
    authorRows.push([
      group.author,group.kind,group.currency,group.count,
      group.net,group.vat,group.gross,group.commission,group.service,
      "DIS_MUHASEBE_BELGE_KONTROLU_GEREKLI",
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
    refundIds: string[]; ledgerIds: string[]; badRefundDates: boolean;
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
      refundIds: [], ledgerIds: [], badRefundDates: false,
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
  }
  const refundReconciliation: CsvField[][] = [[
    "siparis_no","para_birimi","islenen_iade_adedi","iade_tutari_toplam_kurus",
    "refund_ledger_hareket_adedi","ledger_imzali_toplam_kurus",
    "ledger_mutlak_toplam_kurus","sonuc","inceleme_notu",
  ]];
  let refundLedgerMatchedGroups = 0, refundLedgerReviewGroups = 0;
  for (const group of [...refundGroups.values()].sort((a,b) =>
    a.orderNo.localeCompare(b.orderNo) || a.currency.localeCompare(b.currency))) {
    const matched = group.orderNo.length > 0 && !group.badRefundDates &&
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
      else if (group.refundCount === 0) warning = "DONEMDE_REFUND_LEDGER_KARSILIGI_YOK";
      else if (group.ledgerCount === 0) warning = "DONEMDE_IADE_LEDGER_KARSILIGI_YOK";
      else if (group.badRefundDates) warning = "IADE_TARIHI_IS_GUNU_DISINDA";
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
  const fieldMap = {
    version: "generic-accounting-map-v1",
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
      satis_tarihi_utc: { source: "Order.paidAt", meaning: "sale settlement date in UTC", required: true },
      yazar_kodu: { source: "Order.author.publicId", meaning: "writer reference, not buyer tax number", required: true },
      eser: { source: "Order.work.title", meaning: "sale item description", required: true },
      para_birimi: { source: "Order.currency", meaning: "TRY for this profile", required: true },
      satis_net_kurus: { source: "OrderPriceQuoteSnapshot.listNetAmount", meaning: "net list amount", required: true },
      satis_kdv_kurus: { source: "OrderPriceQuoteSnapshot.listVatAmount", meaning: "20% VAT illustration, not declaration", required: true },
      satis_brut_kurus: { source: "Order.finalAmount", meaning: "customer collected gross", required: true },
      komisyon_bps: { source: "OrderCommissionRateSnapshot.commissionRateBps", meaning: "frozen commission rate", required: true },
      komisyon_net_ornek_kurus: { source: "calculated from frozen net price and commission rate", meaning: "estimate, not posted income", required: false },
      aracilik_bps_uygulanan: { source: "Frozen OrderCommissionRateSnapshot plus AuthorTaxReviewEvent as-of paidAt", meaning: "0 for verified invoice/receipt, 500 for verified eligible GVK18; never auto-bill", required: false },
      aracilik_net_ornek_kurus: { source: "sale net multiplied by verified applicable rate", meaning: "illustrative separate service amount, not a ledger or invoice", required: false },
      yazar_mali_belge_turu: { source: "latest valid verified AuthorTaxReviewEvent at paidAt", meaning: "internal review, not government validation", required: true },
      kayit_durumu: { source: "review flags", meaning: "technical record check, not fiscal approval", required: true },
      mali_belge_durumu: { source: "fixed fail-closed disclaimer", meaning: "accountant review required", required: true },
    },
    customerLegalIdentity: "NOT_EXPORTED_MUST_BE_VERIFIED_EXTERNALLY",
    documentType: "NOT_DETERMINED",
    fiscalApproval: "REQUIRED_EXTERNALLY",
    commissionField: "komisyon_net_ornek_kurus",
    commissionNotice: "Illustration from frozen rate and sale net; never an issued service invoice",
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
  const documents = [
    { name: "siparisler.csv", data: safeCsv(sales) },
    { name: "finans_hareketleri.csv", data: safeCsv(movements) },
    { name: "iadeler.csv", data: safeCsv(refundRows) },
    { name: "iade_ledger_mutabakat.csv", data: safeCsv(refundReconciliation) },
    { name: "uyarilar.csv", data: safeCsv(issues) },
    { name: "mutabakat.csv", data: safeCsv(reconciliation) },
    { name: "gun_sonu_ozet.csv", data: safeCsv(summary) },
    { name: "muhasebe_on_hazirlik.csv", data: safeCsv(preparation) },
    { name: "yazar_hesap_ozeti.csv", data: safeCsv(authorRows) },
    { name: "muhasebe_tl_inceleme.csv", data: safeCsvDelimited(liraWorksheet,";") },
    { name: "alan_esleme.json", data: JSON.stringify(fieldMap,null,2)+"\n" },
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
    readySalesCount: details.ready,
    flaggedSalesCount: details.review,
    zeroAmountCount: details.zero,
    refundsCount: input.refunds.length,
    flaggedRefundCount,
    refundLedgerMatchedGroups,
    refundLedgerReviewGroups,
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
    reviewedInvoiceDocumentSales: invoiceDocumentSales,
    reviewedGvk18DocumentSales: gvk18DocumentSales,
    fileHashes: Object.fromEntries(documents.map((file) => [file.name,sha256(file.data)])),
  };
  const files = [...documents,{ name: "manifest.json", data: JSON.stringify(manifest,null,2)+"\n" }];
  return { files, manifest, zip: zipFiles(files) };
}
