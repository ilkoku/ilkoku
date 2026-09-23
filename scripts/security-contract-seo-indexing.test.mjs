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

test("global public routes share one canonical SEO and social brand identity", () => {
  const brand = source("src/lib/public-brand.ts");
  const homepage = source("src/app/page.tsx");
  const layout = source("src/app/layout.tsx");
  const openGraph = source("src/app/opengraph-image.tsx");
  const twitter = source("src/app/twitter-image.tsx");
  const exactTitle = "İlkOku | Dijital Yazar Platformu – İlk cümle, ilk adım";

  assertContains(brand, `publicBrandTitle = "${exactTitle}"`, "canonical homepage/social title");
  assertContains(brand, 'publicBrandPositioning = "Dijital Yazar Platformu"', "brand positioning");
  assertContains(brand, 'publicBrandShortSlogan = "İlk cümle, ilk adım"', "short social slogan");
  assertContains(brand, 'publicBrandEditorialSlogan = "İlk cümle, ilk okurun, ilk adımın."', "editorial slogan remains distinct");

  assertContains(homepage, "const homeTitle = publicBrandTitle", "homepage title consumes canonical brand title");
  assertContains(homepage, "const homeSocialImage = publicBrandSocialImage", "homepage social artwork consumes canonical brand image");
  assertContains(homepage, "title: homeTitle", "homepage Open Graph/Twitter title source");
  assertContains(layout, "title: publicBrandTitle", "global metadata default title");
  assertContains(layout, "title: publicBrandTitle", "global Open Graph/Twitter title source");
  assertContains(layout, "images: [{ url: publicBrandSocialImage", "global Open Graph image");
  assertContains(layout, "images: [publicBrandSocialImage]", "global Twitter image");

  assertContains(openGraph, 'import { ImageResponse } from "next/og"', "Open Graph image response");
  assertContains(openGraph, "width: 1200", "Open Graph width");
  assertContains(openGraph, "height: 630", "Open Graph height");
  assertContains(openGraph, 'contentType = "image/png"', "Open Graph content type");
  assertContains(openGraph, "publicBrandPositioning", "Open Graph positioning");
  assertContains(openGraph, "publicBrandShortSlogan", "Open Graph short slogan");
  assertContains(openGraph, "publicBrandDescription", "Open Graph description");
  assertContains(twitter, 'from "./opengraph-image"', "Twitter reuses canonical social artwork");
});

test("robots isolates private content management without blocking the public content policy route", () => {
  const robots = source("src/app/robots.ts");
  const liveSmoke = source(".github/workflows/seo-indexability-smoke.yml");

  assertNotContains(robots, '          "/icerik",', "broad private content robots prefix");
  assertContains(robots, '          "/icerik$",', "exact private content root robots rule");
  assertContains(robots, '          "/icerik/",', "private content descendant robots rule");
  assertContains(liveSmoke, "Disallow: /icerik$", "live exact private content robots guard");
  assertContains(liveSmoke, "Disallow: /icerik/", "live private content descendant robots guard");
  assertContains(liveSmoke, "broad /icerik robots prefix blocks public content policy", "live broad prefix regression message");
});

