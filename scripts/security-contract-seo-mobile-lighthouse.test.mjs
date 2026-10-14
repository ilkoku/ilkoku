import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { makePerformanceSummary } from "./seo-mobile-lighthouse-report.mjs";

const workflow = fs.readFileSync(".github/workflows/seo-mobile-lighthouse-baseline.yml", "utf8");
const src = fs.readFileSync("scripts/seo-mobile-lighthouse-report.mjs", "utf8");

const good = {
  requestedUrl: "https://ilkoku.com/",
  finalDisplayedUrl: "https://ilkoku.com/",
  fetchTime: "2026-10-13T17:00:00.000Z",
  configSettings: { formFactor: "mobile" },
  categories: { performance: { score: 0.74 } },
  audits: {
    "largest-contentful-paint": { numericValue: 7700 },
    "first-contentful-paint": { numericValue: 1400 },
    "total-blocking-time": { numericValue: 160 },
    "cumulative-layout-shift": { numericValue: 0.03 },
    "speed-index": { numericValue: 2800 },
    "render-blocking-resources": { details: { type: "opportunity", overallSavingsMs: 900 }, title: "Blocking styles" },
  },
};

test("Reads mobile metrics precisely without substituting field data", () => {
  const d = makePerformanceSummary(good);
  assert.equal(d.performanceScore, 74);
  assert.equal(d.lcpMs, 7700);
  assert.equal(d.fcpMs, 1400);
  assert.equal(d.tbtMs, 160);
  assert.equal(d.cls, 0.03);
  assert.equal(d.opportunities[0].savingMs, 900);
  assert.match(d.source, /lab/u);
});

test("Fails closed when Lighthouse inspected wrong site, desktop or missing LCP", () => {
  assert.throws(() => makePerformanceSummary({ ...good, finalDisplayedUrl: "https://other.example/" }));
  assert.throws(() => makePerformanceSummary({ ...good, configSettings: { formFactor: "desktop" } }));
  assert.throws(() => makePerformanceSummary({ ...good, audits: { ...good.audits, "largest-contentful-paint": {} } }));
  assert.throws(() => makePerformanceSummary({ ...good, runtimeError: { code: "PAGE_HUNG" } }));
});


test("No speculative Next.js route prefetch on homepage marketing and guarded navigation", () => {
  const homepage = fs.readFileSync("src/features/homepage/HomepageExperience.tsx", "utf8");
  const header = fs.readFileSync("src/components/layout/PublicSiteHeader.tsx", "utf8");
  const navigation = fs.readFileSync("src/components/layout/PublicHeaderNavigation.tsx", "utf8");
  assert.match(homepage, /<Link\s+prefetch=\{false\}\s+href=\{role\.href\}/u, "Role registration cards do not prefetch");
  assert.match(homepage, /<Link prefetch=\{false\} href=\{primaryHref\}/u, "Hero primary CTA does not prefetch");
  assert.match(homepage, /<Link prefetch=\{false\} href=\{secondaryHref\}/u, "Hero secondary CTA does not prefetch");
  assert.match(header, /<Link\s+prefetch=\{false\}\s+className="public-site-header__brand"/u, "Home logo does not prefetch current route");
  assert.match(navigation, /<Link\s+prefetch=\{false\}\s+className="public-site-header__menu-trigger"/u, "Direct public menu links do not prefetch guarded routes");
  assert.match(navigation, /<Link\s+prefetch=\{false\}\s+className="public-site-header__mobile-category"/u, "Mobile menu links do not prefetch guarded routes");
});

test("Homepage-only legacy landing CSS is route-scoped instead of loaded on every public page", () => {
  const layout = fs.readFileSync("src/app/layout.tsx", "utf8");
  const homepage = fs.readFileSync("src/app/page.tsx", "utf8");
  const homepageOnly = [
      "landing-theme.css",
      "landing-role-icons.css",
      "landing-footer-pro.css",
      "landing-footer-tight.css",
      "landing-header-pro.css",
      "landing-account-bubble.css"
  ];
  for (const filename of homepageOnly) {
    const importStatement = 'import "./' + filename + '";';
    assert.ok(homepage.includes(importStatement), filename + " must load on the home route");
    assert.equal(layout.includes(importStatement), false, filename + " must not be loaded globally");
    const content = fs.readFileSync("src/app/" + filename, "utf8");
    assert.match(content, /\.landing-page\b/u, filename + " must remain scoped to the landing surface");
  }
  for (const monitored of ["src/app/layout.tsx", "src/app/page.tsx", "src/app/landing-*.css"]) {
    assert.ok(workflow.includes(monitored), monitored + " must trigger a new one-shot mobile Lighthouse sample after release");
  }
  assert.ok(layout.includes('import "./globals.css";'), "Shared CSS stays global");
  assert.ok(layout.includes('import "./site-contact-links.css";'), "Shared contact CSS stays global");
});

test("Lab audit runs once, outside Hostinger, never load-tests or modifies SEO policy", () => {
  for (const token of ["workflow_dispatch:", "on:", "npx --yes lighthouse@", "--form-factor=mobile", "--only-categories=performance", "WAF circuit breaker", "if: always()"]) {
    assert.ok(workflow.includes(token), "Expected low-load contract: " + token);
  }
  assert.doesNotMatch(workflow, /schedule:|workflow_run:|k6 |npm run deploy|prisma|git push/u);
  assert.match(src, /MOBILE_LIGHTHOUSE/u);
  assert.match(src, /Lighthouse simulated mobile lab run/u);
});
