import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "src/features/commerce/commission-rates.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  fileName: "commission-rates.ts",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal((compiled.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
const loaded = { exports: {} };
const fn = runInNewContext(
  "(function (require, module, exports) {\n" + compiled.outputText + "\n})",
  {},
);
fn(() => { throw new Error("Unexpected import"); }, loaded, loaded.exports);
const rates = loaded.exports;

test("global 15 percent and separate 5 percent service are independent", () => {
  const result = rates.resolveCommissionRate({});
  assert.equal(result.source, "global");
  assert.equal(result.commissionRateBps, 1500);
  assert.equal(result.serviceFeeRateBps, 500);
  assert.equal(result.sourceEventId, null);
});
test("writer then work override takes precedence, resets correctly fallback", () => {
  const writer = { id: "author-1", active: true, rateBps: 1800 };
  const work = { id: "work-1", active: true, rateBps: 2300 };
  assert.equal(rates.resolveCommissionRate({ authorEvent: writer }).commissionRateBps, 1800);
  const specific = rates.resolveCommissionRate({ authorEvent: writer, workEvent: work });
  assert.equal(specific.commissionRateBps, 2300);
  assert.equal(specific.sourceEventId, "work-1");
  assert.equal(specific.serviceFeeRateBps, 500);
  assert.equal(rates.resolveCommissionRate({
    authorEvent: writer, workEvent: { ...work, active: false },
  }).commissionRateBps, 1800);
  assert.equal(rates.resolveCommissionRate({
    authorEvent: { ...writer, active: false }, workEvent: { ...work, active: false },
  }).commissionRateBps, 1500);
});
test("commission percent handles decimal comma, exact bps and rejects invalid values", () => {
  for (const [text, rate] of [["0",0],["15",1500],["15,25",1525],["20.5",2050],["90",9000]]) {
    assert.equal(rates.readRateBasisPoints(text), rate);
  }
  for (const invalid of ["-1","90.01","99","100","14.333","1e2","abc","10%","", "01"]) {
    assert.equal(rates.readRateBasisPoints(invalid), null, invalid);
  }
});
test("checkout orders freeze rates in the same database transaction for paid and free paths", () => {
  const repo = readFileSync(join(root, "src/features/commerce/commission-rates-repository.ts"), "utf8");
  assert.ok(repo.includes("tx.authorCommissionRateEvent.findFirst"));
  assert.ok(repo.includes('where: { authorId, workId }'));
  assert.ok(repo.includes("workId: null"));
  const order = readFileSync(join(root, "src/features/commerce/order-snapshot.ts"), "utf8");
  assert.ok(order.includes("commissionRateSnapshot:"));
  assert.ok(order.includes("sourceEventId: input.commissionRate.sourceEventId"));
});
