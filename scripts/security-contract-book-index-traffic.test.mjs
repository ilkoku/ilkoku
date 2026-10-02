import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { selectIndexNowUrls } from "./prepare-indexnow-payload.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) =>
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

test("Book Index public pages expose ranking and freshness SEO signals", () => {
  const overview = source("src/app/en-cok-satanlar/page.tsx");
  const turkey = source("src/app/en-cok-satanlar/turkiye/page.tsx");
  const seo = source("src/lib/book-index/seo.ts");
  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");
  const sitemap = source("src/lib/seo/sitemap-data.ts");

  contains(seo, '"@type": "ItemList"', "ItemList schema");
  contains(seo, '"@type": "Book"', "Book schema");
  contains(seo, "numberOfItems: items.length", "schema item count");
  contains(overview, "createBookIndexItemListSchema", "overview ranking schema");
  contains(turkey, "createBookIndexItemListSchema", "Turkey ranking schema");
  contains(overview, "dateModified", "overview freshness schema");
  contains(turkey, "dateModified", "Turkey freshness schema");
  contains(view, "Son veri güncellemesi", "visible freshness");
  contains(view, "Hangi kitap satış kanalının hangi kitabı hangi sıraya koyduğunu", "sales-site rank comparison intent");
  contains(sitemap, "getBookIndexLastObservedAt", "sitemap real freshness");
  contains(sitemap, "lastModified", "sitemap lastModified");
});

test("public site map exposes stable indexable Book Index routes without a transient data gate", () => {
  const siteMapPage = source("src/app/site-haritasi/page.tsx");

  contains(
    siteMapPage,
    "SITE_MAP_PAGES.filter",
    "site-map uses the canonical code-owned route inventory",
  );
  contains(
    siteMapPage,
    "page.indexable !== false",
    "site-map exposes only routes marked indexable",
  );
  notContains(
    siteMapPage,
    "getBookIndexPublicPageContext",
    "stable Book Index discovery is not hidden behind transient data availability",
  );
  notContains(
    siteMapPage,
    "bookIndexPublished",
    "obsolete runtime Book Index publication gate remains removed",
  );
});

test("scheduled IndexNow refresh targets only published Book Index URLs", () => {
  const workflow = source(".github/workflows/indexnow-submit.yml");

  contains(workflow, 'cron: "37 4 * * *"', "daily search refresh schedule");
  contains(workflow, '"src/features/book-index/**"', "Book Index feature trigger");
  contains(workflow, '"src/lib/book-index/**"', "Book Index data/SEO trigger");
  contains(workflow, "__BOOK_INDEX__", "scheduled Book Index sentinel");

  const result = selectIndexNowUrls({
    sitemapUrls: [
      "https://ilkoku.com/",
      "https://ilkoku.com/en-cok-satanlar",
      "https://ilkoku.com/en-cok-satanlar/turkiye",
      "https://ilkoku.com/en-cok-satanlar/turkiye/karsilastirma",
      "https://ilkoku.com/hakkimizda",
    ],
    changedFiles: ["__BOOK_INDEX__"],
  });

  assert.equal(result.mode, "book-index");
  assert.deepEqual(result.urls, [
    "https://ilkoku.com/en-cok-satanlar",
    "https://ilkoku.com/en-cok-satanlar/turkiye",
    "https://ilkoku.com/en-cok-satanlar/turkiye/karsilastirma",
  ]);
});

test("scheduled IndexNow refresh remains fail-closed while Book Index is absent from sitemap", () => {
  const result = selectIndexNowUrls({
    sitemapUrls: [
      "https://ilkoku.com/",
      "https://ilkoku.com/hakkimizda",
    ],
    changedFiles: ["__BOOK_INDEX__"],
  });

  assert.equal(result.mode, "book-index");
  assert.deepEqual(result.urls, []);
});


test("Book Index uses a dedicated social preview for result-sharing CTR", () => {
  const overview = source("src/app/en-cok-satanlar/page.tsx");
  const turkey = source("src/app/en-cok-satanlar/turkiye/page.tsx");
  const image = source("src/app/en-cok-satanlar/opengraph-image.tsx");

  contains(
    overview,
    'image: "/en-cok-satanlar/opengraph-image"',
    "overview social image",
  );
  contains(
    turkey,
    'image: "/en-cok-satanlar/opengraph-image"',
    "Turkey social image",
  );
  contains(image, "1200", "social image width");
  contains(image, "630", "social image height");
  contains(image, "En Çok Satan Kitaplar", "search-intent social headline");
  contains(image, "Site sıraları değiştirilmez", "site-rank trust signal");
});


test("Book Index gains a gated site-wide footer discovery link after publication", () => {
  const footer = source("src/components/content/PublicTrustFooter.tsx");

  contains(
    footer,
    "getBookIndexPublicPageContext(10).catch(() => null)",
    "footer uses the same fail-closed public gate",
  );
  contains(
    footer,
    '{ href: "/en-cok-satanlar", label: "En Çok Satanlar" }',
    "footer Book Index discovery link",
  );
  contains(
    footer,
    "const platformLinks = bookIndexContext",
    "footer link only appears when publication is actually allowed",
  );
});
