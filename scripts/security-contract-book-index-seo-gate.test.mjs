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

  contains(gate, "observedCompositeSources", "storefront source evidence");
  contains(gate, "observedIndependentCompositeSources", "independent source evidence");
  contains(
    gate,
    "evidence.observedIndependentCompositeSources < policy.minCompositeSources!",
    "source threshold uses independent operator groups",
  );
  contains(gate, "matchCoveragePercent", "matching evidence");
  contains(gate, "historySpanDays", "history evidence");
  contains(gate, "turkeyItemCount", "Turkey result evidence");
  contains(gate, 'state === "eligible" && policy.publicationEnabled', "two-key publication gate");
  contains(gate, '"insufficient_evidence"', "evidence failure state");
});

test("Book Index soft-launch routes stay noindex while sitemap publication remains gated", () => {
  const access = source("src/lib/book-index/public-access.ts");
  const overview = source("src/app/en-cok-satanlar/page.tsx");
  const turkey = source("src/app/en-cok-satanlar/turkiye/page.tsx");
  const insight = source("src/app/en-cok-satanlar/[insight]/page.tsx");
  const sitemap = source("src/lib/seo/sitemap-data.ts");
  const navigation = source("src/lib/public-site-navigation.ts");
  const header = source("src/components/layout/PublicSiteHeader.tsx");

  contains(
    access,
    "policy.enabled\n        && policy.publicationEnabled",
    "two-key indexed publication precondition",
  );
  contains(access, "if (!configured) return null;", "indexed publication fails closed before DB work");
  contains(
    access,
    "getBookIndexSoftLaunchPageContext",
    "route-only soft-launch context exists",
  );

  contains(
    overview,
    "getBookIndexSoftLaunchPageContext(30)",
    "overview uses route-only soft-launch context",
  );
  contains(
    overview,
    "noIndex: !context.gate.canPublish",
    "overview stays noindex until full publish gate passes",
  );
  contains(
    overview,
    "context.gate.canPublish ? (",
    "overview structured data stays off during soft launch",
  );
  contains(
    overview,
    "showInsightPages={context.gate.canPublish}",
    "overview hides unpublished trend links during soft launch",
  );

  contains(
    turkey,
    "getBookIndexSoftLaunchPageContext(100)",
    "Turkey route uses route-only soft-launch context",
  );
  contains(
    turkey,
    'context.model.turkey.availability !== "available"',
    "Turkey still requires usable data",
  );
  contains(
    turkey,
    "noIndex: !context.gate.canPublish",
    "Turkey route stays noindex until full publish gate passes",
  );
  contains(
    turkey,
    "context.gate.canPublish ? (",
    "Turkey structured data stays off during soft launch",
  );

  contains(
    insight,
    "getBookIndexSoftLaunchPageContext(100)",
    "trend routes use route-only soft-launch context",
  );
  contains(
    insight,
    "noIndex: !context.gate.canPublish || items.length === 0",
    "trend routes stay noindex until publish gate and data are both ready",
  );
  notContains(
    insight,
    "if (!context) notFound();",
    "trend routes must not 404 only because the publication gate is closed",
  );
  notContains(
    insight,
    "if (items.length === 0) notFound();",
    "known trend routes stay reachable while data is temporarily empty",
  );
  contains(
    insight,
    "context.gate.canPublish && items.length > 0 ? (",
    "trend structured data stays off until publication is allowed",
  );

  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");
  const rankTable = source("src/features/book-index/public/BookIndexRankTable.tsx");
  contains(rankTable, '<table className={styles.rankingTable}>', "Turkey ranking uses a real table");
  for (const heading of [
    "Sıra",
    "Kitap",
    "Yazar",
    "Kitap satış kanalı",
    "Hareket",
  ]) {
    contains(rankTable, `<th scope="col">${heading}</th>`, `ranking table heading: ${heading}`);
  }
  contains(
    rankTable,
    "const showRank = !previousRow || previousRow.rank !== row.rank;",
    "source rank remains in every row while duplicate visible labels are collapsed",
  );
  contains(
    rankTable,
    'row.sources.map((source) => source.sourceName).join(" · ")',
    "same-rank sources are shown together",
  );
  notContains(`${view}\n${rankTable}`, "İlkOku Sırası", "no invented public rank heading");
  notContains(`${view}\n${rankTable}`, "Kaynak Sayısı", "no composite source-count column");
  contains(rankTable, "rowMovementLabel(row)", "movement uses verified source snapshot history");
  contains(
    view,
    "showInsightPages && publishedInsightPages.length",
    "trend links render only after the full publication gate passes",
  );

  contains(
    sitemap,
    'import { getBookIndexPublicPageContext } from "@/lib/book-index/public-access";',
    "sitemap still consumes the strict publication gate",
  );
  contains(sitemap, "async function loadBookIndexSitemapEntries()", "isolated sitemap gate helper");
  contains(
    sitemap,
    "const context = await getBookIndexPublicPageContext(100);",
    "sitemap remains on strict publish context",
  );
  contains(
    sitemap,
    'context.model.turkey.availability !== "available"',
    "sitemap requires usable Turkey data",
  );

  notContains(
    header,
    "getBookIndexPublicPageContext",
    "public header remains independent from the SEO publication gate",
  );

  const fallbackStart = sitemap.indexOf("const staticFallbackEntries");
  const fallbackEnd = sitemap.indexOf("type CmsSitemapRow", fallbackStart);
  assert.ok(fallbackStart >= 0 && fallbackEnd > fallbackStart, "static fallback block must exist");
  const fallbackBlock = sitemap.slice(fallbackStart, fallbackEnd);
  notContains(
    fallbackBlock,
    "/en-cok-satanlar",
    "database/error fallback must never publish Book Index",
  );
  notContains(navigation, "/en-cok-satanlar", "public navigation remains closed during soft launch");
});



