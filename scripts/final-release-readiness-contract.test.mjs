import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

function criticalRows(text) {
  return text
    .split("\n")
    .filter((line) => line.startsWith("|") && line.includes("| AUTOMATED_PASS |"));
}

function contains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

test("final release preserves historical Sprint 7 UAT and adds current product acceptance", () => {
  const base = source("docs/sprint-7-production-uat.md");
  const addendum = source("docs/final-release-uat-addendum.md");

  assert.equal(criticalRows(base).length, 33, "historical Sprint 7 matrix must remain 33 rows");
  assert.equal(criticalRows(addendum).length, 7, "current-product addendum must contain 7 rows");
  assert.equal(criticalRows(base).length + criticalRows(addendum).length, 40, "Final Release must cover 40 critical rows");

  for (const row of [...criticalRows(base), ...criticalRows(addendum)]) {
    assert.match(row, /\| (HUMAN_PENDING|HUMAN_PASS|BLOCKED) \|$/, `invalid human state: ${row}`);
  }
});

test("current-product UAT addendum covers every new critical control surface", () => {
  const addendum = source("docs/final-release-uat-addendum.md");

  for (const fragment of [
    "/icerik/seo",
    "/harita",
    "/sozlesme",
    "/sozlesmelerim",
    "Contract assignment / send",
    "Recipient response and admin history",
    "Contract ownership / authority negative check",
  ]) {
    contains(addendum, fragment, "current product UAT coverage");
  }

  contains(addendum, "40 kritik satır", "final critical row total");
  contains(addendum, "7 PASS · 33 PENDING · 0 BLOCKED", "initial final UAT status");
});

test("final release gate is fail-closed across base and addendum", () => {
  const gate = source("scripts/final-release-readiness.mjs");

  contains(gate, "EXPECTED_BASE_ROWS = 33", "historical row guard");
  contains(gate, "EXPECTED_ADDENDUM_ROWS = 7", "addendum row guard");
  contains(gate, "EXPECTED_CRITICAL_ROWS = EXPECTED_BASE_ROWS + EXPECTED_ADDENDUM_ROWS", "combined final gate");
  contains(gate, 'process.argv.includes("--strict")', "strict release flag");
  contains(gate, '"READY_TO_RELEASE"', "ready release state");
  contains(gate, '"OPEN_HUMAN_UAT"', "open human UAT state");
  contains(gate, "Final Release cannot close until every critical production UAT row is HUMAN_PASS.", "fail-closed release message");
  contains(gate, "process.exit(1)", "strict failure exit");
});

test("package scripts expose final release status and strict closure and register the contract", () => {
  const pkg = JSON.parse(source("package.json"));

  assert.equal(pkg.scripts["release:final:status"], "node scripts/final-release-readiness.mjs");
  assert.equal(pkg.scripts["release:final:close"], "node scripts/final-release-readiness.mjs --strict");
  contains(pkg.scripts["test:security"], "scripts/final-release-readiness-contract.test.mjs", "security suite registration");
});
