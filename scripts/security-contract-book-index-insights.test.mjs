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

test("Book Index insights derive from historical snapshots without publishing routes", () => {
  const insights = source("src/lib/book-index/insights.ts");

  contains(
    insights,
    'status: { in: ["success", "no_change"] }',
    "successful snapshot gate",
  );
  contains(insights, "take: 2", "current and previous snapshot comparison");
  contains(insights, "if (!snapshot.hasPrevious) continue;", "new-entry baseline requirement");
  contains(insights, "previous.rank - current.rank", "riser rank gain");
  contains(insights, "newSourceCount", "new-entry source evidence");
  contains(
    insights,
    "bestNewEntryRank",
    "new-entry ranking uses the rank of the newly entered source list",
  );
  contains(
    insights,
    "a.bestNewEntryRank - b.bestNewEntryRank",
    "new-entry native position breaks ties before total current visibility",
  );
  contains(insights, "newSources.add(snapshot.sourceCode)", "new-entry source dedupe");
  contains(insights, "gains.set(snapshot.sourceCode, {", "riser source evidence dedupe");
  contains(
    insights,
    "currentIndependenceGroupsByBook",
    "everywhere-seller independent operator evidence",
  );
  contains(
    insights,
    "independenceGroups.size >= TURKEY_INDEX_MIN_SOURCES",
    "everywhere-seller independent-operator threshold",
  );
  contains(
    insights,
    "getBookIndexSourceIndependenceGroup",
    "operator-group mapping",
  );
  notContains(
    insights,
    "sources.size >= TURKEY_INDEX_MIN_SOURCES",
    "raw storefront threshold",
  );
  contains(
    insights,
    "MIN(observation.observedAt)",
    "long-seller first observation",
  );
  contains(
    insights,
    "MAX(observation.observedAt)",
    "long-seller last observation",
  );
  contains(
    insights,
    "GROUP_CONCAT(DISTINCT source.code",
    "long-seller source-code evidence",
  );
  contains(
    insights,
    "sourceCount: independenceGroups.size",
    "long-seller independent operator count",
  );
  notContains(
    insights,
    "COUNT(DISTINCT list.sourceId)",
    "raw storefront long-seller count",
  );
});

test("Book Index analysis pages use descriptive canonical slugs and keep legacy redirects", () => {
  const pages = source("src/lib/book-index/insight-pages.ts");
  const config = source("next.config.ts");

  for (const slug of [
    "cok-satanlara-yeni-girenler",
    "cok-satanlarda-yukselenler",
    "birden-fazla-listede-cok-satanlar",
    "uzun-suredir-cok-satanlar",
  ]) {
    contains(pages, `slug: "${slug}"`, `canonical analysis slug ${slug}`);
  }

  for (const [legacyPath, canonicalPath] of [
    ["/en-cok-satanlar/yeni-girisler", "/en-cok-satanlar/cok-satanlara-yeni-girenler"],
    ["/en-cok-satanlar/yukselenler", "/en-cok-satanlar/cok-satanlarda-yukselenler"],
    ["/en-cok-satanlar/her-yerde-satanlar", "/en-cok-satanlar/birden-fazla-listede-cok-satanlar"],
    ["/en-cok-satanlar/uzun-satanlar", "/en-cok-satanlar/uzun-suredir-cok-satanlar"],
  ]) {
    contains(config, `source: "${legacyPath}"`, `legacy redirect source ${legacyPath}`);
    contains(config, `destination: "${canonicalPath}"`, `legacy redirect destination ${canonicalPath}`);
  }
});

test("Book Index insight labels stay descriptive rather than inventing fixed time thresholds", () => {
  const insights = source("src/lib/book-index/insights.ts");

  contains(insights, "historyDays", "measured history duration");
  contains(insights, "totalRankGain", "measured rank improvement");
  contains(insights, "improvingSourceCount", "measured improving-source count");
  contains(insights, "currentSourceCount", "measured current-source count");
});

test("Book Index trend pages expose source-level evidence instead of summary-only claims", () => {
  const insights = source("src/lib/book-index/insights.ts");
  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");
  const page = source("src/app/en-cok-satanlar/[insight]/page.tsx");

  contains(insights, "BookIndexSourceRankEvidence", "source-rank evidence contract");
  contains(insights, "previousRank", "riser previous-rank evidence");
  contains(insights, "currentRank", "current-rank evidence");
  contains(insights, "rankGain", "source-level rank gain");
  contains(insights, "sourceName: getBookIndexSource", "human-readable source names");
  contains(view, "insightEvidence(item)", "trend evidence is rendered");
  contains(view, "Yeni kaynak görünümü", "new-entry summary metric");
  contains(
    view,
    "Soldaki sıra satış sırası değildir.",
    "analysis pages explain that their ordinals are not sales rankings",
  );
  contains(
    view,
    "Önce daha fazla bağımsız satış sitesinde yükselen kitaplar",
    "riser page explains its analysis ordering",
  );
  contains(
    view,
    "Önce daha fazla bağımsız satış sitesinin çok satan listesinde görünen kitaplar",
    "multi-site page explains its analysis ordering",
  );
  contains(
    view,
    "Önce en uzun doğrulanmış gözlem süresi",
    "long-seller page explains its analysis ordering",
  );
  contains(
    view,
    "en iyi yeni giriş",
    "new-entry cards label the native entry-rank metric clearly",
  );
  contains(view, "Toplam sıra kazanımı", "riser summary metric");
  contains(view, "En geniş görünürlük", "multi-source summary metric");
  contains(view, "Toplam gözlem", "long-seller summary metric");
  contains(view, 'name="q"', "book/author search filter");
  contains(view, 'name="source"', "source filter");
  contains(page, "searchParams", "trend filters are server-side URL parameters");
});


test("Book Index auto-matches refresh corrected metadata only through exact ISBN identity", () => {
  const matching = source("src/lib/book-index/matching.ts");

  contains(
    matching,
    "hasExactIsbnIdentity",
    "linked master metadata refresh requires exact ISBN identity",
  );
  contains(
    matching,
    'externalBook.matchStatus === "auto_matched"',
    "only existing auto-matches enter the linked-master refresh path",
  );
  contains(
    matching,
    "shouldRefreshMasterTitle",
    "contaminated master titles are recognized conservatively",
  );
  contains(
    matching,
    "currentTitle.startsWith(`${incomingTitle} `)",
    "title cleanup only removes verified metadata appended after the current source title",
  );
  contains(
    matching,
    "title: externalBook.title",
    "verified current source title can repair a stale master title",
  );
  contains(
    matching,
    "authorName: externalBook.authorName",
    "verified current source author can fill an empty master author",
  );
  notContains(
    matching,
    'externalBook.matchStatus === "manual_matched") {\n      await refreshAutoMatchedMasterMetadata',
    "manual matches are not rewritten by automatic metadata refresh",
  );
});
