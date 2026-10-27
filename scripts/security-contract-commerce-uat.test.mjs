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
  has(access, "shouldEnforcePaidChapterAccess", "locked chapter enforced independently");
  has(publicQuery, "getActiveReaderPurchaseTerms", "public purchase readiness preserves terms gate");
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
  has(access, "shouldEnforcePaidChapterAccess", "runtime activation history protection");
  has(query, "shouldEnforcePaidChapterAccess", "public activation history");
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

test("UAT C: provider checkout enforces verified seller and freezes immutable legal snapshot", () => {
  const paid = source("src/features/commerce/paid-checkout.ts");
  const zero = source("src/features/commerce/zero-total-checkout.ts");
  const action = source("src/features/commerce/checkout-actions.ts");

  for (const [name, code] of [["provider", paid], ["0 TL", zero]]) {
    has(code, "getVerifiedWorkSeller(work.id, transaction)", name + " checks verified seller in checkout transaction");
    has(code, 'reason: "seller_unverified"', name + " fails closed on missing seller");
    has(code, "transaction.orderLegalSnapshot.create", name + " persists immutable legal seller snapshot");
    for (const field of [
      "legalPartyId: verifiedSeller.party.id",
      "sellerAssignmentId: verifiedSeller.assignmentId",
      "authorizationId: verifiedSeller.rights.id",
      "sellerName: verifiedSeller.party.legalName!",
      "sellerTaxIdentifier: verifiedSeller.party.taxIdentifier!",
      "rightsDocumentHash: verifiedSeller.rights.documentHash!",
    ]) {
      has(code, field, name + " legal evidence " + field);
    }
  }

  const sellerGate = paid.indexOf("const verifiedSeller = await getVerifiedWorkSeller");
  const orderWrite = paid.indexOf("const order = await transaction.order.create");
  const legalWrite = paid.indexOf("await transaction.orderLegalSnapshot.create");
  const consentWrite = paid.indexOf("await transaction.orderConsent.create");
  const paymentWrite = paid.indexOf("const payment = await transaction.payment.create");
  const handoff = paid.indexOf("await adapter.createPayment");
  assert.ok(
    sellerGate >= 0 && sellerGate < orderWrite &&
    orderWrite < legalWrite && legalWrite < consentWrite &&
    consentWrite < paymentWrite && paymentWrite < handoff,
    "provider checkout must verify seller before all writes and persist legal snapshot before handoff",
  );
  has(action, 'seller_unverified: "satici-yetkisi-dogrulanmadi"', "same denial shown to reader for both checkout routes");
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
  has(checkout, "0 TL ile satın al", "reader purchase button");
  has(library, "Satın alma başarılı. Eser kütüphanene eklendi", "successful library redirect message");
  lacks(zero, "transaction.payment.create", "zero-total external payment");
  lacks(zero, "adapter.createPayment", "zero-total provider handoff");
});

test("UAT K: a locked coupon must be re-read with fresh committed global and per-reader usage", () => {
  const zero = source("src/features/commerce/zero-total-checkout.ts");
  const paid = source("src/features/commerce/paid-checkout.ts");

  for (const [name, code] of [["zero-total", zero], ["provider checkout", paid]]) {
    has(code, 'isolationLevel: "ReadCommitted"', name + " uses fresh snapshots after coupon row lock");
    const lock = code.indexOf("FROM Coupon");
    const freshRead = code.indexOf("const coupon = await transaction.coupon.findUnique") >= 0
      ? code.indexOf("const coupon = await transaction.coupon.findUnique")
      : code.indexOf("const record = await transaction.coupon.findUnique");
    const validation = code.indexOf("const validation = validateCouponRules");
    assert.ok(lock >= 0 && freshRead > lock && validation > freshRead,
      name + " must re-read coupon usage only after acquiring the coupon mutex");
  }
});