test("sitemap keeps public trust and legal routes always indexable while preserving CMS noindex elsewhere", () => {
  const sitemap = source("src/app/sitemap.ts");
  const publicStore = source("src/lib/cms-public-page-store.ts");
  const legalStore = source("src/lib/cms-legal-public-store.ts");

  for (const route of [
    "/hakkimizda",
    "/nasil-calisir",
    "/editoryal-standartlar",
    "/icerik-ve-yas-politikasi",
    "/topluluk-kurallari",
    "/telif-bildirimi",
    "/yazarlar-icin",
    "/editorler-icin",
    "/yayinevleri-icin",
    "/yardim",
    "/iletisim",
    "/site-haritasi",
  ]) {
    assertContains(sitemap, route, `${route} sitemap route`);
  }

  for (const slug of [
    "hakkimizda",
    "nasil-calisir",
    "yazarlar-icin",
    "editorler-icin",
    "yayinevleri-icin",
    "editoryal-standartlar",
    "icerik-ve-yas-politikasi",
    "topluluk-kurallari",
    "telif-bildirimi",
  ]) {
    assertContains(publicStore, `"${slug}"`, `${slug} always-index public trust policy`);
  }

  for (const slug of [
    "kullanim-sartlari",
    "gizlilik-politikasi",
    "kvkk",
    "cerez-politikasi",
    "telif-hakki-politikasi",
  ]) {
    assertContains(sitemap, `"${slug}"`, `${slug} legal sitemap inventory`);
    assertContains(legalStore, `"${slug}"`, `${slug} always-index legal policy`);
  }

  assertContains(sitemap, 'url: `${baseUrl}/yasal/${slug}`', "legal sitemap URL template");
  assertContains(publicStore, "const noIndex = alwaysIndexPublicTrustSlugs.has(slugPart) ? false : row.noIndex", "public trust CMS noindex override");
  assertContains(legalStore, 'locale === "tr" && alwaysIndexTurkishLegalSlugs.has(definition.slug)', "Turkish legal CMS noindex override");
  assertNotContains(sitemap, "if (row?.noIndex)", "code-owned public trust and legal sitemap exclusion");
  assertNotContains(sitemap, "contentKey LIKE 'guide:%'", "retired guide sitemap inventory");
  assertNotContains(sitemap, "foundationalGuides", "retired foundational guide sitemap source");
  assertContains(sitemap, "contentKey LIKE 'page:tr:%'", "TR generic page sitemap coverage");
  assertContains(sitemap, "SELECT slug, noIndex, updatedAt", "CMS sitemap reads indexability and freshness together");
  assertContains(sitemap, "lastModified: row?.updatedAt ?? new Date(page.updatedAt)", "CMS update time overrides bundled public freshness");
  assertContains(sitemap, ".filter((page) => !page.noIndex && !staticCmsPageSlugs.has(page.slug))", "dynamic CMS noindex exclusion");
  assertContains(sitemap, "status = 'published'", "published-only CMS sitemap boundary");
  assertNotContains(sitemap, '`${baseUrl}/en`', "no EN static sitemap URL");
  assertContains(sitemap, "contentKey NOT LIKE 'legal:en:%'", "EN legal sitemap exclusion");
  assertNotContains(sitemap, "page:en:%", "no EN generic sitemap inventory");
  assertContains(sitemap, 'url: \`${baseUrl}/eserler\`', "active work directory sitemap route");
  assertContains(sitemap, 'url: \`${baseUrl}/yazarlar\`', "active author directory sitemap route");
  assertContains(sitemap, 'url: \`${baseUrl}/turler\`', "active genre directory sitemap route");
  assertContains(sitemap, "authorEntries", "dynamic public author sitemap entries");
  assertContains(sitemap, "genreEntries", "dynamic public genre sitemap entries");
});

