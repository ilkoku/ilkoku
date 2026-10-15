import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const src = readFileSync("src/components/privacy/SiteAnalyticsLoader.tsx", "utf8");
const liveAudit = readFileSync("scripts/seo-live-consent-network-audit.mjs", "utf8");

test("Manual Worker health is probed only from the consent-approved GTM loader", () => {
  const loaderStart = src.indexOf("function loadGtm(id: string, consentRequired: boolean)");
  const providerStart = src.indexOf("function loadProviders(settings: SiteAnalyticsSettings)");
  const caller = src.slice(loaderStart, providerStart);
  assert.ok(loaderStart >= 0 && providerStart > loaderStart);
  assert.match(caller, /await gtmScriptSource\(id\)/u);
  assert.match(caller, /consentRequired && !readAnalyticsConsent\(\)/u);
  assert.match(src, /gtmScriptSource\(id: string\)/u);
  assert.match(src, /MANUAL_GTM_HEALTH_URL = "\/ilkgtm\/healthy"/u);
  assert.match(src, /cache: "no-store"/u);
  assert.match(src, /pendingGtmLoad/u);
});

test("Worker failure falls back to Google's existing direct script after consent", () => {
  assert.match(src, /https:\/\/www\.googletagmanager\.com\/gtm\.js\?id=/u);
  assert.match(src, /return fallback;/u);
  assert.match(src, /response\.ok && \(await response\.text\(\)\)\.trim\(\) === "ok"/u);
  assert.ok(src.includes("return " + String.fromCharCode(96) + "$" + "{MANUAL_GTM_PATH}?id="));
  assert.match(src, /window\.clearTimeout\(timeout\)/u);
});

test("Manual route has no pre-consent injection; audit recognizes it after acceptance", () => {
  assert.doesNotMatch(src, /HTMLRewriter|beforeInteractive|document\.write/u);
  assert.match(liveAudit, /ilkgtm/u);
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  assert.doesNotMatch(layout, /\/ilkgtm\//u);
});
