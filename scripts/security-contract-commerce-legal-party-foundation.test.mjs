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

test("P0 seller workbench requires admin identity, independent evidence review and auditable transitions", () => {
  const actions = source("src/features/commerce/seller-admin-actions.ts");
  const page = source("src/app/admin/odeme-sistemi/satici-yetkileri/page.tsx");
  const settings = source("src/app/admin/odeme-sistemi/ayarlar/page.tsx");

  assert.ok(actions.includes('user.role !== "admin"'), "all seller mutations must be admin-only");
  assert.ok(actions.includes('verificationStatus: "pending"'), "new seller starts unverified");
  assert.ok(actions.includes("reviewedOriginalEvidence"), "identity evidence must be reviewed explicitly");
  assert.ok(actions.includes("reviewedSalesRightsEvidence"), "rights evidence must be reviewed explicitly");
  assert.ok(actions.includes('status: "pending"'), "new rights begin unverified");
  assert.ok(actions.includes('status: "approved"'), "only explicit review can approve assignment");
  assert.ok(actions.includes("currentKey: rights.workId"), "only one current seller per work");
  assert.ok(actions.includes('status: "revoked"'), "allow explicit future seller revocation");
  assert.ok(actions.includes("tx.auditLog.create"), "all transitions need audit evidence");
  assert.ok(actions.includes("createHash(\"sha256\")"), "rights evidence must be hashed");
  assert.ok(page.includes("Satıcı ve Satış Yetkisi"), "admin review UI exists");
  assert.ok(page.includes("registerLegalSellerDraftAction"), "seller identity form wired");
  assert.ok(page.includes("verifyLegalSellerAction"), "seller review form wired");
  assert.ok(page.includes("registerWorkSalesRightsDraftAction"), "rights draft form wired");
  assert.ok(page.includes("approveWorkSellerRightsAction"), "rights approval wired");
  assert.ok(settings.includes("/sistem-yonetimi/odeme-sistemi/satici-yetkileri"), "activation diagnostics link to admin workbench");
});
