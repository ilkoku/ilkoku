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


test("staged paid setup remains zero-priced until checkout enables real pricing", () => {
  const actions = source("src/features/commerce/actions.ts");
  const page = source("src/app/satis-erisim/[workId]/page.tsx");
  const productContract = source("docs/COMMERCE_FOUNDATION_V1.md");

  contains(actions, "const checkoutEnabled = isCommerceCheckoutEnabled();", "server-side checkout pricing gate");
  contains(actions, 'formData.get("price")', "future real price input parser");
  contains(page, "<strong>Ücretli</strong>", "writer paid option label");
  contains(page, '<span className={styles.paidPrice}>0 TL</span>', "zero price visually belongs to paid option");
  contains(page, "!checkoutEnabled ? (", "staged UI branch");
  contains(page, 'name="price"', "real price input remains prepared behind checkout gate");
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


test("author coupon workspace is restricted to the writer's paid works", () => {
  const actions = source("src/features/commerce/actions.ts");
  const page = source("src/app/satis-erisim/kuponlar/page.tsx");

  contains(actions, 'owner: "author"', "author-funded coupon owner");
  contains(actions, 'authorId: writer.id', "coupon author ownership");
  contains(actions, 'scope: "selected_works"', "work-scoped author coupon");
  contains(actions, 'work.saleConfiguration?.saleModel !== "paid"', "paid-work coupon gate");
  contains(page, "Yazar kuponundaki indirim yazar tarafından finanse edilir", "author-funded coupon explanation");
  contains(page, "paidWorks.map", "paid works only in coupon selector");
});


test("platform coupon workspace preserves author earning base and supports explicit scopes", () => {
  const actions = source("src/features/commerce/admin-actions.ts");
  const page = source("src/app/admin/odeme-sistemi/kuponlar/page.tsx");
  const navigation = source("src/lib/admin-navigation.ts");

  contains(actions, 'owner: "platform"', "platform-funded coupon owner");
  contains(actions, 'scopeSchema = z.enum(["all_paid_works", "selected_works", "selected_authors"])', "platform coupon scopes");
  contains(page, "yazar hakedişi eserin", "protected author earning explanation");
  contains(page, "kuponsuz/orijinal fiyatı üzerinden korunur", "original price earning base");
  contains(navigation, 'label: "Ödeme Sistemi"', "payment system admin navigation");
  contains(navigation, 'label: "Finans & Gelirler"', "finance admin navigation");
});


test("commerce routes are private and writer-gated", () => {
  const security = source("src/lib/route-security.ts");
  const proxy = source("src/proxy.ts");
  const nextConfig = source("next.config.ts");

  contains(security, '{ approved: false, path: "/satis-erisim", roles: ["writer"] }', "sales access writer gate");
  contains(security, '{ approved: false, path: "/gelirler", roles: ["writer"] }', "writer income gate");
  contains(proxy, '"/satis-erisim/:path*"', "sales access proxy enforcement");
  contains(proxy, '"/gelirler/:path*"', "income proxy enforcement");
  contains(nextConfig, '"/satis-erisim/:path*"', "sales access noindex header");
  contains(nextConfig, '"/gelirler/:path*"', "income noindex header");
});


test("writer commerce step order matches frozen flow", () => {
  const listPage = source("src/app/satis-erisim/page.tsx");
  const detailPage = source("src/app/satis-erisim/[workId]/page.tsx");
  const productContract = source("docs/COMMERCE_FOUNDATION_V1.md");

  contains(listPage, "1. adım · Eser seç", "step one work selection");
  contains(detailPage, ">2. adım<", "step two access plan");
  contains(detailPage, ">3. adım<", "step three free/paid selection");
  contains(detailPage, ">4. adım<", "step four agreement");
  contains(detailPage, ">5. adım<", "step five work confirmation");
  contains(productContract, "3. Select publication model: Free or Paid.", "frozen step three publication model");
});


test("agreement evidence is immutable across same-version content changes", () => {
  const actions = source("src/features/commerce/actions.ts");

  contains(actions, "existing.documentHash !== agreement.documentHash", "same-version document hash conflict");
  contains(actions, '"sozlesme-surum-uyusmazligi"', "hash conflict fail-closed status");
  notContains(actions, "documentHash: agreement.documentHash,\n        status: \"accepted\",\n        acceptedAt,\n        revokedAt: null", "agreement evidence overwrite path");
});


test("reader commerce gate stays open until checkout and paid activation are both active", () => {
  const access = source("src/features/commerce/access.ts");
  const readingPage = source("src/app/oku/[slug]/[chapterSlug]/page.tsx");
  const checkoutPage = source("src/app/satinal/[slug]/page.tsx");

  contains(access, 'return { allowed: true, reason: "checkout_disabled" }', "checkout-disabled reader fail-open");
  contains(access, 'configuration.status !== "active"', "staged paid work fail-open");
  contains(access, 'chapter.commerceAccess?.accessType === "preview"', "preview access");
  contains(access, 'entitlement?.status === "active"', "purchased entitlement access");
  contains(access, 'reason: "purchase_required"', "locked paid purchase gate");
  contains(readingPage, "getCommerceChapterAccessDecision", "reading route commerce access check");
  contains(readingPage, "/satinal/", "purchase redirect");
  contains(checkoutPage, "Satın alma altyapısı hazır, ancak gerçek tahsilat henüz aktif", "staged checkout notice");
});


test("coupon pricing preserves the two frozen funding models", () => {
  const pricing = source("src/features/commerce/pricing.ts");

  contains(pricing, 'coupon.owner === "author" ? finalAmount : originalAmount', "author coupon discounted earning base");
  contains(pricing, 'coupon.owner === "platform" ? discountAmount : 0n', "platform-funded subsidy amount");
  contains(pricing, "discountValue > 100n", "percentage cap");
  contains(pricing, "discount > originalAmount ? originalAmount : discount", "discount cannot create negative checkout");
});


test("checkout coupon resolution revalidates scope and usage before pricing", () => {
  const checkoutRepository = source("src/features/commerce/checkout-repository.ts");
  const checkoutPage = source("src/app/satinal/[slug]/page.tsx");

  contains(checkoutRepository, 'coupon.status !== "active"', "coupon active state");
  contains(checkoutRepository, "coupon.startsAt && coupon.startsAt > now", "coupon start date");
  contains(checkoutRepository, "coupon.endsAt && coupon.endsAt < now", "coupon end date");
  contains(checkoutRepository, "coupon.usageCount >= coupon.totalUsageLimit", "total usage limit");
  contains(checkoutRepository, "coupon.redemptions.length >= coupon.perUserUsageLimit", "per-user usage limit");
  contains(checkoutRepository, 'coupon.scope === "all_paid_works"', "platform all-paid-work scope");
  contains(checkoutRepository, 'coupon.scope === "selected_works"', "platform selected-work scope");
  contains(checkoutRepository, 'coupon.scope === "selected_authors"', "platform selected-author scope");
  contains(checkoutPage, "calculateCommercePricing", "checkout pricing calculation");
});


test("checkout route is private and reader-role gated", () => {
  const security = source("src/lib/route-security.ts");
  const proxy = source("src/proxy.ts");
  const nextConfig = source("next.config.ts");

  contains(security, '{ approved: false, path: "/satinal", roles: [...readerWorkspaceRoles] }', "checkout reader-role gate");
  contains(proxy, '"/satinal/:path*"', "checkout proxy enforcement");
  contains(nextConfig, '"/satinal/:path*"', "checkout noindex header");
});


test("staged paid price display stays zero across writer surfaces", () => {
  const listPage = source("src/app/satis-erisim/page.tsx");
  const detailPage = source("src/app/satis-erisim/[workId]/page.tsx");

  contains(listPage, '"Ücretli · 0 TL"', "writer work card staged price");
  contains(detailPage, '<span className={styles.paidPrice}>0 TL</span>', "paid option staged price");
  contains(detailPage, "checkoutEnabled", "final confirmation rollout state");
  contains(detailPage, "formatPrice(", "future real price display");
  contains(detailPage, ': "0 TL"', "staged final confirmation price");
});


test("reader purchase surfaces stay in library and account instead of a payment top-level", () => {
  const navigation = source("src/content/navigation.ts");
  const account = source("src/app/hesabim/page.tsx");
  const library = source("src/app/kutuphanem/satin-aldiklarim/page.tsx");
  const history = source("src/app/hesabim/odeme-gecmisi/page.tsx");

  contains(navigation, '{ label: "Kütüphanem", href: "/kutuphanem/satin-aldiklarim" }', "reader library navigation");
  notContains(navigation, '{ label: "Ödemeler"', "no reader top-level payments menu");
  contains(account, 'label: "Ödeme Geçmişi"', "payment history nested under account");
  contains(library, "<h1>Satın Aldıklarım</h1>", "purchased library surface");
  contains(history, "<h1>Ödeme Geçmişi</h1>", "account payment history surface");
});


test("reader library is entitlement-driven and payment history is order-driven", () => {
  const repository = source("src/features/commerce/reader-repository.ts");

  contains(repository, "prisma.workEntitlement.findMany", "purchased library entitlement source");
  contains(repository, 'status: "active"', "active entitlement filter");
  contains(repository, "prisma.order.findMany", "payment history order source");
  contains(repository, "originalAmount: true", "original price history");
  contains(repository, "discountAmount: true", "discount history");
  contains(repository, "finalAmount: true", "final paid amount history");
});


test("reader library route is private and reader-role gated", () => {
  const security = source("src/lib/route-security.ts");
  const proxy = source("src/proxy.ts");
  const nextConfig = source("next.config.ts");

  contains(security, '{ approved: false, path: "/kutuphanem", roles: [...readerWorkspaceRoles] }', "library reader-role gate");
  contains(proxy, '"/kutuphanem/:path*"', "library proxy enforcement");
  contains(nextConfig, '"/kutuphanem/:path*"', "library noindex header");
});


test("checkout keeps digital-content acceptance in the frozen purchase surface", () => {
  const checkout = source("src/app/satinal/[slug]/page.tsx");
  const productContract = source("docs/COMMERCE_FOUNDATION_V1.md");

  contains(checkout, 'name="acceptDigitalContent"', "digital content acceptance checkbox");
  contains(checkout, "Dijital içerik satın alma koşullarını", "digital content acceptance copy");
  contains(productContract, "digital-content purchase acceptance", "frozen checkout acceptance requirement");
});


test("paid publication requires explicit chapter access only after checkout activation", () => {
  const guard = source("src/features/commerce/publication-guard.ts");
  const workActions = source("src/features/works/actions.ts");

  contains(guard, "if (!isCommerceCheckoutEnabled())", "current publication remains unaffected while checkout is disabled");
  contains(guard, 'work.saleConfiguration?.saleModel !== "paid"', "free work publication bypass");
  contains(guard, "!chapter.commerceAccess", "explicit chapter access requirement");
  contains(guard, "Ön İzleme veya Kilitli", "writer-facing access choice requirement");
  contains(workActions, "assertPaidWorkAccessPlanReadyForPublication", "publication flow commerce guard");
});
