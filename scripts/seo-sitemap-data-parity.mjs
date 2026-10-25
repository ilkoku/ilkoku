import assert from "node:assert/strict";
import fs from "node:fs";

const [inventoryFile, sitemapFile] = process.argv.slice(2);
if (!inventoryFile || !sitemapFile) throw new Error("Provide inventory JSON and live XML");

const inventory = JSON.parse(fs.readFileSync(inventoryFile, "utf8"));
assert.equal(inventory.ok, true, "Production DB inventory is required");
assert.equal(inventory.dataSource, "production-database", "Static fallback is not an acceptable inventory");

const xml = fs.readFileSync(sitemapFile, "utf8");
assert.match(xml, /<urlset\b/u, "Missing XML urlset");
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gu)]
  .map((match) => match[1].trim().replaceAll("&amp;", "&"));
assert.ok(urls.length >= 128, "Live sitemap has fewer than 128 URLs");
const actual = new Set(urls);
assert.equal(actual.size, urls.length, "Duplicate sitemap URLs");
for (const url of urls) assert.equal(new URL(url).origin, "https://ilkoku.com");

const workSet = new Set(inventory.workUrls);
const cmsSet = new Set(inventory.cmsUrls);
assert.equal(workSet.size, inventory.workUrls.length, "Duplicate DB work URLs");
assert.equal(cmsSet.size, inventory.cmsUrls.length, "Duplicate DB CMS URLs");
const missingWorks = [...workSet].filter((url) => !actual.has(url));
const missingCms = [...cmsSet].filter((url) => !actual.has(url));
const unexpectedWorks = urls.filter((url) =>
  url.startsWith("https://ilkoku.com/kitap/") && !workSet.has(url));
const gated = urls.filter((url) => {
  const path = new URL(url).pathname;
  return path === "/yeni-cikanlar"
    || path === "/en-cok-satanlar"
    || path.startsWith("/en-cok-satanlar/");
});

const report = {
  verifiedAt: new Date().toISOString(),
  source: inventory.dataSource,
  inventoryObservedAt: inventory.observedAt,
  sitemapUrls: urls.length,
  eligibleWorksInDatabase: workSet.size,
  eligibleWorksInXml: urls.filter((url) => workSet.has(url)).length,
  publishedTurkishCmsRows: inventory.publishedTurkishCmsPageCount,
  indexableCmsUrlsInDatabase: cmsSet.size,
  missingWorkCount: missingWorks.length,
  missingCmsCount: missingCms.length,
  unexpectedWorkCount: unexpectedWorks.length,
  gatedRouteLeakCount: gated.length,
  missingWorkSamples: missingWorks.slice(0, 15),
  missingCmsSamples: missingCms.slice(0, 15),
  unexpectedWorkSamples: unexpectedWorks.slice(0, 15),
};
fs.writeFileSync("/tmp/ilkoku-sitemap-parity-report.json", JSON.stringify(report, null, 2));
console.log("SEO_SITEMAP_PARITY " + JSON.stringify(report));
if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = [
    "## Live sitemap / production DB parity", "",
    "| Metric | Value |", "| --- | ---: |",
    "| Sitemap URLs | " + report.sitemapUrls + " |",
    "| Eligible works in DB | " + report.eligibleWorksInDatabase + " |",
    "| Matched works | " + report.eligibleWorksInXml + " |",
    "| Missing works | " + report.missingWorkCount + " |",
    "| Missing CMS pages | " + report.missingCmsCount + " |",
    "| Unexpected work URLs | " + report.unexpectedWorkCount + " |",
    "| Gated route leaks | " + report.gatedRouteLeakCount + " |",
    "", "Authenticated production DB evidence is compared with live XML; no fallback cohort.", "",
  ];
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, rows.join("\n"));
}
if (missingWorks.length || missingCms.length || unexpectedWorks.length || gated.length) {
  console.error("FAIL: sitemap/production DB disagreement");
  process.exitCode = 1;
}