test("active public help surfaces expose canonical social metadata", () => {
  for (const [path, canonical] of [
    ["src/app/yardim/page.tsx", "/yardim"],
    ["src/app/editorler/page.tsx", "/editorler"],
  ]) {
    const page = source(path);
    assertContains(page, `canonical: "${canonical}"`, `${canonical} canonical`);
    assertContains(page, "openGraph:", `${canonical} Open Graph metadata`);
    assertContains(page, "twitter:", `${canonical} Twitter metadata`);
    assertContains(page, 'const socialImage = "/opengraph-image"', `${canonical} social image fallback`);
  }

  const help = source("src/app/yardim/page.tsx");
  const editors = source("src/app/editorler/page.tsx");
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

test("public HTML site map exposes the complete crawl discovery graph", () => {
  const page = source("src/app/site-haritasi/page.tsx");
  const sitemap = source("src/app/sitemap.ts");
  const navigation = source("src/lib/public-site-navigation.ts");
  const indexNow = source(".github/workflows/indexnow-submit.yml");
  const smoke = source(".github/workflows/production-smoke.yml");

  assertContains(page, 'alternates: { canonical: "/site-haritasi" }', "site map self canonical");
  assertContains(page, "robots: { index: true, follow: true }", "site map index/follow");
  assertContains(page, "SITE_MAP_PAGES", "code-owned public route inventory");
  assertContains(page, "loadPublishedCmsSiteMapPages()", "published CMS discovery links");
  assertContains(page, "prisma.work.findMany", "published public work discovery links");
  assertContains(page, "isSearchIndexExcludedPublicWorkSlug", "public work search safety exclusion");
  assertContains(page, "publicLegalLinks", "legal discovery links");
  assertContains(navigation, '{ href: "/site-haritasi", label: "Site Haritası" }', "site map footer/support link");
  assertContains(sitemap, 'url: `${baseUrl}/site-haritasi`', "XML sitemap includes HTML site map");

  for (const cohort of [
    "https://ilkoku.com/site-haritasi",
    "https://ilkoku.com/yazarlar-icin/kurgu/roman",
    "https://ilkoku.com/okurlar-icin/okumaya-baslama",
    "https://ilkoku.com/editorler-icin/egitim/editorluge-baslama",
  ]) {
    assertContains(indexNow, cohort, `IndexNow waits for live cohort ${cohort}`);
    assertContains(smoke, cohort, `production smoke verifies live cohort ${cohort}`);
  }
});

test("dynamic public work route keeps canonical query noindex and structured-data contracts", () => {
  const book = source("src/app/kitap/[slug]/page.tsx");

  assertContains(book, "const canonical = `/kitap/${work.slug}`", "book self canonical");
  assertContains(book, "index: !query.from", "book return-path noindex");
  assertContains(book, "twitter:", "book Twitter metadata");
  assertContains(book, '"@type": "Book"', "book schema");
  assertContains(book, '"@type": "BreadcrumbList"', "book breadcrumb schema");
  assertContains(book, 'name: "Ana Sayfa"', "book public breadcrumb root");
  assertNotContains(book, "/eserler", "retired work directory route");
  assertNotContains(book, "/yazarlar/", "retired public author route");
});
test("SEO center uses one core route catalog and verifies exact live coverage", () => {
  const technical = source("src/app/icerik/seo/SeoTechnicalAudit.tsx");
  const metadata = source("src/app/icerik/seo/SeoMetadataQualityAudit.tsx");
  const routes = source("src/lib/public-seo-routes.ts");
  const navigation = source("src/lib/public-site-navigation.ts");
  const live = source("src/lib/seo-live-verification.ts");

  for (const route of [
    '"/yardim"',
    '"/editorler"',
    '"/iletisim"',
    '"/site-haritasi"',
  ]) {
    assertContains(routes, route, `canonical code-owned SEO route ${route}`);
  }

  assertContains(routes, "publicPlatformLinks", "platform routes feed SEO catalog");
  assertContains(routes, "publicTrustLinks", "trust routes feed SEO catalog");
  assertContains(routes, "publicLegalLinks", "legal routes feed SEO catalog");
  assertContains(navigation, 'href: "/hakkimizda"', "about route in canonical public navigation");
  assertContains(navigation, 'href: "/yasal/kullanim-sartlari"', "legal routes in canonical public navigation");
  assertContains(technical, "publicCodeOwnedIndexRoutes", "technical SEO consumes canonical code-owned routes");
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
  assertContains(metadata, 'href="/editorler"', "active structured-data collection link");
  assertNotContains(metadata, 'href="/kesfet"', "member discovery route is not a public SEO action");
  for (const discovery of ['"/eserler"', '"/yazarlar"', '"/turler"']) {
    assertContains(navigation, discovery, `active public discovery navigation route ${discovery}`);
  }
  assertContains(routes, "publicDiscoveryLinks", "active public discovery feeds core SEO route catalog");
});

test("SEO center and audit API stay Turkish-only", () => {
  const page = source("src/app/icerik/seo/page.tsx");
  const route = source("src/app/api/cms-seo-audit/route.ts");
  const roleCards = source("src/app/icerik/seo/SeoRoleCardsAudit.tsx");

  assertContains(page, 'toLocaleLowerCase("tr-TR")', "SEO Turkish search normalization");
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
