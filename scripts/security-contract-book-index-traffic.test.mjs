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

test("Book Index public pages expose ranking and freshness SEO signals", () => {
  const overview = source("src/app/en-cok-satanlar/page.tsx");
  const turkey = source("src/app/en-cok-satanlar/turkiye/page.tsx");
  const seo = source("src/lib/book-index/seo.ts");
  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");
  const sitemap = source("src/app/sitemap.ts");

  contains(seo, '"@type": "ItemList"', "ItemList schema");
  contains(seo, '"@type": "Book"', "Book schema");
  contains(seo, "numberOfItems: items.length", "schema item count");
  contains(overview, "createBookIndexItemListSchema", "overview ranking schema");
  contains(turkey, "createBookIndexItemListSchema", "Turkey ranking schema");
  contains(overview, "dateModified", "overview freshness schema");
  contains(turkey, "dateModified", "Turkey freshness schema");
  contains(view, "Son veri güncellemesi", "visible freshness");
  contains(view, "en çok satan kitaplar nasıl belirleniyor?", "search-intent methodology");
  contains(sitemap, "getBookIndexLastObservedAt", "sitemap real freshness");
  contains(sitemap, "lastModified", "sitemap lastModified");
  contains(
    overview,
    'image: "/en-cok-satanlar/opengraph-image"',
    "overview Book Index social card",
  );
  contains(
    turkey,
    'image: "/en-cok-satanlar/opengraph-image"',
    "Turkey Book Index social card",
  );
});

test("Book Index owns a dedicated evergreen social share image", () => {
  const image = source("src/app/en-cok-satanlar/opengraph-image.tsx");

  contains(image, "ImageResponse", "social image renderer");
  contains(image, "En Çok Satan Kitaplar", "social search intent");
  contains(image, "new Date().getFullYear()", "current-year social freshness");
  contains(image, "Kitap Endeksi", "Book Index brand");
  contains(image, "1200", "OpenGraph width");
  contains(image, "630", "OpenGraph height");
});

test("public site map never exposes gated Book Index links early", () => {
  const siteMapPage = source("src/app/site-haritasi/page.tsx");

  contains(
    siteMapPage,
    "getBookIndexPublicPageContext(30).catch(() => null)",
    "site-map Book Index gate",
  );
  contains(
    siteMapPage,
    'bookIndexPublished || page.id !== "book-index"',
    "code-owned Book Index site-map filter",
  );
  contains(
    siteMapPage,
    '!page.href.startsWith("/en-cok-satanlar")',
    "CMS Book Index backdoor filter",
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
      "https://ilkoku.com/hakkimizda",
    ],
    changedFiles: ["__BOOK_INDEX__"],
  });

  assert.equal(result.mode, "book-index");
  assert.deepEqual(result.urls, [
    "https://ilkoku.com/en-cok-satanlar",
    "https://ilkoku.com/en-cok-satanlar/turkiye",
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
