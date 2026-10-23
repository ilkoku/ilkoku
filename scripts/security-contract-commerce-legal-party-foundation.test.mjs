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
  assert.doesNotMatch(migration, /\b(?:UPDATE|DELETE FROM|INSERT INTO|ALTER TABLE|DROP TABLE|TRUNCATE)\b/iu);
  assert.doesNotMatch(migration, /\bCREATE TRIGGER\b/iu);
  assert.match(migration, /Never backfill authorId as seller/u);
});

test("P0 schema addition does not activate production payments", () => {
  const runtime = source("src/features/commerce/runtime.ts");
  const providers = source("src/features/commerce/payment-providers.ts");
  assert.ok(runtime.includes('process.env.COMMERCE_CHECKOUT_ENABLED === "true"'));
  assert.ok(providers.includes("const adapters: PaymentProviderAdapter[] = [];"));
});
