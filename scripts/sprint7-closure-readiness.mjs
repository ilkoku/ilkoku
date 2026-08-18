import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UAT_PATH = join(ROOT, "docs/sprint-7-production-uat.md");
const EXPECTED_CRITICAL_ROWS = 33;
const ALLOWED_HUMAN_STATUSES = new Set(["HUMAN_PENDING", "HUMAN_PASS", "BLOCKED"]);
const strict = process.argv.includes("--strict");

const text = readFileSync(UAT_PATH, "utf8");
const rows = text
  .split("\n")
  .filter((line) => line.startsWith("|") && line.includes("| AUTOMATED_PASS |"))
  .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));

if (rows.length !== EXPECTED_CRITICAL_ROWS) {
  console.error(
    `Sprint 7 UAT matrix changed unexpectedly: expected ${EXPECTED_CRITICAL_ROWS} critical rows, found ${rows.length}.`,
  );
  process.exit(1);
}

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
  console.error("Sprint 7 UAT matrix contains invalid human acceptance states:");
  for (const item of invalid) {
    console.error(`- ${item.flow}: ${item.human ?? "missing"}`);
  }
  process.exit(1);
}

const open = counts.HUMAN_PENDING + counts.BLOCKED;
const status = open === 0 && counts.HUMAN_PASS === EXPECTED_CRITICAL_ROWS
  ? "READY_TO_CLOSE"
  : "OPEN_HUMAN_UAT";

console.log(`Sprint 7 closure status: ${status}`);
console.log(`- Critical rows: ${EXPECTED_CRITICAL_ROWS}`);
console.log(`- HUMAN_PASS: ${counts.HUMAN_PASS}`);
console.log(`- HUMAN_PENDING: ${counts.HUMAN_PENDING}`);
console.log(`- BLOCKED: ${counts.BLOCKED}`);

if (strict && status !== "READY_TO_CLOSE") {
  console.error("Sprint 7 cannot close until every critical production UAT row is HUMAN_PASS.");
  process.exit(1);
}
