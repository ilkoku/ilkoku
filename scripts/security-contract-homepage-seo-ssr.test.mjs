import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

function assertContains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

function assertNotContains(text, fragment, label) {
  assert.equal(text.includes(fragment), false, `${label} must not contain ${JSON.stringify(fragment)}`);
}

test("TR homepage publishes CMS body content in first server HTML", () => {
  const page = source("src/app/page.tsx");
  const experience = source("src/app/onizleme/ana-sayfa-yeni/HomepageExperience.tsx");
  const store = source("src/lib/cms-homepage-store.ts");
  const hydrator = source("src/components/content/PublicCmsHydrator.tsx");

  assertContains(store, 'cmsLocaleNamespace("homepage", locale)', "canonical homepage namespace");
  assertContains(store, "status = 'published'", "published-only homepage read");
  assertContains(store, 'state: "corrupt"', "malformed homepage fail-safe state");
  assertContains(store, 'state: "unavailable"', "unavailable homepage fail-safe state");

  assertContains(page, 'import HomepageExperience from "./onizleme/ana-sayfa-yeni/HomepageExperience"', "live homepage experience boundary");
  assertNotContains(page, 'from "./onizleme/ana-sayfa-yeni/page"', "preview route must not power the live homepage");
  assertNotContains(experience, "export const metadata", "shared homepage experience must stay route-metadata neutral");
  assertNotContains(experience, "export const dynamic", "shared homepage experience must stay route-config neutral");
  assertContains(experience, 'getPublishedHomepageState("tr")', "TR published homepage server read");
  assertContains(experience, 'homepageState.state === "valid"', "TR safe fallback boundary");
  assertContains(experience, "hero?.title", "hero title server source");
  assertContains(experience, "roleSection?.title", "role section server source");
  assertContains(experience, "passport?.title", "passport server source");
  assertContains(experience, "why?.[`stat${index + 1}Value`]", "why statistics server source");
  assertContains(experience, "footer?.slogan", "footer slogan server source");
  assertContains(experience, "safeCmsInternalHref(hero?.primaryCtaHref)", "hero CTA safe server href");
  assertContains(experience, "safeCmsInternalHref(passport?.ctaHref)", "passport CTA safe server href");

  assertNotContains(hydrator, 'fetch("/api/site-content/homepage"', "obsolete client homepage text fetch");
  assertNotContains(hydrator, "function applyHomepage", "obsolete homepage DOM mutation");
});

test("TR homepage exposes canonical, conditional language alternates and social image metadata", () => {
  const page = source("src/app/page.tsx");

  assertContains(page, "export async function generateMetadata", "dynamic homepage metadata");
  assertContains(page, 'isCmsLocaleEnabled("en")', "EN alternate follows public locale state");
  assertContains(page, 'canonical: "https://ilkoku.com/"', "TR canonical");
  assertContains(page, '"tr-TR": "https://ilkoku.com/"', "TR hreflang");
  assertContains(page, 'en: "https://ilkoku.com/en"', "conditional EN hreflang target");
  assertContains(page, '"x-default": "https://ilkoku.com/"', "x-default alternate");
  assertContains(page, "robots: { index: true, follow: true }", "explicit live homepage indexability");
  assertContains(page, "images: [{ url: homeSocialImage", "Open Graph image");
  assertContains(page, "images: [homeSocialImage]", "Twitter image");
});
