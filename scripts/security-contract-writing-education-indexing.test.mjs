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
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);
}

function readWritingInventory() {
  const genresSource = source("src/lib/genres.ts");
  const hubsSource = source("src/lib/writing-category-hubs.ts");

  const genres = [...genresSource.matchAll(
    /\{ slug: "([^"]+)", label: "[^"]+", category: "([^"]+)" \}/g,
  )].map((match) => ({ slug: match[1], category: match[2] }));

  const hubs = [...hubsSource.matchAll(
    /category: "([^"]+)",\s+slug: "([^"]+)",\s+href: "([^"]+)"/g,
  )].map((match) => ({ category: match[1], slug: match[2], href: match[3] }));

  return { genres, hubs };
}

test("homepage and all writing education routes stay canonical indexable and sitemap-owned", () => {
  const homepage = source("src/app/page.tsx");
  const sitemap = source("src/lib/seo/sitemap-data.ts");
  const { genres, hubs } = readWritingInventory();

  assert.equal(hubs.length, 7, "writing category inventory must stay at 7 hubs");
  assert.equal(genres.length, 85, "writing genre inventory must stay at 85 genres");

  assertContains(homepage, 'canonical: "https://ilkoku.com/"', "homepage self canonical");
  assertContains(homepage, "robots: { index: true, follow: true }", "homepage index/follow");
  assertContains(sitemap, 'url: `${baseUrl}/`', "homepage sitemap entry");
  assertContains(sitemap, "priority: 1", "homepage sitemap priority");

  assertContains(sitemap, 'import { GENRES } from "@/lib/genres"', "genre sitemap inventory source");
  assertContains(sitemap, 'import { WRITING_CATEGORY_HUBS } from "@/lib/writing-category-hubs"', "category sitemap inventory source");
  assertContains(sitemap, "WRITING_CATEGORY_HUBS.map((hub)", "category sitemap generation");
  assertContains(sitemap, "const writingGenreHrefs = GENRES.map((genre)", "genre sitemap generation");
  assertContains(sitemap, "...writingEducationEntries", "writing education static sitemap inclusion");
  assertContains(sitemap, "...writingGenreHrefs", "writing genre CMS duplicate guard");
  assertContains(sitemap, "...WRITING_CATEGORY_HUBS.map((hub) => hub.href)", "writing category CMS duplicate guard");

  const hrefByCategory = new Map(hubs.map((hub) => [hub.category, hub.href]));

  for (const hub of hubs) {
    const page = source(`src/app${hub.href}/page.tsx`);
    assertContains(page, `canonical: "https://ilkoku.com${hub.href}"`, `${hub.href} self canonical`);
    assertContains(page, "robots: { index: true, follow: true }", `${hub.href} index/follow`);
  }

  const informational = source("src/app/yazarlar-icin/bilgilendirici/[slug]/page.tsx");
  assertContains(
    informational,
    'alternates: { canonical: `https://ilkoku.com/yazarlar-icin/bilgilendirici/${slug}` }',
    "informational guide self canonical",
  );
  assertContains(informational, "robots: { index: true, follow: true }", "informational guides index/follow");
  assertContains(
    informational,
    'return { title: "Eğitim bulunamadı | İlkOku", robots: { index: false, follow: false } };',
    "invalid informational slug remains noindex",
  );

  for (const genre of genres) {
    const categoryHref = hrefByCategory.get(genre.category);
    assert.ok(categoryHref, `missing category href for ${genre.category}`);

    if (genre.category === "Bilgilendirici") continue;

    const canonical = `${categoryHref}/${genre.slug}`;
    const page = source(`src/app${canonical}/page.tsx`);

    if (canonical === "/yazarlar-icin/kurgu/roman") {
      assertContains(page, 'createPublicPageMetadata({', `${canonical} shared metadata contract`);
      assertContains(page, 'const canonical = "/yazarlar-icin/kurgu/roman"', `${canonical} canonical source`);
      continue;
    }

    assertContains(page, `canonical: "https://ilkoku.com${canonical}"`, `${canonical} self canonical`);
    assertContains(page, "robots: { index: true, follow: true }", `${canonical} index/follow`);
  }
});


