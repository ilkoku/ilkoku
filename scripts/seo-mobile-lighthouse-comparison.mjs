import assert from "node:assert/strict";
import fs from "node:fs";

const LEGACY = {
  "error": "4f2a9f97f5ae944d",
  "global-error": "d488dd9a7b97f67c",
};

const LEGACY_HOMEPAGE_CSS = [
  "728ad4a8d248521d.css",
  "616c93a03e23480b.css",
  "93eae98f85f26c45.css",
  "e18276ad93330b4b.css",
  "bf00e15a432f2fe1.css",
  "06d1af4e11fd8a11.css",
];

const PREVIOUS_THREE_RUN_CSS_MEDIAN = 63167;

const BASELINE = {
  score: 35,
  tbtMs: 3156,
  lcpMs: 5347.49,
  fcpMs: 4395.49,
  jsTransferBytes: 506779,
  rscRequests: 9,
  scriptExecutionMs: 1690.852,
};

const round = (value, places = 0) => Number(value.toFixed(places));
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[1];
};

function fingerprint(htmlFile) {
  const html = fs.readFileSync(htmlFile, "utf8");
  const chunks = [...new Set(
    [...html.matchAll(/\/_next\/static\/chunks\/app\/(?:global-error|error)-[a-f0-9]+\.js/g)]
      .map((match) => match[0]),
  )];
  const error = chunks.find((item) => /\/app\/error-/.test(item));
  const globalError = chunks.find((item) => /\/app\/global-error-/.test(item));
  if (!error || !globalError) {
    throw new Error("DEPLOY_NOT_VERIFIABLE: The initial HTML has no explicit app/error and app/global-error chunk signatures. Do not attribute Lighthouse results to PR #1693.");
  }
  if (error.includes(LEGACY.error) || globalError.includes(LEGACY["global-error"])) {
    throw new Error("DEPLOY_OLD: Homepage still references one or both original #1693-prechange error chunks. Defer measurements.");
  }
  const cssLinks = [...new Set([...html.matchAll(/\/_next\/static\/css\/[a-f0-9]+\.css/g)].map((match) => match[0]))];
  if (cssLinks.length === 0) throw new Error("DEPLOY_NOT_VERIFIABLE: Homepage has no CSS fingerprint.");
  if (LEGACY_HOMEPAGE_CSS.every((name) => cssLinks.some((url) => url.endsWith(name)))) {
    throw new Error("DEPLOY_OLD_CSS: Homepage still uses all six pre-PR #1698 stylesheet hashes.");
  }
  const result = {status: "NEW_CSS_AND_ERROR_CHUNKS", error, globalError, cssLinks, baseline: LEGACY};
  fs.writeFileSync("/tmp/ilkoku-mobile-deployment-fingerprint.json", JSON.stringify(result, null, 2));
  process.stdout.write("DEPLOYMENT_FINGERPRINT=" + JSON.stringify(result) + "\n");
}

function parseLhr(file) {
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(new URL(doc.finalDisplayedUrl || doc.finalUrl).origin, "https://ilkoku.com", "unexpected Lighthouse origin");
  assert.equal(doc.configSettings.formFactor, "mobile", "desktop results are not comparable");
  if (doc.runtimeError) throw new Error("Lighthouse reported " + JSON.stringify(doc.runtimeError));
  const metric = (name) => {
    const value = doc.audits?.[name]?.numericValue;
    if (!Number.isFinite(value)) throw new Error("Missing numeric Lighthouse audit: " + name);
    return value;
  };
  const items = doc.audits["network-requests"]?.details?.items;
  if (!Array.isArray(items)) throw new Error("Missing Lighthouse network request data");
  const scripts = items.filter((item) => item.resourceType === "Script");
  const styles = items.filter((item) => item.resourceType === "Stylesheet");
  const breakdown = doc.audits["mainthread-work-breakdown"]?.details?.items || [];
  const scriptEval = breakdown.find((item) => item.group === "scriptEvaluation");
  const errorAssets = scripts.map((item) => item.url).filter((url) => /\/app\/(?:error|global-error)-/.test(url));
  return {
    at: doc.fetchTime,
    score: round(doc.categories.performance.score * 100),
    tbtMs: round(metric("total-blocking-time")),
    lcpMs: round(metric("largest-contentful-paint")),
    fcpMs: round(metric("first-contentful-paint")),
    cls: round(metric("cumulative-layout-shift"), 4),
    jsTransferBytes: Math.round(scripts.reduce((total, item) => total + (item.transferSize || 0), 0)),
    jsRequests: scripts.length,
    cssTransferBytes: Math.round(styles.reduce((total, item) => total + (item.transferSize || 0), 0)),
    cssResourceBytes: Math.round(styles.reduce((total, item) => total + (item.resourceSize || 0), 0)),
    cssRequests: styles.length,
    rscRequests: items.filter((item) => item.url && item.url.includes("_rsc=")).length,
    scriptExecutionMs: round(metric("bootup-time")),
    mainThreadMs: round(metric("mainthread-work-breakdown")),
    scriptEvaluationMs: scriptEval ? round(scriptEval.duration) : null,
    errorAssets,
  };
}

