import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { selectDefaultInspectionUrls } from "./gsc-url-inspection.mjs";

const workflow = fs.readFileSync(".github/workflows/gsc-url-inspection.yml", "utf8");
const script = fs.readFileSync("scripts/gsc-url-inspection.mjs", "utf8");
const performanceWorkflow = fs.readFileSync(".github/workflows/gsc-book-index-performance.yml", "utf8");
const performanceScript = fs.readFileSync("scripts/gsc-book-index-performance.mjs", "utf8");
const sitemapSubmitWorkflow = fs.readFileSync(".github/workflows/gsc-sitemap-submit.yml", "utf8");
const sitemapSubmitScript = fs.readFileSync("scripts/gsc-sitemap-submit.mjs", "utf8");
const censusWorkflow = fs.readFileSync(".github/workflows/gsc-full-index-census.yml", "utf8");
const censusScript = fs.readFileSync("scripts/gsc-full-index-census.mjs", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const docs = fs.readFileSync("docs/seo-sprint11-status.md", "utf8");

test("GSC URL Inspection diagnostic is self-change, manual-or-weekly and read-only", () => {
  assert.match(workflow, /workflow_dispatch:/u);
  assert.match(workflow, /schedule:/u);
  assert.match(workflow, /cron: "23 5 \* \* 2"/u);
  assert.match(workflow, /if: github\.event_name == 'workflow_dispatch'/u);
  assert.match(workflow, /permissions:\s*\n\s+contents: read/u);
  assert.match(workflow, /push:\s*\n\s+branches:\s*\n\s+- main\s*\n\s+paths:\s*\n\s+- "\.github\/workflows\/gsc-url-inspection\.yml"\s*\n\s+- "scripts\/gsc-url-inspection\.mjs"/u);
  assert.match(workflow, /RUN-GSC-URL-INSPECTION/u);
  assert.match(workflow, /secrets\.GSC_OAUTH_CLIENT_ID/u);
  assert.match(workflow, /secrets\.GSC_OAUTH_CLIENT_SECRET/u);
  assert.match(workflow, /secrets\.GSC_OAUTH_REFRESH_TOKEN/u);
});

test("inspection script only calls read-only Search Console diagnostics", () => {
  assert.match(script, /https:\/\/searchconsole\.googleapis\.com\/v1\/urlInspection\/index:inspect/u);
  assert.match(script, /https:\/\/www\.googleapis\.com\/webmasters\/v3\/sites\/\$\{encodeURIComponent\(SITE_URL\)\}\/sitemaps/u);
  assert.match(script, /https:\/\/oauth2\.googleapis\.com\/token/u);
  assert.match(script, /https:\/\/oauth2\.googleapis\.com\/tokeninfo\?access_token=/u);
  assert.match(script, /GSC OAuth granted scopes:/u);
  assert.doesNotMatch(script, /console\.log\([^\n]*accessToken/u);
  assert.doesNotMatch(script, /indexing\.googleapis\.com/u);
  assert.match(script, /sc-domain:ilkoku\.com/u);
  assert.match(script, /MAX_URLS = 10/u);
  assert.match(script, /SITEMAP_MAX_URLS = 50_000/u);
  assert.match(script, /SITEMAP_MAX_BYTES = 50 \* 1024 \* 1024/u);
  assert.match(script, /Buffer\.byteLength\(xml, "utf8"\)/u);
  assert.match(script, /Sitemap exceeds the 50,000 URL limit/u);
  assert.match(script, /Sitemap exceeds the 50 MB uncompressed limit/u);
  assert.match(script, /Sitemap contains duplicate URLs/u);
  assert.match(script, /GSC sitemaps:/u);
  assert.match(script, /discoverPublicSitemapUrls/u);
  assert.match(script, /selectDefaultInspectionUrls/u);
  assert.match(script, /DEFAULT_CORE_INSPECTION_URLS/u);
  assert.match(script, /Representative inspection:/u);
  assert.match(script, /sitemap URL\(s\)/u);
  assert.match(script, /editorler-icin\/egitim\/editorluge-baslama/u);
  assert.match(script, /okurlar-icin\/okumaya-baslama/u);
  assert.match(script, /hakkimizda/u);
  assert.match(script, /yayinevleri-icin/u);
  assert.doesNotMatch(script, /site-haritasi/u);
  assert.doesNotMatch(script, /en-cok-satanlar/u);
  assert.match(script, /discoveredSitemapUrls/u);
  assert.match(script, /lastDownloaded/u);
  assert.match(script, /Diagnostic only/u);
  assert.doesNotMatch(script, /requestIndexing|indexing\.googleapis\.com/u);
});

test("default inspection samples the current focused index cohort", () => {
  const sitemapUrls = [
    "https://ilkoku.com/",
    "https://ilkoku.com/nasil-calisir",
    "https://ilkoku.com/hakkimizda",
    "https://ilkoku.com/yazarlar-icin",
    "https://ilkoku.com/okurlar-icin",
    "https://ilkoku.com/editorler-icin",
    "https://ilkoku.com/yayinevleri-icin",
    "https://ilkoku.com/editoryal-standartlar",
    "https://ilkoku.com/yazarlar-icin/kurgu",
    "https://ilkoku.com/yazarlar-icin/kurgu/roman",
    "https://ilkoku.com/okurlar-icin/okumaya-baslama",
    "https://ilkoku.com/editorler-icin/egitim/editorluge-baslama",
    "https://ilkoku.com/editorler-icin/egitim/dil-ve-anlatim-editorlugu",
  ];

  assert.deepEqual(selectDefaultInspectionUrls(sitemapUrls), [
    "https://ilkoku.com/",
    "https://ilkoku.com/nasil-calisir",
    "https://ilkoku.com/hakkimizda",
    "https://ilkoku.com/yazarlar-icin",
    "https://ilkoku.com/okurlar-icin",
    "https://ilkoku.com/editorler-icin",
    "https://ilkoku.com/yayinevleri-icin",
    "https://ilkoku.com/editoryal-standartlar",
    "https://ilkoku.com/yazarlar-icin/kurgu/roman",
    "https://ilkoku.com/editorler-icin/egitim/editorluge-baslama",
  ]);
});

test("default inspection never reintroduces retired noindex discovery families", () => {
  const sitemapUrls = [
    "https://ilkoku.com/",
    "https://ilkoku.com/nasil-calisir",
    "https://ilkoku.com/hakkimizda",
    "https://ilkoku.com/yazarlar-icin",
    "https://ilkoku.com/okurlar-icin",
    "https://ilkoku.com/editorler-icin",
    "https://ilkoku.com/yayinevleri-icin",
    "https://ilkoku.com/editoryal-standartlar",
    "https://ilkoku.com/yazarlar-icin/kurgu/roman",
    "https://ilkoku.com/editorler-icin/egitim/editorluge-baslama",
    "https://ilkoku.com/site-haritasi",
    "https://ilkoku.com/en-cok-satanlar/dunya",
    "https://ilkoku.com/yasal/kullanim-sartlari",
  ];

  const selected = selectDefaultInspectionUrls(sitemapUrls);
  assert.equal(selected.includes("https://ilkoku.com/site-haritasi"), false);
  assert.equal(selected.includes("https://ilkoku.com/en-cok-satanlar/dunya"), false);
  assert.equal(selected.includes("https://ilkoku.com/yasal/kullanim-sartlari"), false);
});

test("package and docs expose the official diagnostic path", () => {
  assert.equal(pkg.scripts["seo:gsc:inspect"], "node scripts/gsc-url-inspection.mjs");
  assert.match(docs, /GSC URL Inspection diagnostic/u);
  assert.match(docs, /webmasters\.readonly/u);
  assert.match(docs, /does not request indexing|dizine ekleme isteği göndermez/iu);
});



test("GSC full index census is read-only and bounded to the live İlkOku sitemap", () => {
  assert.match(censusWorkflow, /workflow_dispatch:/u);
  assert.match(censusWorkflow, /push:\s*\n\s+branches:\s*\n\s+- main\s*\n\s+paths:/u);
  assert.match(censusWorkflow, /permissions:\s*\n\s+contents: read/u);
  assert.match(censusWorkflow, /gsc-full-index-census\.mjs/u);
  assert.match(censusWorkflow, /secrets\.GSC_OAUTH_REFRESH_TOKEN/u);
  assert.doesNotMatch(censusWorkflow, /GSC_OAUTH_WRITE_REFRESH_TOKEN/u);

  assert.match(censusScript, /const MAX_URLS = 500/u);
  assert.match(censusScript, /const CONCURRENCY = 6/u);
  assert.match(censusScript, /https:\/\/ilkoku\.com/u);
  assert.match(censusScript, /https:\/\/searchconsole\.googleapis\.com\/v1\/urlInspection\/index:inspect/u);
  assert.match(censusScript, /languageCode: "tr-TR"/u);
  assert.match(censusScript, /Read-only census/u);
  assert.doesNotMatch(censusScript, /indexing\.googleapis\.com|requestIndexing/u);
  assert.doesNotMatch(censusScript, /method: "PUT"|method: "DELETE"/u);
});

test("GSC sitemap submit is manual-only, separately authorized, and narrowly scoped", () => {
  assert.match(sitemapSubmitWorkflow, /workflow_dispatch:/u);
  assert.doesNotMatch(sitemapSubmitWorkflow, /\n\s+push:/u);
  assert.doesNotMatch(sitemapSubmitWorkflow, /\n\s+schedule:/u);
  assert.match(sitemapSubmitWorkflow, /SUBMIT-GSC-SITEMAP/u);
  assert.match(sitemapSubmitWorkflow, /permissions:\s*\n\s+contents: read/u);
  assert.match(sitemapSubmitWorkflow, /secrets\.GSC_OAUTH_WRITE_REFRESH_TOKEN/u);
  assert.doesNotMatch(sitemapSubmitWorkflow, /secrets\.GSC_OAUTH_REFRESH_TOKEN/u);

  assert.match(sitemapSubmitScript, /const SITEMAP_URL = "https:\/\/ilkoku\.com\/sitemap\.xml"/u);
  assert.match(sitemapSubmitScript, /const WRITE_SCOPE = "https:\/\/www\.googleapis\.com\/auth\/webmasters"/u);
  assert.match(sitemapSubmitScript, /GSC_OAUTH_WRITE_REFRESH_TOKEN/u);
  assert.match(sitemapSubmitScript, /method: "PUT"/u);
  assert.match(sitemapSubmitScript, /\/webmasters\/v3\/sites\/\$\{encodeURIComponent\(SITE_URL\)\}\/sitemaps\/\$\{encodeURIComponent\(SITEMAP_URL\)\}/u);
  assert.match(sitemapSubmitScript, /DISCOVERY_TARGETS/u);
  assert.match(sitemapSubmitScript, /nasil-calisir/u);
  assert.match(sitemapSubmitScript, /hakkimizda/u);
  assert.match(sitemapSubmitScript, /yazarlar-icin\/kurgu\/roman/u);
  assert.match(sitemapSubmitScript, /okurlar-icin\/okumaya-baslama/u);
  assert.match(sitemapSubmitScript, /editorler-icin\/egitim\/editorluge-baslama/u);
  assert.doesNotMatch(sitemapSubmitScript, /en-cok-satanlar\/dunya/u);
  assert.doesNotMatch(sitemapSubmitScript, /yasal\/kullanim-sartlari/u);
  assert.match(sitemapSubmitScript, /grantedScopes\.includes\(WRITE_SCOPE\)/u);
  assert.doesNotMatch(sitemapSubmitScript, /indexing\.googleapis\.com|requestIndexing/u);
  assert.doesNotMatch(sitemapSubmitScript, /console\.log\([^\n]*accessToken/u);
});

test("Book Index Search performance report is weekly and read-only", () => {
  assert.match(performanceWorkflow, /schedule:/u);
  assert.match(performanceWorkflow, /cron: "45 5 \* \* 2"/u);
  assert.match(performanceWorkflow, /workflow_dispatch:/u);
  assert.match(performanceWorkflow, /permissions:\s*\n\s+contents: read/u);
  assert.match(performanceWorkflow, /gsc-book-index-performance\.mjs/u);
  assert.match(performanceWorkflow, /secrets\.GSC_OAUTH_CLIENT_ID/u);
  assert.match(performanceWorkflow, /secrets\.GSC_OAUTH_CLIENT_SECRET/u);
  assert.match(performanceWorkflow, /secrets\.GSC_OAUTH_REFRESH_TOKEN/u);

  assert.match(
    performanceScript,
    /\/searchAnalytics\/query/u,
  );
  assert.match(performanceScript, /dimension: "page"/u);
  assert.match(performanceScript, /operator: "contains"/u);
  assert.match(performanceScript, /BOOK_INDEX_PATH = "\/en-cok-satanlar"/u);
  assert.match(performanceScript, /dimensions.*\["page", "query"\]/su);
  assert.match(performanceScript, /dataState: "final"/u);
  assert.match(performanceScript, /PERIOD_DAYS = 28/u);
  assert.match(performanceScript, /FINAL_DATA_LAG_DAYS = 3/u);
  assert.match(performanceScript, /America\/Los_Angeles/u);
  assert.match(performanceScript, /clicks/u);
  assert.match(performanceScript, /impressions/u);
  assert.match(performanceScript, /ctr/u);
  assert.match(performanceScript, /position/u);
  assert.doesNotMatch(performanceScript, /indexing\.googleapis\.com|requestIndexing/u);
});
