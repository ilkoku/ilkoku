import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const REQUIRED = ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index"];

function metric(audits, id) {
  const audit = audits?.[id];
  if (!audit || typeof audit.numericValue !== "number" || !Number.isFinite(audit.numericValue)) {
    throw new Error("Missing/invalid Lighthouse metric: " + id);
  }
  return audit.numericValue;
}

export function makePerformanceSummary(report) {
  assert.equal(report?.finalDisplayedUrl?.replace(/\/+$/u, ""), "https://ilkoku.com",
    "Measurement must be on the production homepage");
  assert.equal(report?.configSettings?.formFactor, "mobile", "Desktop metrics cannot substitute mobile");
  assert.equal(report?.runtimeError, undefined, "Lighthouse runtime error");
  const performance = report.categories?.performance;
  assert.ok(performance && typeof performance.score === "number", "Lighthouse performance category missing");
  const audits = report.audits;
  const lcp = metric(audits, "largest-contentful-paint");
  const fcp = metric(audits, "first-contentful-paint");
  const tbt = metric(audits, "total-blocking-time");
  const cls = metric(audits, "cumulative-layout-shift");
  const speedIndex = metric(audits, "speed-index");
  const longTasks = audits?.["long-tasks"]?.details?.items?.length ?? null;
  const opportunities = Object.entries(audits)
    .filter(([, value]) => value?.details?.type === "opportunity" &&
      Number.isFinite(value?.details?.overallSavingsMs) &&
      value.details.overallSavingsMs > 0)
    .map(([id, value]) => ({
      id, title: value.title, savingMs: Math.round(value.details.overallSavingsMs),
    }))
    .sort((a, b) => b.savingMs - a.savingMs)
    .slice(0, 8);

  const lcpAudit = audits?.["lcp-breakdown-insight"] ?? audits?.["largest-contentful-paint-element"];
  const lcpElements = lcpAudit?.details?.items?.slice(0, 2)?.map((item) =>
    item?.node?.snippet ?? item?.node?.selector ?? item?.element?.snippet ?? null,
  ).filter(Boolean) ?? [];
  return {
    measuredAt: report.fetchTime,
    source: "Lighthouse simulated mobile lab run (not CrUX field data)",
    requestedUrl: report.requestedUrl,
    finalUrl: report.finalDisplayedUrl,
    performanceScore: Math.round(performance.score * 100),
    lcpMs: Math.round(lcp),
    fcpMs: Math.round(fcp),
    tbtMs: Math.round(tbt),
    cls: Math.round(cls * 1000) / 1000,
    speedIndexMs: Math.round(speedIndex),
    longTasks,
    lcpElements,
    opportunities,
  };
}

export function printSummary(summary) {
  console.log("MOBILE_LIGHTHOUSE " + JSON.stringify(summary));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = [
      "## İlkOku — Mobile Lighthouse baseline", "",
      "**Single simulated mobile lab measurement, not actual Google ranking or Chrome field data.**", "",
      "| Metric | Result |", "| --- | ---: |",
      "| Performance | " + summary.performanceScore + " / 100 |",
      "| LCP | " + (summary.lcpMs / 1000).toFixed(2) + " s |",
      "| FCP | " + (summary.fcpMs / 1000).toFixed(2) + " s |",
      "| TBT | " + summary.tbtMs + " ms |",
      "| CLS | " + summary.cls + " |",
      "| Speed Index | " + (summary.speedIndexMs / 1000).toFixed(2) + " s |",
      "", "**Main opportunities (estimates, not additive):**", "",
      ...summary.opportunities.map((x) => "- " + x.title + ": approximately " + x.savingMs + " ms"),
      "",
      "**LCP element clues:** " + (summary.lcpElements.join(" ; ") || "not identified by this Lighthouse version"),
      "",
    ];
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, rows.join("\n"));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const input = process.argv[2];
  assert.ok(input, "Supply a Lighthouse JSON path");
  const report = JSON.parse(fs.readFileSync(input, "utf8"));
  const summary = makePerformanceSummary(report);
  fs.writeFileSync("/tmp/ilkoku-mobile-lighthouse-summary.json", JSON.stringify(summary, null, 2));
  printSummary(summary);
}
