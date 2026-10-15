import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { classifyGa4Request, summarizeHits } from "./seo-ga4-live-hit-rules.mjs";

test("First-party GA4 page_view is recognized without user/session parameters", () => {
  const record = classifyGa4Request("https://ilkoku.com/ilkgtm/g/collect?v=2&tid=G-MCF2YN9SL8&en=page_view&cid=SECRET&dl=https%3A%2F%2Filkoku.com%2Ffoo");
  assert.deepEqual(record, { type: "ga4-hit", firstParty: true, event: "page_view", measurement: "G-MCF2YN9SL8" });
  assert.doesNotMatch(JSON.stringify(record), /SECRET|cid|dl=/);
});

test("Third-party GA4 requests count but arbitrary domains cannot", () => {
  assert.equal(classifyGa4Request("https://www.google-analytics.com/g/collect?en=page_view").type, "ga4-hit");
  assert.equal(classifyGa4Request("https://analytics.google.com/g/collect?en=form_submit").event, "form_submit");
  assert.equal(classifyGa4Request("https://evil.example/g/collect?en=page_view"), null);
  assert.equal(classifyGa4Request("garbage"), null);
});

test("Tag config and health are not incorrectly reported as GA4 events", () => {
  assert.equal(classifyGa4Request("https://ilkoku.com/ilkgtm/ag/g/c?x=1").type, "tag-configuration");
  assert.equal(classifyGa4Request("https://ilkoku.com/ilkgtm/healthy").type, "gateway-health");
  assert.equal(classifyGa4Request("https://ilkoku.com/ilkgtm/tyfn-random"), null);
});

test("Aggregate only GA4 collection endpoints and successful HTTP response count", () => {
  const example = [
    { ...classifyGa4Request("https://ilkoku.com/ilkgtm/g/collect?en=page_view"), status: 204 },
    { ...classifyGa4Request("https://ilkoku.com/ilkgtm/g/collect?en=page_view"), status: 200 },
    { ...classifyGa4Request("https://ilkoku.com/ilkgtm/g/collect?en=click"), status: 503 },
    { type: "tag-configuration", status: 200 }
  ];
  assert.deepEqual(summarizeHits(example), {
    count: 3, events: { page_view: 2, click: 1 }, firstPartyCount: 3, status2xx: 2
  });
});

test("Browser GA4 audit does not submit forms, inject synthetic hits or log raw URLs", () => {
  const script = readFileSync("scripts/seo-ga4-live-hit-audit.mjs", "utf8");
  assert.match(script, /"Tümünü reddet"/);
  assert.match(script, /"Tümünü kabul et"/);
  assert.match(script, /\/nasil-calisir/);
  assert.doesNotMatch(script, /\.fill\(|\.submit\(|gtag\("event"|api\/debug|localStorage\.setItem/);
  assert.match(script, /GA4_HIT_BEFORE_CONSENT/);
  assert.match(script, /NO_GA4_HITS_AFTER_ACCEPT/);
});
