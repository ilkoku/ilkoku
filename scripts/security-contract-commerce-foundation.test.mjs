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
  contains(productContract, "has **never been activated for real paid access** must not lock reader access", "staged paid access rule");
});


test("staged paid setup remains zero-priced until checkout enables real pricing", () => {
  const actions = source("src/features/commerce/actions.ts");
  const page = source("src/app/satis-erisim/[workId]/page.tsx");
  const productContract = source("docs/COMMERCE_FOUNDATION_V1.md");

  contains(actions, "const checkoutEnabled = isCommerceCheckoutEnabled();", "server-side checkout pricing gate");
  contains(actions, 'formData.get("price")', "future real price input parser");
  contains(page, "<strong>Ücretli</strong>", "writer paid option label");
  contains(page, '<span className={styles.paidPrice}>0 TL</span>', "zero price visually belongs to paid option");
  contains(page, "!paidPricingEnabled ? (", "staged UI branch");
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
  contains(actions, "work.saleConfiguration!.activatedAt ?? now", "activation timestamp is created once");
  contains(actions, ": work.saleConfiguration!.activatedAt", "post-activation outage preserves activation history");
  contains(page, "Hukuki inceleme ve gerekli onaylar tamamlanıp aktif", "inactive agreement writer notice");
  contains(page, "acceptedAgreement ? (", "accepted agreement compact branch");
  contains(page, "<details className={styles.acceptedAgreementDetails}>", "accepted agreement collapsible text");
  contains(page, "Sözleşmeyi göster / gizle", "accepted agreement reveal control");
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


test("reader commerce gate is fail-open only before first paid activation", () => {
  const access = source("src/features/commerce/access.ts");
  const readingPage = source("src/app/oku/[slug]/[chapterSlug]/page.tsx");
  const checkoutPage = source("src/app/satinal/[slug]/page.tsx");

  contains(access, "previouslyActivatedPaid = Boolean(configuration.activatedAt)", "paid activation history");
  contains(access, 'if (!previouslyActivatedPaid && !checkoutEnabled)', "prelaunch checkout fail-open only");
  contains(access, 'if (!previouslyActivatedPaid && !paymentProviderReady)', "prelaunch provider fail-open only");
  contains(access, 'configuration.status !== "active"', "staged paid work fail-open");
  contains(access, 'chapterAccessType === "preview"', "preview access");
  contains(access, 'entitlement?.status === "active"', "purchased entitlement access");
  contains(access, 'reason: "purchase_required"', "locked paid purchase gate");
  contains(readingPage, "getCommerceChapterAccessDecision", "reading route commerce access check");
  contains(readingPage, "/satinal/", "purchase redirect");
  contains(checkoutPage, "Bu ücretli yapılandırma henüz gerçek paid access olarak aktive", "staged checkout notice");
});


test("coupon pricing preserves the two frozen funding models", () => {
  const pricing = source("src/features/commerce/pricing.ts");

  contains(pricing, 'coupon.owner === "author" ? finalAmount : originalAmount', "author coupon discounted earning base");
  contains(pricing, 'coupon.owner === "platform" ? discountAmount : BigInt(0)', "platform-funded subsidy amount");
  contains(pricing, "discountValue > BigInt(100)", "percentage cap");
  contains(pricing, "discount > originalAmount ? originalAmount : discount", "discount cannot create negative checkout");
});


test("checkout coupon resolution revalidates scope and usage before pricing", () => {
  const checkoutRepository = source("src/features/commerce/checkout-repository.ts");
  const couponRules = source("src/features/commerce/coupon-rules.ts");
  const checkoutPage = source("src/app/satinal/[slug]/page.tsx");

  contains(checkoutRepository, "validateCouponRules", "shared coupon rule engine");
  contains(couponRules, 'input.status !== "active"', "coupon active state");
  contains(couponRules, "input.startsAt && input.startsAt > now", "coupon start date");
  contains(couponRules, "input.endsAt && input.endsAt < now", "coupon end date");
  contains(couponRules, "input.usageCount >= input.totalUsageLimit", "total usage limit");
  contains(couponRules, "input.userUsageCount >= input.perUserUsageLimit", "per-user usage limit");
  contains(couponRules, 'input.scope === "all_paid_works"', "platform all-paid-work scope");
  contains(couponRules, 'input.scope === "selected_works"', "platform selected-work scope");
  contains(couponRules, 'input.scope === "selected_authors"', "platform selected-author scope");
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
  contains(detailPage, "paidPricingEnabled", "final confirmation real-price readiness");
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
  contains(checkout, "{purchaseTerms.title}", "active digital-content terms title");
  contains(productContract, "digital-content purchase acceptance", "frozen checkout acceptance requirement");
});


test("paid publication requires explicit chapter access once payment is live or the work was activated before", () => {
  const guard = source("src/features/commerce/publication-guard.ts");
  const workActions = source("src/features/works/actions.ts");

  contains(guard, "paymentPathReady", "current payment path readiness");
  contains(guard, "!paymentPathReady && !previouslyActivatedPaid", "prelaunch-only publication bypass");
  contains(guard, 'configuration.saleModel !== "paid" && !previouslyActivatedPaid', "free work publication bypass");
  contains(guard, "!chapter.commerceAccess", "explicit chapter access requirement");
  contains(guard, "Ön İzleme veya Kilitli", "writer-facing access choice requirement");
  contains(workActions, "assertPaidWorkAccessPlanReadyForPublication", "publication flow commerce guard");
});


test("zero-total order completion is atomic and provider-free", () => {
  const service = source("src/features/commerce/zero-total-checkout.ts");
  const snapshot = source("src/features/commerce/order-snapshot.ts");
  const checkout = source("src/app/satinal/[slug]/page.tsx");

  contains(service, "return prisma.$transaction", "atomic zero-total transaction");
  contains(service, "FOR UPDATE", "coupon redemption serialization");
  contains(service, 'status: "paid"', "zero-total order completion state");
  contains(service, "couponRedemption.create", "coupon redemption record");
  contains(service, "workEntitlement.create", "entitlement grant");
  contains(service, 'source: "purchase"', "order-backed entitlement source");
  contains(service, "financialLedger.create", "zero-total finance ledger");
  notContains(service, "transaction.payment.create", "zero-total checkout skips external payment record");
  contains(snapshot, "authorEarningBaseAmount", "immutable author earning base snapshot");
  contains(checkout, "0 TL ile erişimi aç", "reader zero-total completion action");
});


test("platform 100 percent coupon protects author earning base", () => {
  const pricing = source("src/features/commerce/pricing.ts");
  const zeroTotal = source("src/features/commerce/zero-total-checkout.ts");

  contains(pricing, 'coupon.owner === "author" ? finalAmount : originalAmount', "platform coupon preserves original earning base");
  contains(pricing, 'coupon.owner === "platform" ? discountAmount : BigInt(0)', "platform subsidy equals discount");
  contains(zeroTotal, "authorEarningBaseAmount", "protected earning base reaches ledger metadata");
  contains(zeroTotal, "platformCouponSubsidyAmount", "platform subsidy reaches ledger metadata");
});


test("paid activation requires a positive real price once checkout and provider are operational or the work was activated before", () => {
  const actions = source("src/features/commerce/actions.ts");
  const page = source("src/app/satis-erisim/[workId]/page.tsx");

  contains(actions, 'work.saleConfiguration.saleModel === "paid"', "paid activation branch");
  contains(actions, "work.saleConfiguration.priceAmount <= BigInt(0)", "positive paid price gate");
  contains(actions, '"fiyat-gerekli"', "paid price fail-closed state");
  contains(page, "paidPriceReady", "writer final confirmation price readiness");
});


test("zero-total checkout requires reader consent and never bypasses rollout", () => {
  const action = source("src/features/commerce/checkout-actions.ts");
  const service = source("src/features/commerce/zero-total-checkout.ts");

  contains(action, 'formData.get("acceptDigitalContent") !== "on"', "reader consent gate");
  contains(action, '"kosul-onayi-gerekli"', "consent fail-closed status");
  contains(service, "if (!isCommerceCheckoutEnabled())", "checkout rollout gate");
  contains(service, '"checkout_disabled"', "disabled checkout result");
  contains(service, 'effectiveCommerce.status !== "active"', "active paid configuration requirement");
  contains(service, "effectiveCommerce.priceAmount <= BigInt(0)", "positive real price requirement");
});


test("coupon preview and coupon consumption share one eligibility engine", () => {
  const repository = source("src/features/commerce/checkout-repository.ts");
  const completion = source("src/features/commerce/zero-total-checkout.ts");
  const rules = source("src/features/commerce/coupon-rules.ts");

  contains(repository, "validateCouponRules", "checkout coupon preview rule engine");
  contains(completion, "validateCouponRules", "coupon consumption rule engine");
  contains(rules, 'input.status !== "active"', "coupon active-state rule");
  contains(rules, "input.userUsageCount >= input.perUserUsageLimit", "per-user limit rule");
  contains(rules, 'input.scope === "selected_works"', "selected work scope rule");
  contains(rules, 'input.scope === "selected_authors"', "selected author scope rule");
});


test("checkout cannot bypass the existing adult-content gate", () => {
  const checkout = source("src/app/satinal/[slug]/page.tsx");
  const action = source("src/features/commerce/checkout-actions.ts");
  const completion = source("src/features/commerce/zero-total-checkout.ts");

  contains(checkout, "enforceAdultWorkGate", "checkout page adult gate");
  contains(action, "enforceAdultWorkGate", "zero-total action adult gate");
  contains(completion, 'status: "active"', "active author requirement");
  contains(completion, "deletedAt: null", "non-deleted author requirement");
});


test("zero-total checkout persists versioned reader consent evidence", () => {
  const schema = source("prisma/schema.prisma");
  const migration = source("prisma/migrations/20260920190000_commerce_foundation_v1/migration.sql");
  const terms = source("src/features/commerce/checkout-terms.ts");
  const action = source("src/features/commerce/checkout-actions.ts");
  const completion = source("src/features/commerce/zero-total-checkout.ts");

  contains(schema, "model OrderConsent {", "order consent evidence model");
  contains(schema, "documentVersion String", "consent document version");
  contains(schema, "documentHash    String", "consent document hash");
  contains(migration, "ILKOKU_READER_DIGITAL_CONTENT_PURCHASE", "draft reader purchase terms template");
  contains(migration, "'draft'", "reader purchase terms start inactive");
  contains(terms, "lifecycleStatus = 'active'", "active terms lifecycle gate");
  contains(action, "getActiveReaderPurchaseTerms", "checkout active terms requirement");
  contains(completion, "transaction.orderConsent.create", "consent evidence transaction write");
  contains(completion, 'consentType: "digital_content_purchase"', "digital purchase consent type");
});


test("checkout shows the exact active reader terms before acceptance", () => {
  const checkout = source("src/app/satinal/[slug]/page.tsx");

  contains(checkout, "{purchaseTerms.body}", "active terms body visible to reader");
  contains(checkout, "Sürüm {purchaseTerms.version}", "active terms version visible");
  contains(checkout, 'name="acceptDigitalContent"', "reader acceptance checkbox");
});


test("provider registry cannot activate production through a test adapter", () => {
  const providers = source("src/features/commerce/payment-providers.ts");

  contains(providers, 'adapter.mode === "active"', "active provider mode");
  contains(providers, 'adapter.mode === "test" && process.env.NODE_ENV !== "production"', "test provider blocked in production");
  contains(providers, "hasOperationalPaymentProvider", "provider operational readiness helper");
});


test("paid checkout prepares order payment consent and coupon reservation before provider redirect", () => {
  const checkout = source("src/features/commerce/paid-checkout.ts");
  const schema = source("prisma/schema.prisma");

  contains(checkout, "getPaymentProviderAdapter", "provider adapter lookup before order creation");
  contains(checkout, "return { ok: false, reason: \"provider_unavailable\" }", "no order without provider");
  contains(checkout, "SELECT id\n      FROM User", "reader serialization lock");
  contains(checkout, 'status: "pending_payment"', "pending order creation");
  contains(checkout, 'status: "pending"', "pending payment attempt");
  contains(checkout, "transaction.orderConsent.create", "checkout consent evidence");
  contains(checkout, 'status: "reserved"', "coupon reservation before provider redirect");
  contains(checkout, "adapter.createPayment", "provider initialization after prepared DB state");
  contains(checkout, 'status: "released"', "reservation release on provider initialization failure");
  contains(schema, "@@unique([provider, providerTransactionId])", "provider transaction idempotency key");
});


test("coupon reservations count against coupon limits until payment resolves", () => {
  const schema = source("prisma/schema.prisma");
  const checkoutRepository = source("src/features/commerce/checkout-repository.ts");
  const paidCheckout = source("src/features/commerce/paid-checkout.ts");

  contains(schema, "enum CouponRedemptionStatus {", "coupon redemption lifecycle");
  contains(schema, "reserved", "reserved coupon status");
  contains(schema, "released", "released coupon status");
  contains(checkoutRepository, 'status: { in: ["reserved", "used"] }', "reader limit includes reservation");
  contains(checkoutRepository, 'status: "reserved"', "global coupon reservation count");
  contains(paidCheckout, "record.usageCount + reservedCount", "paid checkout total limit includes reservations");
});


test("verified provider success is the only paid path that grants entitlement", () => {
  const lifecycle = source("src/features/commerce/payment-lifecycle.ts");

  contains(lifecycle, "applyVerifiedProviderPaymentEvent", "verified-event payment lifecycle");
  contains(lifecycle, 'current.status !== "pending"', "payment state gate");
  contains(lifecycle, "current.amount !== event.amount", "provider amount verification");
  contains(lifecycle, "current.currency !== event.currency", "provider currency verification");
  contains(lifecycle, 'status: "succeeded"', "provider success persistence");
  contains(lifecycle, 'status: "paid"', "order paid transition");
  contains(lifecycle, "workEntitlement.upsert", "entitlement only on verified success branch");
  contains(lifecycle, "financialLedger.upsert", "idempotent sale ledger writes");
  contains(lifecycle, 'status: "released"', "failed or cancelled payment releases coupon reservation");
});


test("new paid work activation stays staged without a provider while previously activated work stays protected", () => {
  const actions = source("src/features/commerce/actions.ts");
  const access = source("src/features/commerce/access.ts");
  const guard = source("src/features/commerce/publication-guard.ts");

  contains(actions, "hasOperationalPaymentProvider", "writer activation provider readiness");
  contains(actions, "(checkoutEnabled && paymentProviderReady)", "new paid activation requires checkout plus provider");
  contains(actions, "previouslyActivatedPaid", "existing paid activation history");
  contains(access, "previouslyActivatedPaid", "reader paid activation history");
  contains(guard, "const previouslyActivatedPaid = Boolean(configuration.activatedAt)", "publication guard activation history");
});


test("provider webhook cannot reach payment lifecycle before adapter verification", () => {
  const providers = source("src/features/commerce/payment-providers.ts");
  const route = source("src/app/api/commerce/payments/[provider]/webhook/route.ts");

  contains(providers, "verifyWebhook(", "provider webhook verification contract");
  contains(route, "await request.text()", "raw webhook body preserved");
  contains(route, "adapter.verifyWebhook", "provider-specific verification");
  contains(route, "if (!verified)", "unverified webhook rejection");
  contains(route, "applyVerifiedProviderPaymentEvent", "shared lifecycle after verification");
  const verificationIndex = route.indexOf("adapter.verifyWebhook");
  const lifecycleIndex = route.indexOf(
    "const result = await applyVerifiedProviderPaymentEvent",
  );
  assert.ok(
    verificationIndex >= 0 && lifecycleIndex > verificationIndex,
    "payment lifecycle must run only after provider verification",
  );
});


test("admin payment operations are backed by commerce records", () => {
  const overview = source("src/app/admin/odeme-sistemi/page.tsx");
  const repository = source("src/features/commerce/admin-operations-repository.ts");
  const orders = source("src/app/admin/odeme-sistemi/siparisler/page.tsx");
  const payments = source("src/app/admin/odeme-sistemi/odemeler/page.tsx");
  const refunds = source("src/app/admin/odeme-sistemi/iadeler/page.tsx");

  contains(overview, 'href="/sistem-yonetimi/odeme-sistemi/siparisler"', "orders operations link");
  contains(overview, 'href="/sistem-yonetimi/odeme-sistemi/odemeler"', "payments operations link");
  contains(overview, 'href="/sistem-yonetimi/odeme-sistemi/iadeler"', "refund operations link");

  contains(repository, "prisma.order.findMany", "orders repository");
  contains(repository, "prisma.payment.findMany", "payments repository");
  contains(repository, "prisma.refund.findMany", "refund repository");
  contains(repository, "take: 200", "bounded operations queries");

  contains(orders, "authorEarningBaseAmount", "order author earning base visibility");
  contains(orders, "documentVersion", "order terms evidence visibility");
  contains(payments, "providerTransactionId", "provider transaction visibility");
  contains(refunds, "salt okunurdur", "refund policy remains read-only");
});


test("refund admin does not invent execution rules before policy is frozen", () => {
  const refundPage = source("src/app/admin/odeme-sistemi/iadeler/page.tsx");
  const repository = source("src/features/commerce/admin-operations-repository.ts");

  contains(refundPage, "İade işlemi burada yürütülmüyor", "refund read-only notice");
  contains(refundPage, "kısmi iade politikası", "partial refund remains undecided");
  contains(refundPage, "kupon iade sonrası", "coupon restore/reuse remains undecided");
  notContains(refundPage, 'action={', "no refund mutation action");
  notContains(repository, "prisma.refund.update", "no refund mutation repository");
  notContains(repository, "prisma.refund.create", "no invented refund request creation");
});


test("admin operations avoid exposing payment credentials", () => {
  const paymentPage = source("src/app/admin/odeme-sistemi/odemeler/page.tsx");
  const repository = source("src/features/commerce/admin-operations-repository.ts");

  contains(paymentPage, "Kart veya operatör kimlik bilgileri burada", "payment credential privacy explanation");
  notContains(repository, "cardNumber", "no card number field");
  notContains(repository, "cvv", "no cvv field");
  notContains(repository, "pan", "no payment PAN field");
});


test("admin entitlement operations remain entitlement-driven", () => {
  const overview = source("src/app/admin/odeme-sistemi/page.tsx");
  const repository = source("src/features/commerce/admin-operations-repository.ts");
  const page = source("src/app/admin/odeme-sistemi/erisim-haklari/page.tsx");

  contains(overview, 'href="/sistem-yonetimi/odeme-sistemi/erisim-haklari"', "entitlement operations link");
  contains(repository, "prisma.workEntitlement.findMany", "entitlement repository");
  contains(repository, "prisma.workEntitlement.groupBy", "entitlement status counts");
  contains(page, "Fiyat hiçbir zaman erişim kararı olarak", "access is not price-derived");
  contains(page, "entitlement.order", "order linkage visibility");
  contains(page, "saleConfiguration", "work sale-state visibility");
  notContains(page, 'action={', "entitlement admin is read-only");
});


test("admin provider readiness is read-only and production-safe", () => {
  const overview = source("src/app/admin/odeme-sistemi/page.tsx");
  const page = source("src/app/admin/odeme-sistemi/saglayicilar/page.tsx");
  const providers = source("src/features/commerce/payment-providers.ts");

  contains(overview, 'href="/sistem-yonetimi/odeme-sistemi/saglayicilar"', "provider readiness link");
  contains(page, "COMMERCE_CHECKOUT_ENABLED", "rollout state visibility");
  contains(page, "hasOperationalPaymentProvider", "operational provider state");
  contains(page, "Secret, kart verisi veya operatör kimlik bilgisi", "credential privacy");
  contains(page, "Test-mode adapter production", "test provider production warning");
  notContains(page, 'action={', "provider readiness page is read-only");
  contains(providers, 'adapter.mode === "test" && process.env.NODE_ENV !== "production"', "test provider remains production-blocked");
});


test("finance admin separates sales volume from platform income", () => {
  const overview = source("src/app/admin/finans-gelirler/page.tsx");
  const repository = source("src/features/commerce/finance-repository.ts");
  const platformIncome = source("src/app/admin/finans-gelirler/ilkoku-gelirleri/page.tsx");

  contains(overview, "Toplam satış hacmi", "gross sales metric");
  contains(overview, "İlkOku geliri değildir", "sales volume is not platform income");
  contains(repository, 'grossSales: totals.get("sale_gross")', "gross sales ledger source");
  contains(repository, 'platformCommission: totals.get("platform_commission")', "platform income ledger source");
  contains(platformIncome, "platform_commission", "platform income page only uses commission movements");
  contains(platformIncome, "Net kâr hesabı yapılmıyor", "no invented net profit");
});


test("writer income dashboard is ledger and balance driven without reader payment data", () => {
  const page = source("src/app/gelirler/page.tsx");
  const repository = source("src/features/commerce/finance-repository.ts");

  contains(page, "getWriterFinanceOverview", "writer finance repository");
  contains(repository, "prisma.financialLedger.findMany", "writer ledger source");
  contains(repository, "prisma.authorBalance.findUnique", "writer balance projection");
  contains(page, "Toplam satış", "writer gross sales");
  contains(page, "Kesintiler", "writer deductions");
  contains(page, "Net kazancım", "writer earning");
  contains(page, "Bekleyen", "writer pending balance");
  contains(page, "Ödenebilir", "writer available balance");
  contains(page, "Ödenen", "writer paid balance");
  contains(page, "Okurun ödeme bilgileri gösterilmez", "writer reader-payment privacy");
  notContains(repository, "cardNumber", "no reader card data in writer finance");
  notContains(repository, "providerTransactionId", "no provider transaction id in writer finance");
});


test("finance ledger remains the source of truth while author balance is a projection", () => {
  const overview = source("src/app/admin/finans-gelirler/page.tsx");
  const balances = source("src/app/admin/finans-gelirler/yazar-bakiyeleri/page.tsx");
  const ledger = source("src/app/admin/finans-gelirler/finans-hareketleri/page.tsx");

  contains(overview, "Finansal gerçek kaynak ledger", "ledger truth notice");
  contains(balances, "operasyonel projeksiyondur", "balance projection notice");
  contains(ledger, "Ledger İlkOku commerce finansının", "ledger operations source");
});


test("payout and reconciliation screens remain non-mutating until finance policy is frozen", () => {
  const payouts = source("src/app/admin/finans-gelirler/yazar-odemeleri/page.tsx");
  const reconciliation = source("src/app/admin/finans-gelirler/mutabakat/page.tsx");
  const repository = source("src/features/commerce/finance-repository.ts");

  contains(payouts, "Gerçek payout yürütümü kapalı", "payout execution disabled");
  notContains(payouts, 'action={', "no payout mutation action");
  contains(reconciliation, "otomatik düzeltme yapmaz", "reconciliation is diagnostic");
  notContains(reconciliation, 'action={', "no reconciliation mutation action");
  notContains(repository, "prisma.payout.update", "no payout mutation repository");
  notContains(repository, "prisma.financialLedger.update", "ledger is not rewritten");
});


test("platform campaign costs preserve the writer earning-base concept", () => {
  const page = source("src/app/admin/finans-gelirler/kampanya-maliyetleri/page.tsx");
  const repository = source("src/features/commerce/finance-repository.ts");

  contains(repository, 'entryType: "platform_coupon_discount"', "platform campaign ledger source");
  contains(page, "yazarın normal hakediş matrahını azaltmaz", "writer earning base protection");
  contains(page, "authorEarningBaseAmount", "order earning base visibility");
});


test("writer work income detail matches the frozen finance fields", () => {
  const page = source("src/app/gelirler/page.tsx");
  const repository = source("src/features/commerce/finance-repository.ts");

  contains(repository, "priceAmount: true", "writer work current price source");
  contains(repository, 'commerceOrders: {', "writer work sales count source");
  contains(repository, 'where: { status: "paid" }', "paid unit count");
  contains(repository, 'entry.entryType === "payment_provider_fee"', "provider fee work rollup");
  contains(repository, 'entry.entryType === "platform_commission"', "platform service share work rollup");
  contains(repository, 'entry.entryType === "refund"', "refund work rollup");
  contains(repository, 'entry.entryType === "tax_withholding"', "tax work rollup");
  contains(repository, 'entry.entryType === "adjustment"', "other adjustment rollup");
  contains(repository, 'entry.entryType === "author_earning"', "net writer earning rollup");

  contains(page, "Güncel fiyat", "writer work price field");
  contains(page, "Satış adedi", "writer work units sold field");
  contains(page, "Ödeme hizmeti ücreti", "writer provider fee field");
  contains(page, "İlkOku hizmet payı", "writer platform share field");
  contains(page, "İade", "writer refund field");
  contains(page, "Vergi / stopaj", "writer tax field");
  contains(page, "Diğer düzeltmeler", "writer other deductions field");
  contains(page, "Net hakediş", "writer net earning field");
});


test("writer finance totals aggregate full ledger history instead of a capped recent slice", () => {
  const repository = source("src/features/commerce/finance-repository.ts");

  contains(repository, 'prisma.financialLedger.groupBy({', "writer finance ledger aggregation");
  contains(repository, 'by: ["entryType"]', "writer total aggregation by ledger type");
  contains(repository, 'by: ["workId", "entryType"]', "writer work aggregation by ledger type");
  notContains(repository, 'where: { authorId, currency: "TRY" },\n      select:', "writer totals do not rely on a capped findMany slice");
});


test("commerce settings remain read-only and require rollout provider and active terms", () => {
  const overview = source("src/app/admin/odeme-sistemi/page.tsx");
  const settings = source("src/app/admin/odeme-sistemi/ayarlar/page.tsx");
  const readerTerms = source("src/features/commerce/checkout-terms.ts");

  contains(overview, 'href="/sistem-yonetimi/odeme-sistemi/ayarlar"', "commerce settings link");
  contains(settings, "COMMERCE_CHECKOUT_ENABLED", "checkout rollout status");
  contains(settings, "hasOperationalPaymentProvider", "provider readiness status");
  contains(settings, "getAuthorPublicationAgreementStatus", "author agreement lifecycle");
  contains(settings, "getReaderPurchaseTermsStatus", "reader terms lifecycle");
  contains(settings, "paidAccessReady", "combined paid access readiness");
  notContains(settings, 'action={', "settings page remains read-only");
  contains(readerTerms, "getReaderPurchaseTermsStatus", "reader terms status query");
});


test("public work queries redact locked paid chapter content before rendering", () => {
  const query = source("src/features/works/member-public-queries.ts");
  const showcase = source("src/features/showcase/components/BookShowcase.tsx");
  const bookPage = source("src/app/kitap/[slug]/page.tsx");

  contains(query, "commerceEnforcementActive", "paid public work enforcement state");
  contains(query, 'content: readable ? bookChapter.content : ""', "published-book locked content redaction");
  contains(query, 'content: readable ? snapshot.content : ""', "chapter snapshot locked content redaction");
  contains(query, "safePublicationBook", "published book safe projection");
  contains(query, 'content: ""', "locked book item content removal");
  contains(query, "formatting: null", "locked book formatting removal");

  contains(showcase, "Kilitli · Ücretli erişime dahildir", "generic locked chapter copy");
  contains(showcase, "Ön İzleme · Ücretsiz okunabilir", "preview chapter copy");
  contains(showcase, "purchaseHref", "locked chapter purchase route");
  contains(showcase, "İçerik satın alma sonrasında açılır", "locked chapter hides content-derived timing");
  contains(bookPage, "isAccessibleForFree: !work.commerce?.enforcementActive", "structured-data paid access state");
  notContains(bookPage, "isAccessibleForFree: true", "no hardcoded free structured-data claim");
});


test("chapter reading resolves editor review bypass before commerce redaction", () => {
  const page = source("src/app/oku/[slug]/[chapterSlug]/page.tsx");
  const query = source("src/features/works/member-public-queries.ts");

  contains(page, "getPublicWorkAgeRating", "minimal work reference before chapter load");
  contains(page, "getActiveEditorReviewAssignment", "review assignment lookup");
  contains(page, "{ bypassCommerce: isReviewReading }", "verified review bypass passed to chapter query");

  const assignmentIndex = page.indexOf("getActiveEditorReviewAssignment");
  const chapterIndex = page.indexOf("const chapter = await getMemberPublicChapter");
  assert.ok(
    assignmentIndex >= 0 && chapterIndex > assignmentIndex,
    "editor review assignment must be resolved before full chapter query",
  );

  contains(query, "options.bypassCommerce", "member query explicit bypass");
  contains(query, "commerceAllowsContent", "chapter content commerce gate");
  contains(query, 'content: ""', "denied chapter returns no content");
});


test("writer paid price stays zero before first activation and preserves live pricing after activation", () => {
  const actions = source("src/features/commerce/actions.ts");
  const page = source("src/app/satis-erisim/[workId]/page.tsx");

  contains(actions, "const previouslyActivatedPaid =", "writer activation history");
  contains(actions, "(checkoutEnabled && paymentProviderReady) || previouslyActivatedPaid", "paid pricing readiness");
  contains(actions, "paidPricingEnabled\n        ? parseTryMinorUnits", "real price after live payment path or prior activation");
  contains(actions, ": BigInt(0)", "never-activated staged paid price remains zero");
  contains(page, "const previouslyActivatedPaid =", "writer UI activation history");
  contains(page, "const paidPricingEnabled = paymentPathReady || previouslyActivatedPaid", "writer paid pricing UI readiness");
  contains(page, "!paidPricingEnabled", "writer staged zero-price view");
  contains(page, '<span className={styles.paidPrice}>0 TL</span>', "paid zero shown under paid choice");
});


test("chapter access plan rejects missing or tampered selections instead of defaulting to preview", () => {
  const actions = source("src/features/commerce/actions.ts");

  contains(actions, 'value === "preview" || value === "locked"', "explicit chapter access choices");
  contains(actions, "parseChapterAccessType(", "chapter access selection mapping");
  contains(actions, "selections.some((selection) => !selection.accessType)", "missing access selection gate");
  contains(actions, '"erisim-secimi-eksik"', "missing access selection fail-closed status");
  notContains(actions, 'const accessType = raw === "locked" ? "locked" : "preview"', "no silent preview default");
  const page = source("src/app/satis-erisim/[workId]/page.tsx");
  contains(page, "chapter.commerceAccess?.accessType ?? null", "unconfigured chapter has no implicit access choice");
});


test("author coupon numeric parsers accept normal digit input", () => {
  const actions = source("src/features/commerce/actions.ts");

  contains(actions, 'if (!/^\\d+$/.test(normalized)) return null;', "positive integer regex");
  contains(actions, 'if (!/^\\d+(?:\\.\\d{1,2})?$/.test(normalized)) return null;', "fixed amount regex");
  notContains(actions, 'if (!/^\\\\d+$/.test(normalized)) return null;', "no double-escaped digit regex");
});


test("previously activated paid work never becomes free because checkout or provider is temporarily unavailable", () => {
  const access = source("src/features/commerce/access.ts");
  const memberQuery = source("src/features/works/member-public-queries.ts");
  const actions = source("src/features/commerce/actions.ts");

  contains(access, "previouslyActivatedPaid", "reader activation history guard");
  contains(access, "if (!previouslyActivatedPaid && !checkoutEnabled)", "checkout outage cannot open activated paid work");
  contains(access, "if (!previouslyActivatedPaid && !paymentProviderReady)", "provider outage cannot open activated paid work");

  contains(memberQuery, "Boolean(saleConfiguration?.activatedAt)", "public work activation history guard");
  contains(memberQuery, "commerceEnforcementActive", "public work locked content remains enforced");

  contains(actions, "const nextActivatedAt = work.saleConfiguration?.activatedAt ?? null", "draft edit preserves paid activation history");
  contains(actions, 'work.saleConfiguration!.saleModel === "free"', "confirmed free transition clears paid activation history");
  contains(actions, "work.saleConfiguration!.activatedAt ?? now", "confirmed paid activation preserves existing timestamp");
});


test("public paid showcase distinguishes access enforcement from purchase availability", () => {
  const types = source("src/features/works/types.ts");
  const query = source("src/features/works/member-public-queries.ts");
  const showcase = source("src/features/showcase/components/BookShowcase.tsx");
  const bookPage = source("src/app/kitap/[slug]/page.tsx");

  contains(types, "purchaseAvailable: boolean", "public commerce purchase availability contract");
  contains(query, "const purchaseAvailable =", "purchase availability resolver");
  contains(query, "paymentPathReady", "purchase requires live payment path");
  contains(showcase, "Satış geçici olarak kullanılamıyor", "outage paid-work state");
  contains(showcase, "Mevcut erişim hakları korunur", "existing entitlement outage copy");
  contains(showcase, "purchaseAvailable", "locked chapter purchase availability");
  contains(bookPage, "work.commerce?.purchaseAvailable", "structured offer purchase availability");
});


test("checkout distinguishes never-activated staging from post-activation outage", () => {
  const repository = source("src/features/commerce/checkout-repository.ts");
  const page = source("src/app/satinal/[slug]/page.tsx");

  contains(repository, "activatedAt: true", "checkout activation history");
  contains(page, "previouslyActivatedPaid", "checkout historical paid state");
  contains(page, "paidAccessEnforced", "paid access enforcement state");
  contains(page, "checkoutConfigurationActive", "checkout transaction readiness");
  contains(page, "Mevcut okuma erişimi açık kalır", "never-activated staging remains open");
  contains(page, "eser bu nedenle ücretsiz erişime açılmaz", "post-activation outage stays locked");
  contains(page, "Erişim korunuyor", "post-activation outage status");
});


test("writer final confirmation copy follows the frozen free paid and staged states", () => {
  const page = source("src/app/satis-erisim/[workId]/page.tsx");

  contains(page, "Bu eserin yukarıdaki koşullarla yayımlanmasını onaylıyorum.", "free work confirmation copy");
  contains(page, "satış fiyatıyla satışa açılmasını onaylıyorum.", "live paid work confirmation copy");
  contains(page, "0 TL hazırlık fiyatı", "staged paid confirmation copy");
  contains(page, '"SATIŞA AÇ"', "live paid confirmation button");
  contains(page, '"SATIŞA HAZIRLA"', "staged paid confirmation button");
  contains(page, '"YAYINA AÇ"', "free confirmation button");
});


test("step three is explicitly free paid and staged zero belongs under paid", () => {
  const page = source("src/app/satis-erisim/[workId]/page.tsx");

  contains(page, "<h2>Ücretsiz / Ücretli seç</h2>", "frozen step-three label");
  const paidIndex = page.indexOf("<strong>Ücretli</strong>");
  const zeroIndex = page.indexOf('<span className={styles.paidPrice}>0 TL</span>');
  assert.ok(
    paidIndex >= 0 && zeroIndex > paidIndex,
    "0 TL must render inside the paid option after its label",
  );
});


test("writer deductions include author-funded coupons but not platform-funded campaign cost", () => {
  const repository = source("src/features/commerce/finance-repository.ts");
  const page = source("src/app/gelirler/page.tsx");

  contains(repository, 'totals.get("author_coupon_discount")', "author coupon deduction total");
  contains(repository, 'entry.entryType === "author_coupon_discount"', "author coupon work rollup");
  contains(page, "finance.authorCouponDiscounts", "author coupon included in writer deductions");
  contains(page, "Yazar kupon indirimi", "author coupon work detail");
  notContains(page, "platformCampaignCost", "platform-funded coupon is not writer deduction");
});


test("writer draft edits do not leak into confirmed reader commerce state", () => {
  const effective = source("src/features/commerce/effective-state.ts");
  const access = source("src/features/commerce/access.ts");
  const memberQuery = source("src/features/works/member-public-queries.ts");
  const checkoutRepository = source("src/features/commerce/checkout-repository.ts");
  const checkoutPage = source("src/app/satinal/[slug]/page.tsx");

  contains(effective, "shouldUseConfirmedPaidSnapshot", "confirmed paid snapshot resolver");
  contains(effective, 'configuration.status !== "active"', "draft/ready snapshot boundary");
  contains(effective, 'latestConsent?.publicationModel === "paid"', "last confirmed paid model");
  contains(effective, "parseAccessPlanSnapshot", "confirmed access plan parser");

  contains(access, "publicationConsents", "reader access loads last confirmation");
  contains(access, "effective.useConfirmedSnapshot", "reader chapter access uses confirmed plan during draft edit");
  contains(memberQuery, "resolveEffectiveCommerceState", "public showcase effective commerce state");
  contains(memberQuery, "effectiveCommerce.accessPlan", "public chapter plan from confirmed snapshot");
  contains(checkoutRepository, "publicationConsents", "checkout loads confirmed state");
  contains(checkoutPage, "effectiveCommerce.saleModel", "checkout preserves confirmed paid enforcement");
});


test("chapter access edits mark the work configuration draft before reader state can change", () => {
  const actions = source("src/features/commerce/actions.ts");
  const effective = source("src/features/commerce/effective-state.ts");

  contains(actions, "prisma.workSaleConfiguration.updateMany", "chapter access draft transition");
  contains(actions, 'status: "draft"', "chapter access edit marks commerce configuration draft");
  contains(effective, 'configuration.status !== "active"', "reader uses confirmed snapshot outside active state");
});


test("writer sees when draft edits are not yet live", () => {
  const page = source("src/app/satis-erisim/[workId]/page.tsx");

  contains(page, "Son onaylı ücretli", "activated paid draft notice");
  contains(page, "eser bazlı son onay tamamlandığında", "draft changes require final confirmation");
});


test("paid activation history survives a draft model toggle until confirmation", () => {
  const actions = source("src/features/commerce/actions.ts");
  const page = source("src/app/satis-erisim/[workId]/page.tsx");
  const checkout = source("src/app/satinal/[slug]/page.tsx");

  contains(actions, "Boolean(work.saleConfiguration?.activatedAt)", "writer save activation history");
  contains(actions, "Boolean(work.saleConfiguration.activatedAt)", "writer confirmation activation history");
  contains(page, "Boolean(work.saleConfiguration?.activatedAt)", "writer UI activation history");
  contains(checkout, "Boolean(configuration?.activatedAt)", "checkout activation history");
  notContains(actions, 'saleModel === "paid" &&\n    Boolean(work.saleConfiguration.activatedAt)', "draft model must not erase prior paid history");
});


test("unconfirmed writer edits cannot interrupt purchases at the last confirmed paid price", () => {
  const effective = source("src/features/commerce/effective-state.ts");
  const memberQuery = source("src/features/works/member-public-queries.ts");
  const checkoutPage = source("src/app/satinal/[slug]/page.tsx");
  const paidCheckout = source("src/features/commerce/paid-checkout.ts");
  const zeroTotal = source("src/features/commerce/zero-total-checkout.ts");

  contains(effective, 'status: "active" as const', "last confirmed paid snapshot remains live");
  contains(memberQuery, "effectiveCommerce.status === \"active\"", "public purchase availability uses confirmed status");
  contains(memberQuery, "effectiveCommerce.priceAmount > BigInt(0)", "public purchase availability uses confirmed price");
  contains(checkoutPage, "effectiveCommerce.priceAmount ?? BigInt(0)", "checkout displays confirmed price");
  contains(checkoutPage, "effectiveCommerce.currency", "checkout displays confirmed currency");
  contains(paidCheckout, "resolveEffectiveCommerceState", "paid provider checkout resolves confirmed state");
  contains(paidCheckout, "effectiveCommerce.priceAmount", "paid provider checkout charges confirmed price");
  contains(zeroTotal, "resolveEffectiveCommerceState", "zero-total checkout resolves confirmed state");
  contains(zeroTotal, "effectiveCommerce.priceAmount", "zero-total checkout prices confirmed state");
});


test("previously activated paid work remains active when a confirmed edit occurs during payment outage", () => {
  const actions = source("src/features/commerce/actions.ts");

  contains(actions, "previouslyActivatedPaid ||\n    paidActivationReady", "post-activation paid configuration stays active through provider outage");
  contains(actions, 'work.saleConfiguration.saleModel === "free"', "free confirmation remains active");
  contains(actions, 'nextStatus === "active"', "confirmed active state persistence");
});


test("author-funded coupon discount is visible in writer deductions without charging platform subsidy", () => {
  const repository = source("src/features/commerce/finance-repository.ts");
  const page = source("src/app/gelirler/page.tsx");

  contains(repository, 'totals.get("author_coupon_discount")', "author coupon deduction total");
  contains(repository, 'entry.entryType === "author_coupon_discount"', "author coupon work rollup");
  contains(page, "finance.authorCouponDiscount", "author coupon included in writer deductions");
  contains(page, "Yazar kupon indirimi", "author coupon deduction field");
  notContains(page, "platformCampaignCost", "platform-funded coupon cost excluded from writer deductions");
});


test("new chapters still require explicit access while a previously paid work has an unconfirmed free draft", () => {
  const guard = source("src/features/commerce/publication-guard.ts");

  contains(guard, "const previouslyActivatedPaid = Boolean(configuration.activatedAt)", "publication guard activation history");
  contains(guard, 'configuration.saleModel !== "paid" && !previouslyActivatedPaid', "draft free cannot bypass confirmed paid publication guard");
  contains(guard, "!paymentPathReady && !previouslyActivatedPaid", "never-activated staged work may stay fail-open");
  contains(guard, "!chapter.commerceAccess", "explicit chapter access remains required");
});


test("author publication access v2 replaces the placeholder but remains inactive pending explicit approval evidence", () => {
  const migration = source(
    "prisma/migrations/20260921114500_author_publication_access_contract_v2/migration.sql",
  );

  contains(
    migration,
    "İLKOKU YAZAR YAYIN VE ERİŞİM SÖZLEŞMESİ",
    "real author commerce agreement body",
  );
  contains(
    migration,
    "BÖLÜM ERİŞİM PLANI",
    "preview locked contract coverage",
  );
  contains(
    migration,
    "HAZIRLIK MODU VE 0 TL KURALI",
    "staged paid contract coverage",
  );
  contains(
    migration,
    "Yazar kuponunda indirim Yazar tarafından finanse edilmiş sayılır",
    "author coupon funding rule",
  );
  contains(
    migration,
    "bu indirim Yazarın hakediş matrahını düşürmez",
    "platform coupon earning-base protection",
  );
  contains(
    migration,
    "kesin İlkOku komisyon oranı, vergi/stopaj oranı, ödeme eşiği, ödeme yöntemi veya Yazar para transferi kuralı belirlenmemiştir",
    "undefined commercial terms remain undefined",
  );
  contains(
    migration,
    "`lifecycleStatus` = 'review'",
    "agreement is submitted to review",
  );
  contains(
    migration,
    "`active` = false",
    "agreement remains inactive before approval",
  );
  notContains(
    migration,
    "`active` = true",
    "migration cannot bypass the activation gate",
  );
});
