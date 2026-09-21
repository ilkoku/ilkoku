import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");
const has = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const lacks = (text, fragment, label) =>
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

test("UAT W/A/R: staged paid work stays zero-priced and can use provider-free 0 TL acquisition", () => {
  const actions = source("src/features/commerce/actions.ts");
  const page = source("src/app/satis-erisim/[workId]/page.tsx");
  const access = source("src/features/commerce/access.ts");
  const publicQuery = source("src/features/works/member-public-queries.ts");

  has(actions, "previouslyActivatedPaid", "writer activation history");
  has(actions, ": BigInt(0)", "staged paid zero price");
  has(page, '<span className={styles.paidPrice}>0 TL</span>', "paid zero-price UI");
  has(page, "!paidPricingEnabled", "staged paid UI gate");
  has(access, "stagedZeroPurchaseReady", "reader staged zero acquisition gate");
  has(access, "getActiveReaderPurchaseTerms", "reader terms prerequisite");
  has(publicQuery, "stagedZeroPurchaseAvailable", "public staged zero purchase availability");
  has(publicQuery, "effectiveCommerce.priceAmount === BigInt(0)", "public zero-price gate");
});

test("UAT A: first paid activation requires price, provider path and reader terms", () => {
  const actions = source("src/features/commerce/actions.ts");

  has(actions, "work.saleConfiguration.priceAmount <= BigInt(0)", "positive paid price gate");
  has(actions, "checkoutEnabled &&", "checkout readiness");
  has(actions, "paymentProviderReady &&", "provider readiness");
  has(actions, "await getActiveReaderPurchaseTerms()", "reader purchase terms");
  has(actions, "const paidActivationReady =", "combined activation readiness");
  has(actions, 'nextStatus === "active"', "active transition");
});

test("UAT R: previously activated paid work never becomes free during payment outage", () => {
  const contract = source("docs/COMMERCE_FOUNDATION_V1.md");
  const access = source("src/features/commerce/access.ts");
  const query = source("src/features/works/member-public-queries.ts");
  const checkout = source("src/app/satinal/[slug]/page.tsx");
  const showcase = source("src/features/showcase/components/BookShowcase.tsx");

  has(contract, "temporary checkout/provider outage does **not** unlock", "frozen outage rule");
  has(access, "previouslyActivatedPaid", "runtime activation history");
  has(query, "Boolean(saleConfiguration?.activatedAt)", "public activation history");
  has(query, "commerceEnforcementActive", "public enforcement state");
  has(checkout, "eser bu nedenle ücretsiz erişime açılmaz", "checkout outage lock copy");
  has(showcase, "Mevcut erişim hakları korunur", "public outage entitlement copy");
});

test("UAT R: locked chapter content is redacted before reader rendering", () => {
  const query = source("src/features/works/member-public-queries.ts");

  has(query, "const canReadChapter", "chapter content access decision");
  has(query, "const readable = canReadChapter(chapter.id)", "per-chapter commerce decision");
  has(query, 'content: ""', "locked chapter redaction");
  has(query, "safePublicationBook", "publication book redaction");
  has(query, "formatting: null", "locked publication formatting redaction");
});

test("UAT R: active editor review can bypass commerce without opening normal reader access", () => {
  const page = source("src/app/oku/[slug]/[chapterSlug]/page.tsx");
  const query = source("src/features/works/member-public-queries.ts");

  has(page, "getActiveEditorReviewAssignment", "editor assignment verification");
  has(page, "{ bypassCommerce: isReviewReading }", "verified editor commerce bypass");
  has(page, "canAccessReaderWorkspace(user.role) && !isReviewReading", "normal reader commerce gate");
  has(query, "options.bypassCommerce", "query-level explicit bypass");
});

