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
