import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_ARCHIVE_BYTES = 96 * 1024 * 1024;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_ENTRIES = 64;
const SAFE_NAME = /^[a-z0-9._-]+$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
// Values are compared as stored, never through floating point conversion.
// A numeric total can remain unchanged even when money moved between orders
// or authors: source CSV changes must still trigger a separate review.
const FINANCIAL_FIELDS = [
  "checkedGrossMinor", "checkedVatMinor", "reviewedRefundMinor",
  "reviewedCommissionIllustrationMinor", "reviewedServiceFeeIllustrationMinor",
];
const COUNT_FIELDS = [
  "salesCount", "readySalesCount", "flaggedSalesCount", "zeroAmountCount",
  "refundsCount", "flaggedRefundCount",
  "refundLedgerMatchedGroups", "refundLedgerReviewGroups",
  "periodBridgeCurrencyGroups", "ledgerCount", "ledgerSummaryGroups",
  "preparationRows", "liraWorksheetRows", "reviewedAuthorSummaryGroups",
  "unmatchedGrossLedgerOrderCount", "reviewedInvoiceDocumentSales",
  "reviewedGvk18DocumentSales",
];
const CONTROL_FIELDS = [
  "version", "day", "timezone", "period", "batchKey", "classification",
  "sourceMappingVerified", "authorTotalsReconciled", "vendorImportReady",
];

