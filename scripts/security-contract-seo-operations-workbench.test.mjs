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

test("SEO workbench exposes technical indexing health without creating a second write path", () => {
  const technical = source("src/app/icerik/seo/SeoTechnicalAudit.tsx");
  const roleCards = source("src/app/icerik/seo/SeoRoleCardsAudit.tsx");

  assertContains(roleCards, "<SeoTechnicalAudit />", "technical SEO workbench surface");
  assertContains(technical, "status = 'published'", "published-only SEO inventory");
  assertContains(technical, "contentKey NOT LIKE 'legal:en:%'", "TR-only legal inventory");
  assertContains(technical, "contentKey NOT LIKE 'guide:en:%'", "TR-only guide inventory");
  assertContains(technical, "contentKey NOT LIKE 'page:en:%'", "TR-only generic page inventory");
  assertContains(technical, "canonicalIsSafe", "canonical host validation");
  assertContains(technical, "duplicateCanonical", "duplicate canonical diagnosis");
  assertContains(technical, "analyzeFooterNavigation", "canonical footer/internal-link analyzer reuse");
  assertContains(technical, "FOOTER_LIVE_KEY", "published footer source");
  assertContains(technical, 'href="/sitemap.xml"', "sitemap direct inspection action");
  assertContains(technical, 'href="/robots.txt"', "robots direct inspection action");
  assertContains(technical, 'href="/icerik/menuler"', "canonical internal-link correction action");
  assertNotContains(technical, "INSERT INTO", "no SEO write SQL");
  assertNotContains(technical, "UPDATE ContentPage", "no metadata mutation");
  assertNotContains(technical, "saveSeo", "no second SEO save action");
});

test("technical SEO audit fails closed when inventory cannot be read", () => {
  const technical = source("src/app/icerik/seo/SeoTechnicalAudit.tsx");

  assertContains(technical, "return null", "inventory read failure state");
  assertContains(technical, "yanlış bir temiz sonucu üretmiyor", "fail-closed user message");
  assertContains(technical, 'data-state="danger"', "fail-closed blocker state");
});
