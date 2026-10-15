// Read-only live browser audit: no account access, no Cloudflare settings changes.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { evaluateConsentAudit } from "./seo-consent-audit-rules.mjs";

const pageUrl = "https://ilkoku.com/";
const outputFile = process.env.CONSENT_AUDIT_REPORT || "/tmp/ilkoku-live-consent-network.json";
const filterUrl = (url) => /\/1q6z(?:\/|$)|googletagmanager\.com|google-analytics\.com|\/api\/site-(?:analytics|consent)/i.test(url);
const normalizeUrl = (raw) => {
  try {
    const url = new URL(raw);
    if (url.pathname.startsWith("/1q6z/") && url.pathname !== "/1q6z/") return url.origin + "/1q6z/{tag-script}";
    if (url.pathname === "/1q6z/") return url.origin + "/1q6z/";
    return url.origin + url.pathname;
  } catch { return "unknown"; }
};
const timing = () => Date.now();

async function runCase(browser, choice) {
  const context = await browser.newContext({
    locale: "tr-TR",
    serviceWorkers: "block",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const requests = [];
  const initiators = [];
  let visitStart = 0;
  let failureEvidence = null;

  page.on("request", (request) => {
    if (!filterUrl(request.url())) return;
    requests.push({
      atMs: timing() - visitStart,
      url: normalizeUrl(request.url()),
      type: request.resourceType(),
    });
  });

  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  cdp.on("Network.requestWillBeSent", (event) => {
    if (!filterUrl(event.request.url)) return;
    initiators.push({
      atMs: timing() - visitStart,
      url: normalizeUrl(event.request.url),
      kind: event.initiator?.type || "unknown",
      source: (event.initiator?.stack?.callFrames || []).slice(0, 2).map((frame) => ({
        file: normalizeUrl(frame.url || ""),
        function: frame.functionName || "",
      })),
    });
  });

  const snapshot = () => page.evaluate(() => {
    const root = document.documentElement.dataset;
    return {
      consent: root.ilkokuAnalyticsConsent || null,
      gtm: root.ilkokuAnalyticsGtm || null,
      ga4: root.ilkokuAnalyticsGa4 || null,
      hasSavedConsent: window.localStorage.getItem("ilkoku:consent:v1") !== null,
      appGtm: Boolean(document.getElementById("ilkoku-gtm-script")),
      appGa4: Boolean(document.getElementById("ilkoku-ga4-script")),
      registeredGtm: Boolean(window.google_tag_manager?.["GTM-W6NVSMNV"]),
      dynamicScripts: Array.from(document.scripts)
        .filter((script) => script.src && (/\/1q6z(?:\/|$)|googletagmanager\.com/i).test(script.src))
        .map((script) => ({
          id: script.id || null,
          src: script.src.replace(/\/1q6z\/[^/?#]+/, "/1q6z/{tag-script}").replace(/\?.*/, ""),
        })),
    };
  });

  try {
    visitStart = timing();
    const response = await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 35_000 });
    const code = response?.status() || 0;
    if (code === 403 || code === 429) throw Error("WAF circuit breaker: homepage returned HTTP " + code);
    if (code !== 200) throw Error("Homepage unavailable: HTTP " + code);

    // The live policy requires consent. Never carry existing cookies or LocalStorage
    // between the rejected and accepted visits.
    await page.getByRole("button", { name: "Tümünü reddet" }).waitFor({ state: "visible", timeout: 25_000 });
    await page.waitForFunction(() => document.documentElement.dataset.ilkokuAnalyticsGtm !== "checking", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(1600);

    const initial = await snapshot();
    const initialRequests = requests.slice();
    failureEvidence = { initial, initialRequests, requestInitiators: initiators.slice(0, 30) };
    // Capture a policy violation but DO NOT stop: rejecting/accepting must
    // still be inspected, so a CDN-injected request cannot hide duplicate
    // requests or invalid consent state after the actual visitor action.
    if (choice === "reject") {
      await page.getByRole("button", { name: "Tümünü reddet" }).click();
    } else {
      await page.getByRole("button", { name: "Tümünü kabul et" }).click();
    }
    await page.waitForTimeout(choice === "accept" ? 3500 : 1600);
    const after = await snapshot();
    const afterRequests = requests.slice(initialRequests.length);
    const evaluation = evaluateConsentAudit({
      choice, initial, after, initialRequests, afterRequests,
    });

    return {
      choice,
      httpStatus: code,
      initial,
      after,
      initialRequests,
      afterRequests,
      requestInitiators: initiators.slice(0, 20),
      gatewayScriptsBeforeChoice: evaluation.gatewayScriptsBeforeChoice,
      gatewayScriptsAfterChoice: evaluation.gatewayScriptsAfterChoice,
      appGtmBeforeChoice: initial.appGtm,
      passed: evaluation.passed,
      violations: evaluation.violations,
    };
  } catch (error) {
    // Preserve initiator and request evidence even if a privacy gate fails.
    throw new Error(String(error) + " | NETWORK_EVIDENCE=" + JSON.stringify(failureEvidence));
  } finally {
    await context.close();
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  page: pageUrl,
  policy: "Read-only evidence; two isolated virgin browser contexts, no Cloudflare configuration changes",
  cases: [],
};
let failed = false;
let browser;
try {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  for (const choice of ["reject", "accept"]) {
    try {
      const result = await runCase(browser, choice);
      report.cases.push(result);
      if (!result.passed) failed = true;
      const evidenceSummary = {
        choice,
        initialGatewayScripts: result.gatewayScriptsBeforeChoice,
        postChoiceGatewayScripts: result.gatewayScriptsAfterChoice,
        initialGtmScripts: result.appGtmBeforeChoice,
        endState: result.after.consent,
        appGtmAfter: result.after.appGtm,
        registeredGtmBefore: result.initial.registeredGtm,
        registeredGtmAfter: result.after.registeredGtm,
        gtmStateAfter: result.after.gtm,
        passed: result.passed,
        violations: result.violations,
      };
      console.log((result.passed ? "CONSENT_CASE " : "CONSENT_CASE_FAILED ") + JSON.stringify(evidenceSummary));
    } catch (error) {
      failed = true;
      report.cases.push({ choice, passed: false, error: String(error) });
      console.error("CONSENT_CASE_FAILED " + choice + ": " + String(error));
      // Inspect reject and accept independently: one failure must not hide
      // the second consent scenario's initiators and requests.
    }
  }
} catch (error) {
  failed = true;
  report.setupError = String(error);
  console.error("CONSENT_AUDIT_FAILED " + String(error));
} finally {
  await browser?.close();
  await mkdir(outputFile.slice(0, outputFile.lastIndexOf("/")), { recursive: true });
  await writeFile(outputFile, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log("CONSENT_AUDIT_REPORT=" + outputFile);
}
if (failed) process.exitCode = 1;
