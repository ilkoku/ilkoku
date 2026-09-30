import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const before = (text, first, second, label) =>
  assert.ok(
    text.indexOf(first) >= 0
      && text.indexOf(second) >= 0
      && text.indexOf(first) < text.indexOf(second),
    `${label}: expected ${JSON.stringify(first)} before ${JSON.stringify(second)}`,
  );

test("Book Index analytics respects consent and avoids GTM/GA4 duplicate delivery", () => {
  const analytics = source("src/features/book-index/public/BookIndexAnalytics.tsx");

  contains(analytics, 'value === "granted" || value === "not-required"', "consent gate");
  contains(analytics, 'providerState("Gtm") === "loaded"', "GTM readiness");
  contains(analytics, 'providerState("Ga4") === "loaded"', "GA4 fallback readiness");
  contains(analytics, 'window.dataLayer.push(payload)', "GTM dataLayer event");
  contains(analytics, 'window.gtag("event", event, params)', "direct GA4 fallback event");
  before(
    analytics,
    'providerState("Gtm") === "loaded"',
    'providerState("Ga4") === "loaded"',
    "GTM must win when both providers are enabled",
  );
});

test("Book Index analytics records views and shared-family navigation events", () => {
  const analytics = source("src/features/book-index/public/BookIndexAnalytics.tsx");
  const bestsellerLayout = source("src/app/en-cok-satanlar/layout.tsx");
  const newReleaseLayout = source("src/app/yeni-cikanlar/layout.tsx");
  const sectionNav = source("src/features/book-index/public/BookIndexSectionNav.tsx");

  contains(analytics, 'event: "book_index_view"', "Book Index view event");
  contains(
    analytics,
    'event: "book_index_navigation_click"',
    "Book Index navigation event",
  );
  contains(
    analytics,
    'pathname === "/yeni-cikanlar"',
    "Yeni Çıkanlar joins the Book Index analytics family",
  );
  contains(
    analytics,
    'return "new_releases"',
    "Yeni Çıkanlar has a dedicated analytics surface",
  );
  contains(analytics, '"ilkoku:consent-changed"', "late consent recovery");
  contains(bestsellerLayout, "<BookIndexAnalytics />", "bestseller layout tracker");
  contains(newReleaseLayout, "<BookIndexAnalytics />", "new-release layout tracker");
  contains(newReleaseLayout, "<PublicSiteFrame>", "new-release public site frame");
  contains(newReleaseLayout, "<PublicTrustFooter />", "new-release public footer");
  contains(sectionNav, 'href: "/en-cok-satanlar"', "Book Index overview navigation");
  contains(sectionNav, 'href: "/en-cok-satanlar/turkiye"', "Turkey navigation");
  contains(sectionNav, 'href: "/yeni-cikanlar"', "new-release navigation");
  contains(sectionNav, 'href: "/en-cok-satanlar/dunya"', "global navigation");
  contains(sectionNav, 'href: "/en-cok-satanlar/turkiye/karsilastirma"', "comparison navigation");
  contains(sectionNav, 'href: "/en-cok-satanlar/yeni-girisler"', "new-entry navigation");
  contains(sectionNav, 'href: "/en-cok-satanlar/yukselenler"', "riser navigation");
  contains(sectionNav, 'href: "/en-cok-satanlar/her-yerde-satanlar"', "everywhere-seller navigation");
  contains(sectionNav, 'href: "/en-cok-satanlar/uzun-satanlar"', "long-seller navigation");
});
