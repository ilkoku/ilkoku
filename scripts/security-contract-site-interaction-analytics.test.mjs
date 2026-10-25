import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = "src/lib/site-interaction-events.ts";
const source = readFileSync(root, "utf8");
const interaction = readFileSync("src/components/privacy/SiteInteractionAnalytics.tsx", "utf8");
const layout = readFileSync("src/app/layout.tsx", "utf8");
const cms = readFileSync("src/components/content/PublicCmsPageBlocks.tsx", "utf8");
const share = readFileSync("src/features/reading/components/WorkShareActions.tsx", "utf8");

function createEmitter(consent = "denied", gtm = "loaded", ga4 = "disabled") {
  const sent = [];
  const direct = [];
  const sandbox = {
    exports: {},
    require: (name) => {
      assert.equal(name, "@/lib/site-analytics-settings");
      return { ILKOKU_GA4_ID: "G-MCF2YN9SL8" };
    },
    document: { documentElement: { dataset: {
      ilkokuAnalyticsConsent: consent,
      ilkokuAnalyticsGtm: gtm,
      ilkokuAnalyticsGa4: ga4,
    } } },
    window: {
      dataLayer: sent,
      gtag: (...args) => direct.push(args),
    },
  };
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(compiled, sandbox, { timeout: 1000 });
  return { sent, direct, ...sandbox.exports, dataset: sandbox.document.documentElement.dataset };
}

test("site events never send before consent and remain blocked after revocation", () => {
  const api = createEmitter("denied");
  assert.equal(api.emitPublicInteraction("site_cta_click", { placement: "home_hero" }), false);
  assert.equal(api.sent.length, 0);
  assert.equal(api.direct.length, 0);
  api.dataset.ilkokuAnalyticsConsent = "granted";
  assert.equal(api.emitPublicInteraction("site_cta_click", { placement: "home_hero" }), true);
  assert.equal(api.direct.length, 1);
  assert.equal(api.direct[0][2].send_to, "G-MCF2YN9SL8");
  api.dataset.ilkokuAnalyticsConsent = "denied";
  assert.equal(api.emitPublicInteraction("site_cta_click", { placement: "home_hero" }), false);
  assert.equal(api.direct.length, 1);
  assert.equal(api.sent.length, 0);
});

test("GTM routes allowlisted events to its existing GA4 tag with no duplicate custom event", () => {
  const api = createEmitter("granted", "loading", "loaded");
  assert.equal(api.emitPublicInteraction("site_contact_click", { channel: "linkedin" }), true);
  assert.equal(api.sent.length, 0);
  assert.equal(api.direct.length, 1);
  assert.equal(api.direct[0][0], "event");
  assert.equal(api.direct[0][1], "site_contact_click");
  assert.equal(api.direct[0][2].channel, "linkedin");
  assert.equal(api.direct[0][2].send_to, "G-MCF2YN9SL8");
  api.dataset.ilkokuAnalyticsGtm = "loaded";
  api.emitPublicInteraction("site_contact_click", { channel: "email" });
  assert.equal(api.direct.length, 2);
  assert.equal(api.direct[1][2].send_to, "G-MCF2YN9SL8");
  assert.equal(api.sent.length, 0, "GTM custom-event tag must not be triggered twice");
});

test("GA4-only fallback preserves existing direct event delivery, no extra pageview", () => {
  const api = createEmitter("not-required", "disabled", "loaded");
  assert.equal(api.emitPublicInteraction("site_share_click", { channel: "whatsapp", placement: "work_share" }), true);
  assert.equal(api.sent.length, 0);
  assert.equal(api.direct[0][0], "event");
  assert.equal(api.direct[0][1], "site_share_click");
  assert.equal(api.direct[0][2].channel, "whatsapp");
  assert.equal(api.direct.filter(row => row[1] === "page_view" || row[0] === "config").length, 0);
});

test("unknown attributes and arbitrary visitor values never leave the page", () => {
  const api = createEmitter("granted");
  assert.equal(api.emitPublicInteraction("site_cta_click", { placement: "https://example.com/?email=secret" }), false);
  assert.equal(api.emitPublicInteraction("site_contact_click", { channel: "linkedin", email: "private@example.com" }), false);
  assert.equal(api.emitPublicInteraction("site_form_success", { form: "invalid" }), false);
  assert.equal(api.emitPublicInteraction("site_share_click", { channel: "whatsapp" }), false);
  assert.equal(api.sent.length, 0);
  assert.equal(api.direct.length, 0);
});

test("public layout registers one global delegated event tracker", () => {
  assert.equal(layout.split("<SiteInteractionAnalytics />").length - 1, 1);
  assert.match(layout, /import \{ SiteInteractionAnalytics \}/);
  assert.match(interaction, /document\.addEventListener\("click", onClick\)/);
  assert.match(interaction, /document\.addEventListener\("submit", onSubmit\)/);
  assert.match(interaction, /document\.removeEventListener\("click", onClick\)/);
  assert.match(interaction, /document\.removeEventListener\("submit", onSubmit\)/);
  for (const channel of ["email", "phone", "whatsapp", "linkedin"]) {
    assert.match(interaction, new RegExp('"' + channel + '"'));
  }
  assert.match(cms, /data-site-analytics-cta="cms"/);
  const homepage = readFileSync("src/features/homepage/HomepageExperience.tsx", "utf8");
  for (const selector of [".nx-hero__actions", ".nx-role-grid", ".nx-passport__copy"]) {
    assert.ok(interaction.includes(selector), `homepage CTA ${selector} must be classified`);
    assert.ok(homepage.includes(selector.slice(1)), `homepage must still render ${selector}`);
  }
  const trust = readFileSync("src/components/content/HowItWorksExperience.tsx", "utf8");
  assert.ok(interaction.includes(".how-hero__actions"));
  assert.ok(trust.includes("how-button--primary"));
  assert.match(share, /emitPublicInteraction\("site_share_click", \{ channel: "whatsapp"/);
});

test("form conversion requires valid POST intent, fresh marker and server success redirect", () => {
  assert.match(interaction, /form\.getAttribute\("action"\) !== "\/api\/site-contact"/);
  assert.match(interaction, /form\.method\.toLowerCase\(\) !== "post"/);
  assert.match(interaction, /!form\.checkValidity\(\)/);
  assert.match(interaction, /CONTACT_MARKER_MAX_AGE_MS = 10 \* 60 \* 1000/);
  assert.match(interaction, /status !== "alindi" \|\| !hasFreshPendingContact\(\)/);
  assert.match(interaction, /emitPublicInteraction\("site_form_success"/);
  assert.match(interaction, /clearPendingContact\(\);/);
  assert.doesNotMatch(interaction, /formData\(|\.value\b|\.submit\(|\.requestSubmit\(|fetch\("\/api\/site-contact"/);
  assert.doesNotMatch(source + interaction, /(?:user_email|phone_number|first_name|last_name|message_body|page_location)\s*:/);
});
