import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAudit, csvReport, markdownReport } from "../scripts/seo-audit-loop.mjs";

const home = "https://ilkoku.com/";
const read = "https://ilkoku.com/nasil-calisir";
const unknown = "https://ilkoku.com/yazarlar-icin/kurgu/oyku";
const now = new Date("2026-11-05T12:00:00.000Z");

function sample() {
  const gsc = {
    generatedAt: "2026-11-05T10:00:00.000Z",
    summary: { errors: 0, recrawlWatch: { pages: [{
      path: "/nasil-calisir", state: "POST_UPDATE_CRAWLED_NOT_INDEXED"
    }] } },
    results: [
      { inspectionUrl: home, verdict: "PASS", coverageState: "Gönderildi ve dizine eklendi" },
      { inspectionUrl: read, verdict: "NEUTRAL", coverageState: "Tarandı - şu anda dizine eklenmiş değil",
        lastCrawlTime: "2026-11-04T11:00:00.000Z", robotsTxtState: "ALLOWED",
        pageFetchState: "SUCCESSFUL", indexingState: "INDEXING_ALLOWED", sitemap: [], referringUrls: [] },
      { inspectionUrl: unknown, verdict: "NEUTRAL", coverageState: "URL Google tarafından bilinmiyor",
        sitemap: [], referringUrls: [] },
    ],
  };
  const power = {
    checkedAt: "2026-11-05T08:00:00.000Z", summary: { errors: 0 },
    results: [home, read, unknown].map((url) => ({
      url, ok: true, canonicalMatches: true, robots: "index,follow"
    })),
    linkReview: { pageLinks: [
      { url: home, insideSitemap: [read, unknown] },
      { url: read, insideSitemap: [unknown, home] },
      { url: unknown, insideSitemap: [home] },
    ] },
    contentReview: { contentOverlapCandidates: [] },
  };
  return { gsc, power };
}

test("merges Google and live sitemap evidence without treating missing Google attribution as missing HTML links", () => {
  const data = buildAudit({ ...sample(), now });
  assert.equal(data.stats.total, 3);
  // Homepage remains in the full inventory, while main writing/institutional
  // pages drive the priority view. The sales lists remain out of priority.
  assert.deepEqual(data.priorityStats, {
    total: 2, indexed: 0, crawledNotIndexed: 1, unknown: 1, discoveredNotIndexed: 0,
  });
  assert.equal(data.rows.find((row) => row.url === home).priorityFamily, null);
  assert.equal(data.rows.find((row) => row.url === read).priorityFamily, "Kurumsal");
  assert.equal(data.rows.find((row) => row.url === unknown).priorityFamily, "Yazarlar");
  assert.match(markdownReport(data), /Birinci öncelik: İlkOku temel sayfaları/);
  assert.match(csvReport(data), /priorityFamily/);
  assert.equal(data.stats.indexed, 1);
  assert.equal(data.stats.unknown, 1);
  assert.equal(data.stats.crawledNotIndexed, 1);
  assert.equal(data.stats.unknownWithMultipleInlinks, 2 > 1 ? 1 : 0);
  assert.equal(data.stats.newContentCrawledNotIndexed, 1);
  assert.equal(data.stats.technicalReviewUrls, 0);
  assert.equal(data.stats.noIncomingInSitemapGraph, 0);
  assert.equal(data.sources.incomplete, false);
  assert.equal(data.rows.find((r) => r.url === unknown).incomingSitemapPages, 2);
  assert.equal(data.rows.find((r) => r.url === read).incomingSitemapPages, 1);
  assert.match(markdownReport(data), /Google bilinmiyor/);
  assert.match(csvReport(data), /incomingSitemapPages/);
});

test("detects changed Google indexing state without asserting the algorithmic cause", () => {
  const { gsc, power } = sample();
  const previousGsc = { generatedAt: "2026-11-04T10:00:00.000Z", results: [
    { inspectionUrl: home, verdict: "PASS" },
    { inspectionUrl: read, coverageState: "URL Google tarafından bilinmiyor" },
    { inspectionUrl: unknown, coverageState: "URL Google tarafından bilinmiyor" },
  ] };
  const data = buildAudit({ gsc, power, previousGsc, now });
  assert.deepEqual(data.changes, [{ path: "/nasil-calisir", from: "unknown", to: "crawled_not_indexed" }]);
});

test("stale source data is marked incomplete", () => {
  const { gsc, power } = sample();
  gsc.generatedAt = "2026-10-30T10:00:00.000Z";
  const data = buildAudit({ gsc, power, now });
  assert.equal(data.sources.incomplete, true);
});

test("sitemap mismatch and canonical error are surfaced but do not mutate site", () => {
  const { gsc, power } = sample();
  power.results = power.results.filter((row) => row.url !== unknown);
  power.results[1].canonicalMatches = false;
  const data = buildAudit({ gsc, power, now });
  assert.equal(data.sources.incomplete, true);
  assert.equal(data.stats.technicalReviewUrls, 2);
});

test("rejects duplicate GSC rows", () => {
  const { gsc, power } = sample();
  gsc.results.push(gsc.results[0]);
  assert.throws(() => buildAudit({ gsc, power, now }), /duplicated/);
});
