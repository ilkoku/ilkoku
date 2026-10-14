import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const experience = readFileSync("src/features/homepage/HomepageExperience.tsx", "utf8");
const footer = readFileSync("src/features/homepage/live-footer.tsx", "utf8");
const consent = readFileSync("src/components/privacy/SiteConsentBanner.tsx", "utf8");
const homepage = readFileSync("src/app/page.tsx", "utf8");
const workflow = readFileSync(".github/workflows/seo-mobile-lighthouse-baseline.yml", "utf8");

test("All homepage footer links stay crawlable without eager route prefetch", () => {
  const links = [...footer.matchAll(/<Link\b[^>]*>/gu)].map(([element]) => element);
  assert.ok(links.length >= 10, "Expected all existing footer link groups");
  for (const element of links) {
    assert.match(element, /prefetch=\{false\}/u, "Unnecessary viewport footer route prefetch: " + element);
    assert.match(element, /href=/u, "SEO visible href must remain");
  }
  for (const token of ["publicPlatformLinks", "publicTrustLinks", "publicSupportLinks", "publicLegalLinks", "CloudflareSafeEmailLink", "siteContact.socialLinks"]) {
    assert.ok(footer.includes(token), "Footer SSR link/data group must be preserved: " + token);
  }
  assert.match(homepage, /<HomepageExperience\s*\/>/u);
});

test("A single mobile Lighthouse retest runs when this precise footer changes", () => {
  assert.match(workflow, /src\/features\/homepage\/live-footer\.tsx/u);
  assert.match(workflow, /src\/components\/privacy\/SiteConsentBanner\.tsx/u);
  assert.match(workflow, /--form-factor=mobile/u);
  assert.match(workflow, /--only-categories=performance/u);
  assert.doesNotMatch(workflow, /schedule:|workflow_run:/u);
});

test("Visible cookie consent policy link does not prefetch the legal route", () => {
  assert.ok(consent.includes('<Link prefetch={false} href={settings.policyPath}>Gizlilik ve çerez bilgileri</Link>'));
  assert.match(consent, /updateConsentMode/u);
  assert.match(consent, /dispatchChoice/u);
});


test("Public homepage streams exactly one real footer without duplicated fallback markup", () => {
  assert.ok(experience.includes("<Suspense fallback={null}>"), "Suspense boundary should keep stream nonblocking");
  assert.equal(experience.split("<HomepageFooterSection").length - 1, 1, "One server-driven footer");
  assert.equal(experience.split("<LiveHomepageFooter").length - 1, 1, "Only footer component owner renders a live footer");
  assert.ok(experience.includes("bookIndexPublished={Boolean(bookIndexContext)}"), "Book Index publication visibility unchanged");
  assert.ok(experience.includes("slogan={footer?.slogan"), "Homepage CMS footer copy unchanged");
});