test("education sitemap lastmod uses only truthful published CMS timestamps", () => {
  const sitemap = source("src/lib/seo/sitemap-data.ts");

  assertContains(sitemap, "type EducationFreshnessRow", "education freshness row contract");
  assertContains(sitemap, "'education_guide'", "writing education freshness namespace");
  assertContains(sitemap, "'reader_education_guide'", "reader education freshness namespace");
  assertContains(sitemap, "'editor_education_guide'", "editor visual freshness namespace");
  assertContains(sitemap, "'editor_education_text'", "editor text freshness namespace");
  assertContains(sitemap, "AND status = 'published'", "published-only education freshness");
  assertContains(sitemap, "educationLastModifiedByUrl", "education URL freshness map");
  assertContains(sitemap, "liveStaticDiscoveryEntries", "live static sitemap freshness merge");
  assertContains(sitemap, "lastModified", "truthful sitemap lastmod output");
  assertContains(
    sitemap,
    "WRITING_CATEGORY_INDEXABLE_AT",
    "writing category hub lastmod must use the verified indexable release time",
  );
  assertContains(
    sitemap,
    'new Date("2026-09-13T19:15:11Z")',
    "writing category verified indexable timestamp",
  );
  const searchFreshness = source("src/lib/search-content-freshness.ts");
  const recentUpdatesAtom = source("src/app/recent-updates.atom/route.ts");

  assertContains(
    sitemap,
    'import { WRITING_GUIDE_STRUCTURED_DATA_UPDATED_AT } from "@/lib/search-content-freshness"',
    "sitemap shared writing guide freshness import",
  );
  assertContains(
    sitemap,
    "WRITING_GUIDE_STRUCTURED_DATA_UPDATED_AT",
    "writing guide lastmod must preserve the real shared structured-data update",
  );
  assertContains(
    searchFreshness,
    'new Date("2026-10-01T08:40:42Z")',
    "writing guide structured-data lastmod timestamp",
  );
  assertContains(
    recentUpdatesAtom,
    'import { WRITING_GUIDE_STRUCTURED_DATA_UPDATED_AT } from "@/lib/search-content-freshness"',
    "Atom feed shared writing guide freshness import",
  );
  assertContains(
    recentUpdatesAtom,
    'import { buildSitemap } from "@/lib/seo/sitemap-data"',
    "Atom feed must reuse canonical sitemap inventory",
  );
  assertContains(
    recentUpdatesAtom,
    "const RECENT_ENTRY_LIMIT = 50",
    "Atom feed bounded recent-entry cap",
  );
  assertContains(
    recentUpdatesAtom,
    "const sitemap = await buildSitemap()",
    "Atom feed freshness must come from sitemap lastmod data",
  );
  assertContains(
    recentUpdatesAtom,
    "normalizeLastModified(entry.lastModified)",
    "Atom feed accepts only explicit sitemap lastmod timestamps",
  );
  assertContains(
    recentUpdatesAtom,
    "parsed.origin !== baseUrl",
    "Atom feed must stay same-origin",
  );
  assertContains(
    recentUpdatesAtom,
    ".slice(0, RECENT_ENTRY_LIMIT)",
    "Atom feed keeps only the bounded most-recent indexable URLs",
  );
  assertNotContains(
    recentUpdatesAtom,
    "WHERE namespace = 'education_guide'",
    "Atom feed must not be restricted to writing-guide freshness only",
  );
  assertContains(
    recentUpdatesAtom,
    'import { createHash } from "node:crypto"',
    "Atom feed deterministic ETag hashing",
  );
  assertContains(
    recentUpdatesAtom,
    'ETag: etag',
    "Atom feed ETag response header",
  );
  assertContains(
    recentUpdatesAtom,
    '"Last-Modified": feedUpdated.toUTCString()',
    "Atom feed Last-Modified response header",
  );
  assertContains(
    recentUpdatesAtom,
    'request.headers.get("if-none-match") === etag',
    "Atom feed If-None-Match conditional response",
  );
  assertContains(
    recentUpdatesAtom,
    'request.headers.get("if-modified-since")',
    "Atom feed If-Modified-Since conditional response",
  );
  assertContains(
    recentUpdatesAtom,
    'return new Response(null, { status: 304, headers })',
    "Atom feed 304 response path",
  );
  assertNotContains(
    sitemap,
    "search-discovery-signals",
    "sitemap must not rely on the retired search discovery signal module",
  );
  assertNotContains(
    recentUpdatesAtom,
    "search-discovery-signals",
    "Atom feed must not rely on the retired search discovery signal module",
  );

  assertContains(
    sitemap,
    "bookIndexLastModified",
    "dynamic Book Index freshness must be available to sitemap discovery entries",
  );
  assertContains(
    sitemap,
    'entry.url === \`${baseUrl}/yeni-cikanlar\`',
    "new releases sitemap entry must inherit live Book Index freshness",
  );

  const websubWorkflow = source(".github/workflows/google-websub-publish.yml");
  assertContains(
    websubWorkflow,
    'cron: "23 */6 * * *"',
    "WebSub must periodically publish dynamic database/feed updates",
  );
  assertContains(
    websubWorkflow,
    "workflow_dispatch:",
    "WebSub keeps an explicit manual dispatch path",
  );
  assertContains(
    websubWorkflow,
    "github.event_name != 'workflow_run'",
    "WebSub scheduled/manual events must not depend on workflow_run fields",
  );
  assertContains(
    websubWorkflow,
    "https://ilkoku.com/recent-updates.atom",
    "WebSub publishes the canonical recent-updates feed",
  );
  assertContains(
    websubWorkflow,
    "hub.mode=publish",
    "WebSub uses the canonical publish notification",
  );
  assertNotContains(
    websubWorkflow,
    "Check whether discovery feed changed",
    "WebSub must not remain limited by repository file-diff gating",
  );
  assertNotContains(
    websubWorkflow,
    "search-discovery-signals",
    "WebSub must not reference the retired freshness module",
  );
});