test("Book Index admin shows SEO gate evidence without publishing", () => {
  const page = source("src/app/admin/kitap-endeksi/page.tsx");
  const sitemap = source("src/lib/seo/sitemap-data.ts");
  const navigation = source("src/lib/public-site-navigation.ts");

  contains(page, "getBookIndexSeoGateSnapshot", "admin reads SEO gate snapshot");
  contains(page, "SEO kalite kapısı", "admin SEO gate card");
  contains(page, "SEO gate kanıtı", "admin evidence table");
  contains(page, "Bağımsız işletmeci", "independent operator evidence label");
  contains(
    page,
    "seoGate.evidence.observedIndependentCompositeSources",
    "admin shows the same independent operator evidence used by the gate",
  );
  contains(page, "Master eşleşme", "matching evidence");
  contains(page, "Tüm listeler · Master eşleşme", "overall matching metric is labelled as all lists");
  contains(page, "Türkiye Endeksi · Master eşleşme", "SEO gate matching metric is labelled as Turkey Index");
  contains(page, "Tarihsel kapsam", "history evidence");
  contains(page, "Türkiye Endeksi kayıt", "Turkey result evidence");
  contains(page, "Publish switch", "separate publication state");
  contains(page, "Public kapalı", "truthful default public state");

  contains(sitemap, "loadBookIndexSitemapEntries", "admin status does not bypass gated sitemap helper");
  notContains(navigation, "/en-cok-satanlar", "admin status does not publish navigation");
});


test("Book Index SEO gate source threshold cannot be inflated by sibling storefronts", () => {
  const gate = source("src/lib/book-index/seo-gate.ts");

  contains(
    gate,
    "readiness.observedCompositeIndependenceGroups",
    "gate evidence derives independent operator groups from readiness",
  );
  const access = source("src/lib/book-index/public-access.ts");
  contains(
    access,
    "readiness.observedCompositeIndependenceGroups",
    "public route gate uses the same independent source evidence",
  );
  notContains(
    gate,
    "if (evidence.observedCompositeSources < policy.minCompositeSources!)",
    "storefront count does not satisfy the source quality threshold",
  );
});


test("Turkey SEO match coverage ignores non-composite external books", () => {
  const gate = source("src/lib/book-index/seo-gate.ts");
  const access = source("src/lib/book-index/public-access.ts");

  contains(
    gate,
    "matchCoveragePercent: readiness.latestCompositeMatchCoveragePercent",
    "SEO gate uses latest Turkey composite match coverage",
  );
  contains(
    access,
    "matchCoveragePercent: readiness.latestCompositeMatchCoveragePercent",
    "public route gate uses latest Turkey composite match coverage",
  );
  notContains(
    gate,
    "matchCoveragePercent: readiness.matchCoveragePercent",
    "global and non-composite unmatched books cannot dilute SEO gate evidence",
  );
  notContains(
    access,
    "matchCoveragePercent: readiness.matchCoveragePercent",
    "global and non-composite unmatched books cannot dilute public gate evidence",
  );
});


test("internal readiness SEO gate uses Turkey composite match coverage", () => {
  const route = source("src/app/api/internal/book-index-readiness/route.ts");

  contains(
    route,
    "matchCoveragePercent: readiness.latestCompositeMatchCoveragePercent",
    "internal readiness SEO gate uses Turkey composite match coverage",
  );
});


test("SEO history evidence uses the minimum Turkey composite source history floor", () => {
  const gate = source("src/lib/book-index/seo-gate.ts");
  const access = source("src/lib/book-index/public-access.ts");
  const route = source("src/app/api/internal/book-index-readiness/route.ts");

  contains(
    gate,
    'readiness: Pick<BookIndexReadinessSnapshot, "minimumSourceHistorySpanHours">',
    "SEO history helper is scoped to the composite source history floor",
  );
  contains(
    gate,
    "Math.floor(readiness.minimumSourceHistorySpanHours / 24)",
    "SEO history days derive from the least mature composite source",
  );
  contains(
    gate,
    "historySpanDays: getBookIndexSeoHistorySpanDays(readiness)",
    "direct SEO gate snapshot uses the composite history floor",
  );
  contains(
    access,
    "historySpanDays: getBookIndexSeoHistorySpanDays(readiness)",
    "public page gate uses the composite history floor",
  );
  contains(
    route,
    "historySpanDays: getBookIndexSeoHistorySpanDays(readiness)",
    "readiness API SEO gate uses the composite history floor",
  );
  notContains(
    gate,
    "historySpanDays: readiness.historySpanDays",
    "all-observation history cannot satisfy the SEO gate",
  );
  notContains(
    access,
    "historySpanDays: readiness.historySpanDays",
    "public gate cannot use unrelated global/new-release history",
  );
});
