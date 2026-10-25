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
  const details = { ready: 0, review: 0, zero: 0 };
  let grossMinor = 0n, vatMinor = 0n;

  for (const order of input.orders) {
    const warnings: string[] = [];
    const rate = order.commission, quote = order.quote;
    if (order.currency !== "TRY") warnings.push("TRY_DISINDA_PARA_BIRIMI");
    if (order.sellerMode !== "platform_direct") warnings.push("SATICI_ILKOKU_DOGRULANMADI");
    if (order.finalAmount < 0n || order.originalAmount - order.discountAmount !== order.finalAmount) {
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
        quote.listNetAmount < 0n ||
        quote.listVatAmount !== (quote.listNetAmount * 2000n + 5000n) / 10000n ||
        quote.listNetAmount + quote.listVatAmount !== quote.listGrossAmount ||
        quote.listGrossAmount !== order.originalAmount ||
        quote.discountGrossAmount !== order.discountAmount ||
        quote.payableGrossAmount !== order.finalAmount) {
      warnings.push("FIYAT_KDV_SNAPSHOT_EKSIK_GECERSIZ");
    }
    if (order.couponCode || order.discountAmount !== 0n) warnings.push("KUPON_VERGI_MATRAHI_INCELEME");
    if (order.status === "refunded") warnings.push("IADE_SONRASI_SIPARIS");
    const captures = order.payments.filter((payment) => payment.status === "succeeded");
    if (order.finalAmount > 0n &&
        (captures.length !== 1 || captures[0].amount !== order.finalAmount ||
         captures[0].currency !== order.currency)) warnings.push("TAHSILAT_KAYDI_MUTABAKATSIZ");
    if (order.finalAmount === 0n) {
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
  const documents = [
    { name: "siparisler.csv", data: safeCsv(sales) },
    { name: "finans_hareketleri.csv", data: safeCsv(movements) },
    { name: "iadeler.csv", data: safeCsv(refundRows) },
    { name: "uyarilar.csv", data: safeCsv(issues) },
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
    checkedGrossMinor: grossMinor.toString(),
    checkedVatMinor: vatMinor.toString(),
    fileHashes: Object.fromEntries(documents.map((file) => [file.name,sha256(file.data)])),
  };
  const files = [...documents,{ name: "manifest.json", data: JSON.stringify(manifest,null,2)+"\n" }];
  return { files, manifest, zip: zipFiles(files) };
}