test("public writing guides keep responsive Next image optimization enabled", () => {
  const roman = source("src/app/yazarlar-icin/kurgu/roman/page.tsx");
  const fiction = source("src/components/content/BatchedFictionGuidePage.tsx");
  const education = source("src/components/content/BatchedEducationGuidePage.tsx");

  assertNotContains(roman, "unoptimizedImages", "Roman public guide image optimization bypass");
  assertNotContains(fiction, "unoptimizedImages", "fiction guide image optimization bypass");
  assertNotContains(education, "unoptimizedImages", "education guide image optimization bypass");
});


test("public writing guides stay ISR-cacheable and CMS reads stay published-only", () => {
  const { genres, hubs } = readWritingInventory();
  const hrefByCategory = new Map(hubs.map((hub) => [hub.category, hub.href]));

  const informational = source("src/app/yazarlar-icin/bilgilendirici/[slug]/page.tsx");
  assertContains(informational, "export const revalidate = 300;", "informational guide ISR");
  assertNotContains(informational, 'export const dynamic = "force-dynamic";', "informational guide forced dynamic mode");
  assertContains(informational, "export function generateStaticParams()", "informational guide static params");

  for (const genre of genres) {
    const categoryHref = hrefByCategory.get(genre.category);
    assert.ok(categoryHref, `missing category href for ${genre.category}`);

    if (genre.category === "Bilgilendirici") continue;

    const route = `${categoryHref}/${genre.slug}`;
    const page = source(`src/app${route}/page.tsx`);
    assertContains(page, "export const revalidate = 300;", `${route} ISR`);
    assertNotContains(page, 'export const dynamic = "force-dynamic";', `${route} forced dynamic mode`);
  }

  const cmsEducation = source("src/lib/cms-education.ts");
  assertContains(cmsEducation, "AND status = 'published'", "writer education published-only CMS read");
  assertNotContains(cmsEducation, 'from "next/headers"', "writer education request-state import");
  assertNotContains(cmsEducation, "cookies(", "writer education cookies dependency");
  assertNotContains(cmsEducation, "headers(", "writer education headers dependency");
  assertNotContains(cmsEducation, "getServerSession", "writer education session dependency");
});