function report(files) {
  assert.equal(files.length, 3, "Three separate Lighthouse runs required");
  const fingerprint = JSON.parse(fs.readFileSync("/tmp/ilkoku-mobile-deployment-fingerprint.json", "utf8"));
  const runs = files.map(parseLhr);
  const fields = ["score", "tbtMs", "lcpMs", "fcpMs", "cls", "jsTransferBytes", "jsRequests", "cssTransferBytes", "cssResourceBytes", "cssRequests", "rscRequests", "scriptExecutionMs", "mainThreadMs"];
  const medians = Object.fromEntries(fields.map((name) => [name, median(runs.map((run) => run[name]))]));
  const markdown = [
    "## İlkOku — mobile Lighthouse after scoped book-showcase CSS (#1698)",
    "",
    "Deployment evidence: new homepage error chunks: " + fingerprint.error + ", " + fingerprint.globalError,
    "",
    "| Run | Score | TBT ms | LCP ms | FCP ms | CLS | CSS transfer bytes | CSS raw bytes | CSS requests | JS transfer bytes | _rsc | Script CPU ms |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...runs.map((run, i) => "| " + (i+1) + " | " + [run.score,run.tbtMs,run.lcpMs,run.fcpMs,run.cls,run.cssTransferBytes,run.cssResourceBytes,run.cssRequests,run.jsTransferBytes,run.rscRequests,run.scriptExecutionMs].join(" | ") + " |"),
    "| **Median** | **" + [medians.score,medians.tbtMs,medians.lcpMs,medians.fcpMs,medians.cls,medians.cssTransferBytes,medians.cssResourceBytes,medians.cssRequests,medians.jsTransferBytes,medians.rscRequests,medians.scriptExecutionMs].join("** | **") + "** |",
    "",
    "CSS transfer (previous #1694 three-run median vs new three-run median): " + PREVIOUS_THREE_RUN_CSS_MEDIAN + " vs " + medians.cssTransferBytes + " bytes; change " + (medians.cssTransferBytes - PREVIOUS_THREE_RUN_CSS_MEDIAN) + " bytes.",
    "",
    "Historical comparison (single 2026-10-13 baseline run, not a before-median):",
    "",
    "| Metric | Prior single run | New three-run median | Difference |",
    "|---|---:|---:|---:|",
    ...["score","tbtMs","lcpMs","fcpMs","jsTransferBytes","rscRequests","scriptExecutionMs"].map((key) =>
      "| " + key + " | " + BASELINE[key] + " | " + medians[key] + " | " + round(medians[key]-BASELINE[key],2) + " |"),
    "",
    "Interpretation: These are simulated mobile *lab* measures (not CrUX). A three-run median versus one earlier run cannot prove causal improvement; actual load and server response can vary. No assertion of TBT resolution without sustained, repeatable reduction.",
    "",
  ].join("\n");
  const result = {source:"simulated-mobile-lab",before:BASELINE,fingerprint,runs,medians,comparison:Object.fromEntries(Object.keys(BASELINE).map((k)=>[k,round(medians[k]-BASELINE[k],2)]))};
  fs.writeFileSync("/tmp/ilkoku-mobile-three-run-comparison.json", JSON.stringify(result,null,2));
  fs.writeFileSync("/tmp/ilkoku-mobile-three-run-comparison.md",markdown);
  if(process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdown);
  process.stdout.write(markdown + "\n");
}

try {
  if (process.argv[2] === "fingerprint") fingerprint(process.argv[3]);
  else if (process.argv[2] === "report") report(process.argv.slice(3));
  else throw new Error("Usage: ... fingerprint <html> | report <run1.json> <run2.json> <run3.json>");
} catch(err) {
  console.error("TAMAMLANMADI: " + (err?.message || String(err)));
  process.exitCode=1;
}
