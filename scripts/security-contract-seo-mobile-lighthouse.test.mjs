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


test("LCP hero is the only prioritized image; visible site logo remains eager", () => {
  const header = fs.readFileSync("src/components/layout/PublicSiteHeader.tsx", "utf8");
  const hero = fs.readFileSync("src/features/homepage/HomepageExperience.tsx", "utf8");
  assert.equal((header.match(/loading="eager"/gu) || []).length, 2, "Both logo sources remain eagerly loaded");
  assert.doesNotMatch(header, /\bpriority\b/u, "Header logo must not compete with LCP preload");
  assert.match(hero, /fill priority fetchPriority="high"/u, "LCP illustration retains preload and high priority");
});

test("No speculative Next.js route prefetch on homepage marketing and guarded navigation", () => {
  const homepage = fs.readFileSync("src/features/homepage/HomepageExperience.tsx", "utf8");
  const header = fs.readFileSync("src/components/layout/PublicSiteHeader.tsx", "utf8");
  const navigation = fs.readFileSync("src/components/layout/PublicHeaderNavigation.tsx", "utf8");
  assert.match(homepage, /<Link\s+prefetch=\{false\}\s+href=\{role\.href\}/u, "Role registration cards do not prefetch");
  assert.match(homepage, /<Link prefetch=\{false\} href=\{primaryHref\}/u, "Hero primary CTA does not prefetch");
  assert.match(homepage, /<Link prefetch=\{false\} href=\{secondaryHref\}/u, "Hero secondary CTA does not prefetch");
  assert.match(header, /<Link\s+prefetch=\{false\}\s+className="public-site-header__brand"/u, "Home logo does not prefetch current route");
  assert.match(navigation, /<Link\s+prefetch=\{false\}\s+href=\{link\.href\}/u, "Opening mega menu does not prefetch every destination");
  assert.match(navigation, /<Link\s+prefetch=\{false\}\s+className="public-site-header__menu-trigger"/u, "Direct public menu links do not prefetch guarded routes");
  assert.match(navigation, /<Link\s+prefetch=\{false\}\s+className="public-site-header__mobile-category"/u, "Mobile menu links do not prefetch guarded routes");
});

test("Above-fold hero icons reuse inline SVG without extra role-image downloads", () => {
  const css = fs.readFileSync("src/features/homepage/preview.css", "utf8");
  const home = fs.readFileSync("src/features/homepage/HomepageExperience.tsx", "utf8");
  const lightTheme = fs.readFileSync("src/app/home-apple-soft.css", "utf8");
  assert.ok(lightTheme.includes(".homepage-live .nx-hero .nx-eyebrow > svg"), "Light theme must style the inline hero icon");
  assert.equal(lightTheme.includes(".homepage-live .nx-hero .nx-eyebrow::before"), false, "No legacy image pseudo-icon styling");
  assert.match(css, /\.nx-hero \.nx-eyebrow > svg \{ display: block;/u);
  assert.match(css, /\.nx-hero__proof svg \{ display: block;/u);
  assert.doesNotMatch(css, /\.nx-hero \.nx-eyebrow::before/u);
  assert.doesNotMatch(css, /\.nx-hero__proof span::before/u);
  assert.match(home, /<LandingIcon name="book" \/>/u);
  for (const icon of ["shield", "editor", "publisher"]) {
    assert.ok(home.includes('<LandingIcon name="' + icon + '" />'), "Hero proof renders inline " + icon + " icon");
  }
});


test("writer dashboard stylesheet is scoped to authenticated writer route, not public homepage", () => {
  const globalStyles = fs.readFileSync("src/app/globals.css", "utf8");
  const writerPage = fs.readFileSync("src/app/yazar/page.tsx", "utf8");
  const dashboardStyles = fs.readFileSync("src/features/dashboard/dashboard.css", "utf8");
  assert.doesNotMatch(globalStyles, /@import "\.\.\/features\/dashboard\/dashboard\.css"/u,
    "Public page CSS must not load authenticated writer dashboard styling");
  assert.match(writerPage, /import "@\/features\/dashboard\/dashboard\.css";/u,
    "Writer dashboard continues to receive its original stylesheet");
  assert.match(writerPage, /<WriterDashboard/u, "CSS scope stays tied to the actual writer dashboard route");
  assert.match(dashboardStyles, /\.dashboard__main\s*\{/u,
    "Writer dashboard stylesheet retains its real desktop styles");
  for (const changed of ["src/app/globals.css", "src/app/yazar/page.tsx"]) {
    assert.ok(workflow.includes(changed), changed + " must trigger post-merge Lighthouse mobile measurement");
  }
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
