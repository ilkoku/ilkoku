import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const discoveryFamilies = ["/eserler", "/yazarlar", "/turler"];
const privateFamilies = ["/giris", "/kayit", "/yazar", "/eserlerim", "/editor", "/yayinevi", "/icerik", "/admin"];

test("authenticated product routes stay outside search while public discovery stays indexable", () => {
  const nextConfig = source("next.config.ts");
  const navigation = source("src/lib/public-site-navigation.ts");
  const sitemap = source("src/app/sitemap.ts");

  assert.match(navigation, /export const publicDiscoveryEnabled = true;/u);
  assert.doesNotMatch(nextConfig, /pausedPublicDiscoveryRouteHeaders/u);
  assert.match(nextConfig, /const searchExcludedRouteHeaders = \[/u);
  assert.match(nextConfig, /value: "noindex, nofollow, noarchive"/u);

  for (const route of discoveryFamilies) {
    assert.ok(!nextConfig.includes(`"${route}"`), `${route} must not have an exact noindex header guard`);
    assert.ok(!nextConfig.includes(`"${route}/:path*"`), `${route} descendants must not have a noindex header guard`);
    assert.ok(sitemap.includes(`url: \`\${baseUrl}${route}\``), `${route} must be emitted by sitemap source`);
  }

  for (const route of privateFamilies) {
    assert.ok(nextConfig.includes(route), `${route} private family must remain covered by X-Robots-Tag`);
  }

  assert.match(sitemap, /visibility: "public"/u);
  assert.match(sitemap, /status: "published"/u);
  assert.match(sitemap, /publishedAt: \{\s*not: null/u);
  assert.match(sitemap, /contentRating: \{\s*not: "adult_18"/u);
  assert.match(sitemap, /authorEntries/u);
  assert.match(sitemap, /genreEntries/u);
});

test("robots keeps public discovery crawlable", () => {
  const robots = source("src/app/robots.ts");

  for (const route of discoveryFamilies) {
    assert.ok(!robots.includes(`"${route}"`), `${route} must remain crawlable`);
  }

  assert.match(robots, /sitemap: `\$\{baseUrl\}\/sitemap\.xml`/u);
});

test("route inventory documents active public discovery", () => {
  const inventory = source("docs/public-site-route-inventory.md");

  assert.match(inventory, /## Gated-product SEO rule/u);
  assert.match(inventory, /## Active public discovery routes/u);
  assert.match(inventory, /indexable/u);
  assert.match(inventory, /published, active and public content/u);
});

test("public discovery links prefer clean canonical destinations", () => {
  const stream = source("src/features/public-discovery/PublicWorkStream.tsx");
  const authors = source("src/app/yazarlar/page.tsx");
  const genres = source("src/app/turler/page.tsx");

  assert.match(stream, /return path is kept for API compatibility|second argument is kept for API compatibility/u);
  assert.doesNotMatch(authors, /\/yazarlar\/\$\{author\.publicId\}\?from=/u);
  assert.doesNotMatch(genres, /\/turler\/\$\{genre\.slug\}\?from=/u);
});
