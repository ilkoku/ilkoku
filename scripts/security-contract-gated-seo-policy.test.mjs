import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const publicDiscoveryFamilies = ["/eserler", "/yazarlar", "/turler"];
const publicAuthFamilies = ["/giris", "/kayit", "/sifremi-unuttum", "/sifre-yenile"];
const privateFamilies = ["/yazar", "/eserlerim", "/editor", "/yayinevi", "/icerik", "/admin"];

test("public discovery opens while authenticated products stay outside search", () => {
  const nextConfig = source("next.config.ts");
  const navigation = source("src/lib/public-site-navigation.ts");
  const sitemap = source("src/lib/seo/sitemap-data.ts");

  assert.match(navigation, /export const publicDiscoveryEnabled = true;/u);
  assert.doesNotMatch(nextConfig, /const pausedPublicDiscoveryRouteHeaders = \[/u);
  assert.match(nextConfig, /const publicAuthNoindexRouteHeaders = \[/u);
  assert.match(nextConfig, /const searchExcludedRouteHeaders = \[/u);
  assert.match(nextConfig, /value: "noindex, follow, noarchive"/u);
  assert.match(nextConfig, /value: "noindex, nofollow, noarchive"/u);

  for (const route of publicDiscoveryFamilies) {
    assert.ok(!nextConfig.includes(`"${route}"`), `${route} must not have a blanket noindex header`);
    assert.ok(!nextConfig.includes(`"${route}/:path*"`), `${route} descendants must not have blanket noindex`);
  }

  for (const route of publicAuthFamilies) {
    assert.ok(nextConfig.includes(`"${route}"`), `${route} auth root must have an exact noindex-follow header guard`);
    assert.ok(nextConfig.includes(`"${route}/:path*"`), `${route} auth descendants must have a noindex-follow header guard`);
  }

  for (const route of privateFamilies) {
    assert.ok(nextConfig.includes(route), `${route} private family must remain covered by X-Robots-Tag`);
  }

  assert.match(sitemap, /\["eserler", "yazarlar", "turler"\]/u, "public discovery roots must be in the sitemap source");
  assert.match(sitemap, /visibility: "public"/u);
  assert.match(sitemap, /status: "published"/u);
  assert.match(sitemap, /publishedAt: \{\s*not: null/u);
  assert.match(sitemap, /contentRating: \{\s*not: "adult_18"/u);
});

test("robots keeps public discovery crawlable", () => {
  const robots = source("src/app/robots.ts");

  for (const route of publicDiscoveryFamilies) {
    assert.ok(!robots.includes(`"${route}"`), `${route} should stay crawlable enough for Google to observe 404/noindex rather than be hidden only by robots.txt`);
  }

  assert.match(robots, /\$\{baseUrl\}\/sitemap\.xml/u);
  assert.doesNotMatch(
    robots,
    /\$\{baseUrl\}\/recent-updates\.atom/u,
    "Atom feed stays a WebSub surface instead of a robots sitemap directive",
  );
});

test("public discovery is linked and sitemap-listed without exposing private areas", () => {
  const navigation = source("src/lib/public-site-navigation.ts");
  const sitemap = source("src/lib/seo/sitemap-data.ts");
  const config = source("next.config.ts");
  for (const route of publicDiscoveryFamilies) {
    assert.ok(navigation.includes(`href: "${route}"`), `public navigation includes ${route}`);
  }
  assert.match(sitemap, /\["eserler", "yazarlar", "turler"\]/u);
  assert.match(config, /const privateRouteHeaders = \[/u);
});

test("private reader author discovery is protected at every SEO and access-control layer", () => {
  const page = source("src/app/yazar-kesfet/page.tsx");
  const routeSecurity = source("src/lib/route-security.ts");
  const proxy = source("src/proxy.ts");
  const config = source("next.config.ts");
  const robots = source("src/app/robots.ts");
  const productionSmoke = source(".github/workflows/production-smoke.yml");

  assert.match(page, /redirect\("\/giris\?sonraki=\/yazar-kesfet"\)/u, "anonymous requests redirect to login");
  assert.ok(routeSecurity.includes('"/yazar-kesfet"'), "protected path requires an active session");
  assert.ok(proxy.includes('"/yazar-kesfet/:path*"'), "request-time proxy enforces login");
  assert.ok(config.includes('"/yazar-kesfet/:path*"'), "private X-Robots-Tag response covers route");
  assert.ok(robots.includes('"/yazar-kesfet"'), "private crawl path is disallowed");
  assert.ok(productionSmoke.includes('check_redirect_and_noindex "https://ilkoku.com/yazar-kesfet" "/giris"'), "production smoke verifies X-Robots-Tag on live redirect");

  for (const guide of ["/yazarlar-icin", "/yazarlar-icin/kurgu"]) {
    assert.equal(
      robots.includes('"' + guide + '"'),
      false,
      "public writing guides must not be blocked by the private route rule",
    );
  }
});

test("browser hardening is sitewide without changing auth and discovery index policy", () => {
  const nextConfig = source("next.config.ts");
  const login = source("src/app/giris/page.tsx");
  const registration = source("src/app/kayit/page.tsx");
  const recovery = source("src/app/sifremi-unuttum/page.tsx");
  const proxy = source("src/proxy.ts");

  assert.match(nextConfig, /const browserSecurityHeaders = \[/u);
  assert.match(nextConfig, /source: "\/:path\*"/u);
  assert.match(nextConfig, /headers: browserSecurityHeaders/u);

  const expectedHeaders = [
    ['X-Content-Type-Options', 'nosniff'],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
    ['X-Frame-Options', 'SAMEORIGIN'],
    ['Content-Security-Policy', "frame-ancestors 'self'; upgrade-insecure-requests"],
    ['Strict-Transport-Security', 'max-age=300'],
  ];

  for (const [key, value] of expectedHeaders) {
    assert.ok(nextConfig.includes(`key: "${key}"`), `Missing ${key} hardening header`);
    assert.ok(nextConfig.includes(`value: "${value}"`), `Unexpected ${key} header value`);
  }

  const broadHeaders = nextConfig.indexOf('source: "/:path*"');
  const authHeaders = nextConfig.indexOf("...publicAuthNoindexRouteHeaders.map");
  const privateHeaders = nextConfig.indexOf("...searchExcludedRouteHeaders.map");
  assert.ok(broadHeaders >= 0 && broadHeaders < authHeaders && authHeaders < privateHeaders,
    "Global hardening must precede the existing auth/private X-Robots-Tag rules");

  for (const [route, page] of [
    ["/giris", login],
    ["/kayit", registration],
    ["/sifremi-unuttum", recovery],
  ]) {
    assert.match(page, /robots: \{ index: false, follow: true \}/u, `${route} must keep noindex follow`);
    assert.ok(nextConfig.includes(`"${route}"`), `${route} must retain auth noindex header`);
  }

  assert.match(proxy, /NextResponse\.redirect\(destination\)/u,
    "Unauthenticated user routes must continue using temporary redirects");
  assert.doesNotMatch(nextConfig, /max-age=31536000[^\n]*includeSubDomains/u,
    "Long-duration subdomain-wide HSTS requires a separate audit");
});
