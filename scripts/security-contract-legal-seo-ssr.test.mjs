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

test("TR legal documents use published CMS content in server HTML and metadata", () => {
  const store = source("src/lib/cms-legal-public-store.ts");
  const page = source("src/app/yasal/[slug]/page.tsx");
  const shellHydrator = source("src/components/content/PublicCmsHydrator.tsx");

  assertContains(store, "cmsLegalContentKey(definition.slug, locale)", "canonical legal content key");
  assertContains(store, "status = 'published'", "published-only legal read");
  assertContains(store, 'state: "corrupt"', "malformed legal payload state");
  assertContains(store, 'state: "unavailable"', "unavailable legal state");
  assertContains(page, 'getPublishedLegalDocumentState(slug, "tr")', "TR legal server read");
  assertContains(page, 'trState.state === "valid"', "metadata safe CMS boundary");
  assertContains(page, "cms?.seoTitle", "CMS SEO title source");
  assertContains(page, "cms?.seoDescription", "CMS SEO description source");
  assertContains(page, "cms?.canonicalUrl", "CMS canonical source");
  assertContains(page, "cms?.noIndex", "CMS robots source");
  assertContains(page, "<CmsLegalBody body={cms.body} />", "CMS body server render");
  assertNotContains(shellHydrator, "PublicDocumentHydrator", "obsolete legal client hydration mount");
});

test("TR legal metadata exposes EN alternate only for a valid published EN document", () => {
  const page = source("src/app/yasal/[slug]/page.tsx");

  assertContains(page, 'isCmsLocaleEnabled("en")', "EN public language check");
  assertContains(page, 'getPublishedLegalDocumentState(slug, "en")', "EN legal published state check");
  assertContains(page, 'const hasEnglish = enState.state === "valid"', "EN hreflang validity boundary");
  assertContains(page, 'en: `https://ilkoku.com/en/yasal/${slug}`', "EN legal hreflang target");
  assertContains(page, '"x-default": `https://ilkoku.com/yasal/${slug}`', "legal x-default target");
});
