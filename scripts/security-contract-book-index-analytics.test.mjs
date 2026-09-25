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

test("Book Index analytics records view and internal navigation events", () => {
  const analytics = source("src/features/book-index/public/BookIndexAnalytics.tsx");
  const layout = source("src/app/en-cok-satanlar/layout.tsx");

  contains(analytics, 'event: "book_index_view"', "Book Index view event");
  contains(
    analytics,
    'event: "book_index_navigation_click"',
    "Book Index navigation event",
  );
  contains(
    analytics,
    'destination.pathname.startsWith("/en-cok-satanlar")',
    "Book Index click scope",
  );
  contains(analytics, '"ilkoku:consent-changed"', "late consent recovery");
  contains(layout, "<BookIndexAnalytics />", "Book Index layout tracker");
});
