import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const round = (value, places = 0) => Number(value.toFixed(places));
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[1];
};

// Exact live identity is preferred. When the runner commit contains ONLY
// measurement workflow/reporter/tests, the shipped application can legitimately
// remain at the immediately preceding commit. Verify ancestry AND file list;
// never report the runner commit as deployed and never measure unshipped app code.
const MEASUREMENT_ONLY_FILES = new Set([
  ".github/workflows/seo-mobile-lighthouse-comparison.yml",
  "scripts/seo-mobile-lighthouse-comparison.mjs",
  "scripts/security-contract-seo-mobile-lighthouse.test.mjs",
]);

function fingerprint(buildInfoFile, expectedCommitSha) {
  assert.match(expectedCommitSha || "", /^[0-9a-f]{40}$/u, "Expected main commit SHA required");
  const info = JSON.parse(fs.readFileSync(buildInfoFile, "utf8"));
  const servedCommitSha = info?.commitSha;
  assert.match(servedCommitSha || "", /^[0-9a-f]{40}$/u, "Live /api/build-info must report a valid SHA");

  let metricsOnlyUnshippedFiles = [];
  if (servedCommitSha !== expectedCommitSha) {
    try {
      execFileSync("git", ["merge-base", "--is-ancestor", servedCommitSha, expectedCommitSha], { stdio: "ignore" });
    } catch {
      throw new Error("DEPLOY_NOT_LIVE: live commit is not an ancestor of the measurement runner; stop");
    }
    const difference = execFileSync("git", ["diff", "--name-only", servedCommitSha, expectedCommitSha], { encoding: "utf8" });
    const changedPaths = difference.split(/\r?\n/u).filter(Boolean);
    const unpublishedAppChanges = changedPaths.filter((path) => !MEASUREMENT_ONLY_FILES.has(path));
    assert.deepEqual(unpublishedAppChanges, [],
      "DEPLOY_NOT_LIVE: unpublished application/configuration changes, do not measure");
    metricsOnlyUnshippedFiles = changedPaths;
  }

  const result = {
    status: servedCommitSha === expectedCommitSha ? "VERIFIED_LIVE_COMMIT" : "VERIFIED_EQUIVALENT_LIVE_BUILD",
    expectedCommitSha, servedCommitSha, metricsOnlyUnshippedFiles,
    observedAt: new Date().toISOString(),
  };
  fs.writeFileSync("/tmp/ilkoku-mobile-deployment-fingerprint.json", JSON.stringify(result, null, 2));
  process.stdout.write("DEPLOYMENT_FINGERPRINT=" + JSON.stringify(result) + "\n");
}


/**
 * Distinguish Lighthouse's simulated mobile LCP phase estimates from actual
 * unthrottled Chrome request timings. Never infer a slow network request
 * solely from simulated phase numbers.
 */
