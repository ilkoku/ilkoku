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

test("public interaction is blocked before consent and after revocation", () => {
  const api = createEmitter("denied");
  assert.equal(api.emitPublicInteraction("site_cta_click", { placement: "home_hero" }), false);
  assert.equal(api.sent.length, 0);
  api.dataset.ilkokuAnalyticsConsent = "granted";
  assert.equal(api.emitPublicInteraction("site_cta_click", { placement: "home_hero" }), true);
  assert.equal(api.sent.length, 1);
  api.dataset.ilkokuAnalyticsConsent = "denied";
  assert.equal(api.emitPublicInteraction("site_cta_click", { placement: "home_hero" }), false);
  assert.equal(api.sent.length, 1);
});

test("GTM wins over direct GA4 and queues when it is still loading", () => {
  const api = createEmitter("granted", "loading", "loaded");
  assert.equal(api.emitPublicInteraction("site_contact_click", { channel: "linkedin" }), true);
  assert.equal(api.sent.length, 1);
  assert.equal(api.sent[0].event, "site_contact_click");
  assert.equal(api.sent[0].channel, "linkedin");
  assert.equal(api.direct.length, 0);
  api.dataset.ilkokuAnalyticsGtm = "loaded";
  api.emitPublicInteraction("site_contact_click", { channel: "email" });
  assert.equal(api.sent.length, 2);
  assert.equal(api.direct.length, 0);
});

test("direct GA4 only when GTM is not active", () => {
  const api = createEmitter("not-required", "disabled", "loaded");
  assert.equal(api.emitPublicInteraction("site_share_click", { channel: "whatsapp" }), true);
  assert.equal(api.sent.length, 0);
  assert.equal(api.direct.length, 1);
  assert.equal(api.direct[0][0], "event");
  assert.equal(api.direct[0][1], "site_share_click");
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
