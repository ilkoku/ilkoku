import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = (path) => readFileSync(join(root, path), "utf8");
const schema = source("prisma/schema.prisma");
const migration = source("prisma/migrations/20261023152000_commerce_legal_party_foundation_p0/migration.sql");

test("P0 legal party, seller assignment and rights authorization are separate", () => {
  for (const model of ["LegalParty", "WorkSellerAssignment", "WorkSalesAuthorization"]) {
    assert.ok(schema.includes(`model ${model} {`), `Missing ${model} model`);
    assert.ok(migration.includes(`CREATE TABLE \`${model}\``), `Missing ${model} table`);
  }
  assert.ok(schema.includes("enum WorkSellerMode {"));
  assert.ok(schema.includes("  platform_direct"));
  assert.ok(schema.includes("  third_party"));
  assert.ok(schema.includes("  verificationStatus LegalPartyVerificationStatus"));
  assert.ok(schema.includes("  authorizationId String?"));
  assert.ok(schema.includes("  currentKey      String?"));
});

test("P0 assignment can be tied to verified rights and preserves version history", () => {
  assert.match(schema, /@@unique\(\[workId, version\]\)/u);
  assert.match(schema, /@@unique\(\[workId, legalPartyId, version\]\)/u);
  assert.match(migration, /WorkSellerAssignment_authorizationId_fkey/u);
  assert.match(migration, /WorkSellerAssignment_currentKey_key/u);
  assert.match(migration, /ON DELETE RESTRICT/u);
  assert.doesNotMatch(migration, /ON DELETE CASCADE/u);
});

test("P0 migration never rewrites old works, orders, users or entitlements", () => {
  assert.doesNotMatch(migration, /^\s*(?:UPDATE|DELETE FROM|INSERT INTO|ALTER TABLE|DROP TABLE|TRUNCATE)\b/imu);
  assert.doesNotMatch(migration, /\bCREATE TRIGGER\b/iu);
  assert.match(migration, /Never backfill authorId as seller/u);
});

test("P0 schema addition does not activate production payments", () => {
  const runtime = source("src/features/commerce/runtime.ts");
  const providers = source("src/features/commerce/payment-providers.ts");
  assert.ok(runtime.includes('process.env.COMMERCE_CHECKOUT_ENABLED === "true"'));
  assert.ok(providers.includes("const adapters: PaymentProviderAdapter[] = [];"));
});

test("P0 seller authorization expiry cannot normalize a nonexistent calendar day", () => {
  const actions = source("src/features/commerce/seller-admin-actions.ts");
  assert.ok(actions.includes('rawValidUntil && !/^\\d{4}-\\d{2}-\\d{2}$/.test(rawValidUntil)'), "seller rights expiry must use strict YYYY-MM-DD");
  assert.ok(actions.includes("calendarDate.setUTCFullYear(year, month - 1, day)"), "calendar day must be reconstructed explicitly");
  assert.ok(actions.includes("calendarDate.getUTCDate() !== day"), "invalid day must not roll over");
  assert.ok(actions.includes('go("yetki-gecerlilik-tarihi-hatali")'), "invalid date must keep existing error path");
  assert.ok(actions.includes("validUntil <= new Date()"), "expired sales rights must remain invalid");
  const strictValidation = actions.indexOf("calendarDate.getUTCDate() !== day");
  const expiryParsing = actions.indexOf('new Date(`${rawValidUntil}T23:59:59+03:00`)');
  assert.ok(strictValidation >= 0 && expiryParsing > strictValidation, "calendar validation must precede expiry conversion");
});

test("author declares invoice status only, while existing seller verification remains admin-only", () => {
  const seller = source("src/features/commerce/seller-admin-actions.ts");
  const admin = source("src/app/admin/odeme-sistemi/satici-yetkileri/page.tsx");
  const billingAction = source("src/features/commerce/writer-billing-actions.ts");
  const billingPage = source("src/app/satis-erisim/odeme-vergi-bilgileri/page.tsx");
  const writerIndex = source("src/app/satis-erisim/page.tsx");
  const oldRoute = source("src/app/satis-erisim/satici-yetkileri/page.tsx");
  const schema = source("prisma/schema.prisma");

  assert.ok(seller.includes('user.role !== "admin"'), "seller legal verification stays admin-only");
  assert.ok(seller.includes("reviewedOriginalEvidence"), "verified seller requires reviewed evidence");
  assert.ok(seller.includes("reviewedSalesRightsEvidence"), "sales rights require reviewed evidence");
  assert.ok(admin.includes("verifyLegalSellerAction") && admin.includes("approveWorkSellerRightsAction"));
  assert.ok(billingAction.includes('writer.role !== "writer"'), "writers only");
  assert.ok(billingAction.includes('authorId: writer.id'), "author-owned billing declaration");
  assert.ok(billingAction.includes('invoiceStatus: z.enum(["invoicing", "non_invoicing"])'));
  assert.ok(!billingAction.includes("workSellerAssignment.create"), "writer cannot authorize sellers");
  assert.ok(!billingAction.includes("status: \"approved\""), "writer cannot approve rights");
  assert.ok(!billingAction.includes("prisma.order.create"), "no checkout created");
  assert.ok(schema.includes("model AuthorBillingProfile {"), "billing profile is a separate model");
  assert.ok(billingPage.includes("WriterBillingForm"), "writer invoice self-declaration form exists");
  assert.ok(writerIndex.includes('href="/satis-erisim/odeme-vergi-bilgileri"'));
  assert.ok(!writerIndex.includes('href="/satis-erisim/satici-yetkileri"'), "rights application removed from writer menu");
  assert.ok(oldRoute.includes('redirect("/satis-erisim/odeme-vergi-bilgileri")'));
});
