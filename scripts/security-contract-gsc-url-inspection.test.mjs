import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(".github/workflows/gsc-url-inspection.yml", "utf8");
const script = fs.readFileSync("scripts/gsc-url-inspection.mjs", "utf8");
const performanceWorkflow = fs.readFileSync(".github/workflows/gsc-book-index-performance.yml", "utf8");
const performanceScript = fs.readFileSync("scripts/gsc-book-index-performance.mjs", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const docs = fs.readFileSync("docs/seo-sprint11-status.md", "utf8");

test("GSC URL Inspection diagnostic is manual-or-weekly and read-only", () => {
  assert.match(workflow, /workflow_dispatch:/u);
  assert.match(workflow, /schedule:/u);
  assert.match(workflow, /cron: "23 5 \* \* 2"/u);
  assert.match(workflow, /if: github\.event_name == 'workflow_dispatch'/u);
  assert.match(workflow, /permissions:\s*\n\s+contents: read/u);
  assert.doesNotMatch(workflow, /\n\s+push:/u);
  assert.match(workflow, /RUN-GSC-URL-INSPECTION/u);
  assert.match(workflow, /secrets\.GSC_OAUTH_CLIENT_ID/u);
  assert.match(workflow, /secrets\.GSC_OAUTH_CLIENT_SECRET/u);
  assert.match(workflow, /secrets\.GSC_OAUTH_REFRESH_TOKEN/u);
});

test("inspection script only calls read-only Search Console diagnostics", () => {
  assert.match(script, /https:\/\/searchconsole\.googleapis\.com\/v1\/urlInspection\/index:inspect/u);
  assert.match(script, /https:\/\/www\.googleapis\.com\/webmasters\/v3\/sites\/\$\{encodeURIComponent\(SITE_URL\)\}\/sitemaps/u);
  assert.match(script, /https:\/\/oauth2\.googleapis\.com\/token/u);
  assert.doesNotMatch(script, /indexing\.googleapis\.com/u);
  assert.match(script, /sc-domain:ilkoku\.com/u);
  assert.match(script, /MAX_URLS = 10/u);
  assert.match(script, /GSC sitemaps:/u);
  assert.match(script, /discoverPublicSitemapUrls/u);
  assert.match(script, /en-cok-satanlar/u);
  assert.match(script, /en-cok-satanlar\/turkiye/u);
  assert.match(script, /discoveredSitemapUrls/u);
  assert.match(script, /lastDownloaded/u);
  assert.match(script, /Diagnostic only/u);
  assert.doesNotMatch(script, /requestIndexing|indexing\.googleapis\.com/u);
});

test("package and docs expose the official diagnostic path", () => {
  assert.equal(pkg.scripts["seo:gsc:inspect"], "node scripts/gsc-url-inspection.mjs");
  assert.match(docs, /GSC URL Inspection diagnostic/u);
  assert.match(docs, /webmasters\.readonly/u);
  assert.match(docs, /does not request indexing|dizine ekleme isteği göndermez/iu);
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