test("UAT C: non-zero checkout persists pending state before provider handoff", () => {
  const checkout = source("src/features/commerce/paid-checkout.ts");

  has(checkout, 'status: "pending_payment"', "pending order");
  has(checkout, 'status: "pending"', "pending payment");
  has(checkout, "transaction.orderConsent.create", "reader consent evidence");
  has(checkout, 'status: "reserved"', "coupon reservation");
  has(checkout, "adapter.createPayment", "provider handoff");

  const orderIndex = checkout.indexOf("const order = await transaction.order.create");
  const paymentIndex = checkout.indexOf("const payment = await transaction.payment.create");
  const providerIndex = checkout.indexOf("adapter.createPayment");
  assert.ok(
    orderIndex >= 0 && paymentIndex > orderIndex && providerIndex > paymentIndex,
    "order and payment persistence must precede provider handoff",
  );
});

test("UAT C: provider webhook is verified before settlement and settlement is idempotent", () => {
  const route = source("src/app/api/commerce/payments/[provider]/webhook/route.ts");
  const lifecycle = source("src/features/commerce/payment-lifecycle.ts");

  const verifyIndex = route.indexOf("adapter.verifyWebhook");
  const settleIndex = route.indexOf("const result = await applyVerifiedProviderPaymentEvent");
  assert.ok(verifyIndex >= 0 && settleIndex > verifyIndex, "settlement must follow provider verification");

  has(lifecycle, "current.amount !== event.amount", "amount verification");
  has(lifecycle, "current.currency !== event.currency", "currency verification");
  has(lifecycle, "idempotent: true", "terminal callback idempotency");
  has(lifecycle, "workEntitlement.upsert", "verified success entitlement");
  has(lifecycle, "financialLedger.upsert", "idempotent finance posting");
});

test("UAT K/R: zero-total orders skip provider and grant entitlement atomically", () => {
  const zero = source("src/features/commerce/zero-total-checkout.ts");
  const checkout = source("src/app/satinal/[slug]/page.tsx");
  const library = source("src/app/kutuphanem/satin-aldiklarim/page.tsx");

  has(zero, "prisma.$transaction", "zero-total atomic transaction");
  has(zero, 'status: "paid"', "zero-total paid order");
  has(zero, "const stagedZeroPurchase =", "base-price zero acquisition");
  has(zero, "transaction.couponRedemption.create", "coupon-derived zero consumption");
  has(zero, "transaction.workEntitlement.upsert", "entitlement grant or reactivation");
  has(zero, "transaction.financialLedger.create", "ledger posting");
  has(checkout, '"0 TL ile satın al"', "reader purchase button");
  has(library, "Satın alma başarılı. Eser kütüphanene eklendi", "successful library redirect message");
  lacks(zero, "transaction.payment.create", "zero-total external payment");
  lacks(zero, "adapter.createPayment", "zero-total provider handoff");
});

test("UAT K/F: coupon funder determines earning base without mixing platform campaign cost into writer deductions", () => {
  const pricing = source("src/features/commerce/pricing.ts");
  const writerFinance = source("src/app/gelirler/page.tsx");
  const financeRepository = source("src/features/commerce/finance-repository.ts");

  has(pricing, 'coupon.owner === "author" ? finalAmount : originalAmount', "coupon earning base");
  has(pricing, 'coupon.owner === "platform" ? discountAmount : BigInt(0)', "platform subsidy");
  has(financeRepository, 'totals.get("author_coupon_discount")', "author-funded discount deduction");
  lacks(writerFinance, "platformCampaignCost", "platform campaign cost excluded from writer deductions");
});

test("UAT F: gross sales, platform income and writer earnings remain separate ledger concepts", () => {
  const repository = source("src/features/commerce/finance-repository.ts");
  const overview = source("src/app/admin/finans-gelirler/page.tsx");
  const writer = source("src/app/gelirler/page.tsx");

  has(repository, 'grossSales: totals.get("sale_gross")', "gross sales source");
  has(repository, 'platformCommission: totals.get("platform_commission")', "platform income source");
  has(repository, 'authorEarnings: totals.get("author_earning")', "writer earning source");
  has(overview, "İlkOku geliri değildir", "gross versus platform income disclosure");
  has(writer, "Okurun ödeme bilgileri gösterilmez", "writer payment-data privacy");
});

