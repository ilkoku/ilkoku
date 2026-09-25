import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) =>
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

test("Book Index SEO gate has no invented default quality thresholds", () => {
  const gate = source("src/lib/book-index/seo-gate.ts");
  const env = source(".env.example");

  for (const key of [
    "BOOK_INDEX_SEO_MIN_COMPOSITE_SOURCES",
    "BOOK_INDEX_SEO_MIN_MATCH_COVERAGE_PERCENT",
    "BOOK_INDEX_SEO_MIN_HISTORY_DAYS",
    "BOOK_INDEX_SEO_MIN_TURKEY_ITEMS",
  ]) {
    contains(gate, key, `${key} gate input`);
    contains(env, `${key}=""`, `${key} intentionally unset default`);
  }

  contains(gate, '"policy_incomplete"', "incomplete policy state");
  contains(gate, 'BOOK_INDEX_SEO_GATE_ENABLED === "true"', "explicit gate enable");
  contains(gate, 'BOOK_INDEX_SEO_PUBLISH_ENABLED === "true"', "separate publication enable");
});

test("Book Index SEO gate requires evidence and a separate publication switch", () => {
  const gate = source("src/lib/book-index/seo-gate.ts");

  contains(gate, "observedCompositeSources", "source evidence");
  contains(gate, "matchCoveragePercent", "matching evidence");
  contains(gate, "historySpanDays", "history evidence");
  contains(gate, "turkeyItemCount", "Turkey result evidence");
  contains(gate, 'state === "eligible" && policy.publicationEnabled', "two-key publication gate");
  contains(gate, '"insufficient_evidence"', "evidence failure state");
});

test("Book Index public routes fail closed before sitemap publication", () => {
  const access = source("src/lib/book-index/public-access.ts");
  const overview = source("src/app/en-cok-satanlar/page.tsx");
  const turkey = source("src/app/en-cok-satanlar/turkiye/page.tsx");
  const sitemap = source("src/app/sitemap.ts");
  const navigation = source("src/lib/public-site-navigation.ts");

  contains(
    access,
    "policy.enabled\n        && policy.publicationEnabled",
    "two-key route precondition",
  );
  contains(access, "if (!configured) return null;", "route access fails closed before DB work");
  contains(overview, "getBookIndexPublicPageContext(30)", "overview gate context");
  contains(overview, "if (!context) notFound();", "overview 404 gate");
  contains(turkey, "getBookIndexPublicPageContext(100)", "Turkey gate context");
  contains(
    turkey,
    'context.model.turkey.availability !== "available"',
    "Turkey data availability gate",
  );
  contains(turkey, "notFound();", "Turkey 404 gate");

  contains(
    sitemap,
    'import { getBookIndexPublicPageContext } from "@/lib/book-index/public-access";',
    "sitemap consumes the same public gate",
  );
  contains(sitemap, "async function loadBookIndexSitemapEntries()", "isolated sitemap gate helper");
  contains(
    sitemap,
    "const context = await getBookIndexPublicPageContext(100);",
    "sitemap gate context",
  );
  contains(
    sitemap,
    'context.model.turkey.availability !== "available"',
    "sitemap requires usable Turkey data",
  );
  contains(
    sitemap,
    'url: `${baseUrl}/en-cok-satanlar`',
    "gated bestseller sitemap URL",
  );
  contains(
    sitemap,
    'url: `${baseUrl}/en-cok-satanlar/turkiye`',
    "gated Turkey sitemap URL",
  );
  contains(sitemap, "...bookIndexEntries", "conditional sitemap insertion");

  const fallbackStart = sitemap.indexOf("const staticFallbackEntries");
  const fallbackEnd = sitemap.indexOf("type CmsSitemapRow", fallbackStart);
  assert.ok(fallbackStart >= 0 && fallbackEnd > fallbackStart, "static fallback block must exist");
  const fallbackBlock = sitemap.slice(fallbackStart, fallbackEnd);
  notContains(
    fallbackBlock,
    "/en-cok-satanlar",
    "database/error fallback must never publish Book Index",
  );
  notContains(navigation, "/en-cok-satanlar", "public navigation remains closed");
});