test("UAT K: concurrent 0 TL requests serialize by reader before entitlement and order reads", () => {
  const zero = source("src/features/commerce/zero-total-checkout.ts");
  const paid = source("src/features/commerce/paid-checkout.ts");

  for (const [name, code] of [["zero-total", zero], ["provider checkout", paid]]) {
    assert.match(
      code,
      /SELECT id\s+FROM User\s+WHERE id = \$\{input\.readerId\}\s+FOR UPDATE/u,
      name + " must lock the same reader row",
    );
  }
  const mutexIndex = zero.indexOf("await transaction.$queryRaw");
  const workReadIndex = zero.indexOf("const work = await transaction.work.findFirst");
  const entitlementIndex = zero.indexOf("const entitlement = await transaction.workEntitlement.findUnique");
  const orderIndex = zero.indexOf("const order = await transaction.order.create");
  assert.ok(
    mutexIndex >= 0 &&
      mutexIndex < workReadIndex &&
      workReadIndex < entitlementIndex &&
      entitlementIndex < orderIndex,
    "reader lock must precede work/entitlement snapshot and all zero-total order writes",
  );
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


test("writer, reader, editor, publisher and admin commerce disclosures stay linked without purchase privilege widening", () => {
  const model = source("src/features/commerce/effective-state.ts");
  const writer = source("src/app/satis-erisim/page.tsx");
  const reader = source("src/app/kesfet/page.tsx");
  const readerTable = source("src/features/reader/components/ReaderWorksTable.tsx");
  const showcase = source("src/features/showcase/components/BookShowcase.tsx");
  const publisherRepo = source("src/features/publisher-workspace/repository.ts");
  const publisherDiscovery = source("src/features/publisher-discovery/work-query.ts");
  const publisherWorksTable = source("src/features/publisher-discovery/components/PublisherWorksTable.tsx");
  const editorDiscovery = source("src/features/editor-workspace/common-discovery-query.ts");
  const editorWorksTable = source("src/features/editor-workspace/components/EditorWorksTable.tsx");
  const publisherQuery = source("src/features/publisher-workspace/queries.ts");
  const publisherUi = source("src/features/publisher-workspace/components/PublisherDashboard.tsx");
  const admin = source("src/app/admin/eserler/[workId]/page.tsx");
  const checkout = source("src/app/satinal/[slug]/page.tsx");
  const auth = source("src/features/auth/data.ts");

  has(model, "describeWorkSaleModel", "shared read-only model source");
  has(model, "resolveEffectiveCommerceState(input)", "confirmed paid snapshot disclosure");
  has(writer, "Okur eser sayfasını gör", "writer links published work to reader");
  has(reader, "saleConfiguration:", "reader sees sale model");
  has(reader, "publicationConsents:", "reader sees last confirmed sale snapshot");
  has(reader, "describeWorkSaleModel", "reader/editor/editor candidate reuse same model");
  has(readerTable, "work.saleDisclosure.label", "reader row shows sale state");
  has(readerTable, "selectedWork.saleDisclosure.detail", "reader details explain state");
  has(showcase, "Ücretli eser · Hazırlıkta", "public book display distinguishes staged paid");
  has(publisherRepo, "publisherId: membership.publisherId", "publisher submission tenant boundary");
  has(publisherDiscovery, "saleDisclosure: describeWorkSaleModel", "publisher discovery lists sale model");
  has(publisherWorksTable, "work.saleDisclosure.label", "publisher discovery UI shows sale model");
  has(editorDiscovery, "saleDisclosure: describeWorkSaleModel", "editor discovery uses same sale model");
  has(editorWorksTable, "work.saleDisclosure.label", "editor discovery UI shows sale model");
  has(publisherQuery, "saleDisclosure: describeWorkSaleModel", "publisher shows authorized submitted-work model");
  has(publisherUi, "submission.work.saleDisclosure.label", "publisher user-facing sale label");
  has(admin, "chapter.commerceAccess?.accessType", "admin sees chapter preview/locked state");
  has(admin, "disclosure.detail", "admin sees reader-facing sale state");
  has(checkout, "canAccessReaderWorkspace(profile.role)", "checkout reader role guard remains");
  has(auth, "readerWorkspaceRoles", "reader role allowlist retained");
  lacks(auth, '  "publisher",', "publisher checkout access not silently expanded");
});

test("reader discovery checkout actions require terms, entitlement and operational providers", () => {
  const page = source("src/app/kesfet/page.tsx");
  const table = source("src/features/reader/components/ReaderWorksTable.tsx");
  const checkout = source("src/app/satinal/[slug]/page.tsx");
  const book = source("src/features/works/member-public-queries.ts");

  has(page, "getActiveReaderPurchaseTerms()", "reader purchase terms are verified server-side");
  has(page, "isCommerceCheckoutEnabled() && hasOperationalPaymentProvider()", "nonzero checkout requires provider");
  has(page, "stagedZeroPurchaseAvailable", "0 TL staging controlled by reader purchase terms");
  has(page, "livePaidPurchaseAvailable", "paid purchase controlled by provider readiness");
  has(page, 'where: { readerId: userId, status: "active" }', "entitlement belongs to current reader");
  has(page, "work.entitlements.length > 0", "existing entitlement avoids repeat purchase");
  has(page, 'chapter.commerceAccess?.accessType ?? "locked"', "unknown chapter plan is closed");
  has(page, "effective.useConfirmedSnapshot", "confirmed access plan survives draft edits");
  has(page, 'stagedZeroPurchaseAvailable ? "0 TL ile edin" : "Satın al"', "no false checkout label");
  has(table, "work.purchaseAction.href", "direct purchase from reader discovery row");
  has(table, "selectedWork.purchaseAction.href", "direct purchase from discovery detail panel");
  has(table, "!work.paidAccessRestricted", "paid restriction prevents misleading restart");
  has(checkout, "stagedZeroPurchaseReady", "backend checkout still enforces terms");
  has(book, "const stagedZeroPurchaseAvailable =", "showcase also enforces terms");
  lacks(page, "completeZeroTotalCheckoutAction", "discovery cannot create orders");
});

test("reader checkout placeholders cannot pass the admin approval or acquisition gate", () => {
  const terms = source("src/features/commerce/checkout-terms.ts");
  const lifecycle = source("src/features/contracts/template-lifecycle.ts");
  const lifecycleUi = source("src/features/contracts/ContractTemplateLifecyclePanel.tsx");
  const zero = source("src/features/commerce/checkout-actions.ts");

  has(terms, "export function isReaderPurchaseTermsPlaceholder", "placeholder detector");
  has(terms, 'normalized.startsWith("çalışma taslağı")', "seeded placeholder heading");
  has(terms, 'normalized.includes("nihai hukuki metnin hazırlanacağı çalışma alanıdır")', "seeded draft description");
  has(terms, "isReaderPurchaseTermsPlaceholder(row.body)", "reader checkout fails closed");
  has(lifecycle, 'input.transition === "approve" || input.transition === "activate"', "both approval and activation guarded");
  has(lifecycle, 'status: "purchase_terms_placeholder"', "placeholder status");
  has(lifecycle, "template.code === READER_DIGITAL_CONTENT_TERMS_CODE", "no unrelated contract affected");
  has(lifecycleUi, "purchaseTermsPlaceholder", "admin sees clear restriction");
  has(lifecycleUi, "0 TL edinim de kapalı kalır", "plain-language readiness explanation");
  has(zero, "if (!terms)", "zero-total action requires active terms");
});

test("checkout maintains normal İlkOku overview while preparation is not purchasable", () => {
  const page = source("src/app/satinal/[slug]/page.tsx");
  const css = source("src/features/commerce/commerce.module.css");
  has(page, "readerCheckoutLayout", "two-column normal purchase layout");
  has(page, "Platform: İlkOku", "platform seller display label");
  has(page, "stagedZeroCandidate", "staged offer is represented without false charge");
  has(page, "!checkoutConfigurationActive", "unready checkout stays inactive");
  has(page, "type=\"button\" className={styles.action} disabled", "blocked checkout cannot submit");
  has(page, "checkoutConfigurationActive && pricing.finalAmount === BigInt(0) && purchaseTerms", "0 TL action requires live terms");
  has(page, "completeZeroTotalCheckoutAction", "real provider-free acquisition path retained");
  has(page, "beginPaidCheckoutAction", "existing paid checkout action retained");
  has(css, ".readerCheckoutSummary", "dedicated order summary UI styles");
  has(css, "@media (max-width: 800px)", "checkout responsive layout");
});


test("UAT: reader order detail is scoped to the authenticated buyer and immutable sale snapshots", () => {
  const repo = source("src/features/commerce/reader-repository.ts");
  const page = source("src/app/hesabim/odeme-gecmisi/[orderNo]/page.tsx");
  const history = source("src/app/hesabim/odeme-gecmisi/page.tsx");
  has(repo, "where: { readerId, orderNo }", "buyer-bound order read");
  has(repo, "legalSnapshot:", "historical seller snapshot");
  has(repo, "consent:", "purchase terms consent snapshot");
  has(page, "getReaderOrderDetail(profile.id, orderNo)", "buyer authentication");
  has(page, 'order.status === "paid"', "entitlement requires paid order");
  has(page, 'order.entitlement?.status === "active"', "entitlement requires active access");
  has(page, "resmî", "do not claim an invoice");
  has(history, "/hesabim/odeme-gecmisi/", "order-detail navigation");
});

test("UAT: writer fee example is read-only and preserves invoice vs GVK18 assumptions", () => {
  const preview = source("src/features/commerce/settlement-preview.ts");
  const page = source("src/app/satis-erisim/kazanc-hesaplama/page.tsx");
  const writer = source("src/app/satis-erisim/page.tsx");
  for (const fragment of [
    'mode === "invoice"',
    'commissionRateBps = 1500',
    'serviceFeeRateBps = 500',
    'percentBps(saleNetAmount, commissionRateBps)',
    'percentBps(saleNetAmount, serviceFeeRateBps)',
    'BigInt(17)',
    'BigInt(20)',
    'BigInt(25)',
    "authorBankPayment",
    "vat1Payment",
    "vat2Payment",
  ]) has(preview, fragment, "illustrative financial breakdown");
  has(page, 'profile.role !== "writer"', "writer-only preview");
  has(page, 'method="get"', "read-only GET form");
  has(page, "gerçek hakediş", "illustrative label");
  has(writer, "/satis-erisim/kazanc-hesaplama", "writer preview navigation");
  const tax = source("src/app/satis-erisim/odeme-vergi-bilgileri/page.tsx");
  has(tax, 'profile.role !== "writer"', "tax info role gate");
  has(tax, "authorBillingProfile.findUnique", "writer owns billing detail view");
  const billAction = source("src/features/commerce/writer-billing-actions.ts");
  has(billAction, 'writer.role !== "writer"', "owner-only saved tax information");
  lacks(billAction, "prisma.order", "invoice declaration does not create paid orders");
  has(writer, "/satis-erisim/odeme-vergi-bilgileri", "tax overview navigation");
  lacks(preview, "prisma.", "illustrative calculator never writes records");
});

test("UAT: checkout steps and library receipts do not open a paid provider or change 0 TL guards", () => {
  const checkout = source("src/app/satinal/[slug]/page.tsx");
  const library = source("src/app/kutuphanem/satin-aldiklarim/page.tsx");
  const css = source("src/features/commerce/commerce.module.css");
  has(checkout, "checkoutStages", "checkout-before navigation");
  has(checkout, "completeZeroTotalCheckoutAction", "existing 0 TL checkout path");
  has(checkout, "beginPaidCheckoutAction", "existing paid checkout gate");
  has(library, "Sipariş ve onay kayıtları", "postpurchase detail link");
  has(css, ".readerCheckoutPage .checkoutStages", "scoped mobile styles");
  has(css, "@media (max-width: 640px)", "small viewport layout");
});

test("UAT: purchase order number is shown only from reader-owned persisted order snapshots", () => {
  const zero = source("src/features/commerce/zero-total-checkout.ts");
  const action = source("src/features/commerce/checkout-actions.ts");
  const repository = source("src/features/commerce/checkout-repository.ts");
  const checkout = source("src/app/satinal/[slug]/page.tsx");
  const library = source("src/app/kutuphanem/satin-aldiklarim/page.tsx");
  const paymentHistory = source("src/app/hesabim/odeme-gecmisi/page.tsx");
  const orderDetail = source("src/app/hesabim/odeme-gecmisi/[orderNo]/page.tsx");
  const readerRepo = source("src/features/commerce/reader-repository.ts");

  has(zero, 'orderNo: orderNumber()', "persistent order identifier generation");
  has(action, "encodeURIComponent(result.orderNo)", "purchase redirect includes saved order number");
  has(repository, "orderNo: true", "checkout existing entitlement reads persisted number");
  has(checkout, "Sipariş numarası:", "existing entitlement shows verified number");
  has(library, "completedOrderNo", "success notice selects confirmed order number");
  has(library, "entitlements.find((item) => item.order?.orderNo === query.siparis)", "query order number cross-checked against buyer entitlement");
  has(library, "Sipariş No:", "library item displays order number");
  has(paymentHistory, "Sipariş No:", "history displays order number");
  has(orderDetail, "Sipariş numarası:", "receipt displays order number");
  has(readerRepo, "where: { readerId, orderNo }", "order detail access remains buyer-scoped");
});


test("UAT: promotion-only TEST209 access is never labeled purchased in checkout", () => {
  const repository = source("src/features/commerce/checkout-repository.ts");
  const checkout = source("src/app/satinal/[slug]/page.tsx");
  const showcase = source("src/features/showcase/components/BookShowcase.tsx");
  has(repository, "source: true", "checkout reads entitlement origin");
  has(checkout, 'entitlement.source === "promotion"', "demo access is detected by persisted origin");
  has(checkout, "work.slug === TEST209_DEMO_SLUG", "demo label is restricted to TEST209");
  has(checkout, '"0 TL test erişimi"', "reader sees a demo label rather than a purchase label");
  has(checkout, "Bu işlem gerçek sipariş veya tahsilat değildir.", "reader is told demo has no order or payment");
  has(checkout, "entitlement.order?.orderNo", "real purchased entitlements still display persisted order number");
  has(showcase, "Erişim hakkı aktif · Okunabilir", "book page does not falsely claim promotional entitlement was bought");
});

test("UAT: VAT-exclusive new prices are frozen per order without retroactive legacy migration", () => {
  const schema = source("prisma/schema.prisma");
  const migration = source("prisma/migrations/20261025143000_commerce_price_tax_quote/migration.sql");
  const quote = source("src/features/commerce/price-quote.ts");
  const state = source("src/features/commerce/effective-state.ts");
  const actions = source("src/features/commerce/actions.ts");
  const zero = source("src/features/commerce/zero-total-checkout.ts");
  const paid = source("src/features/commerce/paid-checkout.ts");
  const checkout = source("src/app/satinal/[slug]/page.tsx");
  const publicQuery = source("src/features/works/member-public-queries.ts");
  const reader = source("src/features/commerce/reader-repository.ts");
  const details = source("src/app/hesabim/odeme-gecmisi/[orderNo]/page.tsx");

  has(schema, "model OrderPriceQuoteSnapshot", "per-order immutable quote relation");
  has(migration, "DEFAULT 'legacy_inclusive'", "non-retroactive schema migration");
  has(quote, 'input.taxTreatment === "net_plus_vat"', "explicit opt-in for price plus VAT");
  has(quote, "calculateCommercePricing(listGrossAmount", "coupons apply to VAT-inclusive total");
  has(state, "priceTaxTreatment: input.latestConsent.priceTaxTreatment", "confirmed writer price-tax basis");
  has(actions, '"net_plus_vat"', "new work explicitly records net VAT-plus basis");
  has(actions, "priceTaxTreatment: work.saleConfiguration!.priceTaxTreatment", "writer final approval freezes price treatment");
  has(zero, "priceQuote,", "0 TL and coupon orders preserve quote source");
  has(paid, "priceQuote,", "paid orders preserve quote source");
  has(checkout, "priceQuote.listVatAmount", "reader sees VAT separately when supported");
  has(publicQuery, ".listGrossAmount", "work reader metadata shows VAT-inclusive price");
  has(reader, "priceQuoteSnapshot:", "order reader retrieves frozen quote");
  has(details, "order.priceQuoteSnapshot", "order receipt shows frozen net price and VAT");
});


test("0 TL admin readiness cannot show ready for an ineligible work despite approved terms and seller", () => {
  const settings = source("src/app/admin/odeme-sistemi/ayarlar/page.tsx");
  has(settings, 'slug: "yeni-test209-30820c6a"', "sample work is fixed to TEST209");
  has(settings, 'publishedAt: { not: null }', "sample work must be published");
  has(settings, 'visibility: "public"', "sample work must be public");
  has(settings, 'author: { is: { deletedAt: null, status: "active" } }', "author must be active");
  has(settings, 'sampleWork?.saleConfiguration?.saleModel === "paid"', "paid model required");
  has(settings, 'sampleWork.saleConfiguration.status === "ready"', "ready state required");
  has(settings, 'sampleWork.saleConfiguration.priceAmount === BigInt(0)', "zero price required");
  has(settings, '!sampleWork.saleConfiguration.activatedAt', "staged, not activated, required");
  has(settings, 'sampleZeroTotalStaged && sampleSeller && readerTermsReady',
    "do not claim a ready 0 TL checkout without all three prerequisites");
});


test("TEST209 0 TL demo is a narrow non-sale reader access grant", () => {
  const demo = source("src/features/commerce/test209-demo-access.ts");
  const checkout = source("src/features/commerce/checkout-actions.ts");
  const page = source("src/app/satinal/[slug]/page.tsx");
  const library = source("src/app/kutuphanem/satin-aldiklarim/page.tsx");
  const normal = source("src/features/commerce/zero-total-checkout.ts");

  has(demo, 'TEST209_DEMO_SLUG = "yeni-test209-30820c6a"', "exact QA work slug");
  has(demo, 'const TEST209_DEMO_WORK_ID = "6ebb633f-4356-459c-ac12-4fbd253a49e7"', "exact QA work id");
  has(demo, 'const TEST209_READER_NAME = "ERSİN OKURTEST"', "single QA reader");
  has(demo, "TEST209_READER_EMAIL_SHA256", "non-mutable QA account fingerprint");
  has(demo, 'input.email.trim().toLowerCase()', "account email matching");
  lacks(demo, "ersinokurtest@hotmail.com", "raw private account email not committed");
  has(demo, 'input.role !== "reader"', "reject non-reader roles");
  has(demo, "FOR UPDATE", "serialized QA access grant");
  has(demo, 'work.saleConfiguration?.status !== "ready"', "work must be ready");
  has(demo, 'work.saleConfiguration?.priceAmount !== BigInt(0)', "must be 0 TL");
  has(demo, 'source: "promotion"', "promotion provenance rather than sale");
  has(demo, 'transaction.workEntitlement.create', "only a test entitlement is issued");
  lacks(demo, "transaction.order.create", "no sales order");
  lacks(demo, "transaction.payment.create", "no payment");
  lacks(demo, "transaction.financialLedger.create", "no commercial ledger");
  lacks(demo, "transaction.orderLegalSnapshot.create", "no fabricated legal party snapshot");
  has(checkout, "completeTest209ZeroTlDemoAction", "separate user-authorized trial action");
  has(checkout, 'getActiveReaderPurchaseTerms()', "active reader terms still required");
  has(checkout, 'formData.get("acceptDemoAccess")', "explicit reader consent to test");
  has(page, "test209DemoReady", "demo is rendered only when qualified");
  has(page, "0 TL denemeyi etkinleştir", "usable 0 TL test action");
  has(page, "gerçek bir satış veya ödeme olmadığını", "non-sale disclosure");
  has(library, "deneme-erisim", "reader receipt state");
  has(library, "completedDemo.id.slice", "non-order test reference");
  has(normal, "getVerifiedWorkSeller(work.id, transaction)", "real purchases still need seller verification");
  has(normal, "transaction.orderLegalSnapshot.create", "real order legal evidence preserved");
});


test("reader purchased library uses its dark shell without leaking commerce theme to other routes", () => {
  const page = source("src/app/kutuphanem/satin-aldiklarim/page.tsx");
  const css = source("src/features/commerce/commerce.module.css");

  has(page, "styles.readerPurchasedPage", "reader-only class applied");
  has(css, ".readerPurchasedPage .hero", "dark hero scoped to purchased library");
  has(css, "background: linear-gradient(112deg, #211c30", "dark header background");
  has(css, ".readerPurchasedPage .card {", "dark purchased-work card scoped");
  has(css, "background: linear-gradient(145deg, var(--purchased-surface-raised)", "no white purchased-work card");
  has(css, ".readerPurchasedPage .hero h1", "explicit legible title");
  has(css, ".readerPurchasedPage .card h2", "explicit legible work title");
  has(css, ".readerPurchasedPage .successNotice", "success notification restyled");
  has(css, "background: linear-gradient(120deg, #172b24", "no pale-green status banner");
  has(css, ".readerPurchasedPage .grid", "card grid scoped to route");
  has(css, ".readerPurchasedPage :is(.action, .secondaryAction, .quietAction):focus-visible", "keyboard focus retained");
  has(css, "@media (max-width: 720px)", "mobile responsive CSS present");
  has(page, "completedDemo", "valid trial success evidence preserved");
  has(page, "entitlement.order?.orderNo", "purchase history remains visible");
});


test("0 TL TEST209 cancellation is a confirmed, owned, repeatable promotion-only operation", () => {
  const demo = source("src/features/commerce/test209-demo-access.ts");
  const action = source("src/features/commerce/test209-demo-cancel-action.ts");
  const library = source("src/app/kutuphanem/satin-aldiklarim/page.tsx");
  const css = source("src/features/commerce/commerce.module.css");
  const order = source("src/app/hesabim/odeme-gecmisi/[orderNo]/page.tsx");
  const reading = source("src/features/commerce/access.ts");

  has(action, '"use server";', "explicit server action");
  has(action, 'getCurrentUser()', "authenticated reader required");
  has(action, 'isTest209DemoReader(user)', "QA account ownership required");
  has(action, 'formData.get("confirmCancel")', "second confirmation required");
  has(action, 'cancelTest209DemoAccess(user.id, id)', "user-owned cancellation");
  has(demo, "FOR UPDATE", "serialize grant/revoke per reader");
  has(demo, "TEST209_DEMO_WORK_ID", "fixed QA work id");
  has(demo, "TEST209_DEMO_SLUG", "fixed QA work slug");
  has(demo, 'readerId,', "reader ownership predicate");
  has(demo, 'source: "promotion"', "promotion only");
  has(demo, 'orderId: null', "never cancel purchase-linked right");
  has(demo, 'status: "revoked", revokedAt: new Date()', "revocation is recorded not deletion");
  has(demo, 'status: "active", revokedAt: null, grantedAt: new Date()', "repeat demo is possible");
  lacks(demo, "transaction.order.update", "no paid order mutation");
  lacks(demo, "transaction.payment.update", "no payment mutation");
  lacks(demo, "transaction.refund.create", "no refund mutation");
  has(reading, 'entitlement?.status === "active"', "revoked entitlements cannot bypass chapter lock");
  has(library, "0 TL deneme erişimini iptal et", "clear library cancel control");
  has(library, "İptali onayla", "explicit confirmed submit");
  has(library, 'query.durum === "deneme-iptal-edildi"', "visible confirmed cancellation");
  has(css, ".readerPurchasedPage .testCancelDetails", "dark scoped cancellation UI");
  has(order, "E-posta ile iptal / iade talebi gönder", "real order support route");
  has(order, "Siparişi kendiliğinden iptal etmez", "no fake refund claim");
});


test("reader library links to payment history and zero-TL TEST209 shows as a non-payment record", () => {
  const library = source("src/app/kutuphanem/satin-aldiklarim/page.tsx");
  const history = source("src/app/hesabim/odeme-gecmisi/page.tsx");
  const repository = source("src/features/commerce/reader-repository.ts");
  const css = source("src/features/commerce/commerce.module.css");
  has(library, 'href="/hesabim/odeme-gecmisi"', "library-to-history route");
  has(library, "Ödeme geçmişim", "visible library button");
  has(history, "listReaderZeroTlDemoActivity(profile.id)", "reader-owned demo records loaded");
  has(history, "listReaderPaymentHistory(profile.id)", "real orders still loaded");
  has(repository, "export async function listReaderZeroTlDemoActivity(readerId: string)", "separate demo read");
  has(repository, 'source: "promotion"', "only promotional grants");
  has(repository, "orderId: null", "no real-order contamination");
  has(repository, 'slug: "yeni-test209-30820c6a"', "exact TEST209 grant");
  has(repository, 'status: { in: ["active", "revoked"] }', "cancelled trials remain visible");
  has(history, "0 TL Deneme İşlemleri — Tahsilat Yok", "not described as real payments");
  has(history, "sipariş, ödeme,", "no fabricated commercial transaction");
  has(history, "Deneme No: TEST-", "test identifier kept separate from order number");
  has(history, "Gerçek Siparişler", "separate sale history");
  has(history, "Sipariş No: {order.orderNo}", "real order identity unchanged");
  has(history, "Sipariş ayrıntısı", "real order detail route maintained");
  has(history, "Kütüphaneme dön", "return navigation");
  has(css, ".readerPaymentHistoryPage .demoHistoryCard", "dark scoped demo styles");
  has(css, ".readerPurchasedPage .readerLibraryHeaderActions", "responsive header actions");
  lacks(history, "prisma.order.create", "no fake order created");
  lacks(repository, "order.create(", "history cannot create fake orders");
});


test("TEST209 0 TL demo appears in admin ops and author's QA overview, never as a paid financial record", () => {
  const admin = source("src/app/admin/odeme-sistemi/page.tsx");
  const orders = source("src/app/admin/odeme-sistemi/siparisler/page.tsx");
  const entitlements = source("src/app/admin/odeme-sistemi/erisim-haklari/page.tsx");
  const finance = source("src/features/commerce/finance-repository.ts");
  const writer = source("src/app/gelirler/page.tsx");
  const dayClose = source("src/features/commerce/day-close-repository.ts");

  has(admin, 'label: "TEST209 0 TL denemeler"', "admin separates test metrics");
  has(admin, 'source: "promotion"', "promotion-source filter");
  has(admin, "orderId: null", "no order linkage");
  has(admin, "status: { in: [\"active\", \"revoked\"] }", "current grant states");
  has(admin, "erisim-haklari?source=promotion", "drill down for the QA test");
  has(orders, "TEST209 0 TL erişim denemesi gerçek sipariş değildir.", "no fake sale assertion");
  has(orders, "erisim-haklari?source=promotion", "admin ops link");
  has(entitlements, "TEST-{entitlement.id.slice(0, 16).toUpperCase()}", "TEST reference instead of order");
  has(entitlements, "Gerçek sipariş numarası oluşturulmadı", "honest trial identity");
  has(finance, "export async function getWriterTest209DemoCounts(authorId: string)", "writer-bound count read");
  has(finance, 'source: "promotion"', "author QA read restricted to promotions");
  has(finance, "orderId: null", "author QA read excludes real orders");
  has(finance, 'slug: "yeni-test209-30820c6a"', "QA work only");
  has(finance, "authorId,", "author ownership enforcement");
  has(writer, "getWriterTest209DemoCounts(profile.id)", "authenticated writer source");
  has(writer, "Denemeden doğan kazanç", "clearly zero financial consequence");
  has(writer, "formatMoney(BigInt(0), finance.currency)", "no fake earnings");
  has(dayClose, "prisma.order.findMany", "day-close uses sales orders");
  lacks(dayClose, "prisma.workEntitlement.findMany", "promotions excluded from accounting close");
});


test("writer invoice status is self-declared, owner-scoped and does not create an order", () => {
  const schema = source("prisma/schema.prisma");
  const migration = source("prisma/migrations/20261026163000_author_billing_self_declaration/migration.sql");
  const action = source("src/features/commerce/writer-billing-actions.ts");
  const writerPage = source("src/app/satis-erisim/odeme-vergi-bilgileri/page.tsx");
  const form = source("src/app/satis-erisim/odeme-vergi-bilgileri/WriterBillingForm.tsx");
  const writerIndex = source("src/app/satis-erisim/page.tsx");
  const writerWork = source("src/app/satis-erisim/[workId]/page.tsx");
  const legacy = source("src/app/satis-erisim/satici-yetkileri/page.tsx");

  has(schema, "model AuthorBillingProfile {", "separate author biller record");
  has(schema, "authorId        String              @unique", "one billing record per writer");
  has(migration, "CREATE TABLE `AuthorBillingProfile`", "migration available");
  has(writerPage, "authorId: profile.id", "own billing data loaded");
  has(writerPage, "WriterBillingForm", "editable billing form displayed");
  has(form, 'name="invoiceStatus"', "two explicit status choices");
  has(form, 'value="invoicing"', "faturalı option");
  has(form, 'value="non_invoicing"', "faturasız option");
  for (const key of ['name="billingName"', 'name="taxIdentifier"', 'name="taxOffice"', 'name="billingAddress"']) {
    has(form, key, "invoice field present: " + key);
  }
  has(form, "{invoicing ? (", "invoice fields conditional");
  has(action, 'writer.role !== "writer"', "writer role enforced on server");
  has(action, "authorId: writer.id", "writer ownership of record");
  has(action, "authorBillingProfile.upsert", "profile persists across sessions");
  has(action, "taxVerified: false", "declaration does not impersonate verification");
  has(action, "billingName: detail?.data.billingName ?? null", "no-invoice clears old billing details");
  lacks(action, "workSalesAuthorization.create", "no writer sales authorization");
  lacks(action, "order.create", "no fake purchase");
  lacks(action, "financialLedger.create", "no financial transaction");
  lacks(action, "payment.create", "no payment");
  has(writerIndex, 'href="/satis-erisim/odeme-vergi-bilgileri"', "writer billing navigation");
  lacks(writerIndex, 'href="/satis-erisim/satici-yetkileri"', "seller rights removed from writer navigation");
  has(writerWork, 'href="/satis-erisim/odeme-vergi-bilgileri"', "per-work billing navigation");
  has(legacy, 'redirect("/satis-erisim/odeme-vergi-bilgileri")', "old writer URL redirects");
});

test("admin seller drafts and evidence reviews keep explicit four-stage scope", () => {
  const page = source("src/app/admin/odeme-sistemi/satici-yetkileri/page.tsx");
  const actions = source("src/features/commerce/seller-admin-actions.ts");
  const css = source("src/app/admin/odeme-sistemi/satici-yetkileri/seller-rights.module.css");
  for (const id of ["seller-draft", "seller-verification", "rights-draft", "sales-approval", "current-sellers"]) {
    has(page, 'id="' + id + '"', "admin review section " + id);
  }
  has(page, "registerLegalSellerDraftAction", "administrator seller draft");
  has(page, "registerWorkSalesRightsDraftAction", "administrator work rights draft");
  has(page, 'aria-label="Hukukî satıcı taslağı"', "seller legal identity form");
  has(page, 'aria-label="Eser satış yetkisi taslağı"', "work-specific evidence form");
  has(page, "verifiedParties.length === 0", "block rights draft until verified seller");
  has(page, "eligibleWorks.length === 0", "block rights draft without eligible work");
  has(actions, 'verificationStatus: "pending"', "seller draft is never auto-verified");
  has(actions, 'status: "pending"', "work rights draft is never auto-approved");
  has(page, 'styles.screenReaderOnly}>2. ', "admin identity verification label");
  has(page, 'styles.screenReaderOnly}>4. ', "admin sales rights approval label");
  lacks(page, "Yazarlar satıcı kimliği ve eser satış hakkı başvurularını", "obsolete writer sales rights instruction removed");
  has(page, "styles.formGrid", "two-column review controls");
  has(page, "styles.fieldWide", "long review evidence inputs");
  has(page, "styles.confirmLabel", "explicit administrator confirmation");
  has(css, "grid-template-columns: repeat(2, minmax(0, 1fr))", "desktop form grid");
  has(css, "grid-template-columns: minmax(0, 1fr)", "mobile form grid");
});


test("admin finance sees writer invoice declaration without treating it as verified tax review", () => {
  const admin = source("src/app/admin/finans-gelirler/yazar-vergi-inceleme/page.tsx");
  const writer = source("src/app/gelirler/page.tsx");
  const action = source("src/features/commerce/writer-billing-actions.ts");
  has(admin, "authorBillingProfile:", "admin tax review reads declaration");
  has(admin, "invoiceStatus: true", "only status in list");
  has(admin, "billingAddress: true", "billing address in selected record");
  has(admin, "Yazarın fatura beyanı — doğrulanmamış", "clear verification boundary");
  has(admin, "Haricî doğrulama gerekir", "external tax verification guard remains");
  has(admin, "recordAuthorTaxReviewAction", "separate manual finance review retained");
  has(admin, 'Beyan yok', "no declaration handled");
  has(admin, "Aşağıdaki bağımsız belge", "review independent of author's self report");
  has(writer, "prisma.authorBillingProfile.findUnique", "writer income shows own declaration");
  has(writer, "authorId: profile.id", "writer ownership restriction");
  has(writer, "Fatura durumum", "writer income status indicator");
  has(writer, 'href="/satis-erisim/odeme-vergi-bilgileri"', "writer can edit their billing info");
  has(writer, "Bu yalnız kendi beyanındır", "not automatically verified");
  lacks(action, "recordAuthorTaxReviewAction", "writer cannot attest own tax verification");
  lacks(action, "financialLedger.create", "author declaration does not cause ledger entries");
  lacks(action, "prisma.order.create", "author declaration cannot create orders");
});


test("0 TL role screens remain visible without a transaction or provider", () => {
  const admin = source("src/app/admin/finans-gelirler/siparis-mali-inceleme/page.tsx");
  const checkout = source("src/app/satinal/[slug]/page.tsx");
  const history = source("src/app/hesabim/odeme-gecmisi/page.tsx");
  const writer = source("src/app/satis-erisim/page.tsx");
  const writerEarnings = source("src/app/satis-erisim/kazanc-hesaplama/page.tsx");
  has(writerEarnings, 'data-commerce-zero-screen="writer-earnings"', "writer earnings 0 TL screen");
  has(writerEarnings, '(text ?? "0")', "writer preview 0 TL default");
  has(admin, 'data-commerce-zero-screen="admin"', "admin zero amount preview");
  has(admin, "Sipariş oluşturulmadı", "no fabricated order id");
  has(admin, "Finansal tahakkuk değil", "no synthetic commission");
  has(checkout, 'data-commerce-zero-screen="reader-checkout"', "reader zero checkout preparation");
  has(checkout, "checkoutConfigurationActive", "seller and terms remain gated");
  has(checkout, "completeZeroTotalCheckoutAction", "actual server-side zero checkout unchanged");
  has(history, 'data-commerce-zero-screen="reader-history"', "zero empty history screen");
  has(history, "ILK- ile başlayan sipariş numaran", "zero receipt expectation");
  has(writer, 'data-commerce-zero-screen="writer"', "writer zero amount workflow");
  lacks(writer, "financialLedger.create(", "writer dashboard never posts money");
  lacks(admin, "financialLedger.create(", "admin preview never posts money");
});