export function diagnoseLcpEvidence(audits) {
  const requests = audits["network-requests"]?.details?.items;
  const traffic = Array.isArray(requests) ? requests : [];
  const documentRequest = traffic.find((entry) => entry.resourceType === "Document");
  const imageRequest = traffic.find((entry) =>
    entry.resourceType === "Image" && typeof entry.url === "string" &&
    entry.url.includes("ilkoku-hero-user-final.webp"));
  const renderBlocking = audits["render-blocking-resources"];
  const renderBlockingRows = renderBlocking?.details?.items;
  const blockingStyles = Array.isArray(renderBlockingRows)
    ? renderBlockingRows.filter((entry) => typeof entry.url === "string" &&
        /\\.css(?:[?#]|$)/u.test(entry.url))
    : [];
  const lcpTables = audits["largest-contentful-paint-element"]?.details?.items || [];
  const lcpNode = lcpTables.flatMap((entry) => Array.isArray(entry.items) ? entry.items : [])
    .find((entry) => typeof entry.node?.selector === "string")?.node;
  const discovered = audits["lcp-discovery-insight"]?.details?.items
    ?.find((entry) => entry.type === "checklist")?.items;
  const timed = (first, second) =>
    Number.isFinite(first) && Number.isFinite(second) ? Math.max(0, round(second - first)) : null;
  const transferByUrl = new Map(traffic.map((entry) => [entry.url, entry.transferSize || 0]));
  return {
    elementSelector: lcpNode?.selector ?? null,
    priorityHinted: discovered?.priorityHinted?.value === true,
    initiallyDiscoverable: discovered?.requestDiscoverable?.value === true,
    eagerlyLoaded: discovered?.eagerlyLoaded?.value === true,
    blockingCssCount: Array.isArray(renderBlockingRows) ? blockingStyles.length : null,
    blockingCssTransferBytes: Array.isArray(renderBlockingRows)
      ? Math.round(blockingStyles.reduce((sum, entry) => sum + (transferByUrl.get(entry.url) || 0), 0))
      : null,
    blockingCssEstimatedSavingsMs: Number.isFinite(renderBlocking?.numericValue)
      ? round(renderBlocking.numericValue) : null,
    heroRequestAfterDocumentEndMs: timed(documentRequest?.networkEndTime, imageRequest?.networkRequestTime),
    heroObservedNetworkMs: timed(imageRequest?.networkRequestTime, imageRequest?.networkEndTime),
  };
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
  // Scored LCP uses Lighthouse's simulated mobile model. Keep the separately
  // observed browser lab LCP for diagnosing model variability; neither is CrUX.
  const observedLcp = doc.audits["metrics"]?.details?.items?.[0]?.observedLargestContentfulPaint;
  const elementTables = doc.audits["largest-contentful-paint-element"]?.details?.items || [];
  const elementRows = elementTables.flatMap((table) => Array.isArray(table.items) ? table.items : []);
  const phaseMs = (label) => {
    const value = elementRows.find((item) => item.phase === label)?.timing;
    return Number.isFinite(value) ? round(value) : null;
  };
  const heroImage = items.find((item) => item.resourceType === "Image" &&
    typeof item.url === "string" && item.url.includes("ilkoku-hero-user-final.webp"));
  const gatewayScripts = scripts.filter((item) => /^https:\/\/ilkoku\.com\/1q6z(?:\/|[?#]|$)/u.test(item.url || ""));
  return {
    at: doc.fetchTime,
    score: round(doc.categories.performance.score * 100),
    tbtMs: round(metric("total-blocking-time")),
    lcpMs: round(metric("largest-contentful-paint")),
    observedLcpMs: Number.isFinite(observedLcp) ? round(observedLcp) : null,
    lcpSimulatedPhasesMs: {
      ttfb: phaseMs("TTFB"), loadDelay: phaseMs("Load Delay"),
      loadTime: phaseMs("Load Time"), renderDelay: phaseMs("Render Delay"),
    },
    heroImageTransferBytes: Number.isFinite(heroImage?.transferSize) ? Math.round(heroImage.transferSize) : null,
    lcpDiagnosis: diagnoseLcpEvidence(doc.audits),
    gatewayScriptTransferBytes: gatewayScripts.reduce((total, item) => total + (item.transferSize || 0), 0),
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
  const phaseNames = ["ttfb", "loadDelay", "loadTime", "renderDelay"];
  const modelPhaseMediansMs = Object.fromEntries(phaseNames.map((part) => {
    const values = runs.map((run) => run.lcpSimulatedPhasesMs[part]);
    return [part, values.every(Number.isFinite) ? median(values) : null];
  }));
  const markdown = [
    "## İlkOku — current three-run mobile Lighthouse measurement",
    "",
    "Production build verified from /api/build-info: " + fingerprint.servedCommitSha,
    "Measurement source: Lighthouse mobile simulated lab (not Chrome user field data / CrUX).",
    "",
    "| Run | Score | TBT ms | LCP ms | FCP ms | CLS | CSS transfer bytes | CSS raw bytes | CSS requests | JS transfer bytes | _rsc | Script CPU ms |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...runs.map((run, i) => "| " + (i + 1) + " | " + [run.score, run.tbtMs, run.lcpMs, run.fcpMs, run.cls, run.cssTransferBytes, run.cssResourceBytes, run.cssRequests, run.jsTransferBytes, run.rscRequests, run.scriptExecutionMs].join(" | ") + " |"),
    "| **Median** | **" + [medians.score, medians.tbtMs, medians.lcpMs, medians.fcpMs, medians.cls, medians.cssTransferBytes, medians.cssResourceBytes, medians.cssRequests, medians.jsTransferBytes, medians.rscRequests, medians.scriptExecutionMs].join("** | **") + "** |",
    "",
    "## LCP diagnosis — model versus observed browser lab",
    "",
    "The scored LCP and model phases below are SIMULATED mobile timings. Observed browser LCP is a separate unthrottled lab observation, NOT real-user CrUX data. Do not subtract phases from the observed column.",
    "",
    "| Run | Scored simulated LCP ms | Observed browser LCP ms | Model TTFB ms | Model load delay ms | Model load time ms | Model render delay ms | Hero image transfer bytes | Same-origin gateway script transfer bytes |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...runs.map((run, i) => "| " + (i + 1) + " | " + [run.lcpMs, run.observedLcpMs ?? "n/a",
      run.lcpSimulatedPhasesMs.ttfb ?? "n/a", run.lcpSimulatedPhasesMs.loadDelay ?? "n/a",
      run.lcpSimulatedPhasesMs.loadTime ?? "n/a", run.lcpSimulatedPhasesMs.renderDelay ?? "n/a",
      run.heroImageTransferBytes ?? "n/a", run.gatewayScriptTransferBytes].join(" | ") + " |"),
    "",
    "## Evidence of the actual LCP request and blocking CSS",
    "",
    "The image network timings use Chrome's OBSERVED request waterfall and are not the simulated mobile phases above.",
    "",
    "| Run | LCP element | Hero high / eager / initial | Blocking CSS files | Blocking CSS transfer bytes | CSS estimated savings ms | Hero request after document finished ms | Observed hero request duration ms |",
    "|---|---|---|---:|---:|---:|---:|---:|",
    ...runs.map((run, i) => {
      const d = run.lcpDiagnosis;
      return "| " + (i + 1) + " | " + (d.elementSelector || "unknown") + " | " +
        [d.priorityHinted, d.eagerlyLoaded, d.initiallyDiscoverable].map(Boolean).join(" / ") + " | " +
        [d.blockingCssCount ?? "n/a", d.blockingCssTransferBytes ?? "n/a",
          d.blockingCssEstimatedSavingsMs ?? "n/a", d.heroRequestAfterDocumentEndMs ?? "n/a",
          d.heroObservedNetworkMs ?? "n/a"].join(" | ") + " |";
    }),
    "",
    "Median model phase estimates (ms), computed independently: " +
      phaseNames.map((part) => part + "=" + (modelPhaseMediansMs[part] ?? "n/a")).join(", ") + ".",
    "These phase medians do not add up to the median LCP because each median can come from a different run.",
    "",
    "An observed-versus-simulated difference is NOT proof of a production rendering defect. Identify repeatable causes before changing images, shared CSS, footer, or analytics.",
    "",
    "Interpretation: three independent simulated mobile lab runs on the verified currently deployed commit. Compare with historical single runs cautiously; results cannot establish causal performance changes or Google index status.",
    "",
  ].join("\n");
  const result = { source: "simulated-mobile-lab", fingerprint, runs, medians, modelPhaseMediansMs };
  fs.writeFileSync("/tmp/ilkoku-mobile-current-three-run-comparison.json", JSON.stringify(result, null, 2));
  fs.writeFileSync("/tmp/ilkoku-mobile-current-three-run-comparison.md", markdown);
  if(process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdown);
  process.stdout.write(markdown + "\n");
}

// Unit tests can import diagnoseLcpEvidence without executing the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === "fingerprint") fingerprint(process.argv[3], process.argv[4]);
    else if (process.argv[2] === "report") report(process.argv.slice(3));
    else throw new Error("Usage: ... fingerprint <build-info.json> <commit-sha> | report <run1.json> <run2.json> <run3.json>");
  } catch (err) {
    console.error("TAMAMLANMADI: " + (err?.message || String(err)));
    process.exitCode = 1;
  }
}
