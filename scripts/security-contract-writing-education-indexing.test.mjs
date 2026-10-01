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
  const sitemap = source("src/app/sitemap.ts");
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
    assertContains(page, `canonical: "https://ilkoku.com${canonical}"`, `${canonical} self canonical`);
    assertContains(page, "robots: { index: true, follow: true }", `${canonical} index/follow`);
  }
});


test("education sitemap lastmod uses only truthful published CMS timestamps", () => {
  const sitemap = source("src/app/sitemap.ts");

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
  assertContains(
    sitemap,
    "WRITING_GUIDE_STRUCTURED_DATA_UPDATED_AT",
    "writing guide lastmod must preserve the real shared structured-data update",
  );
  assertContains(
    sitemap,
    'new Date("2026-10-01T08:40:42Z")',
    "writing guide structured-data lastmod timestamp",
  );
  assertNotContains(
    sitemap,
    "search-discovery-signals",
    "sitemap must not rely on a detached synthetic freshness module",
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
