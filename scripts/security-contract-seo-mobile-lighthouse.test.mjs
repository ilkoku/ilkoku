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

test("Mobile LCP hero uses the smaller responsive image without losing priority", () => {
  const hero = fs.readFileSync("src/features/homepage/HomepageExperience.tsx", "utf8");
  const nextConfig = fs.readFileSync("next.config.ts", "utf8");
  assert.match(hero, /fill priority fetchPriority="high" quality=\\{45\\}/u,
    "Mobile hero preserves high priority with a lighter generated variant");
  assert.match(hero, /sizes="\\(max-width: 480px\\) 82vw, \\(max-width: 900px\\) 100vw, 48vw"/u,
    "Mobile hero should not request desktop-scale image width");
  assert.match(nextConfig, /qualities: \\[45, 60, 75\\]/u,
    "Optimized images must allow the requested quality in Next.js");
  for (const changed of ["next.config.ts", "src/features/homepage/HomepageExperience.tsx"]) {
    assert.ok(workflow.includes(changed), changed + " must trigger a live Lighthouse sample");
  }
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



test("editor workspace styles load only with authenticated AppShell or explicit editor invitation", () => {
  const globalStyles = fs.readFileSync("src/app/globals.css", "utf8");
  const shell = fs.readFileSync("src/components/layout/AppShell.tsx", "utf8");
  const invitation = fs.readFileSync("src/app/editor-daveti/[token]/page.tsx", "utf8");
  const editorStyles = fs.readFileSync("src/features/editor-workspace/editor-workspace.css", "utf8");
  const route = fs.readFileSync("src/app/editor/incelemeler/page.tsx", "utf8");
  assert.ok(!globalStyles.includes('@import "../features/editor-workspace/editor-workspace.css";'),
    "Public routes must not include authenticated editor CSS in global styles");
  assert.ok(shell.includes('import "@/features/editor-workspace/editor-workspace.css";'),
    "Authenticated editor workspace remains styled through shared AppShell");
  assert.ok(invitation.includes('import "@/features/editor-workspace/editor-workspace.css";'),
    "External second-editor invitation remains styled without AppShell");
  assert.ok(route.includes("<AppShell"), "Editor review route still uses AppShell");
  assert.ok(editorStyles.includes(".editor-workspace"), "Editor layout CSS remains intact");
  assert.ok(editorStyles.includes(".professional-review-tools"),
    "External invitation and professional review CSS remains intact");
  for (const changed of [
    "src/app/globals.css",
    "src/components/layout/AppShell.tsx",
  ]) {
    assert.ok(workflow.includes(changed), changed + " must trigger mobile Lighthouse");
  }
});

test("Writer creation/editor CSS is owned by NewWorkFlow instead of public global CSS", () => {
  const globalStyles = fs.readFileSync("src/app/globals.css", "utf8");
  const flow = fs.readFileSync("src/features/writer/components/NewWorkFlow.tsx", "utf8");
  const writerStyles = fs.readFileSync("src/features/writer/writer-flow.css", "utf8");
  const dashboard = fs.readFileSync("src/features/dashboard/components/WriterDashboard.tsx", "utf8");
  const workspace = fs.readFileSync("src/features/works/components/WorksWorkspace.tsx", "utf8");
  const continuePage = fs.readFileSync("src/app/yazmaya-devam/page.tsx", "utf8");
  const writerPage = fs.readFileSync("src/app/yazar/page.tsx", "utf8");
  const worksPage = fs.readFileSync("src/app/eserlerim/page.tsx", "utf8");
  assert.doesNotMatch(globalStyles, /@import "\.\.\/features\/writer\/writer-flow\.css";/u,
    "Public routes must not load writer creation, editor or publication styles");
  assert.match(flow, /import "\.\.\/writer-flow\.css";/u,
    "All NewWorkFlow consumers load the original stylesheet with their component");
  for (const selector of [".flow-layer", ".writer-screen", ".writer-toolbar", ".writer-chapters",
    ".writer-canvas", ".publish-preview", ".publish-success", ".writer-brand"]) {
    assert.ok(writerStyles.includes(selector), selector + " authoring rules must remain intact");
  }
  assert.match(dashboard, /import \{ NewWorkFlow \} from "@\/features\/writer\/components\/NewWorkFlow";/u);
  assert.match(workspace, /import \{ NewWorkFlow \} from "@\/features\/writer\/components\/NewWorkFlow";/u);
  assert.match(continuePage, /import \{ NewWorkFlow \} from "@\/features\/writer\/components\/NewWorkFlow";/u);
  assert.match(writerPage, /<WriterDashboard/u, "Writer home must mount the writer workflow");
  assert.match(worksPage, /<WorksWorkspace/u, "Works workspace must mount the writer workflow");
  for (const changed of ["src/app/globals.css", "src/features/writer/components/NewWorkFlow.tsx"]) {
    assert.ok(workflow.includes(changed), changed + " must trigger post-merge mobile Lighthouse");
  }
});

test("private profile stylesheet is loaded by both account pages, not the public global layout", () => {
  const globalStyles = fs.readFileSync("src/app/globals.css", "utf8");
  const profileStyles = fs.readFileSync("src/features/profile/profile.css", "utf8");
  for (const accountPage of [
    "src/app/hesabim/page.tsx",
    "src/app/hesabim/log/page.tsx",
  ]) {
    const page = fs.readFileSync(accountPage, "utf8");
    assert.ok(
      page.includes('import "@/features/profile/profile.css";'),
      accountPage + " must explicitly import its account styling",
    );
  }
  assert.ok(
    !globalStyles.includes('@import "../features/profile/profile.css";'),
    "Public home must not load private account page styles",
  );
  assert.ok(profileStyles.includes(".account-shell"), "Original account layout rules stay intact");
  assert.ok(profileStyles.includes(".profile-page"), "Original profile page rules stay intact");
  assert.ok(workflow.includes("src/app/globals.css"), "Global CSS modifications must trigger mobile Lighthouse");
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
