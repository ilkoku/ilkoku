import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
function loadTypedModule(relativePath, imports = {}) {
  const data = readFileSync(join(ROOT, relativePath), "utf8");
  const transpiled = ts.transpileModule(data, {
    fileName: relativePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal((transpiled.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const loaded = { exports: {} };
  const execute = runInNewContext(
    "(function (require, module, exports) {\n" + transpiled.outputText + "\n})",
    {},
    { filename: relativePath },
  );
  execute((specifier) => {
    assert.ok(Object.hasOwn(imports, specifier), "Unexpected import: " + specifier);
    return imports[specifier];
  }, loaded, loaded.exports);
  return loaded.exports;
}
const preview = loadTypedModule("src/features/commerce/settlement-preview.ts");
const review = loadTypedModule("src/features/commerce/settlement-review.ts", {
  "./settlement-preview": preview,
});

const valid = () => ({
  status: "paid",
  currency: "TRY",
  originalAmount: 12000n,
  discountAmount: 0n,
  finalAmount: 12000n,
  couponCodeSnapshot: null,
  refundedAt: null,
  sellerMode: "platform_direct",
  priceQuote: {
    taxTreatment: "net_plus_vat",
    vatRateBasisPoints: 2000,
    listNetAmount: 10000n,
    listVatAmount: 2000n,
    listGrossAmount: 12000n,
    discountGrossAmount: 0n,
    payableGrossAmount: 12000n,
  },
  payments: [{ status: "succeeded", amount: 12000n, currency: "TRY" }],
  bookedEntryTypes: ["sale_gross"],
});

test("accounting review shows separate invoice and expense-receipt illustrations, not payable ledger", () => {
  const result = review.reviewCommerceOrderSettlement(valid());
  assert.deepEqual([...result.blockers], []);
  assert.equal(result.approvalStatus, "accounting_verification_required");
  assert.ok(result.scenarios);
  const { invoiced, expenseReceipt } = result.scenarios;
  assert.equal(invoiced.commissionNet, 1500n);
  assert.equal(invoiced.commissionVat, 300n);
  assert.equal(invoiced.platformServiceNet, 0n);
  assert.equal(invoiced.authorBankPayment, 10200n);
  assert.equal(invoiced.vat1Payment, 300n);
  assert.equal(invoiced.profitAfterTax, 1125n);
  assert.equal(expenseReceipt.commissionNet, 1500n);
  assert.equal(expenseReceipt.platformServiceNet, 500n);
  assert.equal(expenseReceipt.platformServiceVat, 100n);
  assert.equal(expenseReceipt.authorGross, 8500n);
  assert.equal(expenseReceipt.withholding, 1445n);
  assert.equal(expenseReceipt.authorBankPayment, 6455n);
  assert.equal(expenseReceipt.vat1Payment, 400n);
  assert.equal(expenseReceipt.vat2Payment, 1700n);
  assert.equal(expenseReceipt.profitAfterTax, 1500n);
  for (const p of [invoiced, expenseReceipt]) {
    assert.equal(
      p.readerTotal-p.authorBankPayment-p.withholding-
      p.vat1Payment-p.vat2Payment-p.corporateTaxIllustration,
      p.profitAfterTax,
    );
  }
});

for (const [label, patch] of [
  ["0 TL is never a paid royalty", { finalAmount: 0n, originalAmount: 0n }],
  ["pending order", { status: "pending_payment" }],
  ["refunded order", { status: "refunded", refundedAt: new Date("2026-10-24") }],
  ["coupon discount", { discountAmount: 1200n, couponCodeSnapshot: "PROMO" }],
  ["no matching provider settlement", { payments: [] }],
  ["historic ambiguous price basis", { priceQuote: null }],
  ["non-platform seller", { sellerMode: "writer_direct" }],
  ["duplicate booked commission", { bookedEntryTypes: ["sale_gross", "platform_commission"] }],
  ["unknown currency", { currency: "EUR" }],
]) {
  test("accounting review blocks " + label, () => {
    const result = review.reviewCommerceOrderSettlement({ ...valid(), ...patch });
    assert.equal(result.scenarios, null);
    assert.ok(result.blockers.length > 0);
  });
}

test("mismatched VAT and order amounts cannot create an illustrative settlement", () => {
  const v = valid();
  v.priceQuote.listVatAmount = 1900n;
  const result = review.reviewCommerceOrderSettlement(v);
  assert.equal(result.scenarios, null);
  assert.ok(result.blockers.some(s=>s.includes("snapshot")));
});

test("admin accounting page uses GET/read-only sources and never writes a payable balance", () => {
  const page = readFileSync(join(ROOT,"src/app/admin/finans-gelirler/siparis-mali-inceleme/page.tsx"),"utf8");
  const repo = readFileSync(join(ROOT,"src/features/commerce/finance-repository.ts"),"utf8");
  assert.ok(page.includes("getOrderAccountingReviewSource"));
  assert.ok(page.includes("reviewCommerceOrderSettlement"));
  assert.ok(page.includes("Mali inceleme yap"));
  assert.ok(page.includes('method="get"'));
  assert.ok(repo.includes("where: { orderNo }"));
  for (const prohibited of ["financialLedger.create(", "authorBalance.update(", "payout.create(", "payment.create("]) {
    assert.ok(!page.includes(prohibited), "No finance mutation: " + prohibited);
  }
});
