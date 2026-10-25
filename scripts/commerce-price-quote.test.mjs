import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadTypedModule(relativePath, imports = {}) {
  const contents = readFileSync(join(root, relativePath), "utf8");
  const output = ts.transpileModule(contents, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: relativePath,
    reportDiagnostics: true,
  });
  assert.equal((output.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  const wrapper = runInNewContext(
    "(function (require, module, exports) {\n" + output.outputText + "\n})",
    {},
    { filename: relativePath },
  );
  wrapper((specifier) => {
    assert.ok(Object.hasOwn(imports, specifier), "Unexpected import: " + specifier);
    return imports[specifier];
  }, module, module.exports);
  return module.exports;
}

const pricing = loadTypedModule("src/features/commerce/pricing.ts");
const quotes = loadTypedModule("src/features/commerce/price-quote.ts", {
  "./pricing": pricing,
});

test("100 TL KDV-excluded price becomes 120 TL checkout total and immutable price quote", () => {
  const q = quotes.quoteCommercePrice({
    configuredPriceAmount: 10000n,
    taxTreatment: "net_plus_vat",
  });
  assert.equal(q.listNetAmount, 10000n);
  assert.equal(q.listVatAmount, 2000n);
  assert.equal(q.listGrossAmount, 12000n);
  assert.equal(q.pricing.finalAmount, 12000n);
  assert.deepEqual({ ...quotes.buildOrderPriceQuoteSnapshot(q) }, {
    taxTreatment: "net_plus_vat",
    calculationVersion: "quote-v1",
    vatRateBasisPoints: 2000,
    listNetAmount: 10000n,
    listVatAmount: 2000n,
    listGrossAmount: 12000n,
    discountGrossAmount: 0n,
    payableGrossAmount: 12000n,
  });
});

test("VAT-inclusive coupon discounts maintain author/platform subsidy distinction", () => {
  const fixed = { discountType: "fixed", discountValue: 3000n };
  const author = quotes.quoteCommercePrice({
    configuredPriceAmount: 10000n,
    taxTreatment: "net_plus_vat",
    coupon: { ...fixed, owner: "author" },
  });
  const platform = quotes.quoteCommercePrice({
    configuredPriceAmount: 10000n,
    taxTreatment: "net_plus_vat",
    coupon: { ...fixed, owner: "platform" },
  });
  assert.equal(author.pricing.finalAmount, 9000n);
  assert.equal(author.pricing.authorEarningBaseAmount, 9000n);
  assert.equal(platform.pricing.finalAmount, 9000n);
  assert.equal(platform.pricing.authorEarningBaseAmount, 12000n);
  assert.equal(platform.pricing.platformCouponSubsidyAmount, 3000n);
  assert.equal(quotes.buildOrderPriceQuoteSnapshot(platform).payableGrossAmount, 9000n);
});

test("100 percent discount still uses provider-free 0 TL checkout", () => {
  const q = quotes.quoteCommercePrice({
    configuredPriceAmount: 10000n,
    taxTreatment: "net_plus_vat",
    coupon: { discountType: "percent", discountValue: 100n, owner: "platform" },
  });
  assert.equal(q.pricing.finalAmount, 0n);
  assert.equal(q.pricing.discountAmount, 12000n);
});

test("historic 100 TL checkout amounts stay 100 TL without fabricated VAT fields", () => {
  const q = quotes.quoteCommercePrice({
    configuredPriceAmount: 10000n,
    taxTreatment: "legacy_inclusive",
  });
  assert.equal(q.pricing.finalAmount, 10000n);
  assert.equal(q.listVatAmount, null);
  assert.equal(quotes.buildOrderPriceQuoteSnapshot(q), null);
});

test("zero priced works remain zero and price rounding is integer-kurus", () => {
  const zero = quotes.quoteCommercePrice({
    configuredPriceAmount: 0n, taxTreatment: "net_plus_vat",
  });
  assert.equal(zero.pricing.finalAmount, 0n);
  const odd = quotes.quoteCommercePrice({
    configuredPriceAmount: 101n, taxTreatment: "net_plus_vat",
  });
  assert.equal(odd.listVatAmount, 20n);
  assert.equal(odd.listGrossAmount, 121n);
});
