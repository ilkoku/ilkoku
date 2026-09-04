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

test("global public routes have file-based social image fallbacks", () => {
  const openGraph = source("src/app/opengraph-image.tsx");
  const twitter = source("src/app/twitter-image.tsx");

  assertContains(openGraph, 'import { ImageResponse } from "next/og"', "Open Graph image response");
  assertContains(openGraph, "width: 1200", "Open Graph width");
  assertContains(openGraph, "height: 630", "Open Graph height");
  assertContains(openGraph, 'contentType = "image/png"', "Open Graph content type");
  assertContains(openGraph, "İlk cümle, ilk okurun, ilk adımın.", "Open Graph brand message");
  assertContains(twitter, 'from "./opengraph-image"', "Twitter reuses canonical social artwork");
});

test("sitemap keeps all public trust routes synchronized with CMS indexability and update time", () => {
  const sitemap = source("src/app/sitemap.ts");

  for (const route of [
    "/nasil-calisir",
    "/editoryal-standartlar",
    "/icerik-ve-yas-politikasi",
    "/topluluk-kurallari",
    "/telif-bildirimi",
    "/yazarlar-icin",
    "/editorler-icin",
    "/yayinevleri-icin",
  ]) {
    assertContains(sitemap, route, `${route} sitemap route`);
  }

  assertNotContains(sitemap, "contentKey LIKE 'guide:%'", "retired guide sitemap inventory");
  assertNotContains(sitemap, "foundationalGuides", "retired foundational guide sitemap source");
  assertContains(sitemap, "contentKey LIKE 'page:tr:%'", "TR generic page sitemap coverage");
  assertContains(sitemap, "SELECT slug, noIndex, updatedAt", "CMS sitemap reads indexability and freshness together");
  assertContains(sitemap, "if (row?.noIndex)", "static public CMS noindex exclusion");
  assertContains(sitemap, "lastModified: row?.updatedAt ?? new Date(page.updatedAt)", "CMS update time overrides bundled public freshness");
  assertContains(sitemap, ".filter((page) => !page.noIndex && !staticCmsPageSlugs.has(page.slug))", "dynamic CMS noindex exclusion");
  assertContains(sitemap, "status = 'published'", "published-only CMS sitemap boundary");
  assertNotContains(sitemap, '`${baseUrl}/en`', "no EN static sitemap URL");
  assertContains(sitemap, "contentKey NOT LIKE 'legal:en:%'", "EN legal sitemap exclusion");
  assertNotContains(sitemap, "page:en:%", "no EN generic sitemap inventory");
});

test("new public discovery and help surfaces expose canonical social metadata", () => {
  for (const [path, canonical] of [
    ["src/app/yardim/page.tsx", "/yardim"],
    ["src/app/editorler/page.tsx", "/editorler"],
    ["src/app/yazarlar/page.tsx", "/yazarlar"],
    ["src/app/turler/page.tsx", "/turler"],
    ["src/app/eserler/yeni/page.tsx", "/eserler/yeni"],
    ["src/app/eserler/guncellenen/page.tsx", "/eserler/guncellenen"],
  ]) {
    const page = source(path);
    assertContains(page, `canonical: "${canonical}"`, `${canonical} canonical`);
    assertContains(page, "openGraph:", `${canonical} Open Graph metadata`);
    assertContains(page, "twitter:", `${canonical} Twitter metadata`);
    assertContains(page, 'const socialImage = "/opengraph-image"', `${canonical} social image fallback`);
  }

  const works = source("src/app/eserler/page.tsx");
  const help = source("src/app/yardim/page.tsx");
  const editors = source("src/app/editorler/page.tsx");
  assertContains(works, 'canonical: "/eserler"', "work library canonical");
  assertContains(works, "robots:", "work library robots metadata");
  assertContains(works, "openGraph:", "work library Open Graph metadata");
  assertContains(works, "twitter:", "work library Twitter metadata");
  assertContains(works, '"@type": "CollectionPage"', "work library structured data");
  assertContains(help, '"@type": "FAQPage"', "help FAQ structured data");
  assertContains(help, '"@type": "BreadcrumbList"', "help breadcrumb structured data");
  assertContains(editors, '"@type": "CollectionPage"', "editor directory structured data");
  assertContains(editors, '"@type": "BreadcrumbList"', "editor directory breadcrumb structured data");
});

test("legal pages inherit canonical OG Twitter and language-alternate metadata", () => {
  const legal = source("src/app/yasal/[slug]/page.tsx");
  const helper = source("src/lib/public-page-metadata.ts");

  assertContains(legal, 'createPublicPageMetadata({', "legal shared public metadata helper");
  assertContains(legal, '"tr-TR": `/yasal/${slug}`', "legal TR alternate");
  assertContains(legal, '"x-default": `/yasal/${slug}`', "legal x-default alternate");
  assertContains(helper, "languages?: Record<string, string> | null", "public metadata language alternate contract");
  assertContains(helper, "images: [{ url: socialImage }]", "public Open Graph image fallback");
  assertContains(helper, "twitter:", "public Twitter metadata");
  assertContains(helper, 'card: "summary_large_image"', "public Twitter large image card");
  assertContains(helper, "images: [socialImage]", "public Twitter image fallback");
});

