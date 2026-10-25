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
const taxPolicy = loadTypedModule("src/features/commerce/tax-review-policy.ts");
const review = loadTypedModule("src/features/commerce/settlement-review.ts", {
  "./settlement-preview": preview,
  "./tax-review-policy": taxPolicy,
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
  taxReview: {
    documentKind: "commercial_invoice",
    decision: "verified",
    validUntil: new Date(Date.now() + 86400000 * 30),
    reviewedAt: new Date(Date.now() - 86400000),
  },
});

test("verified commercial invoice shows only the matching example, never an automatic payout", () => {
  const result = review.reviewCommerceOrderSettlement(valid());
  assert.deepEqual([...result.blockers], []);
  assert.equal(result.approvalStatus, "accounting_verification_required");
  assert.ok(result.scenarios);
  const { invoiced, expenseReceipt } = result.scenarios;
  assert.equal(expenseReceipt, null);
  assert.equal(invoiced.commissionNet, 1500n);
  assert.equal(invoiced.commissionVat, 300n);
  assert.equal(invoiced.platformServiceNet, 0n);
  assert.equal(invoiced.authorBankPayment, 10200n);
  assert.equal(invoiced.vat1Payment, 300n);
  assert.equal(invoiced.profitAfterTax, 1125n);
});

test("verified GVK18 expense receipt shows distinct 5 percent plus VAT service fee", () => {
  const source = valid();
  source.taxReview.documentKind = "gvk18_expense_receipt";
  const result = review.reviewCommerceOrderSettlement(source);
  assert.deepEqual([...result.blockers], []);
  assert.equal(result.approvalStatus, "accounting_verification_required");
  assert.equal(result.scenarios.invoiced, null);
  const p = result.scenarios.expenseReceipt;
  assert.equal(p.commissionNet, 1500n);
  assert.equal(p.platformServiceNet, 500n);
  assert.equal(p.platformServiceVat, 100n);
  assert.equal(p.authorGross, 8500n);
  assert.equal(p.withholding, 1445n);
  assert.equal(p.authorBankPayment, 6455n);
  assert.equal(p.vat1Payment, 400n);
  assert.equal(p.vat2Payment, 1700n);
  assert.equal(p.profitAfterTax, 1500n);
  assert.equal(p.readerTotal-p.authorBankPayment-p.withholding-
    p.vat1Payment-p.vat2Payment-p.corporateTaxIllustration, p.profitAfterTax);
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

for (const [label, latest] of [
  ["missing", null],
  ["revoked", { documentKind: "commercial_invoice", decision: "revoked", validUntil: null, reviewedAt: new Date() }],
  ["expired", { documentKind: "commercial_invoice", decision: "verified", validUntil: new Date(Date.now()-86400000), reviewedAt: new Date(Date.now()-86400000*2) }],
  ["e-SMM requires separate tax treatment", { documentKind: "self_employed_receipt", decision: "verified", validUntil: new Date(Date.now()+86400000), reviewedAt: new Date(Date.now()-86400000) }],
]) {
  test("accounting review blocks author document review: " + label, () => {
    const result = review.reviewCommerceOrderSettlement({ ...valid(), taxReview: latest });
    assert.equal(result.scenarios, null);
    assert.ok(result.blockers.length > 0);
  });
}

test("admin may record a document-review event only with external reference, future expiry and attestation", () => {
  const input = {
    documentKind: "gvk18_expense_receipt",
    decision: "verified",
    evidenceReference: "MUH-2026-0001",
    validUntil: "2027-10-25",
    attested: true,
  };
  const success = taxPolicy.validateAuthorTaxReview(input, new Date("2026-10-25"));
  assert.equal(success.ok, true);
  for (const invalid of [
    { attested: false },
    { evidenceReference: "" },
    { evidenceReference: "12345678901/TC" },
    { validUntil: "2024-01-01" },
    { documentKind: "not-a-kind" },
  ]) {
    assert.equal(taxPolicy.validateAuthorTaxReview({ ...input, ...invalid }, new Date("2026-10-25")).ok, false);
  }
});

test("tax review recording cannot mutate payments or accepted legal documents", () => {
  const actions = readFileSync(join(ROOT, "src/features/commerce/tax-review-actions.ts"), "utf8");
  const page = readFileSync(join(ROOT, "src/app/admin/finans-gelirler/yazar-vergi-inceleme/page.tsx"), "utf8");
  const schema = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");
  const migration = readFileSync(join(ROOT, "prisma/migrations/20261025165000_author_tax_review_events/migration.sql"), "utf8");
  assert.ok(actions.includes('actor.role !== "admin"'));
  assert.ok(actions.includes('role: "writer"'));
  assert.ok(actions.includes("authorTaxReviewEvent.create("));
  assert.ok(page.includes("Değiştirilemez olay geçmişi"));
  assert.ok(schema.includes("model AuthorTaxReviewEvent"));
  assert.ok(migration.includes("AuthorTaxReviewEvent_authorId_fkey"));
  for (const forbidden of [
    "financialLedger.create(", "authorBalance.update(", "payout.create(",
    "payment.create(", "authorAgreement.update(", "order.update(",
  ]) {
    assert.ok(!actions.includes(forbidden), "Review must not post finance or legal documents: " + forbidden);
  }
});
