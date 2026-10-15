// Read-only live browser audit: no account access, no Cloudflare settings changes.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

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
    if (initial.hasSavedConsent) throw Error("Fresh context unexpectedly has persisted consent");
    if (initial.appGtm || initial.appGa4) throw Error("App loaded measurement scripts before the visitor granted consent");
    const gatewayBeforeChoice = initialRequests.filter((request) => request.url.includes("/1q6z/"));
    if (gatewayBeforeChoice.length > 0) {
      throw Error("Google Tag Gateway sent " + gatewayBeforeChoice.length + " script/measurement requests before user consent");
    }

    if (choice === "reject") {
      await page.getByRole("button", { name: "Tümünü reddet" }).click();
    } else {
      await page.getByRole("button", { name: "Tümünü kabul et" }).click();
    }
    await page.waitForTimeout(choice === "accept" ? 3500 : 1600);
    const after = await snapshot();
    const afterRequests = requests.slice(initialRequests.length);
    if (choice === "reject" && afterRequests.some((request) => request.url.includes("/1q6z/"))) {
      throw Error("Rejected consent still triggered Google Tag Gateway requests");
    }
    if (choice === "reject" && (after.appGtm || after.appGa4 || after.consent === "granted")) {
      throw Error("Rejected consent nevertheless loaded first-party GTM/GA4 or marked consent granted");
    }
    if (choice === "accept" && (!after.appGtm || after.consent !== "granted")) {
      throw Error("Accepted consent did not load GTM or grant analytics_storage");
    }

    return {
      choice,
      httpStatus: code,
      initial,
      after,
      initialRequests,
      afterRequests,
      requestInitiators: initiators.slice(0, 20),
      gatewayScriptsBeforeChoice: initialRequests.filter((x) => x.url.includes("/1q6z/")).length,
      appGtmBeforeChoice: initial.appGtm,
      passed: true,
    };
  } catch (error) {
    // Preserve initiator and request evidence even if a privacy gate fails.
    throw new Error(String(error) + " | NETWORK_EVIDENCE=" + JSON.stringify(failureEvidence));
  } finally {
    await context.close();
  }
}

// Diagnostic only: prove whether a narrowly scoped no-transform response
// avoids an edge-injected gateway script. This does NOT modify visitor consent.
async function probeNoTransformHelpRoute(browser) {
  const context = await browser.newContext({ locale: "tr-TR", serviceWorkers: "block" });
  const page = await context.newPage();
  const gatewayRequests = [];
  page.on("request", (request) => {
    if (/\/1q6z(?:\/|$)/i.test(new URL(request.url()).pathname)) {
      gatewayRequests.push({ type: request.resourceType(), url: normalizeUrl(request.url()) });
    }
  });
  try {
    const response = await page.goto("https://ilkoku.com/yardim", {
      waitUntil: "domcontentloaded",
      timeout: 35_000,
    });
    const httpStatus = response?.status() || 0;
    if (httpStatus === 403 || httpStatus === 429) throw Error("WAF circuit breaker");
    if (httpStatus !== 200) throw Error("Help route HTTP " + httpStatus);
    await page.waitForTimeout(1800);
    const cacheControl = response?.headers()["cache-control"] || "";
    const probeHeader = response?.headers()["x-ilkoku-edge-probe"] || "";
    const appGtm = await page.evaluate(() => Boolean(document.getElementById("ilkoku-gtm-script")));
    const result = {
      path: "/yardim", httpStatus, cacheControl, probeHeader, appGtm,
      gatewayRequestCount: gatewayRequests.length, gatewayRequests,
      passed: probeHeader === "consent-transform-opt-out-v1" &&
        cacheControl.includes("no-transform") && gatewayRequests.length === 0 && !appGtm,
    };
    if (!result.passed) console.error("EDGE_NO_TRANSFORM_PROBE_FAILED " + JSON.stringify(result));
    else console.log("EDGE_NO_TRANSFORM_PROBE_PASSED " + JSON.stringify(result));
    return result;
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
      console.log("CONSENT_CASE " + JSON.stringify({
        choice,
        initialGatewayScripts: result.gatewayScriptsBeforeChoice,
        initialGtmScripts: result.appGtmBeforeChoice,
        endState: result.after.consent,
        appGtmAfter: result.after.appGtm,
        passed: true,
      }));
    } catch (error) {
      failed = true;
      report.cases.push({ choice, passed: false, error: String(error) });
      console.error("CONSENT_CASE_FAILED " + choice + ": " + String(error));
      // Inspect reject and accept independently: one failure must not hide
      // the second consent scenario's initiators and requests.
    }
  }
  try {
    report.noTransformProbe = await probeNoTransformHelpRoute(browser);
    if (!report.noTransformProbe.passed) failed = true;
  } catch (error) {
    failed = true;
    report.noTransformProbe = { passed: false, error: String(error) };
    console.error("EDGE_NO_TRANSFORM_PROBE_ERROR " + String(error));
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