test("dynamic public work author and genre routes keep canonical query noindex and structured-data contracts", () => {
  const book = source("src/app/kitap/[slug]/page.tsx");
  const author = source("src/app/yazarlar/[publicId]/page.tsx");
  const genre = source("src/app/turler/[slug]/page.tsx");

  assertContains(book, "const canonical = `/kitap/${work.slug}`", "book self canonical");
  assertContains(book, "index: !query.from", "book return-path noindex");
  assertContains(book, "twitter:", "book Twitter metadata");
  assertContains(book, '"@type": "Book"', "book schema");
  assertContains(book, '"@type": "BreadcrumbList"', "book breadcrumb schema");

  assertContains(author, "const canonical = `/yazarlar/${author.publicId}`", "author self canonical");
  assertContains(author, "index: !query.from", "author return-path noindex");
  assertContains(author, "twitter:", "author Twitter metadata");
  assertContains(author, '"@type": "ProfilePage"', "author profile schema");
  assertContains(author, '"@type": "BreadcrumbList"', "author breadcrumb schema");

  assertContains(genre, "const canonical = `/turler/${genre.slug}`", "genre self canonical");
  assertContains(genre, "index: page === 1 && !query.from", "genre pagination and return-path noindex");
  assertContains(genre, "twitter:", "genre Twitter metadata");
  assertContains(genre, '"@type": "CollectionPage"', "genre collection schema");
  assertContains(genre, '"@type": "BreadcrumbList"', "genre breadcrumb schema");
});

test("SEO center uses one core route catalog and verifies exact live coverage", () => {
  const technical = source("src/app/icerik/seo/SeoTechnicalAudit.tsx");
  const metadata = source("src/app/icerik/seo/SeoMetadataQualityAudit.tsx");
  const routes = source("src/lib/public-seo-routes.ts");
  const navigation = source("src/lib/public-site-navigation.ts");
  const live = source("src/lib/seo-live-verification.ts");

  for (const route of [
    '"/eserler"',
    '"/eserler/yeni"',
    '"/eserler/guncellenen"',
    '"/yazarlar"',
    '"/turler"',
    '"/yardim"',
    '"/editorler"',
    '"/iletisim"',
  ]) {
    assertContains(routes, route, `canonical code-owned SEO route ${route}`);
  }

  assertContains(routes, "publicPlatformLinks", "platform routes feed SEO catalog");
  assertContains(routes, "publicTrustLinks", "trust routes feed SEO catalog");
  assertContains(routes, "publicLegalLinks", "legal routes feed SEO catalog");
  assertContains(navigation, 'href: "/hakkimizda"', "about route in canonical public navigation");
  assertContains(navigation, 'href: "/yasal/kullanim-sartlari"', "legal routes in canonical public navigation");
  assertContains(technical, "publicCodeOwnedIndexRoutes", "technical SEO consumes canonical code-owned routes");
  assertContains(technical, "getPublicAuthors()", "technical SEO public author inventory");
  assertContains(technical, "getPublicGenres()", "technical SEO public genre inventory");
  assertContains(technical, 'not: "adult_18"', "technical SEO adult work exclusion");
  assertContains(technical, 'visibility: "public"', "technical SEO discovery visibility boundary");
  assertContains(technical, "isBlockedPublicWorkSlug", "technical SEO blocked work slug exclusion");

  assertContains(live, "publicDefaultCoreSeoRoutes", "live social audit consumes complete core route catalog");
  assertContains(live, "coreSitemapExpectation", "live sitemap uses CMS-aware expected routes");
  assertContains(live, "missingCoreRoutes", "live sitemap verifies required route presence");
  assertContains(live, "zorunlu çekirdek rota eksik", "live sitemap reports missing required routes");
  assertContains(live, "published CMS noindex envanteri okunamadığı için", "live sitemap fails closed when CMS indexability is unreadable");
  assertNotContains(live, "minimumCoreSitemapUrls", "live sitemap must not pass on a magic URL count alone");

  for (const schemaType of ["CollectionPage", "ProfilePage", "FAQPage", "BreadcrumbList"]) {
    assertContains(metadata, schemaType, `structured-data inventory ${schemaType}`);
  }
  assertContains(metadata, 'href="/eserler"', "structured-data discovery link");
  assertNotContains(metadata, 'href="/kesfet"', "retired discovery link");
});

test("SEO center and audit API stay Turkish-only", () => {
  const page = source("src/app/icerik/seo/page.tsx");
  const route = source("src/app/api/cms-seo-audit/route.ts");
  const roleCards = source("src/app/icerik/seo/SeoRoleCardsAudit.tsx");

  assertContains(page, "SEO kabul kapısı · TR", "SEO TR acceptance surface");
  assertContains(page, "contentKey NOT LIKE 'legal:en:%'", "SEO excludes EN legal");
  assertContains(page, "contentKey NOT LIKE 'guide:en:%'", "SEO excludes EN guides");
  assertContains(page, "contentKey NOT LIKE 'page:en:%'", "SEO excludes EN generic pages");
  assertContains(route, "contentKey NOT LIKE 'legal:en:%'", "audit API excludes EN legal");
  assertContains(route, "contentKey NOT LIKE 'guide:en:%'", "audit API excludes EN guides");
  assertContains(route, "contentKey NOT LIKE 'page:en:%'", "audit API excludes EN generic pages");
  assertContains(route, "WHERE status = 'published'", "audit API published-only boundary");
  assertContains(roleCards, 'getPublishedRoleCardsState("tr")', "role card SEO reads TR state");
  assertNotContains(roleCards, 'getPublishedRoleCardsState("en")', "role card SEO ignores EN state");
  assertNotContains(roleCards, "TR / EN", "role card SEO has no language parity work");
});
