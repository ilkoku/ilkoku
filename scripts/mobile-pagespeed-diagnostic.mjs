import fs from "node:fs";

const url = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https%3A%2F%2Filkoku.com%2F&strategy=mobile&category=performance";
const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
const text = await response.text();
if (!response.ok) {
  console.log("PAGESPEED_DIAG_ERROR", response.status, text.slice(0, 2000));
  process.exit(0);
}
const data = JSON.parse(text);
const lhr = data.lighthouseResult;
const a = lhr.audits;
const pick = (id) => ({
  score: a[id]?.score,
  displayValue: a[id]?.displayValue,
  numericValue: a[id]?.numericValue,
});
console.log("PAGESPEED_DIAG", JSON.stringify({
  fetchedAt: data.analysisUTCTimestamp,
  lighthouseVersion: lhr.lighthouseVersion,
  performance: Math.round((lhr.categories.performance.score || 0) * 100),
  fcp: pick("first-contentful-paint"),
  lcp: pick("largest-contentful-paint"),
  tbt: pick("total-blocking-time"),
  cls: pick("cumulative-layout-shift"),
  speedIndex: pick("speed-index"),
  interactive: pick("interactive"),
  serverResponse: pick("server-response-time")
}));
