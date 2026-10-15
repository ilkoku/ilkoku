// Read-only GA4 hit audit. Does not send artificial events or submit forms.
// Requests are classified in memory and stripped of cookies, IDs and query
// strings before being written to a report. Two fresh browser contexts.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { classifyGa4Request, summarizeHits } from "./seo-ga4-live-hit-rules.mjs";

const output = process.env.GA4_HIT_AUDIT_REPORT || "/tmp/ilkoku-ga4-live-hit-audit.json";
const homepage = "https://ilkoku.com/";
const internalPage = "https://ilkoku.com/nasil-calisir";
const scriptTagId = "ilkoku-gtm-script";
const delay = (page, ms) => page.waitForTimeout(ms);

async function auditCase(browser, choice) {
  const context = await browser.newContext({
    locale: "tr-TR", serviceWorkers: "block", reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const requests = [];
  const indexed = new WeakMap();
  let phase = "before-choice";
  let started = Date.now();

  page.on("request", (request) => {
    // Read POST only in memory. The classifier persists allowlisted event
    // names and a public tag ID, never user/session fields or the raw body.
    const parsed = classifyGa4Request(request.url(), request.postData() || "");
    if (!parsed) return;
    const entry = { phase, atMs: Date.now() - started, ...parsed, method: request.method(), status: null };
    indexed.set(request, entry);
    requests.push(entry);
  });
  page.on("response", (response) => {
    const entry = indexed.get(response.request());
    if (entry) entry.status = response.status();
  });

  const snapshot = () => page.evaluate((scriptId) => {
    const dataset = document.documentElement.dataset;
    const script = document.getElementById(scriptId);
    let scriptOriginPath = null;
    if (script && script.getAttribute("src")) {
      try {
        const parsed = new URL(script.getAttribute("src"), window.location.origin);
        scriptOriginPath = parsed.origin + parsed.pathname;
      } catch { scriptOriginPath = "malformed"; }
    }
    const dataLayerEvents = [];
    for (const item of (window.dataLayer || [])) {
      if (!item || typeof item !== "object") continue;
      if (typeof item.event === "string" && /^[A-Za-z0-9_.-]{1,80}$/.test(item.event)) {
        dataLayerEvents.push(item.event);
      }
    }
    return {
      path: location.pathname,
      consent: dataset.ilkokuAnalyticsConsent || null,
      gtm: dataset.ilkokuAnalyticsGtm || null,
      ga4: dataset.ilkokuAnalyticsGa4 || null,
      appGtm: Boolean(script),
      appGtmSource: scriptOriginPath,
      dataLayerEvents: dataLayerEvents.slice(-30),
    };
  }, scriptTagId);

  try {
    started = Date.now();
    const response = await page.goto(homepage, { waitUntil: "domcontentloaded", timeout: 35_000 });
    if (response?.status() !== 200) throw Error("HOME_HTTP_" + (response?.status() || "no-response"));
    const button = page.getByRole("button", { name: choice === "reject" ? "Tümünü reddet" : "Tümünü kabul et" });
    await button.waitFor({ state: "visible", timeout: 25_000 });
    await delay(page, 1500);
    const before = await snapshot();
    if (before.consent !== "denied" || before.appGtm) {
      throw Error("CONSENT_DEFAULT_OR_GTM_BEFORE_CHOICE_INVALID");
    }

    phase = "after-" + choice;
    await button.click();
    await delay(page, choice === "accept" ? 6000 : 2500);
    const after = await snapshot();

    let navigation = null;
    if (choice === "accept") {
      phase = "internal-navigation";
      const follow = await page.goto(internalPage, { waitUntil: "domcontentloaded", timeout: 35_000 });
      if (follow?.status() !== 200) throw Error("INTERNAL_PAGE_HTTP_" + (follow?.status() || "no-response"));
      await delay(page, 5500);
      navigation = await snapshot();
    }

    // A real browser click on a public, internal CTA. Prevent navigation only
    // for this QA session; never submit forms, open an external site or inject
    // gtag/dataLayer events. Observe dataLayer AND actual GA4 network hits.
    let ctaSnapshot = null;
    if (choice === "accept") {
      const safeCta = page.locator(".how-hero__actions a").first();
      if (await safeCta.count()) {
        await safeCta.evaluate((anchor) => {
          anchor.addEventListener("click", (event) => event.preventDefault(), { capture: true, once: true });
        });
        phase = "safe-cta-click";
        await safeCta.click();
        await delay(page, 3500);
        ctaSnapshot = await snapshot();
      }
    }
    const byPhase = Object.fromEntries([...new Set(requests.map(item => item.phase))].map((key) => [
      key, summarizeHits(requests.filter(item => item.phase === key))
    ]));
    const beforeHits = summarizeHits(requests.filter(item => item.phase === "before-choice")).count;
    const rejectHits = summarizeHits(requests.filter(item => item.phase === "after-reject")).count;
    const afterHits = summarizeHits(requests.filter(item => item.phase === "after-accept")).count;
    const navigationHits = summarizeHits(requests.filter(item => item.phase === "internal-navigation")).count;
    const pageViewCount = requests.filter(item => item.event === "page_view").length;
    const ctaEvidence = choice === "accept" ? {
      clickPerformed: Boolean(ctaSnapshot),
      dataLayerEventPresent: Boolean(ctaSnapshot?.dataLayerEvents.includes("site_cta_click")),
      ga4HitCount: requests.filter(item =>
        item.phase === "safe-cta-click" && item.event === "site_cta_click").length,
    } : null;

    const violations = [];
    if (beforeHits > 0) violations.push("GA4_HIT_BEFORE_CONSENT");
    if (choice === "reject") {
      if (afterHits > 0 || rejectHits > 0) violations.push("GA4_HIT_AFTER_REJECT");
      if (after.consent !== "denied" || after.appGtm) violations.push("REJECT_CONSENT_STATE_INVALID");
    } else {
      if (after.consent !== "granted" || after.gtm !== "loaded") violations.push("ACCEPT_GTM_NOT_READY");
      if (afterHits + navigationHits === 0) violations.push("NO_GA4_HITS_AFTER_ACCEPT");
      if (pageViewCount === 0) violations.push("NO_PAGE_VIEW_HIT");
    }
    return {
      choice, passed: violations.length === 0, violations,
      before, after, navigation, ctaEvidence,
      byPhase, pageViewCount, requests
    };
  } finally {
    await context.close();
  }
}

const report = { checkedAt: new Date().toISOString(), source: "fresh-browser-network",
  purpose: "Observe real GA4 hits and one safe internal CTA click; no injected analytics events, forms or outbound clicks",
  cases: [] };
let failed = false;
let browser;
try {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  for (const choice of ["reject", "accept"]) {
    try {
      const result = await auditCase(browser, choice);
      report.cases.push(result);
      if (!result.passed) failed = true;
      console.log("GA4_HIT_CASE " + JSON.stringify({
        choice, passed: result.passed, violations: result.violations,
        before: { consent: result.before.consent, appGtm: result.before.appGtm },
        after: { consent: result.after.consent, gtm: result.after.gtm, ga4: result.after.ga4,
          appGtm: result.after.appGtm, appGtmSource: result.after.appGtmSource,
          dataLayerEvents: result.after.dataLayerEvents },
        pageViewHits: result.pageViewCount,
        ctaEvidence: result.ctaEvidence,
        byPhase: result.byPhase
      }));
    } catch (error) {
      failed = true;
      report.cases.push({ choice, passed: false, error: String(error) });
      console.error("GA4_HIT_AUDIT_CASE_ERROR " + choice + " " + String(error));
    }
  }
} finally {
  await browser?.close();
  await mkdir(output.slice(0, output.lastIndexOf("/")), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + "\n");
  console.log("GA4_HIT_AUDIT_REPORT=" + output);
}
if (failed) process.exitCode = 1;
