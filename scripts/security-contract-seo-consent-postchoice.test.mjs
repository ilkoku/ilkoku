import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { evaluateConsentAudit } from "./seo-consent-audit-rules.mjs";

const virgin = { hasSavedConsent: false, appGtm: false, appGa4: false, consent: "denied" };
const gateway = { url: "https://ilkoku.com/1q6z/{tag-script}", type: "script" };

test("Pre-consent Gateway remains a hard failure even if rejection behaves correctly", () => {
  const result = evaluateConsentAudit({
    choice: "reject", initial: virgin,
    after: { ...virgin, consent: "denied" },
    initialRequests: [gateway], afterRequests: [],
  });
  assert.equal(result.passed, false);
  assert.deepEqual(result.violations, ["GATEWAY_REQUEST_BEFORE_CONSENT"]);
  assert.equal(result.gatewayScriptsAfterChoice, 0);
});

test("Both before and after-reject Gateway failures are preserved together", () => {
  const result = evaluateConsentAudit({
    choice: "reject", initial: virgin,
    after: { ...virgin, consent: "granted", appGtm: true },
    initialRequests: [gateway], afterRequests: [gateway],
  });
  assert.equal(result.passed, false);
  assert.deepEqual(result.violations, [
    "GATEWAY_REQUEST_BEFORE_CONSENT",
    "GATEWAY_REQUEST_AFTER_REJECT",
    "MEASUREMENT_ENABLED_AFTER_REJECT",
  ]);
});

test("Accepted consent still reports post-choice GTM behavior after prior Gateway failure", () => {
  const result = evaluateConsentAudit({
    choice: "accept", initial: virgin,
    after: { ...virgin, appGtm: true, consent: "granted" },
    initialRequests: [gateway], afterRequests: [gateway],
  });
  assert.equal(result.passed, false);
  assert.deepEqual(result.violations, ["GATEWAY_REQUEST_BEFORE_CONSENT"]);
  assert.equal(result.gatewayScriptsAfterChoice, 1);
});

test("A clean accepted scenario may pass; denied or absent GTM may not", () => {
  const clean = evaluateConsentAudit({
    choice: "accept", initial: virgin,
    after: { ...virgin, appGtm: true, consent: "granted" },
    initialRequests: [], afterRequests: [],
  });
  assert.equal(clean.passed, true);
  const faulty = evaluateConsentAudit({
    choice: "accept", initial: virgin,
    after: { ...virgin, appGtm: false, consent: "denied" },
    initialRequests: [], afterRequests: [],
  });
  assert.deepEqual(faulty.violations, ["APP_GTM_NOT_LOADED_AFTER_ACCEPT"]);
});

test("Unexpected saved consent and app tags fail closed; unknown choices throw", () => {
  const result = evaluateConsentAudit({
    choice: "reject",
    initial: { ...virgin, hasSavedConsent: true, appGa4: true },
    after: virgin,
    initialRequests: [], afterRequests: [],
  });
  assert.equal(result.passed, false);
  assert.ok(result.violations.includes("FRESH_CONTEXT_ALREADY_HAS_CONSENT"));
  assert.ok(result.violations.includes("APP_TAG_LOADED_BEFORE_CONSENT"));
  assert.throws(() => evaluateConsentAudit({
    choice: "unknown", initial: virgin, after: virgin,
    initialRequests: [], afterRequests: [],
  }));
});

test("Live auditor collects after-state before evaluating failures and preserves nonzero exit", () => {
  const source = readFileSync("scripts/seo-live-consent-network-audit.mjs", "utf8");
  assert.ok(source.indexOf("const after = await snapshot()") < source.indexOf("evaluateConsentAudit({"));
  assert.match(source, /if \(!result\.passed\) failed = true;/u);
  assert.match(source, /if \(failed\) process\.exitCode = 1;/u);
});
