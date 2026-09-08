import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const pausedFamilies = ["/eserler", "/yazarlar", "/turler"];
const privateFamilies = ["/giris", "/kayit", "/yazar", "/eserlerim", "/editor", "/yayinevi", "/icerik", "/admin"];

test("authenticated product routes stay outside search while paused discovery fails closed", () => {
  const nextConfig = source("next.config.ts");
  const navigation = source("src/lib/public-site-navigation.ts");
  const sitemap = source("src/app/sitemap.ts");

  assert.match(navigation, /export const publicDiscoveryEnabled = false;/u);
  assert.match(nextConfig, /const pausedPublicDiscoveryRouteHeaders = \[/u);
  assert.match(nextConfig, /const searchExcludedRouteHeaders = \[/u);
  assert.match(nextConfig, /value: "noindex, nofollow, noarchive"/u);

  for (const route of pausedFamilies) {
    assert.ok(nextConfig.includes(`"${route}"`), `${route} must have an exact noindex header guard`);
    assert.ok(nextConfig.includes(`"${route}/:path*"`), `${route} descendants must have a noindex header guard`);
  }

  for (const route of privateFamilies) {
    assert.ok(nextConfig.includes(route), `${route} private family must remain covered by X-Robots-Tag`);
  }

  assert.match(sitemap, /\.\.\.\(publicDiscoveryEnabled \? publicDiscoveryStaticEntries : \[\]\)/u);
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

  assert.match(robots, /sitemap: `\$\{baseUrl\}\/sitemap\.xml`/u);
});

test("route inventory documents the gated-product search boundary", () => {
  const inventory = source("docs/public-site-route-inventory.md");

  assert.match(inventory, /## Gated-product SEO rule/u);
  assert.match(inventory, /## Paused public discovery routes/u);
  assert.match(inventory, /not indexable/u);
  assert.match(inventory, /Do not add unfinished, authenticated-only or product-paused routes to sitemap\/search/u);
});
