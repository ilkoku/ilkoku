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

test("UAT W/A: staged paid work stays zero-priced until first real activation", () => {
  const actions = source("src/features/commerce/actions.ts");
  const page = source("src/app/satis-erisim/[workId]/page.tsx");
  const access = source("src/features/commerce/access.ts");

  has(actions, "previouslyActivatedPaid", "writer activation history");
  has(actions, ": BigInt(0)", "staged paid zero price");
  has(page, '<span className={styles.paidPrice}>0 TL</span>', "paid zero-price UI");
  has(page, "!paidPricingEnabled", "staged paid UI gate");
  has(access, "if (!previouslyActivatedPaid && !checkoutEnabled)", "never-activated checkout fail-open");
  has(access, "if (!previouslyActivatedPaid && !paymentProviderReady)", "never-activated provider fail-open");
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
  has(query, "Boolean(saleConfiguration.activatedAt)", "public activation history");
  has(query, "commerceEnforcementActive", "public enforcement state");
  has(checkout, "eser bu nedenle ücretsiz erişime açılmaz", "checkout outage lock copy");
  has(showcase, "Mevcut erişim hakları korunur", "public outage entitlement copy");
});

test("UAT R: locked chapter content is redacted before reader rendering", () => {
  const query = source("src/features/works/member-public-queries.ts");

  has(query, "commerceAllowsContent", "chapter content access decision");
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

test("UAT K: zero-total coupon order skips provider and grants entitlement atomically", () => {
  const zero = source("src/features/commerce/zero-total-checkout.ts");

  has(zero, "prisma.$transaction", "zero-total atomic transaction");
  has(zero, 'status: "paid"', "zero-total paid order");
  has(zero, "transaction.couponRedemption.create", "coupon consumption");
  has(zero, "transaction.workEntitlement.create", "entitlement grant");
  has(zero, "transaction.financialLedger.create", "ledger posting");
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
  has(writer, "Okur ödeme bilgileri gösterilmez", "writer payment-data privacy");
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
