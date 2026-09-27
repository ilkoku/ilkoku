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
});

test("public site map keeps aggregate Book Index gated while exposing approved source pages", () => {
  const siteMapPage = source("src/app/site-haritasi/page.tsx");

  contains(
    siteMapPage,
    "getBookIndexPublicPageContext(30).catch(() => null)",
    "site-map aggregate Book Index gate",
  );
  contains(
    siteMapPage,
    "getBookIndexPublicSourcePageContext(100).catch(() => null)",
    "site-map source-page publication context",
  );
  contains(
    siteMapPage,
    'href: "/en-cok-satanlar/kaynak"',
    "source hub is independently discoverable",
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
      "https://ilkoku.com/en-cok-satanlar/kaynak/bkm-kitap",
      "https://ilkoku.com/hakkimizda",
    ],
    changedFiles: ["__BOOK_INDEX__"],
  });

  assert.equal(result.mode, "book-index");
  assert.deepEqual(result.urls, [
    "https://ilkoku.com/en-cok-satanlar",
    "https://ilkoku.com/en-cok-satanlar/turkiye",
    "https://ilkoku.com/en-cok-satanlar/kaynak/bkm-kitap",
  ]);
});

test("Book Index code changes immediately map to the published Book Index URL family", () => {
  const sitemapUrls = [
    "https://ilkoku.com/",
    "https://ilkoku.com/en-cok-satanlar",
    "https://ilkoku.com/en-cok-satanlar/turkiye",
    "https://ilkoku.com/en-cok-satanlar/kaynak/bkm-kitap",
    "https://ilkoku.com/hakkimizda",
  ];

  for (const changedFile of [
    "src/lib/book-index/ranking.ts",
    "src/lib/book-index/public-read-model.ts",
    "src/features/book-index/public/BookIndexPublicView.tsx",
  ]) {
    const result = selectIndexNowUrls({
      sitemapUrls,
      changedFiles: [changedFile],
    });

    assert.equal(result.mode, "diff");
    assert.deepEqual(result.urls, [
      "https://ilkoku.com/en-cok-satanlar",
      "https://ilkoku.com/en-cok-satanlar/turkiye",
      "https://ilkoku.com/en-cok-satanlar/kaynak/bkm-kitap",
    ]);
  }
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



test("source-only Book Index sitemap refresh can run before the aggregate index opens", () => {
  const result = selectIndexNowUrls({
    sitemapUrls: [
      "https://ilkoku.com/",
      "https://ilkoku.com/en-cok-satanlar/kaynak",
      "https://ilkoku.com/en-cok-satanlar/kaynak/bkm-kitap",
      "https://ilkoku.com/en-cok-satanlar/kaynak/idefix",
    ],
    changedFiles: ["__BOOK_INDEX__"],
  });

  assert.equal(result.mode, "book-index");
  assert.deepEqual(result.urls, [
    "https://ilkoku.com/en-cok-satanlar/kaynak",
    "https://ilkoku.com/en-cok-satanlar/kaynak/bkm-kitap",
    "https://ilkoku.com/en-cok-satanlar/kaynak/idefix",
  ]);
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
  contains(image, "1 kaynak = 1 oy", "trust signal");
  contains(
    overview,
    'image: \`\${baseUrl}/en-cok-satanlar/opengraph-image\`',
    "overview structured preferred image",
  );
  contains(
    turkey,
    'image: \`\${baseUrl}/en-cok-satanlar/opengraph-image\`',
    "Turkey structured preferred image",
  );
});


test("Book Index footer discovery follows aggregate or source-only publication", () => {
  const footer = source("src/components/content/PublicTrustFooter.tsx");

  contains(
    footer,
    "getBookIndexPublicPageContext(10).catch(() => null)",
    "footer checks aggregate publication",
  );
  contains(
    footer,
    "getBookIndexPublicSourcePageContext(100).catch(() => null)",
    "footer checks source-only publication",
  );
  contains(
    footer,
    '? "/en-cok-satanlar"',
    "aggregate publication keeps the aggregate href",
  );
  contains(
    footer,
    '? "/en-cok-satanlar/kaynak"',
    "source-only publication falls back to the source hub",
  );
  contains(
    footer,
    'label: "En Çok Satanlar"',
    "footer keeps the discovery label",
  );
});


test("Book Index source SEO pages publish only from real available snapshots", () => {
  const sourcePages = source("src/lib/book-index/source-pages.ts");
  const route = source("src/app/en-cok-satanlar/kaynak/[slug]/page.tsx");
  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");
  const sitemap = source("src/app/sitemap.ts");
  const analytics = source("src/features/book-index/public/BookIndexAnalytics.tsx");

  for (const slug of [
    "bkm-kitap",
    "remzi-kitabevi",
    "idefix",
    "kitapsepeti",
    "kitapzen",
    "inkilap-kitabevi",
    "kitapsec",
    "kitaplarsepette",
    "illa-kitap",
    "nobel-kitap",
  ]) {
    contains(sourcePages, `slug: "${slug}"`, `${slug} source SEO slug`);
  }

  contains(
    sourcePages,
    'list.availability === "available"',
    "only available source lists can publish",
  );
  contains(
    sourcePages,
    "list.items.length > 0",
    "empty source lists stay unpublished",
  );
  contains(
    route,
    "getBookIndexPublicSourcePageContext(100)",
    "source pages use the source-only publication context",
  );
  contains(route, "if (!sourcePage) notFound()", "missing source snapshot fails closed");
  contains(
    route,
    'image: "/en-cok-satanlar/opengraph-image"',
    "source pages reuse dedicated social preview",
  );
  contains(
    route,
    'image: \`\${baseUrl}/en-cok-satanlar/opengraph-image\`',
    "source pages expose structured preferred image",
  );
  contains(route, "createBookIndexSourceItemListSchema", "source ranking schema");
  contains(
    sitemap,
    "loadBookIndexSourceSitemapEntries",
    "sitemap publishes source pages independently from the aggregate gate",
  );
  contains(
    sitemap,
    "/en-cok-satanlar/kaynak/",
    "source pages join the gated Book Index sitemap",
  );
  contains(
    view,
    "Mağazalara göre çok satan kitaplar",
    "overview links source-search intents",
  );
  contains(
    analytics,
    'pathname.startsWith("/en-cok-satanlar/kaynak/")',
    "source pages receive dedicated analytics classification",
  );
});



test("phase-one source hub publishes only approved source definitions", () => {
  const sourcePages = source("src/lib/book-index/source-pages.ts");

  const approved = [
    "bkm",
    "remzi",
    "idefix",
    "kitapsepeti",
    "kitapzen",
    "inkilap",
    "kitapsec",
    "kitaplarsepette",
    "illakitap",
    "nobelkitap",
  ];

  for (const sourceCode of approved) {
    contains(
      sourcePages,
      `sourceCode: "${sourceCode}"`,
      `${sourceCode} phase-one source page`,
    );
  }

  for (const privateSource of [
    "kitapstore",
    "amazon-tr",
    "pandora",
    "kitapambari",
  ]) {
    assert.ok(
      !sourcePages.includes(`sourceCode: "${privateSource}"`),
      `${privateSource} must stay off the phase-one source hub`,
    );
  }
});

test("manual SEO indexability smoke validates Book Index only after sitemap publication", () => {
  const workflow = source(".github/workflows/seo-indexability-smoke.yml");

  contains(
    workflow,
    "Published Book Index source hub detected; validating phased source surfaces.",
    "source-only Book Index sitemap detection",
  );
  contains(
    workflow,
    "check_page '/en-cok-satanlar' 'https://ilkoku.com/en-cok-satanlar'",
    "overview canonical/indexability check",
  );
  contains(
    workflow,
    "check_page '/en-cok-satanlar/turkiye' 'https://ilkoku.com/en-cok-satanlar/turkiye'",
    "Turkey canonical/indexability check",
  );
  contains(
    workflow,
    "/en-cok-satanlar/kaynak/",
    "representative source-page discovery",
  );
  contains(
    workflow,
    "Aggregate Book Index remains gated; aggregate SEO checks skipped.",
    "aggregate fail-closed behavior during phased source launch",
  );
});


test("Book Index insight search-intent pages publish only with real evidence", () => {
  const definitions = source("src/lib/book-index/insight-pages.ts");
  const route = source("src/app/en-cok-satanlar/[insight]/page.tsx");
  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");
  const sitemap = source("src/app/sitemap.ts");
  const analytics = source("src/features/book-index/public/BookIndexAnalytics.tsx");
  const smoke = source(".github/workflows/seo-indexability-smoke.yml");

  for (const slug of [
    "yeni-girisler",
    "yukselenler",
    "her-yerde-satanlar",
    "uzun-satanlar",
  ]) {
    contains(definitions, `slug: "${slug}"`, `${slug} insight slug`);
  }

  contains(
    definitions,
    'item.historyDays > 0',
    "long-seller route requires real historical duration",
  );
  contains(
    route,
    "getBookIndexPublicPageContext(100)",
    "insight pages use shared publication gate",
  );
  contains(route, "if (items.length === 0) notFound()", "empty insight page fails closed");
  contains(route, "createBookIndexGenericItemListSchema", "insight ranking schema");
  contains(route, "getBookIndexLastObservedAt", "real snapshot freshness");
  contains(view, "Çok satan kitap trendleri", "overview insight discovery section");
  contains(
    sitemap,
    "getPublishedBookIndexInsightPages(insights)",
    "sitemap only receives evidence-backed insight pages",
  );
  contains(
    analytics,
    'return "insight"',
    "insight pages receive dedicated analytics classification",
  );
  contains(
    smoke,
    "yeni-girisler|yukselenler|her-yerde-satanlar|uzun-satanlar",
    "SEO smoke samples a published insight page",
  );
});


test("homepage footer resolves aggregate or source-only Book Index destination", () => {
  const homepage = source("src/features/homepage/HomepageExperience.tsx");
  const footer = source("src/features/homepage/live-footer.tsx");

  contains(
    homepage,
    "getBookIndexPublicPageContext(10).catch(() => null)",
    "homepage checks aggregate Book Index publication",
  );
  contains(
    homepage,
    "getBookIndexPublicSourcePageContext(100).catch(() => null)",
    "homepage checks source-only Book Index publication",
  );
  contains(
    homepage,
    'bookIndexHref={',
    "homepage resolves the published Book Index destination",
  );
  contains(
    footer,
    'bookIndexHref ? <Link href={bookIndexHref}>En Çok Satanlar</Link> : null',
    "homepage footer renders only a resolved live Book Index destination",
  );
});
