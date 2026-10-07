import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const pausedFamilies = ["/eserler", "/yazarlar", "/turler"];
const publicAuthFamilies = ["/giris", "/kayit", "/sifremi-unuttum", "/sifre-yenile"];
const privateFamilies = ["/yazar", "/eserlerim", "/editor", "/yayinevi", "/icerik", "/admin"];

test("authenticated product routes stay outside search while paused discovery fails closed", () => {
  const nextConfig = source("next.config.ts");
  const navigation = source("src/lib/public-site-navigation.ts");
  const sitemap = source("src/lib/seo/sitemap-data.ts");

  assert.match(navigation, /export const publicDiscoveryEnabled = false;/u);
  assert.match(nextConfig, /const pausedPublicDiscoveryRouteHeaders = \[/u);
  assert.match(nextConfig, /const publicAuthNoindexRouteHeaders = \[/u);
  assert.match(nextConfig, /const searchExcludedRouteHeaders = \[/u);
  assert.match(nextConfig, /value: "noindex, follow, noarchive"/u);
  assert.match(nextConfig, /value: "noindex, nofollow, noarchive"/u);

  for (const route of pausedFamilies) {
    assert.ok(nextConfig.includes(`"${route}"`), `${route} must have an exact noindex header guard`);
    assert.ok(nextConfig.includes(`"${route}/:path*"`), `${route} descendants must have a noindex header guard`);
  }

  for (const route of publicAuthFamilies) {
    assert.ok(nextConfig.includes(`"${route}"`), `${route} auth root must have an exact noindex-follow header guard`);
    assert.ok(nextConfig.includes(`"${route}/:path*"`), `${route} auth descendants must have a noindex-follow header guard`);
  }

  for (const route of privateFamilies) {
    assert.ok(nextConfig.includes(route), `${route} private family must remain covered by X-Robots-Tag`);
  }

  for (const route of pausedFamilies) {
    assert.ok(
      !sitemap.includes("url: `${baseUrl}" + route + "`"),
      `${route} must not be emitted by sitemap source`,
    );
  }
  assert.match(sitemap, /visibility: "public"/u);
  assert.match(sitemap, /status: "published"/u);
  assert.match(sitemap, /publishedAt: \{\s*not: null/u);
  assert.match(sitemap, /contentRating: \{\s*not: "adult_18"/u);
});

test("robots is not used as the deindex mechanism for paused discovery", () => {
  const robots = source("src/app/robots.ts");

  for (const route of pausedFamilies) {
    assert.ok(!robots.includes(`"${route}"`), `${route} should stay crawlable enough for Google to observe 404/noindex rather than be hidden only by robots.txt`);
  }

  assert.match(robots, /\$\{baseUrl\}\/sitemap\.xml/u);
  assert.doesNotMatch(
    robots,
    /\$\{baseUrl\}\/recent-updates\.atom/u,
    "Atom feed stays a WebSub surface instead of a robots sitemap directive",
  );
});

test("route inventory documents the gated-product search boundary", () => {
  const inventory = source("docs/public-site-route-inventory.md");

  assert.match(inventory, /## Gated-product SEO rule/u);
  assert.match(inventory, /## Paused public discovery routes/u);
  assert.match(inventory, /not indexable/u);
  assert.match(inventory, /Do not add unfinished, authenticated-only or product-paused routes to sitemap\/search/u);
});

test("indexable public experiences never render links into paused discovery families", () => {
  const publicExperiencePaths = [
    "src/components/content/AboutExperience.tsx",
    "src/components/content/HowItWorksExperience.tsx",
    "src/components/content/ContentAgePolicyExperience.tsx",
    "src/components/content/CommunityRulesExperience.tsx",
    "src/components/content/ForEditorsExperience.tsx",
    "src/components/content/ForWritersExperience.tsx",
    "src/components/content/ForPublishersExperience.tsx",
    "src/components/content/CopyrightNoticeExperience.tsx",
    "src/components/content/EditorialStandardsExperience.tsx",
  ];
  const pausedHrefPattern = /href=["']\/(?:eserler|yazarlar|turler)(?:\/[^"']*)?["']/u;

  for (const relativePath of publicExperiencePaths) {
    assert.doesNotMatch(
      source(relativePath),
      pausedHrefPattern,
      `${relativePath} must not render a paused discovery link into public HTML`,
    );
  }
});
