import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE_UAT_PATH = join(ROOT, "docs/sprint-7-production-uat.md");
const ADDENDUM_UAT_PATH = join(ROOT, "docs/final-release-uat-addendum.md");
const EXPECTED_BASE_ROWS = 33;
const EXPECTED_ADDENDUM_ROWS = 7;
const EXPECTED_CRITICAL_ROWS = EXPECTED_BASE_ROWS + EXPECTED_ADDENDUM_ROWS;
const ALLOWED_HUMAN_STATUSES = new Set(["HUMAN_PENDING", "HUMAN_PASS", "BLOCKED"]);
const strict = process.argv.includes("--strict");

function parseCriticalRows(filePath) {
  const text = readFileSync(filePath, "utf8");
  return text
    .split("\n")
    .filter((line) => line.startsWith("|") && line.includes("| AUTOMATED_PASS |"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

const baseRows = parseCriticalRows(BASE_UAT_PATH);
const addendumRows = parseCriticalRows(ADDENDUM_UAT_PATH);

if (baseRows.length !== EXPECTED_BASE_ROWS) {
  console.error(
    `Final Release base UAT changed unexpectedly: expected ${EXPECTED_BASE_ROWS} critical rows, found ${baseRows.length}.`,
  );
  process.exit(1);
}

if (addendumRows.length !== EXPECTED_ADDENDUM_ROWS) {
  console.error(
    `Final Release addendum changed unexpectedly: expected ${EXPECTED_ADDENDUM_ROWS} critical rows, found ${addendumRows.length}.`,
  );
  process.exit(1);
}

const rows = [...baseRows, ...addendumRows];
const counts = {
  HUMAN_PENDING: 0,
  HUMAN_PASS: 0,
  BLOCKED: 0,
};
const invalid = [];

for (const cells of rows) {
  const human = cells.at(-1);
  const flow = cells[0] ?? "unknown flow";

  if (!ALLOWED_HUMAN_STATUSES.has(human)) {
    invalid.push({ flow, human });
    continue;
  }

  counts[human] += 1;
}

if (invalid.length > 0) {
  console.error("Final Release UAT contains invalid human acceptance states:");
  for (const item of invalid) {
    console.error(`- ${item.flow}: ${item.human ?? "missing"}`);
  }
  process.exit(1);
}

const open = counts.HUMAN_PENDING + counts.BLOCKED;
const status = open === 0 && counts.HUMAN_PASS === EXPECTED_CRITICAL_ROWS
  ? "READY_TO_RELEASE"
  : "OPEN_HUMAN_UAT";

console.log(`Final Release UAT status: ${status}`);
console.log(`- Critical rows: ${EXPECTED_CRITICAL_ROWS}`);
console.log(`- Historical Sprint 7 rows: ${EXPECTED_BASE_ROWS}`);
console.log(`- Current-product addendum rows: ${EXPECTED_ADDENDUM_ROWS}`);
console.log(`- HUMAN_PASS: ${counts.HUMAN_PASS}`);
console.log(`- HUMAN_PENDING: ${counts.HUMAN_PENDING}`);
console.log(`- BLOCKED: ${counts.BLOCKED}`);

if (strict && status !== "READY_TO_RELEASE") {
  console.error("Final Release cannot close until every critical production UAT row is HUMAN_PASS.");
  process.exit(1);
}
