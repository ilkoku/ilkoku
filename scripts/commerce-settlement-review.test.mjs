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
  paidAt: new Date(Date.now()-3600000),
  currency: "TRY",
  originalAmount: 12000n,
  discountAmount: 0n,
  finalAmount: 12000n,
  couponCodeSnapshot: null,
  refundedAt: null,
  hasOpenOrProcessedRefund: false,
  sellerMode: "platform_direct",
  priceQuote: {
    calculationVersion: "quote-v1",
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
  commissionRateSnapshot: {
    commissionRateBps: 1500,
    serviceFeeRateBps: 500,
    source: "global",
    sourceEventId: null,
    calculationVersion: "rate-v1",
  },
  taxReview: {
    documentKind: "commercial_invoice",
    decision: "verified",
    validUntil: new Date(Date.now() + 86400000 * 30),
    reviewedAt: new Date(Date.now() - 86400000),
  },
});

test("review verified AFTER payment does not authorize earlier order settlement", () => {
  const v=valid();
  v.taxReview.reviewedAt=new Date(v.paidAt.getTime()+1000);
  const result=review.reviewCommerceOrderSettlement(v);
  assert.equal(result.scenarios,null);
  assert.ok(result.blockers.some(x=>x.includes("ödeme anındaki")));
});

test("historical verification may be shown for review if it expired only after payment", () => {
  const v=valid();
  v.paidAt=new Date(Date.now()-7*86400000);
  v.taxReview.reviewedAt=new Date(Date.now()-8*86400000);
  v.taxReview.validUntil=new Date(Date.now()-6*86400000);
  const result=review.reviewCommerceOrderSettlement(v);
  assert.ok(result.scenarios?.invoiced);
  assert.equal(result.approvalStatus,"accounting_verification_required");
});

test("finance view reads tax review as of payment rather than latest current review", () => {
  const repository=readFileSync(join(ROOT,"src/features/commerce/finance-repository.ts"),"utf8");
  const page=readFileSync(join(ROOT,"src/app/admin/finans-gelirler/siparis-mali-inceleme/page.tsx"),"utf8");
  assert.ok(repository.includes("reviewedAt: { lte: order.paidAt }"));
  assert.ok(repository.includes("taxReviewAtPayment"));
  assert.ok(page.includes("taxReview: order.taxReviewAtPayment"));
});

test("partial processed refund blocks gross author payout even while order status remains paid", () => {
  const v={...valid(),hasOpenOrProcessedRefund:true};
  const result=review.reviewCommerceOrderSettlement(v);
  assert.equal(result.scenarios,null);
  assert.ok(result.blockers.some(x=>x.includes("kısmi/tam iade")));
});

