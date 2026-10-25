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
export function safeCsv(rows: readonly CsvField[][]) {
  const cell = (value: CsvField): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "number" || typeof value === "bigint") return String(value);
    // Spreadsheet formula injection protection on ALL untrusted text fields.
    const text = /^[\s]*[=+@-]/u.test(value) || /^[\t\r\n]/u.test(value) ? "'" + value : value;
    return '"' + text.replace(/"/gu, '""') + '"';
  };
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
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
  payments: { status: string; amount: bigint; currency: string }[];
};

export type DayCloseLedger = {
  id: string; entryType: string; amount: bigint; currency: string;
  createdAt: Date; orderNo: string | null; authorPublicId: string | null;
};

export type DayCloseRefund = {
  id: string; orderNo: string; amount: bigint; currency: string;
  processedAt: Date; status: string;
};

export function buildDayCloseFiles(input: {
  day: string; orders: DayCloseOrder[]; ledger: DayCloseLedger[]; refunds: DayCloseRefund[];
}) {
  const sales: CsvField[][] = [[
    "siparis_no","odeme_tarihi_utc","durum","yazar_kodu","eser",
    "para_birimi","liste_brut_kurus","indirim_kurus","tahsilat_kurus",
    "net_fiyat_kurus","satis_kdv_kurus","komisyon_bps",
    "komisyon_kaynagi","aracilik_bps_kosullu","kupon","kontrol",
  ]];
  const issues: CsvField[][] = [["kaynak","referans","uyari","islem"]];
  const reconciliation: CsvField[][] = [[
    "siparis_no","beklenen_satis_brut_kurus","ledger_satis_brut_kurus",
    "ledger_satis_brut_kayit_sayisi","basarili_tahsilat_kurus",
    "basarili_tahsilat_sayisi","mutabakat",
  ]];
  // Accountants can map this neutral pre-transfer view into the actual
  // external software template. This is NOT a fiscal document payload.
  const preparation: CsvField[][] = [[
    "referans_siparis_no","satis_tarihi_utc","yazar_kodu","eser",
    "para_birimi","satis_net_kurus","satis_kdv_kurus","satis_brut_kurus",
    "komisyon_bps","komisyon_net_ornek_kurus","aracilik_bps_kosullu",
    "kayit_durumu","mali_belge_durumu",
  ]];
  const grossLedger = new Map<string, DayCloseLedger[]>();
  for (const entry of input.ledger) {
    if (entry.entryType !== "sale_gross" || entry.orderNo === null) continue;
    const entries = grossLedger.get(entry.orderNo) ?? [];
    entries.push(entry);
    grossLedger.set(entry.orderNo, entries);
  }
  const details = { ready: 0, review: 0, zero: 0 };
  let grossMinor = BigInt(0), vatMinor = BigInt(0);

  for (const order of input.orders) {
    const warnings: string[] = [];
    const rate = order.commission, quote = order.quote;
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
    const captures = order.payments.filter((payment) => payment.status === "succeeded");
    const ledgerEntries = grossLedger.get(order.orderNo) ?? [];
    const ledgerGross = ledgerEntries.reduce((sum,entry) => sum + entry.amount, BigInt(0));
    const ledgerMatches = ledgerEntries.length === 1 &&
      ledgerEntries[0].currency === order.currency &&
      ledgerEntries[0].amount === order.originalAmount;
    if (!ledgerMatches) warnings.push("LEDGER_BRUT_SATIS_MUTABAKATSIZ");
    const capturedTotal = captures.reduce((sum,payment) => sum + payment.amount, BigInt(0));
    reconciliation.push([
      order.orderNo,order.originalAmount,ledgerGross,ledgerEntries.length,
      capturedTotal,captures.length,ledgerMatches ? "LEDGER_KONTROLU_GECTI" : "INCELEME_GEREKLI",
    ]);
    if (order.finalAmount > BigInt(0) &&
        (captures.length !== 1 || captures[0].amount !== order.finalAmount ||
         captures[0].currency !== order.currency)) warnings.push("TAHSILAT_KAYDI_MUTABAKATSIZ");
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
      rate?.serviceFeeRateBps,order.couponCode,review,
    ]);
    if (review === "VERI_KONTROLU_GECTI" && quote && rate) {
      // This is only the net commission illustration at the frozen order
      // rate, not a platform invoice, ledger posting or tax determination.
      const commissionPreview = (quote.listNetAmount * BigInt(rate.commissionRateBps) +
        BigInt(5000)) / BigInt(10000);
      preparation.push([
        order.orderNo,order.paidAt?.toISOString() ?? null,
        order.authorPublicId,order.workTitle,order.currency,
        quote.listNetAmount,quote.listVatAmount,order.finalAmount,
        rate.commissionRateBps,commissionPreview,rate.serviceFeeRateBps,
        review,"DIS_MUHASEBE_BELGE_KONTROLU_GEREKLI",
      ]);
    }
  }
  const movements: CsvField[][] = [[
    "hareket_id","olusturulma_utc","tur","siparis_no","yazar_kodu","para_birimi","tutar_kurus",
  ]];
  for (const entry of input.ledger) movements.push([
    entry.id,entry.createdAt.toISOString(),entry.entryType,entry.orderNo,
    entry.authorPublicId,entry.currency,entry.amount,
  ]);
  const refundRows: CsvField[][] = [[
    "iade_id","islem_tarihi_utc","siparis_no","durum","para_birimi","tutar_kurus",
  ]];
  for (const refund of input.refunds) refundRows.push([
    refund.id,refund.processedAt.toISOString(),refund.orderNo,refund.status,
    refund.currency,refund.amount,
  ]);
  const fieldMap = {
    version: "generic-accounting-map-v1",
    status: "UNVERIFIED_VENDOR_MAPPING",
    purpose: "External bookkeeping preparation; never issue invoices in IlkOku",
    currencyUnit: "kurus",
    timestamps: "UTC ISO-8601; batch grouped by Europe/Istanbul business day",
    batchReference: "ILK-DAY-" + input.day,
    exportFile: "muhasebe_on_hazirlik.csv",
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
      aracilik_bps_kosullu: { source: "OrderCommissionRateSnapshot.serviceFeeRateBps", meaning: "only eligible un-invoiced writer status; never auto-bill", required: false },
      kayit_durumu: { source: "review flags", meaning: "technical record check, not fiscal approval", required: true },
      mali_belge_durumu: { source: "fixed fail-closed disclaimer", meaning: "accountant review required", required: true },
    },
    customerLegalIdentity: "NOT_EXPORTED_MUST_BE_VERIFIED_EXTERNALLY",
    documentType: "NOT_DETERMINED",
    fiscalApproval: "REQUIRED_EXTERNALLY",
    commissionField: "komisyon_net_ornek_kurus",
    commissionNotice: "Illustration from frozen rate and sale net; never an issued service invoice",
    optionalServiceFee: "5% rate only; applicability, VAT and document require accountant review",
    vendors: {
      logo: { schemaVerified: false, automaticImportReady: false },
      mikro: { schemaVerified: false, automaticImportReady: false },
      parasut: { schemaVerified: false, automaticImportReady: false },
    },
  };
  const documents = [
    { name: "siparisler.csv", data: safeCsv(sales) },
    { name: "finans_hareketleri.csv", data: safeCsv(movements) },
    { name: "iadeler.csv", data: safeCsv(refundRows) },
    { name: "uyarilar.csv", data: safeCsv(issues) },
    { name: "mutabakat.csv", data: safeCsv(reconciliation) },
    { name: "muhasebe_on_hazirlik.csv", data: safeCsv(preparation) },
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
    counting: "Siparisler paidAt, iadeler processedAt, ledger createdAt tarihine gore gruplanir. Gece sonrasi degisiklikler yeni indirmede fark yaratabilir.",
    salesCount: input.orders.length,
    readySalesCount: details.ready,
    flaggedSalesCount: details.review,
    zeroAmountCount: details.zero,
    refundsCount: input.refunds.length,
    ledgerCount: input.ledger.length,
    preparationRows: preparation.length - 1,
    unmatchedGrossLedgerOrderCount: reconciliation.slice(1).filter(row => row[6] !== "LEDGER_KONTROLU_GECTI").length,
    checkedGrossMinor: grossMinor.toString(),
    checkedVatMinor: vatMinor.toString(),
    fileHashes: Object.fromEntries(documents.map((file) => [file.name,sha256(file.data)])),
  };
  const files = [...documents,{ name: "manifest.json", data: JSON.stringify(manifest,null,2)+"\n" }];
  return { files, manifest, zip: zipFiles(files) };
}