test("UAT G: unresolved refund and payout policy stays non-mutating", () => {
  const refunds = source("src/app/admin/odeme-sistemi/iadeler/page.tsx");
  const payouts = source("src/app/admin/finans-gelirler/yazar-odemeleri/page.tsx");

  has(refunds, "salt okunurdur", "refund read-only notice");
  has(payouts, "Gerçek payout yürütümü kapalı", "payout disabled notice");
  lacks(refunds, 'action={', "refund mutation action");
  lacks(payouts, 'action={', "payout mutation action");
});

test("UAT release surface: commerce workspaces are private and admin routes remain admin-only", () => {
  const security = source("src/lib/route-security.ts");
  const proxy = source("src/proxy.ts");
  const nextConfig = source("next.config.ts");

  for (const route of ["/satis-erisim", "/gelirler", "/satinal", "/kutuphanem"]) {
    has(security, `"${route}"`, `${route} protected route`);
    has(proxy, `"${route}/:path*"`, `${route} proxy matcher`);
    has(nextConfig, `"${route}/:path*"`, `${route} noindex header`);
  }

  has(security, "systemManagementPath", "admin system-management boundary");
  has(proxy, "isAdminOnlyPath", "admin request authorization");
});


test("UAT W: unconfirmed edits keep the last confirmed paid reader state", () => {
  const effective = source("src/features/commerce/effective-state.ts");
  const actions = source("src/features/commerce/actions.ts");
  const access = source("src/features/commerce/access.ts");
  const publicQuery = source("src/features/works/member-public-queries.ts");
  const checkout = source("src/app/satinal/[slug]/page.tsx");

  has(actions, "const nextActivatedAt = work.saleConfiguration?.activatedAt ?? null", "draft preserves activation history");
  has(effective, "shouldUseConfirmedPaidSnapshot", "confirmed snapshot selector");
  has(effective, 'configuration.status !== "active"', "draft or ready boundary");
  has(access, "effective.useConfirmedSnapshot", "reader access confirmed chapter plan");
  has(publicQuery, "effectiveCommerce.accessPlan", "public showcase confirmed chapter plan");
  has(checkout, "effectiveCommerce.saleModel", "checkout confirmed paid state");
});


test("UAT C: active paid sales continue on the last confirmed price while new writer edits are draft", () => {
  const effective = source("src/features/commerce/effective-state.ts");
  const publicQuery = source("src/features/works/member-public-queries.ts");
  const page = source("src/app/satinal/[slug]/page.tsx");
  const paid = source("src/features/commerce/paid-checkout.ts");

  has(effective, 'status: "active" as const', "confirmed snapshot live status");
  has(publicQuery, "effectiveCommerce.status === \"active\"", "public purchase remains available");
  has(page, "effectiveCommerce.priceAmount ?? BigInt(0)", "reader sees confirmed price");
  has(paid, "effectiveCommerce.priceAmount", "order charges confirmed price");
});


test("UAT W: completed final commerce confirmation hides the repeat submit until a real next action exists", () => {
  const page = source("src/app/satis-erisim/[workId]/page.tsx");

  has(page, 'finalStatus === "ready"', "ready status detection");
  has(page, "!paidActivationReady", "staged ready state stays settled until live activation is possible");
  has(page, 'finalStatus === "active"', "active status detection");
  has(page, "finalConfirmationSettled ? (", "completed confirmation replaces repeat form");
  has(page, '"✓ Satışa Hazır"', "ready confirmation label");
  has(page, "Hazırlık tamamlandı", "ready confirmation timestamp copy");
  has(page, "Eser 0 TL edinim için hazır", "current staged zero acquisition guidance");
  has(page, "Gerçek ödeme sistemi", "future live activation guidance");
});
