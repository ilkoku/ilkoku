import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { makePerformanceSummary } from "./seo-mobile-lighthouse-report.mjs";

const workflow = fs.readFileSync(".github/workflows/seo-mobile-lighthouse-baseline.yml", "utf8");
const src = fs.readFileSync("scripts/seo-mobile-lighthouse-report.mjs", "utf8");

const good = {
  requestedUrl: "https://ilkoku.com/",
  finalDisplayedUrl: "https://ilkoku.com/",
  fetchTime: "2026-10-13T17:00:00.000Z",
  configSettings: { formFactor: "mobile" },
  categories: { performance: { score: 0.74 } },
  audits: {
    "largest-contentful-paint": { numericValue: 7700 },
    "first-contentful-paint": { numericValue: 1400 },
    "total-blocking-time": { numericValue: 160 },
    "cumulative-layout-shift": { numericValue: 0.03 },
    "speed-index": { numericValue: 2800 },
    "render-blocking-resources": { details: { type: "opportunity", overallSavingsMs: 900 }, title: "Blocking styles" },
  },
};

test("Reads mobile metrics precisely without substituting field data", () => {
  const d = makePerformanceSummary(good);
  assert.equal(d.performanceScore, 74);
  assert.equal(d.lcpMs, 7700);
  assert.equal(d.fcpMs, 1400);
  assert.equal(d.tbtMs, 160);
  assert.equal(d.cls, 0.03);
  assert.equal(d.opportunities[0].savingMs, 900);
  assert.match(d.source, /lab/u);
});

test("Fails closed when Lighthouse inspected wrong site, desktop or missing LCP", () => {
  assert.throws(() => makePerformanceSummary({ ...good, finalDisplayedUrl: "https://other.example/" }));
  assert.throws(() => makePerformanceSummary({ ...good, configSettings: { formFactor: "desktop" } }));
  assert.throws(() => makePerformanceSummary({ ...good, audits: { ...good.audits, "largest-contentful-paint": {} } }));
  assert.throws(() => makePerformanceSummary({ ...good, runtimeError: { code: "PAGE_HUNG" } }));
});

test("Lab audit runs once, outside Hostinger, never load-tests or modifies SEO policy", () => {
  for (const token of ["workflow_dispatch:", "on:", "npx --yes lighthouse@", "--form-factor=mobile", "--only-categories=performance", "WAF circuit breaker", "if: always()"]) {
    assert.ok(workflow.includes(token), "Expected low-load contract: " + token);
  }
  assert.doesNotMatch(workflow, /schedule:|workflow_run:|k6 |npm run deploy|prisma|git push/u);
  assert.match(src, /MOBILE_LIGHTHOUSE/u);
  assert.match(src, /Lighthouse simulated mobile lab run/u);
});
