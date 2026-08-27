import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

function assertContains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

function assertNotContains(text, fragment, label) {
  assert.equal(text.includes(fragment), false, `${label} must not contain ${JSON.stringify(fragment)}`);
}

test("SEO workbench exposes complete TR operations layers without creating a second write path", () => {
  const page = source("src/app/icerik/seo/page.tsx");
  const technical = source("src/app/icerik/seo/SeoTechnicalAudit.tsx");
  const homepage = source("src/app/icerik/seo/SeoHomepageAudit.tsx");
  const metadata = source("src/app/icerik/seo/SeoMetadataQualityAudit.tsx");
  const roleCards = source("src/app/icerik/seo/SeoRoleCardsAudit.tsx");

  assertContains(page, "SEO Operasyon Merkezi", "professional SEO workbench title");
  assertContains(page, "SEO kabul kapısı", "SEO acceptance gate");
  assertContains(page, "canonicalIsSafe", "page-level canonical host validation");
  assertContains(page, '"canonical-duplicate"', "duplicate canonical queue signal");
  assertContains(page, '"title-quality"', "title quality queue signal");
  assertContains(page, '"description-quality"', "description quality queue signal");
  assertContains(page, 'if (page.noIndex) return ["noindex"]', "intentional noindex separation");
  assertContains(page, 'key: "critical", label: "Kritik"', "critical work queue filter");
  assertContains(page, 'key: "quality", label: "Kalite"', "quality work queue filter");
  assertContains(page, 'id="metadata-kuyrugu"', "metadata operations queue anchor");
  assertContains(page, "“Hazır” durumu yalnız gerçek denetimler geçtiğinde verilir", "no fake ready state contract");

  assertContains(roleCards, "<SeoTechnicalAudit />", "technical SEO workbench surface");
  assertContains(roleCards, "<SeoHomepageAudit />", "homepage SEO integrity surface");
  assertContains(roleCards, "<SeoMetadataQualityAudit />", "metadata quality surface");
  assertContains(roleCards, 'id="teknik-seo"', "technical audit navigation anchor");
  assertContains(roleCards, 'id="ana-sayfa-seo"', "homepage audit navigation anchor");
  assertContains(roleCards, 'id="metadata-kalitesi"', "metadata audit navigation anchor");
  assertContains(roleCards, 'id="structured-data"', "structured data navigation anchor");
  assertContains(roleCards, 'id="rol-kartlari-seo"', "role cards navigation anchor");

  assertContains(technical, "status = 'published'", "published-only SEO inventory");
  assertContains(technical, "contentKey NOT LIKE 'legal:en:%'", "TR-only legal inventory");
  assertContains(technical, "contentKey NOT LIKE 'guide:en:%'", "TR-only guide inventory");
  assertContains(technical, "contentKey NOT LIKE 'page:en:%'", "TR-only generic page inventory");
  assertContains(technical, "canonicalIsSafe", "canonical host validation");
  assertContains(technical, "duplicateCanonical", "duplicate canonical diagnosis");
  assertContains(technical, "analyzeFooterNavigation", "canonical footer/internal-link analyzer reuse");
  assertContains(technical, "FOOTER_LIVE_KEY", "published footer source");
  assertContains(technical, 'href="/sitemap.xml"', "sitemap direct inspection action");
  assertContains(technical, 'href="/robots.txt"', "robots direct inspection action");
  assertContains(technical, 'href="/icerik/menuler"', "canonical internal-link correction action");

  assertContains(homepage, 'getPublishedHomepageState("tr")', "TR homepage published-state audit");
  assertContains(homepage, "safeCmsInternalHref", "homepage CTA safety contract");
  assertContains(homepage, 'href="/icerik/ana-sayfa"', "homepage canonical correction action");

  assertContains(metadata, "duplicateCount", "metadata duplicate diagnosis");
  assertContains(metadata, "page.seoTitle.trim().length < 25", "short title quality signal");
  assertContains(metadata, "page.seoTitle.trim().length > 65", "long title quality signal");
  assertContains(metadata, "page.seoDescription.trim().length < 70", "short description quality signal");
  assertContains(metadata, "page.seoDescription.trim().length > 170", "long description quality signal");
  assertContains(metadata, "Uzunluk eşikleri kalite rehberidir", "metadata threshold disclaimer");
  assertContains(metadata, "Structured Data · TR", "structured data operations surface");
  assertContains(metadata, 'label="WebSite"', "WebSite schema status");
  assertContains(metadata, 'label="Book"', "Book schema status");

  for (const text of [page, technical, homepage, metadata]) {
    assertNotContains(text, "INSERT INTO", "no SEO write SQL");
    assertNotContains(text, "UPDATE ContentPage", "no metadata mutation");
    assertNotContains(text, "saveSeo", "no second SEO save action");
  }
});

test("structured data is emitted in server HTML from verified site and work sources", () => {
  const layout = source("src/app/layout.tsx");
  const work = source("src/app/kitap/[slug]/page.tsx");

  assertContains(layout, '"@type": "WebSite"', "root WebSite schema");
  assertContains(layout, 'inLanguage: "tr-TR"', "TR WebSite language");
  assertContains(layout, 'type="application/ld+json"', "root schema script");
  assertContains(work, '"@type": "Book"', "public work Book schema");
  assertContains(work, 'type="application/ld+json"', "work schema script");
  assertNotContains(layout, "aggregateRating", "no invented site rating");
});

test("technical and metadata SEO audits fail closed when inventory cannot be read", () => {
  const page = source("src/app/icerik/seo/page.tsx");
  const technical = source("src/app/icerik/seo/SeoTechnicalAudit.tsx");
  const metadata = source("src/app/icerik/seo/SeoMetadataQualityAudit.tsx");

  assertContains(page, "kabul kapısı ve düzeltme kuyruğu fail-closed durduruldu", "SEO acceptance fail-closed message");
  assertContains(technical, "return null", "technical inventory read failure state");
  assertContains(technical, "yanlış bir temiz sonucu üretmiyor", "technical fail-closed user message");
  assertContains(technical, 'data-state="danger"', "technical fail-closed blocker state");
  assertContains(metadata, "Metadata kalite envanteri doğrulanamadı", "metadata fail-closed user message");
  assertContains(metadata, "Yanlış bir “kalite sorunu yok” sonucu üretilmiyor", "metadata no-fake-clean message");
});

test("legal sitemap output respects published noindex and fails closed on CMS read errors", () => {
  const sitemap = source("src/app/sitemap.ts");

  assertContains(sitemap, "contentKey LIKE 'legal:%'", "TR legal sitemap inventory");
  assertContains(sitemap, "contentKey NOT LIKE 'legal:en:%'", "EN legal exclusion");
  assertContains(sitemap, "const row = legalBySlug.get(path)", "legal CMS state lookup");
  assertContains(sitemap, "if (row?.noIndex) return []", "legal noindex sitemap exclusion");
  assertContains(sitemap, "return safeStaticEntries", "sitemap fail-closed fallback");
  assertNotContains(sitemap, '`${baseUrl}/en`', "no EN sitemap output");
});
