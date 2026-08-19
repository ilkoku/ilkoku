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

test("English homepage exposes complete canonical and social metadata", () => {
  const page = source("src/app/en/page.tsx");

  assertContains(page, 'canonical: "https://ilkoku.com/en"', "EN canonical");
  assertContains(page, '"tr-TR": "https://ilkoku.com/"', "TR alternate");
  assertContains(page, 'en: "https://ilkoku.com/en"', "EN alternate");
  assertContains(page, '"x-default": "https://ilkoku.com/"', "x-default alternate");
  assertContains(page, 'url: "https://ilkoku.com/en"', "EN Open Graph URL");
  assertContains(page, "images: [{ url: socialImage", "EN Open Graph image");
  assertContains(page, 'card: "summary_large_image"', "EN Twitter card");
  assertContains(page, "images: [socialImage]", "EN Twitter image");
});

test("global public routes have file-based social image fallbacks", () => {
  const openGraph = source("src/app/opengraph-image.tsx");
  const twitter = source("src/app/twitter-image.tsx");

  assertContains(openGraph, 'import { ImageResponse } from "next/og"', "Open Graph image response");
  assertContains(openGraph, "width: 1200", "Open Graph width");
  assertContains(openGraph, "height: 630", "Open Graph height");
  assertContains(openGraph, 'contentType = "image/png"', "Open Graph content type");
  assertContains(openGraph, "İlk cümle, ilk okurun, ilk adımın.", "Open Graph brand message");
  assertContains(twitter, 'from "./opengraph-image"', "Twitter reuses canonical social artwork");
});

test("sitemap includes published indexable English CMS content only when EN is enabled", () => {
  const sitemap = source("src/app/sitemap.ts");

  assertContains(sitemap, 'isCmsLocaleEnabled("en")', "EN public locale switch");
  assertContains(sitemap, "contentKey LIKE 'legal:en:%'", "EN legal sitemap coverage");
  assertContains(sitemap, "contentKey LIKE 'guide:en:%'", "EN guide sitemap coverage");
  assertContains(sitemap, "contentKey LIKE 'page:en:%'", "EN generic page sitemap coverage");
  assertContains(sitemap, "status = 'published'", "published-only CMS sitemap boundary");
  assertContains(sitemap, "noIndex = false", "noindex exclusion");
  assertContains(sitemap, 'page.slug.startsWith("/en/")', "EN path safety boundary");
});

test("SEO center and audit API no longer hide English published page metadata", () => {
  const page = source("src/app/icerik/seo/page.tsx");
  const route = source("src/app/api/cms-seo-audit/route.ts");

  assertContains(page, 'type SeoLocale = "tr" | "en"', "SEO language model");
  assertContains(page, 'const localeFilter = param(params, "dil")', "SEO language filter");
  assertContains(page, 'pageLocale(page).toUpperCase()', "SEO visible locale badge");
  assertContains(page, "TR + EN metadata kapsamı", "SEO bilingual coverage summary");
  assertContains(page, 'page.contentKey.startsWith("page:en:") ? "EN içerik kapsamını aç"', "EN generic page safe audit action");
  assertNotContains(page, "contentKey NOT LIKE 'legal:en:%'", "SEO must not exclude EN legal");
  assertNotContains(page, "contentKey NOT LIKE 'guide:en:%'", "SEO must not exclude EN guides");
  assertNotContains(route, "contentKey NOT LIKE 'page:en:%'", "audit API must not exclude EN pages");
  assertContains(route, "WHERE status = 'published'", "audit API published-only boundary");
});
