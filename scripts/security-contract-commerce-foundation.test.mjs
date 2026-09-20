import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) =>
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

test("commerce v1 keeps work-level sale configuration separate from chapter access", () => {
  const schema = source("prisma/schema.prisma");

  contains(schema, "model WorkSaleConfiguration {", "work sale configuration");
  contains(schema, "saleModel        PublicationModel", "free/paid work model");
  contains(schema, "priceAmount      BigInt?", "work price in minor units");
  contains(schema, "model ChapterAccess {", "chapter access model");
  contains(schema, "accessType ChapterAccessType", "preview/locked chapter access");
  contains(schema, "enum ChapterAccessType {\n  preview\n  locked\n}", "preview/locked enum");
});

test("free and paid work publication confirmations preserve agreement and access snapshots", () => {
  const schema = source("prisma/schema.prisma");

  contains(schema, "model AuthorAgreement {", "author agreement evidence");
  contains(schema, "agreementType    AgreementType", "agreement type");
  contains(schema, "documentHash", "agreement document hash");
  contains(schema, "model WorkPublicationConsent {", "work-level confirmation");
  contains(schema, "publicationModel   PublicationModel", "work confirmation publication model");
  contains(schema, "accessPlanSnapshot Json", "chapter access snapshot");
  contains(schema, "agreementVersion   String", "agreement version snapshot");
});

test("coupon funding distinguishes author discounts from platform-funded discounts", () => {
  const schema = source("prisma/schema.prisma");

  contains(schema, "enum CouponOwner {\n  author\n  platform\n}", "coupon owner boundary");
  contains(schema, "authorEarningBaseAmount BigInt", "protected author earning base");
  contains(schema, "couponOwnerSnapshot     CouponOwner?", "coupon funding snapshot");
  contains(schema, "platform_coupon_discount", "platform campaign ledger type");
  contains(schema, "author_coupon_discount", "author-funded discount ledger type");
});

test("orders, payment attempts and entitlements remain separate records", () => {
  const schema = source("prisma/schema.prisma");

  contains(schema, "model Order {", "order model");
  contains(schema, "payments                 Payment[]", "multiple payment attempts");
  contains(schema, "model Payment {", "payment attempt model");
  contains(schema, "model WorkEntitlement {", "work entitlement model");
  contains(schema, "@@unique([readerId, workId])", "one active work entitlement record per reader/work");
});

test("finance foundation is ledger-based and supports refunds and payouts", () => {
  const schema = source("prisma/schema.prisma");
  const migration = source("prisma/migrations/20260920190000_commerce_foundation_v1/migration.sql");
  const productContract = source("docs/COMMERCE_FOUNDATION_V1.md");

  contains(schema, "model FinancialLedger {", "financial ledger");
  contains(schema, "idempotencyKey String", "ledger idempotency");
  contains(schema, "model Payout {", "author payout foundation");
  contains(schema, "model Refund {", "refund foundation");
  contains(migration, "CREATE TABLE `FinancialLedger`", "versioned ledger migration");
  contains(productContract, "Gross sales volume is not İlkOku revenue.", "gross-vs-platform-income rule");
  contains(productContract, "A platform coupon **must not reduce the author's earning base**.", "platform coupon author protection");
});


test("commerce rollout defaults to disabled so staged paid works do not lock readers", () => {
  const runtime = source("src/features/commerce/runtime.ts");
  const envExample = source(".env.example");
  const productContract = source("docs/COMMERCE_FOUNDATION_V1.md");

  contains(runtime, 'process.env.COMMERCE_CHECKOUT_ENABLED === "true"', "explicit opt-in commerce flag");
  contains(envExample, 'COMMERCE_CHECKOUT_ENABLED="false"', "disabled default example");
  contains(productContract, "A paid configuration must not lock reader access while checkout is disabled.", "staged paid access rule");
});


test("staged paid setup fixes the author price at zero and exposes no manual price input", () => {
  const actions = source("src/features/commerce/actions.ts");
  const page = source("src/app/satis-erisim/[workId]/page.tsx");
  const productContract = source("docs/COMMERCE_FOUNDATION_V1.md");

  contains(actions, 'parsedModel.data === "paid" ? 0n : null', "fixed zero staged paid price");
  contains(page, "Fiyat: 0 TL", "writer paid option zero-price display");
  notContains(page, 'name="price"', "manual author price input");
  contains(productContract, "fixed **0 TRY** price", "staged zero-price product rule");
});


test("writer commerce agreement is fail-closed and final consent snapshots the frozen configuration", () => {
  const agreement = source("src/features/commerce/agreement.ts");
  const actions = source("src/features/commerce/actions.ts");
  const page = source("src/app/satis-erisim/[workId]/page.tsx");
  const migration = source("prisma/migrations/20260920190000_commerce_foundation_v1/migration.sql");

  contains(migration, "ILKOKU_AUTHOR_PUBLICATION_ACCESS", "dedicated writer commerce agreement template");
  contains(migration, "'draft'", "agreement starts in draft lifecycle");
  contains(agreement, "lifecycleStatus === \"active\"", "agreement active lifecycle gate");
  contains(agreement, 'targetRole === "writer"', "writer-only agreement gate");
  contains(actions, "getAuthorAgreementAcceptance", "accepted agreement requirement");
  contains(actions, "workPublicationConsent.create", "immutable work confirmation snapshot");
  contains(actions, "accessPlanSnapshot", "chapter access snapshot");
  contains(actions, 'nextStatus === "active" ? now : null', "activation state persistence");
  contains(page, "Hukuki inceleme ve gerekli onaylar tamamlanıp aktif", "inactive agreement writer notice");
  contains(page, "Eser bazlı son onay", "work-level confirmation UI");
});
