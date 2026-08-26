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

test("sitemap keeps all public trust routes synchronized with CMS indexability and update time", () => {
  const sitemap = source("src/app/sitemap.ts");

  for (const route of [
    "/nasil-calisir",
    "/editoryal-standartlar",
    "/icerik-ve-yas-politikasi",
    "/topluluk-kurallari",
    "/telif-bildirimi",
    "/yazarlar-icin",
    "/editorler-icin",
    "/yayinevleri-icin",
  ]) {
    assertContains(sitemap, route, `${route} sitemap route`);
  }

  assertNotContains(sitemap, "contentKey LIKE 'guide:%'", "retired guide sitemap inventory");
  assertNotContains(sitemap, "foundationalGuides", "retired foundational guide sitemap source");
  assertContains(sitemap, "contentKey LIKE 'page:tr:%'", "TR generic page sitemap coverage");
  assertContains(sitemap, "SELECT slug, noIndex, updatedAt", "CMS sitemap reads indexability and freshness together");
  assertContains(sitemap, "if (row?.noIndex)", "static public CMS noindex exclusion");
  assertContains(sitemap, "lastModified: row?.updatedAt ?? new Date(page.updatedAt)", "CMS update time overrides bundled public freshness");
  assertContains(sitemap, ".filter((page) => !page.noIndex && !staticCmsPageSlugs.has(page.slug))", "dynamic CMS noindex exclusion");
  assertContains(sitemap, "status = 'published'", "published-only CMS sitemap boundary");
  assertNotContains(sitemap, '`${baseUrl}/en`', "no EN static sitemap URL");
  assertNotContains(sitemap, "legal:en:%", "no EN legal sitemap inventory");
  assertNotContains(sitemap, "page:en:%", "no EN generic sitemap inventory");
});

test("new public discovery and help surfaces expose canonical social metadata", () => {
  for (const [path, canonical] of [
    ["src/app/yardim/page.tsx", "/yardim"],
    ["src/app/editorler/page.tsx", "/editorler"],
    ["src/app/yazarlar/page.tsx", "/yazarlar"],
    ["src/app/turler/page.tsx", "/turler"],
    ["src/app/eserler/yeni/page.tsx", "/eserler/yeni"],
    ["src/app/eserler/guncellenen/page.tsx", "/eserler/guncellenen"],
  ]) {
    const page = source(path);
    assertContains(page, `canonical: "${canonical}"`, `${canonical} canonical`);
    assertContains(page, "openGraph:", `${canonical} Open Graph metadata`);
    assertContains(page, "twitter:", `${canonical} Twitter metadata`);
    assertContains(page, 'const socialImage = "/opengraph-image"', `${canonical} social image fallback`);
  }

  const help = source("src/app/yardim/page.tsx");
  const editors = source("src/app/editorler/page.tsx");
  assertContains(help, '"@type": "FAQPage"', "help FAQ structured data");
  assertContains(help, '"@type": "BreadcrumbList"', "help breadcrumb structured data");
  assertContains(editors, '"@type": "CollectionPage"', "editor directory structured data");
  assertContains(editors, '"@type": "BreadcrumbList"', "editor directory breadcrumb structured data");
});

test("SEO center and audit API stay Turkish-only", () => {
  const page = source("src/app/icerik/seo/page.tsx");
  const route = source("src/app/api/cms-seo-audit/route.ts");
  const roleCards = source("src/app/icerik/seo/SeoRoleCardsAudit.tsx");

  assertContains(page, "TR metadata kapsamı", "SEO TR coverage summary");
  assertContains(page, "contentKey NOT LIKE 'legal:en:%'", "SEO excludes EN legal");
  assertContains(page, "contentKey NOT LIKE 'guide:en:%'", "SEO excludes EN guides");
  assertContains(page, "contentKey NOT LIKE 'page:en:%'", "SEO excludes EN generic pages");
  assertContains(route, "contentKey NOT LIKE 'legal:en:%'", "audit API excludes EN legal");
  assertContains(route, "contentKey NOT LIKE 'guide:en:%'", "audit API excludes EN guides");
  assertContains(route, "contentKey NOT LIKE 'page:en:%'", "audit API excludes EN generic pages");
  assertContains(route, "WHERE status = 'published'", "audit API published-only boundary");
  assertContains(roleCards, 'getPublishedRoleCardsState("tr")', "role card SEO reads TR state");
  assertNotContains(roleCards, 'getPublishedRoleCardsState("en")', "role card SEO ignores EN state");
  assertNotContains(roleCards, "TR / EN", "role card SEO has no language parity work");
});
