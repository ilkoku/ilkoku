// Independent, offline acceptance of the installed Power-SEO package contracts.
// These tests do NOT change SEO data, call external providers, use credentials,
// render metadata into the real document, or send analytics events.
import test from "node:test";
import assert from "node:assert/strict";

const origin = "https://ilkoku.com";
const modules = [
  "core", "content-analysis", "audit", "links", "images", "preview",
  "schema", "sitemap", "meta", "react", "readability", "redirects",
  "analytics", "ai", "tracking", "search-console", "integrations",
];
assert.equal(new Set(modules).size, 17, "module inventory must be exactly 17 unique packages");

test("Power-SEO / Core — actual title validation", async () => {
  const { validateTitle } = await import("@power-seo/core");
  const title = "İlkOku | Dijital Yazar Platformu";
  const result = validateTitle(title);
  assert.equal(result.charCount, title.length);
  assert.equal(typeof result.valid, "boolean");
});
test("Power-SEO / Content Analysis — actual HTML analysis", async () => {
  const { analyzeContent } = await import("@power-seo/content-analysis");
  const result = analyzeContent({
    content: "<main><h1>İlkOku Yazar Rehberi</h1><p>Yazarlar eserlerini hazırlayıp düzenler.</p></main>",
    title: "İlkOku Yazar Rehberi",
    metaDescription: "Yazarlar için dijital yazma ve düzenleme adımları.",
  });
  assert.ok(result && typeof result === "object");
});
test("Power-SEO / Audit — actual technical page scoring", async () => {
  const { auditPage } = await import("@power-seo/audit");
  const result = auditPage({
    url: origin + "/nasil-calisir", title: "İlkOku Nasıl Çalışır",
    metaDescription: "İlkOku süreçlerini ve okuma adımlarını inceleyin.",
    canonical: origin + "/nasil-calisir", headings: ["h1:İlkOku Nasıl Çalışır"],
    statusCode: 200,
  });
  assert.ok(Number.isFinite(result.score));
  assert.ok(Array.isArray(result.rules));
});
test("Power-SEO / Links — actual directed graph", async () => {
  const { buildLinkGraph, analyzeLinkEquity } = await import("@power-seo/links");
  const graph = buildLinkGraph([
    { url: origin + "/", links: [origin + "/nasil-calisir"] },
    { url: origin + "/nasil-calisir", links: [origin + "/"] },
  ]);
  assert.equal(graph.totalLinks, 2);
  assert.equal(graph.nodes.get(origin + "/")?.outboundCount, 1);
  assert.ok(Array.isArray(analyzeLinkEquity(graph)));
});
test("Power-SEO / Images — actual alt review", async () => {
  const { analyzeAltText } = await import("@power-seo/images");
  const result = analyzeAltText([{ src: origin + "/assets/cover.png", alt: "Kitap kapağı" }]);
  assert.ok(result && Array.isArray(result.issues));
});
test("Power-SEO / Preview — actual SERP preview", async () => {
  const { generateSerpPreview } = await import("@power-seo/preview");
  const result = generateSerpPreview({
    title: "İlkOku Nasıl Çalışır", description: "Yazar ve okurlar için İlkOku.",
    url: origin + "/nasil-calisir", siteTitle: "İlkOku",
  });
  assert.ok(result && typeof result === "object");
});
test("Power-SEO / Schema — malformed Article rejected", async () => {
  const { validateSchema } = await import("@power-seo/schema");
  const result = validateSchema({ "@type": "Article" });
  assert.equal(result.valid, false);
  assert.ok(Array.isArray(result.issues));
});
test("Power-SEO / Sitemap — valid and invalid URLs distinguished", async () => {
  const { validateSitemapUrl } = await import("@power-seo/sitemap");
  assert.equal(validateSitemapUrl({ loc: origin + "/" }).valid, true);
  assert.equal(validateSitemapUrl({ loc: "not-a-url" }).valid, false);
});
test("Power-SEO / Meta — draft generated without publication", async () => {
  const { createMetadata } = await import("@power-seo/meta");
  const m = createMetadata({ title: "İlkOku Rehberi", canonical: origin + "/nasil-calisir" });
  assert.equal(m.title, "İlkOku Rehberi");
  assert.equal(m.alternates?.canonical, origin + "/nasil-calisir");
});
test("Power-SEO / React — isolated tag component only", async () => {
  const { renderMetaTags } = await import("@power-seo/react");
  const fragment = renderMetaTags([{ name: "robots", content: "noindex, nofollow" }]);
  assert.ok(fragment, "React elements generated without mounting to document head");
});
test("Power-SEO / Readability — English diagnostic, not Turkish score", async () => {
  const { analyzeReadability } = await import("@power-seo/readability");
  const result = analyzeReadability({
    content: "<p>The writer reviews the story. The reader enjoys the finished article.</p>",
  });
  assert.ok(Number.isFinite(result.score));
});
test("Power-SEO / Redirects — unsafe destination rejected", async () => {
  const { isDestinationSafe, matchExact } = await import("@power-seo/redirects");
  assert.equal(isDestinationSafe("/nasil-calisir", "javascript:alert(1)"), false);
  assert.equal(matchExact("/nasil-calisir", "/nasil-calisir"), true);
});
test("Power-SEO / Analytics — offline empty dashboard", async () => {
  const { buildDashboardData } = await import("@power-seo/analytics");
  const result = buildDashboardData({});
  assert.equal(result.overview.totalPages, 0);
});
test("Power-SEO / AI — draft prompts only; zero model calls", async () => {
  const { buildTitlePrompt, buildMetaDescriptionPrompt } = await import("@power-seo/ai");
  const title = buildTitlePrompt({ content: "Türkçe öykü yazma rehberi", tone: "Turkish" });
  const desc = buildMetaDescriptionPrompt({ title: "Öykü Rehberi", content: "Yazma rehberi" });
  assert.match(title.user, /öykü/u);
  assert.match(desc.user, /Öykü Rehberi/u);
});
test("Power-SEO / Tracking — deny-by-default without real GA4", async () => {
  const { createConsentManager, buildGA4Script } = await import("@power-seo/tracking");
  const consent = createConsentManager();
  assert.equal(consent.isGranted("analytics"), false);
  assert.equal(consent.isGranted("necessary"), true);
  const scripts = buildGA4Script({ measurementId: "G-TESTONLY", consentModeV2: true });
  assert.ok(scripts.some((s) => s.consentCategory === "analytics" && !s.shouldLoad(consent.getState())));
});
test("Power-SEO / Search Console — local interface only; no Google request", async () => {
  const pkg = await import("@power-seo/search-console");
  assert.equal(typeof pkg.createGSCClient, "function");
  assert.equal(typeof pkg.createTokenManager, "function");
  assert.equal(typeof pkg.querySearchAnalytics, "function");
});
test("Power-SEO / Integrations — local interface only; no paid request", async () => {
  const pkg = await import("@power-seo/integrations");
  assert.equal(typeof pkg.createAhrefsClient, "function");
  assert.equal(typeof pkg.createSemrushClient, "function");
});