test("requested refund and refund ledger also independently block full payout preview", () => {
  const pending=review.reviewCommerceOrderSettlement({...valid(),hasOpenOrProcessedRefund:true});
  assert.equal(pending.scenarios,null);
  const ledger=review.reviewCommerceOrderSettlement({...valid(),bookedEntryTypes:["sale_gross","refund"]});
  assert.equal(ledger.scenarios,null);
  const repo=readFileSync(join(ROOT,"src/features/commerce/finance-repository.ts"),"utf8");
  const page=readFileSync(join(ROOT,"src/app/admin/finans-gelirler/siparis-mali-inceleme/page.tsx"),"utf8");
  assert.ok(repo.includes('status: { in: ["requested", "approved", "processing", "processed"] }'));
  assert.ok(page.includes("hasOpenOrProcessedRefund: order.refunds.length > 0"));
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
  assert.equal(invoiced.commissionVatIllustration, 300n);
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
  assert.equal(p.commissionVatIllustration, 300n);
  assert.equal(p.commissionVat, 0n); // historical GVK18 cash model stays unchanged
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

test("two successful captures for one order block accounting preview even when both match", () => {
  const source = valid();
  source.payments.push({ status: "succeeded", amount: 12000n, currency: "TRY" });
  const result = review.reviewCommerceOrderSettlement(source);
  assert.equal(result.scenarios, null);
  assert.ok(result.blockers.some(s => s.includes("mükerrer tahsilat")));
});

test("an extra successful capture with a different amount also blocks accounting preview", () => {
  const source = valid();
  source.payments.push({ status: "succeeded", amount: 100n, currency: "TRY" });
  const result = review.reviewCommerceOrderSettlement(source);
  assert.equal(result.scenarios, null);
  assert.ok(result.blockers.some(s => s.includes("mükerrer tahsilat")));
});

test("unsettled pending attempts alongside a single matched capture do not block preview", () => {
  const source = valid();
  source.payments.push({ status: "pending", amount: 12000n, currency: "TRY" });
  const result = review.reviewCommerceOrderSettlement(source);
  assert.deepEqual([...result.blockers], []);
  assert.ok(result.scenarios?.invoiced);
});

test("mathematically inconsistent quote VAT is blocked even when gross total matches", () => {
  const source = valid();
  source.priceQuote.listNetAmount = 9999n;
  source.priceQuote.listVatAmount = 2001n;
  const result = review.reviewCommerceOrderSettlement(source);
  assert.equal(result.scenarios, null);
  assert.ok(result.blockers.some(s => s.includes("snapshot")));
});

test("unknown frozen price quote calculation version is never interpreted as quote-v1", () => {
  const source = valid();
  source.priceQuote.calculationVersion = "quote-v9";
  const result = review.reviewCommerceOrderSettlement(source);
  assert.equal(result.scenarios, null);
  assert.ok(result.blockers.some(s => s.includes("KDV hariç fiyat")));
});

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

test("author-specific frozen commission rate changes illustrations but never authorizes payout", () => {
  const source = valid();
  source.commissionRateSnapshot = {
    commissionRateBps: 2000, serviceFeeRateBps: 500,
    source: "author", sourceEventId: "rate-author-01", calculationVersion: "rate-v1",
  };
  const result = review.reviewCommerceOrderSettlement(source);
  assert.deepEqual([...result.blockers], []);
  assert.equal(result.approvalStatus, "accounting_verification_required");
  assert.equal(result.scenarios.invoiced.commissionNet, 2000n);
  assert.equal(result.scenarios.invoiced.authorBankPayment, 9600n);
  assert.equal(result.scenarios.invoiced.profitAfterTax, 1500n);
  source.taxReview.documentKind = "gvk18_expense_receipt";
  const gvk = review.reviewCommerceOrderSettlement(source);
  assert.equal(gvk.scenarios.expenseReceipt.commissionNet, 2000n);
  assert.equal(gvk.scenarios.expenseReceipt.platformServiceNet, 500n);
  assert.equal(gvk.scenarios.expenseReceipt.platformServiceVat, 100n);
  assert.equal(gvk.scenarios.expenseReceipt.commissionVatIllustration, 400n);
  assert.equal(gvk.scenarios.expenseReceipt.authorBankPayment, 6040n);
  assert.equal(gvk.scenarios.expenseReceipt.profitAfterTax, 1875n);
});

for (const [label, commissionRateSnapshot] of [
  ["missing on historic order", null],
  ["unexpected general override", {
    commissionRateBps: 2000, serviceFeeRateBps: 500,
    source: "global", sourceEventId: null, calculationVersion: "rate-v1",
  }],
  ["unknown service fee", {
    commissionRateBps: 1500, serviceFeeRateBps: 700,
    source: "work", sourceEventId: "ev-1", calculationVersion: "rate-v1",
  }],
  ["unknown rate version", {
    commissionRateBps: 1500, serviceFeeRateBps: 500,
    source: "work", sourceEventId: "ev-1", calculationVersion: "rate-v9",
  }],
]) {
  test("accounting review blocks rate snapshot " + label, () => {
    const result = review.reviewCommerceOrderSettlement({ ...valid(), commissionRateSnapshot });
    assert.equal(result.scenarios, null);
    assert.ok(result.blockers.length > 0);
  });
}

test("new orders freeze rate before checkout, never mutate old balances", () => {
  const zero = readFileSync(join(ROOT, "src/features/commerce/zero-total-checkout.ts"), "utf8");
  const paid = readFileSync(join(ROOT, "src/features/commerce/paid-checkout.ts"), "utf8");
  const builder = readFileSync(join(ROOT, "src/features/commerce/order-snapshot.ts"), "utf8");
  const admin = readFileSync(join(ROOT, "src/features/commerce/commission-rate-actions.ts"), "utf8");
  for (const checkout of [zero, paid]) {
    assert.ok(checkout.includes("resolveOrderCommissionRate(transaction, work.authorId, work.id)"));
    assert.ok(checkout.includes("commissionRate,"));
  }
  assert.ok(builder.includes("commissionRateSnapshot:"));
  assert.ok(admin.includes('actor.role !== "admin"'));
  assert.ok(admin.includes('where: { id: workId, authorId }'));
  assert.ok(admin.includes("authorCommissionRateEvent.create("));
  for (const forbidden of ["financialLedger.create(", "authorBalance.update(", "payout.create("]) {
    assert.ok(!admin.includes(forbidden), "No economic side effects on rate change");
  }
});

test("author-seller review is correctly labeled intermediary and never runs platform-direct settlement scenarios", () => {
  const authorSale = { ...valid(), sellerMode: "third_party" };
  const result = review.reviewCommerceOrderSettlement(authorSale);
  assert.equal(result.scenarios, null);
  assert.ok(result.blockers.some((x) => x.includes("Satıcı eser sahibi yazardır")));
  assert.ok(result.blockers.some((x) => x.includes("İlkOku aracı platformdur")));
  assert.ok(!result.blockers.some((x) => x.includes("Satıcının İlkOku olduğu")));
  const unknown = review.reviewCommerceOrderSettlement({ ...valid(), sellerMode: null });
  assert.equal(unknown.scenarios, null);
  assert.ok(unknown.blockers.some((x) => x.includes("hukukî satıcı modeli")));
  const page = readFileSync(join(ROOT, "src/app/admin/finans-gelirler/siparis-mali-inceleme/page.tsx"), "utf8");
  assert.ok(page.includes('"Eser sahibi yazar · İlkOku aracı platform"'));
  const dayClose = readFileSync(join(ROOT, "src/app/admin/finans-gelirler/gun-sonu-aktarim/page.tsx"), "utf8");
  assert.ok(dayClose.includes("hukukî satıcı türü"));
  assert.ok(dayClose.includes("Stopaj tutarı hesaplanmaz"));
});
