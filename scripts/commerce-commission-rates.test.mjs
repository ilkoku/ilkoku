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

test("writer preview selects only owned works and resolves their commission through the shared rate engine", () => {
  const repo = readFileSync(join(root, "src/features/commerce/commission-rates-repository.ts"), "utf8");
  const page = readFileSync(join(root, "src/app/satis-erisim/kazanc-hesaplama/page.tsx"), "utf8");
  assert.ok(repo.includes("getWriterCommissionPreviewContext(authorId: string, requestedWorkId?: string)"));
  assert.ok(repo.includes("where: { authorId, workId: null }"));
  assert.ok(repo.includes('saleConfiguration: { is: { saleModel: "paid" } }'));
  assert.ok(repo.includes("works.find((work) => work.id === requestedWorkId)"));
  assert.ok(repo.includes("resolveCommissionRate({"));
  assert.ok(repo.includes("workEvent: selectedWork?.commissionRateEvents[0] ?? null"));
  assert.ok(page.includes("getWriterCommissionPreviewContext(profile.id, query.eser)"));
  assert.ok(page.includes('name="eser"'));
  assert.ok(page.includes("commissionRateBps, serviceFeeRateBps"));
  assert.ok(page.includes('calculateIllustrativeSettlement(price, "invoice", commissionRateBps, serviceFeeRateBps)'));
  assert.ok(page.includes('calculateIllustrativeSettlement(price, "expense_receipt", commissionRateBps, serviceFeeRateBps)'));
  assert.ok(page.includes("Seçilen eser bu yazar hesabına ait değil"));
});

test("writer preview never reinterprets legacy VAT-inclusive prices or creates a fiscal document", () => {
  const repo = readFileSync(join(root, "src/features/commerce/commission-rates-repository.ts"), "utf8");
  const page = readFileSync(join(root, "src/app/satis-erisim/kazanc-hesaplama/page.tsx"), "utf8");
  assert.ok(repo.includes('effective.priceTaxTreatment === "net_plus_vat"'));
  assert.ok(repo.includes("resolveEffectiveCommerceState({"));
  assert.ok(repo.includes("latestConsent: selectedWork.publicationConsents[0] ?? null"));
  assert.ok(repo.includes('configuration.currency === "TRY"'));
  assert.ok(repo.includes("savedNetPrice,"));
  assert.ok(page.includes("preview.savedNetPrice ?? parseTryNetPrice(query.fiyat)"));
  assert.ok(page.includes("Bu eserin kayıtlı fiyatı KDV hariç olarak doğrulanmış değil"));
  for (const forbidden of ["invoice.create(", "financialLedger.create(", "payout.create(", "payment.create(", "authorBalance.update("]) {
    assert.ok(!page.includes(forbidden), "Preview is read-only: " + forbidden);
  }
});

test("writer income reads historical commission snapshots instead of recomputing the current percent", () => {
  const finance = readFileSync(join(root, "src/features/commerce/finance-repository.ts"), "utf8");
  const income = readFileSync(join(root, "src/app/gelirler/page.tsx"), "utf8");
  assert.ok(finance.includes("commissionRateSnapshot: {"));
  assert.ok(finance.includes("commissionRateBps: true"));
  assert.ok(income.includes("order.commissionRateSnapshot.commissionRateBps"));
  assert.ok(income.includes("Oran kaydı eksik"));
  assert.ok(income.includes("Sipariş anındaki komisyon"));
  const works = readFileSync(join(root, "src/app/satis-erisim/page.tsx"), "utf8");
  assert.ok(works.includes("/satis-erisim/kazanc-hesaplama?eser="));
  assert.ok(!income.includes("commissionRateBps: 1500"));
});