test("all writing guide renderers expose organization-authored Article structured data", () => {
  const education = source("src/components/content/BatchedEducationGuidePage.tsx");
  const fiction = source("src/components/content/BatchedFictionGuidePage.tsx");
  const story = source("src/app/yazarlar-icin/kurgu/oyku/page.tsx");

  for (const [label, guide] of [
    ["batched education", education],
    ["batched fiction", fiction],
    ["story", story],
  ]) {
    assertContains(guide, '"@type": "Article"', `${label} Article schema`);
    assertContains(guide, 'name: "İlkOku"', `${label} organization author name`);
    assertContains(guide, 'author: {', `${label} author relation`);
    assertContains(guide, 'publisher: {', `${label} publisher relation`);
    assertContains(guide, '"@id": "https://ilkoku.com/#organization"', `${label} organization identity`);
  }

  assertContains(education, 'mainEntity: { "@id": `${canonicalUrl}#article` }', "education WebPage to Article relation");
  assertContains(fiction, 'mainEntity: { "@id": `${canonicalUrl}#article` }', "fiction WebPage to Article relation");
  assertContains(education, 'mainEntityOfPage: { "@id": `${canonicalUrl}#webpage` }', "education Article to WebPage relation");
  assertContains(fiction, 'mainEntityOfPage: { "@id": `${canonicalUrl}#webpage` }', "fiction Article to WebPage relation");
  assertContains(story, "mainEntityOfPage: canonicalUrl", "story canonical Article relation");
});


test("roman guide exposes Article and breadcrumb structured data", () => {
  const roman = source("src/app/yazarlar-icin/kurgu/roman/page.tsx");
  assertContains(roman, '"@type": "Article"', "Roman Article schema");
  assertContains(roman, '"@type": "BreadcrumbList"', "Roman breadcrumb schema");
  assertContains(roman, 'mainEntityOfPage: canonical', "Roman canonical schema binding");
  assertContains(roman, 'author: { "@type": "Organization", name: "İlkOku"', "Roman author schema");
  assertContains(roman, 'publisher: { "@type": "Organization", name: "İlkOku"', "Roman publisher schema");
});


test("Roman guide uses the shared public metadata contract instead of inheriting homepage social metadata", () => {
  const roman = source("src/app/yazarlar-icin/kurgu/roman/page.tsx");
  assertContains(roman, 'import { createPublicPageMetadata } from "@/lib/public-page-metadata"', "Roman shared metadata helper");
  assertContains(roman, "export const metadata: Metadata = createPublicPageMetadata({", "Roman metadata helper usage");
  assertContains(roman, 'title: metadataTitle', "Roman metadata title");
  assertContains(roman, 'description: metadataDescription', "Roman metadata description");
  assertContains(roman, 'canonical,', "Roman metadata canonical");
  assertContains(roman, 'image: defaultRomanVisuals.hero', "Roman social image");

  const helper = source("src/lib/public-page-metadata.ts");
  assertContains(helper, "noIndex = false", "shared metadata defaults to indexable");
  assertContains(helper, "index: true", "shared metadata emits index");
  assertContains(helper, "follow: true", "shared metadata emits follow");
});