function check(condition, reason) {
  if (!condition) throw new Error("DAY_CLOSE_COMPARE_INVALID_" + reason);
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Inspect a locally downloaded İlkOku ZIP. Only STORE-method ZIPs produced by
 * the day-close generator are accepted; this never writes or posts records.
 * Hash checks catch accidental modifications, not forged or signed receipts.
 */
export function inspectDayCloseArchive(buffer) {
  check(Buffer.isBuffer(buffer), "NOT_A_BUFFER");
  check(buffer.length >= 22 && buffer.length <= MAX_ARCHIVE_BYTES, "ARCHIVE_SIZE");
  const end = buffer.length - 22;
  check(buffer.readUInt32LE(end) === 0x06054b50, "ZIP_END");
  check(buffer.readUInt16LE(end + 20) === 0, "ZIP_COMMENT");
  const count = buffer.readUInt16LE(end + 10);
  check(count > 1 && count <= MAX_ENTRIES && count === buffer.readUInt16LE(end + 8),
    "ZIP_ENTRY_COUNT");
  const directoryLength = buffer.readUInt32LE(end + 12);
  const directoryStart = buffer.readUInt32LE(end + 16);
  check(directoryStart + directoryLength === end, "ZIP_DIRECTORY_RANGE");

  const entries = new Map();
  const localMetadata = new Map();
  let position = 0;
  while (position < directoryStart) {
    check(position + 30 <= directoryStart &&
      buffer.readUInt32LE(position) === 0x04034b50, "LOCAL_HEADER");
    const flags = buffer.readUInt16LE(position + 6);
    const method = buffer.readUInt16LE(position + 8);
    const expectedCrc = buffer.readUInt32LE(position + 14);
    const size = buffer.readUInt32LE(position + 18);
    const decompressed = buffer.readUInt32LE(position + 22);
    const nameLength = buffer.readUInt16LE(position + 26);
    const extraLength = buffer.readUInt16LE(position + 28);
    check(flags === 0x0800 && method === 0 && size === decompressed,
      "UNSUPPORTED_ZIP_METHOD");
    check(size <= MAX_FILE_BYTES && nameLength > 0, "ENTRY_SIZE");
    const start = position + 30;
    const dataStart = start + nameLength + extraLength;
    const dataEnd = dataStart + size;
    check(dataEnd <= directoryStart, "ENTRY_RANGE");
    const name = buffer.subarray(start, start + nameLength).toString("utf8");
    check(SAFE_NAME.test(name) && !entries.has(name), "ENTRY_NAME");
    const data = buffer.subarray(dataStart, dataEnd);
    check(crc32(data) === expectedCrc, "ENTRY_CRC");
    entries.set(name, data);
    localMetadata.set(name, { offset: position, size, crc: expectedCrc });
    position = dataEnd;
    check(entries.size <= MAX_ENTRIES, "TOO_MANY_ENTRIES");
  }
  check(position === directoryStart && entries.size === count, "LOCAL_COUNT");

  // Cross-check central directory against local entries so hidden/trailing
  // entries and inconsistent indexes are rejected rather than ignored.
  let dir = directoryStart;
  const centralNames = new Set();
  while (dir < end) {
    check(dir + 46 <= end && buffer.readUInt32LE(dir) === 0x02014b50,
      "CENTRAL_HEADER");
    const flags = buffer.readUInt16LE(dir + 8);
    const method = buffer.readUInt16LE(dir + 10);
    const crc = buffer.readUInt32LE(dir + 16);
    const size = buffer.readUInt32LE(dir + 20);
    const nameLength = buffer.readUInt16LE(dir + 28);
    const extraLength = buffer.readUInt16LE(dir + 30);
    const commentLength = buffer.readUInt16LE(dir + 32);
    const offset = buffer.readUInt32LE(dir + 42);
    const next = dir + 46 + nameLength + extraLength + commentLength;
    check(flags === 0x0800 && method === 0 && next <= end,
      "CENTRAL_FORMAT");
    const name = buffer.subarray(dir + 46, dir + 46 + nameLength).toString("utf8");
    const local = localMetadata.get(name);
    check(local && !centralNames.has(name) &&
      local.offset === offset && local.size === size && local.crc === crc,
      "CENTRAL_MISMATCH");
    centralNames.add(name);
    dir = next;
  }
  check(dir === end && centralNames.size === count, "CENTRAL_COUNT");

  const manifestBuffer = entries.get("manifest.json");
  check(Boolean(manifestBuffer), "MISSING_MANIFEST");
  let manifest;
  try {
    manifest = JSON.parse(manifestBuffer.toString("utf8"));
  } catch {
    throw new Error("DAY_CLOSE_COMPARE_INVALID_MANIFEST_JSON");
  }
  check(manifest && typeof manifest === "object" && !Array.isArray(manifest),
    "MANIFEST_SHAPE");
  check(manifest.version === "day-close-v1" &&
    typeof manifest.day === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(manifest.day) &&
    manifest.batchKey === "ILK-DAY-" + manifest.day,
  "MANIFEST_IDENTITY");
  const declared = manifest.fileHashes;
  check(declared && typeof declared === "object" && !Array.isArray(declared),
    "MANIFEST_HASHES");
  const actualNames = [...entries.keys()].filter(name => name !== "manifest.json").sort();
  const declaredNames = Object.keys(declared).sort();
  check(JSON.stringify(actualNames) === JSON.stringify(declaredNames),
    "MANIFEST_FILE_LIST");
  for (const name of actualNames) {
    check(typeof declared[name] === "string" && SHA256.test(declared[name]) &&
      sha256(entries.get(name)) === declared[name], "FILE_HASH");
  }
  return {
    manifest,
    manifestSha256: sha256(manifestBuffer),
    archiveSha256: sha256(buffer),
    verifiedFileCount: entries.size,
  };
}

/** Compare two complete, locally saved day-close ZIP packages from the SAME day. */
export function compareDayCloseArchives(first, second) {
  const previous = inspectDayCloseArchive(first);
  const current = inspectDayCloseArchive(second);
  check(previous.manifest.day === current.manifest.day, "DIFFERENT_DAYS");
  check(previous.manifest.version === current.manifest.version, "DIFFERENT_VERSIONS");
  const original = previous.manifest.fileHashes;
  const latest = current.manifest.fileHashes;
  const names = [...new Set([...Object.keys(original), ...Object.keys(latest)])].sort();
  const changedFiles = names.filter(name => original[name] !== latest[name]);
  const metricsFor = (category, fields) => fields
    .filter(field => previous.manifest[field] !== current.manifest[field])
    .map(field => ({
      category, field, previous: previous.manifest[field] ?? null,
      current: current.manifest[field] ?? null,
    }));
  const changedFinancialMetrics = metricsFor("financial", FINANCIAL_FIELDS);
  const changedCountMetrics = metricsFor("count", COUNT_FIELDS);
  const changedControlMetrics = metricsFor("control", CONTROL_FIELDS);
  const changedMetrics = [
    ...changedFinancialMetrics, ...changedCountMetrics, ...changedControlMetrics,
  ];
  const manifestChanged = previous.manifestSha256 !== current.manifestSha256;
  const archiveChanged = previous.archiveSha256 !== current.archiveSha256;
  // Never say "descriptive only": authors, work IDs and financial allocations
  // can change while all monetary and count aggregates remain the same.
  const changeAssessment = !archiveChanged ? "IDENTICAL" :
    changedFinancialMetrics.length ? "FINANCIAL_TOTALS_CHANGED" :
    changedCountMetrics.length ? "RECORD_COUNTS_CHANGED" :
    changedControlMetrics.length ? "CONTROL_METADATA_CHANGED" :
    changedFiles.length ? "FILES_CHANGED_AGGREGATES_UNCHANGED" :
    manifestChanged ? "MANIFEST_METADATA_CHANGED" :
    "ZIP_CONTAINER_BYTES_CHANGED";
  return {
    day: current.manifest.day,
    result: !archiveChanged ? "IDENTICAL" : "CHANGED_REVIEW_REQUIRED",
    changeAssessment,
    previousSha256: previous.archiveSha256,
    currentSha256: current.archiveSha256,
    changedFiles,
    changedMetrics,
    changedFinancialMetrics,
    changedCountMetrics,
    changedControlMetrics,
    manifestChanged,
    archiveChanged,
    warning: !archiveChanged
      ? "Both downloaded ZIPs have identical bytes. This does not establish bank settlement or tax approval."
      : changedFinancialMetrics.length
      ? "At least one financial aggregate changed; inspect both ZIPs and source records. This is not a verified bank or tax statement."
      : changedFiles.length
      ? "Source file data changed even if aggregates stayed equal. Allocation, writer, order or sale details may still have changed; inspect both versions."
      : "Archive or manifest metadata changed. Verify the origin, chronology and content of both packages; neither file is a signed fiscal document.",
    noWritesPerformed: true,
  };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4) {
    console.error("Usage: node scripts/commerce-day-close-compare.mjs <old-day-close.zip> <new-day-close.zip>");
    process.exitCode = 1;
  } else {
    try {
      const comparison = compareDayCloseArchives(
        readFileSync(resolve(process.argv[2])),
        readFileSync(resolve(process.argv[3])),
      );
      process.stdout.write(JSON.stringify(comparison, null, 2) + "\n");
      process.exitCode = comparison.archiveChanged ? 2 : 0;
    } catch (error) {
      console.error(error instanceof Error ? error.message : "INVALID_ARCHIVE");
      process.exitCode = 1;
    }
  }
}
