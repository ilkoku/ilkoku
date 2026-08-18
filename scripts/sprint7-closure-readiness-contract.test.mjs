import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

function assertContains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

test("Sprint 7 closure gate is explicit, strict and human-UAT bound", () => {
  const gate = source("scripts/sprint7-closure-readiness.mjs");

  assertContains(gate, "EXPECTED_CRITICAL_ROWS = 33", "Sprint 7 critical-row floor");
  assertContains(gate, 'process.argv.includes("--strict")', "Sprint 7 strict closure flag");
  assertContains(gate, '"HUMAN_PENDING"', "Sprint 7 pending human status");
  assertContains(gate, '"HUMAN_PASS"', "Sprint 7 human pass status");
  assertContains(gate, '"BLOCKED"', "Sprint 7 blocked human status");
  assertContains(gate, '"READY_TO_CLOSE"', "Sprint 7 ready state");
  assertContains(gate, '"OPEN_HUMAN_UAT"', "Sprint 7 open human-UAT state");
  assertContains(
    gate,
    "Sprint 7 cannot close until every critical production UAT row is HUMAN_PASS.",
    "Sprint 7 fail-closed message",
  );
  assertContains(gate, "process.exit(1)", "Sprint 7 fail-closed exit");
});

test("Sprint 7 UAT matrix keeps the complete critical human acceptance set", () => {
  const uat = source("docs/sprint-7-production-uat.md");
  const rows = uat
    .split("\n")
    .filter((line) => line.startsWith("|") && line.includes("| AUTOMATED_PASS |"));

  assert.equal(rows.length, 33, "Sprint 7 UAT must keep all 33 critical rows");
  for (const row of rows) {
    assert.match(
      row,
      /\| (HUMAN_PENDING|HUMAN_PASS|BLOCKED) \|$/,
      `critical UAT row must have a recognized human status: ${row}`,
    );
  }
});

test("Sprint 7 closure record cannot claim completion before human UAT", () => {
  const closure = source("docs/sprint-7-closure.md");
  const packageJson = source("package.json");

  assertContains(closure, "`OPEN_HUMAN_UAT`", "Sprint 7 current closure status");
  assertContains(closure, "33/33 human passes", "Sprint 7 final human acceptance requirement");
  assertContains(closure, "Close issue #246 only after", "Sprint 7 issue closure guard");
  assertContains(packageJson, '"release:sprint7:status"', "Sprint 7 status command");
  assertContains(packageJson, '"release:sprint7:close"', "Sprint 7 strict closure command");
  assertContains(
    packageJson,
    "scripts/sprint7-closure-readiness-contract.test.mjs",
    "Sprint 7 closure contract CI registration",
  );
});
