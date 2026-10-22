import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) =>
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

test("Book Index public read model preserves source ranks without public composite ordering", () => {
  const model = source("src/lib/book-index/public-read-model.ts");
  const sourceRankTable = source("src/lib/book-index/source-rank-table.ts");
  const composite = source("src/lib/book-index/read-model.ts");

  contains(
    model,
    "getTurkeySourceRankRows",
    "Turkey source-rank public model",
  );
  contains(
    sourceRankTable,
    "rowsByRankAndBook",
    "rank-and-book grouping",
  );
  contains(
    sourceRankTable,
    "list.includeInComposite || list.includeInTurkeyDisplay === true",
    "public Turkey rows allow explicitly displayed non-voting sources",
  );
  contains(
    sourceRankTable,
    "code: { in: publicTurkeyListCodes }",
    "public Turkey query is constrained to registry-approved display lists",
  );
  notContains(
    sourceRankTable,
    "includeInComposite: true,",
    "public Turkey source table is no longer identical to composite voting",
  );
  contains(
    sourceRankTable,
    "const rowKey = \`\${observation.rank}|\${identity}\`;",
    "same book merges only at the same rank",
  );
  contains(
    model,
    'orderBy: {\n          rank: "asc",',
    "source-native rank ordering",
  );
  contains(
    model,
    "rank: observation.rank",
    "source-native rank preservation",
  );
  contains(
    model,
    'status: { in: ["success", "no_change"] }',
    "successful snapshot gate",
  );
  contains(
    model,
    "observation.priceAmount?.toString() ?? null",
    "JSON-safe public price",
  );
  contains(
    composite,
    "const highestObservedRank = entry.run.observations.reduce(",
    "observed rank span guard",
  );
  contains(
    composite,
    "entry.run.itemsStored,\n      highestObservedRank,\n      1,",
    "gap-safe list size normalization",
  );
  notContains(
    composite,
    "const listSize = Math.max(entry.run.itemsStored, 1);",
    "stale stored-count-only normalization",
  );
});

test("Amazon TR and US public states remain market-isolated while both collectors are ready", () => {
  const model = source("src/lib/book-index/public-read-model.ts");
  const sources = source("src/lib/book-index/sources.ts");

  contains(model, 'getMarketSourceState("amazon-tr"', "Amazon TR public state");
  contains(model, 'getMarketSourceState("amazon-us"', "Amazon US public state");
  contains(
    sources,
    'code: "amazon-tr"',
    "Amazon TR registry source",
  );
  contains(
    sources,
    'baseUrl: "https://www.amazon.com.tr",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "ready"',
    "Amazon TR ready state",
  );
  contains(
    sources,
    'code: "amazon-us"',
    "Amazon US registry source",
  );
  contains(
    sources,
    'baseUrl: "https://www.amazon.com",\n    includeInTurkeyIndex: false,\n    independenceGroup: "amazon-us",\n    operatorName: "Amazon US",\n    phase: "v1",\n    collectionState: "ready"',
    "Amazon US ready state",
  );
  contains(
    model,
    'publicRolloutState: "gated"',
    "public rollout remains gated",
  );
});

test("Book Index public read model stays independent from conditional sitemap publication", () => {
  const model = source("src/lib/book-index/public-read-model.ts");
  const sitemap = source("src/lib/seo/sitemap-data.ts");

  contains(model, 'publicRolloutState: "gated"', "read model remains gated");
  contains(
    sitemap,
    "loadBookIndexSitemapEntries",
    "sitemap publication is handled by an explicit gate helper",
  );
});


test("Book Index public methodology describes source-rank comparison", () => {
  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");
  const normalizedView = view.replace(/\s+/g, " ");

  contains(normalizedView, "İlkOku yeni bir sıra veya bileşik puan üretmez", "no invented public ranking");
  contains(normalizedView, "Aynı kitap aynı sıra numarasında birden fazla kitap satış kanalında", "same-rank merge rule");
  contains(normalizedView, "Aynı kitap farklı sıra numaralarındaysa", "different-rank separation rule");
  contains(normalizedView, "kitap satış kanalı bazında tekilleştirme korunur", "internal insight operator deduplication");
  notContains(normalizedView, "en az üç bağımsız işletmeci grubunda görünmelidir", "stale public composite threshold copy");
});



test("Turkey public page keeps operational source status out of the visitor UI", () => {
  const model = source("src/lib/book-index/public-read-model.ts");
  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");

  contains(
    model,
    'source.market === "TR" && source.includeInTurkeyIndex',
    "Turkey source state remains available to internal read-model consumers",
  );
  contains(
    model,
    "hasRankingData: turkeySourceCodesWithData.has(source.code)",
    "source status remains derived from real ranking observations",
  );
  notContains(
    view,
    "model.turkey.sources.map",
    "operational source catalog is not rendered as public cards",
  );
  notContains(
    view,
    "Veri bağlantısı hazırlanıyor",
    "pending collector state is not visitor-facing",
  );
  notContains(
    view,
    "Sıralama yayında",
    "collector status badge is not visitor-facing",
  );
});

test("retired comparison is permanently redirected with no exposed navigation or sitemap", () => {
  const redirects = source("next.config.ts");
  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");
  const navigation = source("src/features/book-index/public/BookIndexSectionNav.tsx");
  const header = source("src/components/layout/PublicSiteHeader.tsx");
  const catalog = source("src/lib/cms-header-navigation.ts");
  const sitemap = source("src/lib/seo/sitemap-data.ts");
  const fs = source("src/lib/soft-launch-search-policy.ts");

  contains(redirects, 'source: "/en-cok-satanlar/turkiye/karsilastirma"', "legacy comparison redirect source");
  contains(redirects, 'destination: "/en-cok-satanlar/turkiye"', "legacy comparison redirect destination");
  notContains(view, 'href="/en-cok-satanlar/turkiye/karsilastirma"', "no dead overview comparison card");
  contains(view, 'href="/en-cok-satanlar/turkiye"', "overview Turkey card uses live page");
  for (const [content, name] of [
    [navigation, "section navigation"],
    [header, "shared header navigation"],
    [catalog, "CMS menu catalog"],
    [sitemap, "XML sitemap"],
  ]) {
    notContains(content, '"/en-cok-satanlar/turkiye/karsilastirma"', name);
  }
  notContains(fs, '"\u002fen-cok-satanlar/turkiye"', "no change to Book Index soft launch gate");
  contains(fs, '"/en-cok-satanlar"', "Book Index remains noindex until editorial publication gate");
});

test("New-release read model stays source-native and isolated from generic list publication", () => {
  const model = source("src/lib/book-index/new-releases.ts");
  const sitemap = source("src/lib/seo/sitemap-data.ts");
  const lists = source("src/lib/book-index/lists.ts");

  contains(
    model,
    'categoryKey: "new-releases"',
    "new-release lists are isolated by category",
  );
  contains(
    model,
    "list.enabled && list.categoryKey === \"new-releases\"",
    "disabled new-release definitions cannot leak through stale database state",
  );
  contains(
    model,
    "code: { in: enabledNewReleaseListCodes }",
    "new-release database reads are constrained to enabled registry codes",
  );
  contains(
    model,
    'status: { in: ["success", "no_change"] }',
    "new-release model uses successful snapshots only",
  );
  contains(
    model,
    'position: observation.rank',
    "source-native new-release order is preserved as source position",
  );
  contains(
    model,
    'const identity = externalBook.masterBookId',
    "cross-source grouping uses canonical matched identity",
  );
  contains(
    model,
    '`external:${entry.list.source.code}:${externalBook.id}`',
    "unmatched books remain source-specific",
  );
  notContains(
    model,
    "includeInComposite: true",
    "new-release read model does not create a composite ranking",
  );
  contains(
    lists,
    'categoryKey: "new-releases"',
    "new-release collector registry",
  );
  contains(
    lists,
    "includeInComposite: false",
    "new-release collectors remain non-voting",
  );
  contains(
    lists,
    "publiclyVisible: false",
    "new-release collector definitions stay out of generic public list discovery",
  );
});

test("New-release production exceptions stay source-specific and fail closed", () => {
  const inkilap = source("src/lib/book-index/sources/inkilap.ts");
  const illakitap = source("src/lib/book-index/sources/illakitap.ts");
  const kitapsepeti = source("src/lib/book-index/sources/kitapsepeti.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const registry = source("src/lib/book-index/new-release-sources.ts");
  const pandora = source("src/lib/book-index/sources/pandora.ts");

  contains(
    inkilap,
    'context.listCode === "inkilap-tr-new-releases"',
    "İnkılâp native new-release path is explicitly isolated",
  );
  contains(
    inkilap,
    "await fetchInkilapPage(context.sourceUrl)",
    "İnkılâp new releases use the verified single native page",
  );
  contains(
    illakitap,
    "const MIN_EXPECTED_BOOKS = 40;",
    "İlla Kitap bestseller fail-closed minimum is preserved",
  );
  contains(
    illakitap,
    "const NEW_RELEASE_MIN_EXPECTED_BOOKS = 8;",
    "İlla Kitap has a separate bounded new-release minimum",
  );
  contains(
    illakitap,
    'context.listCode === "illakitap-tr-new-releases"',
    "İlla Kitap new releases use the source-specific parser path",
  );

  contains(
    pandora,
    'context.listCode === "pandora-tr-new-releases"',
    "Pandora native new-release path is explicitly isolated",
  );
  contains(
    pandora,
    'const NEW_RELEASE_API_URL = "https://www.pandora.com.tr/api/yenikitaplar?dil=1";',
    "Pandora new releases use the verified native Turkish API",
  );
  contains(
    pandora,
    "const NEW_RELEASE_NATIVE_PAGE_SIZE = 40;",
    "Pandora collection stays aligned with the verified native desktop first page",
  );
  contains(
    pandora,
    'textValue(response.categoryName) !== "Yeni Kitaplar"',
    "Pandora native category metadata fails closed",
  );
  contains(
    pandora,
    'textValue(response.language) !== "1"',
    "Pandora Turkish language metadata fails closed",
  );
  contains(
    pandora,
    'textValue(row.yeniUrun) !== "yeniUrun"',
    "Pandora collected rows retain the verified native new-book marker",
  );
  contains(
    pandora,
    "pandoraNewReleaseSmartOrder(rows)",
    "Pandora first-page position is reconstructed from the source-native smart order",
  );

  const pandoraMarker = 'code: "pandora-tr-new-releases"';
  const pandoraStart = lists.indexOf(pandoraMarker);
  assert.ok(pandoraStart >= 0, "missing Pandora new-release list");
  const pandoraEnd = lists.indexOf("\n  },", pandoraStart);
  const pandoraBlock = lists.slice(pandoraStart, pandoraEnd);
  contains(pandoraBlock, "maxRank: 40", "Pandora native first-page size is bounded");
  contains(
    pandoraBlock,
    "includeInComposite: false",
    "Pandora new releases do not vote in a composite ranking",
  );
  contains(
    pandoraBlock,
    "publiclyVisible: false",
    "Pandora collector stays private during soft launch",
  );
  contains(
    pandoraBlock,
    "enabled: true",
    "verified Pandora new-release collection is scheduler-eligible",
  );

  contains(
    kitapsepeti,
    'context.listCode === "kitapsepeti-tr-new-releases"',
    "KitapSepeti native new-release path is explicitly isolated",
  );
  contains(
    kitapsepeti,
    "const NEW_RELEASE_MAX_BOOKS = 40;",
    "KitapSepeti native new-release collection is bounded to the verified 40 products",
  );
  contains(
    kitapsepeti,
    "const NEW_RELEASE_PAGE_COUNT = 2;",
    "KitapSepeti verified native new-release pagination is bounded to two pages",
  );

  const kitapsepetiMarker = 'code: "kitapsepeti-tr-new-releases"';
  const kitapsepetiStart = lists.indexOf(kitapsepetiMarker);
  assert.ok(kitapsepetiStart >= 0, "missing KitapSepeti new-release list");
  const kitapsepetiEnd = lists.indexOf("\n  },", kitapsepetiStart);
  const kitapsepetiBlock = lists.slice(kitapsepetiStart, kitapsepetiEnd);
  contains(
    kitapsepetiBlock,
    'sourceUrl: "https://www.kitapsepeti.com/yeni-cikan-kitaplar"',
    "KitapSepeti uses the verified native new-release URL",
  );
  contains(kitapsepetiBlock, "maxRank: 40", "KitapSepeti native new-release size is bounded");
  contains(
    kitapsepetiBlock,
    "includeInComposite: false",
    "KitapSepeti new releases do not vote in a composite ranking",
  );
  contains(
    kitapsepetiBlock,
    "collectionEveryMinutes: 360",
    "KitapSepeti verified new-release list is scheduled",
  );
  contains(
    kitapsepetiBlock,
    "publiclyVisible: false",
    "KitapSepeti new releases remain private during soft launch",
  );
  contains(
    kitapsepetiBlock,
    "enabled: true",
    "verified KitapSepeti new-release list is scheduler-eligible",
  );

  const registryMarker = 'sourceCode: "kitapsepeti"';
  const registryStart = registry.indexOf(registryMarker);
  assert.ok(registryStart >= 0, "missing KitapSepeti new-release source registry");
  const registryEnd = registry.indexOf("\n  },", registryStart);
  const registryBlock = registry.slice(registryStart, registryEnd);
  contains(
    registryBlock,
    'sourceUrl: "https://www.kitapsepeti.com/yeni-cikan-kitaplar"',
    "KitapSepeti verified native new-release URL is retained",
  );
  contains(
    registryBlock,
    'collectionMode: "dedicated_page"',
    "KitapSepeti new releases use the dedicated native page",
  );
  contains(
    registryBlock,
    'status: "verified_native_list"',
    "KitapSepeti new releases stay verified",
  );
});

test("Yeni Çıkanlar page stays public but noindex during soft launch and remains source-native", () => {
  const page = source("src/app/yeni-cikanlar/page.tsx");
  const view = source("src/features/book-index/public/NewReleasePublicView.tsx");
  const overview = source("src/features/book-index/public/BookIndexPublicView.tsx");
  const filter = source("src/features/book-index/public/NewReleaseFilterTable.tsx");
  const model = source("src/lib/book-index/new-releases.ts");
  const sitemap = source("src/lib/seo/sitemap-data.ts");

  contains(page, 'canonical = "/yeni-cikanlar"', "stable Yeni Çıkanlar canonical");
  contains(page, "noIndex: isSoftLaunchSearchExcludedPath(canonical)", "Yeni Çıkanlar follows soft-launch noindex policy");
  contains(page, "getTurkeyNewReleaseRows(500)", "Yeni Çıkanlar uses the isolated read model");
  contains(sitemap, "filterSoftLaunchSitemapEntries", "Yeni Çıkanlar sitemap output is filtered during soft launch");

  contains(
    view,
    "İlkOku bu kitaplara yeni bir sıra veya puan vermez.",
    "Yeni Çıkanlar avoids an İlkOku composite ranking",
  );
  contains(
    view,
    "Bu değer satış sırası değildir",
    "source position is not represented as a sales rank",
  );
  contains(
    view,
    "Kayıtlar kitap satış kanallarının kendi yeni çıkanlar listelerindeki konuma göre",
    "Yeni Çıkanlar explains native source-position ordering",
  );
  contains(
    view,
    "Bir kitap satış kanalı seçildiğinde o kanalın kendi liste",
    "Yeni Çıkanlar explains per-source native ordering",
  );
  contains(
    model,
    "(aPrimary?.position ?? Number.MAX_SAFE_INTEGER)",
    "combined new-release rows use native source position as the primary sort",
  );
  contains(
    model,
    "a.position - b.position",
    "multi-source labels keep their native positions ordered",
  );
  contains(
    filter,
    "a.sources.find((source) => source.sourceCode === sourceCode)",
    "source filter resolves the selected source position",
  );
  contains(
    filter,
    "(aSource?.position ?? Number.MAX_SAFE_INTEGER)",
    "source-filtered rows preserve the selected source native order",
  );
  notContains(
    model,
    "b.latestObservedAt.getTime() - a.latestObservedAt.getTime()\n        || a.title",
    "collector timing cannot become the apparent new-release ranking",
  );
  contains(
    view,
    "İlkOku katalog",
    "native new-release methodology is explained",
  );
  contains(
    overview,
    'href="/yeni-cikanlar"',
    "Book Index overview links to Yeni Çıkanlar",
  );
});



test("Book Index insight pages place analysis navigation below summary cards", () => {
  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");
  const nav = source("src/features/book-index/public/BookIndexSectionNav.tsx");
  const css = source("src/features/book-index/public/BookIndexPublicView.module.css");

  contains(
    view,
    "showAnalysis={false}",
    "insight page keeps the primary Book Index navigation above the hero",
  );
  contains(
    view,
    "showPrimary={false}",
    "insight page renders the analysis navigation separately below the summary cards",
  );
  contains(
    nav,
    "showPrimary?: boolean",
    "Book Index navigation supports primary-only rendering",
  );
  contains(
    nav,
    "showAnalysis?: boolean",
    "Book Index navigation supports analysis-only rendering",
  );
  contains(
    css,
    "background: linear-gradient(145deg, #1d1b38 0%, #2a2550 100%);",
    "insight summary cards use the dark brand palette",
  );
});

test("Book Index secondary analysis nav stays inside bestseller routes", () => {
  const nav = source("src/features/book-index/public/BookIndexSectionNav.tsx");

  contains(
    nav,
    'current !== "new-releases" && current !== "global"',
    "secondary bestseller analysis navigation is hidden from Yeni Çıkanlar and Dünya",
  );
  contains(
    nav,
    '<NavRow current={current} items={primaryItems} />',
    "primary Book Index navigation remains available across sections",
  );
  contains(
    nav,
    '<NavRow current={current} items={analysisItems} secondary />',
    "bestseller analysis navigation remains available on bestseller sections",
  );
});


test("Turkey list keeps primary and analysis navigation without retired comparison", () => {
  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");
  const nav = source("src/features/book-index/public/BookIndexSectionNav.tsx");
  contains(view, '<BookIndexSectionNav current="turkey" showAnalysis={false} />', "Turkey primary navigation");
  contains(view, '<BookIndexSectionNav current="turkey" showPrimary={false} />', "Turkey analysis navigation");
  contains(nav, 'href: "/en-cok-satanlar/turkiye"', "Turkey dedicated route");
  contains(nav, 'label: "Türkiye"', "Turkey navigation label");
  notContains(nav, 'label: "Karşılaştırma"', "retired comparison removed from analysis menu");
  notContains(view, 'TurkeyBookIndexComparisonView', "retired comparison renderer deleted");
  notContains(view, "BookIndexViewModeNav", "obsolete two-item view-mode navigation remains removed");
});

test("Kitap Ambari is displayable without gaining a Turkey composite vote", () => {
  const lists = source("src/lib/book-index/lists.ts");
  const sourceRankTable = source("src/lib/book-index/source-rank-table.ts");
  const readModel = source("src/lib/book-index/read-model.ts");

  const marker = 'code: "kitapambari-tr-live"';
  const start = lists.indexOf(marker);
  assert.ok(start >= 0, "missing Kitap Ambari live list");
  const end = lists.indexOf("\n  },", start);
  const block = lists.slice(start, end);

  contains(block, "includeInComposite: false", "Kitap Ambari remains non-voting");
  contains(block, "includeInTurkeyDisplay: true", "Kitap Ambari is explicitly visible in Turkey source rows");
  contains(block, "publiclyVisible: true", "Kitap Ambari is a public source");
  contains(sourceRankTable, "includeInTurkeyDisplay === true", "source-rank table honors display-only sources");
  contains(readModel, "includeInComposite: true", "composite scoring still uses the independent voting gate");
  notContains(readModel, "includeInTurkeyDisplay", "display-only flag cannot affect composite scoring");
});

test("batched public source snapshots reproduce the original single-list reader across lifecycle states and bounds", async () => {
  const sourceCode = source("src/lib/book-index/public-read-model.ts");

  // Compile the actual production module to JS, then run both actual exported
  // readers against the same deterministic mock data. No production DB access.
  const compiled = ts.transpileModule(sourceCode, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;

  const sources = [
    { code: "amazon-tr", name: "Amazon TR", market: "TR", collectionState: "ready" },
    { code: "amazon-us", name: "Amazon US", market: "US", collectionState: "ready" },
    { code: "bookshop-one", name: "Birinci Kaynak", market: "TR", collectionState: "ready" },
    { code: "bookshop-two", name: "İkinci Kaynak", market: "TR", collectionState: "blocked" },
    { code: "bookshop-three", name: "Üçüncü Kaynak", market: "TR", collectionState: "paused" },
    { code: "bookshop-four", name: "Dördüncü Kaynak", market: "TR", collectionState: "researching" },
  ];
  const sourceByCode = new Map(sources.map(item => [item.code, item]));
  const definitions = [
    ["one", "bookshop-one"],
    ["two", "bookshop-one"],
    ["inactive", "bookshop-one"],
    ["blocked", "bookshop-two"],
    ["paused", "bookshop-three"],
    ["no-success", "bookshop-four"],
    ["missing-row", "bookshop-one"],
  ].map(([code, src]) => ({
    code, sourceCode: src, title: "Kaynak " + code,
    categoryKey: "general", period: "weekly",
    sourceUrl: "https://example.com/" + code,
    publiclyVisible: true, enabled: true,
  }));
  const definitionByCode = new Map(definitions.map(item => [item.code, item]));
  const book = (i, sourceId) => ({
    rank: i + 1,
    priceAmount: i === 0 ? 123n : null,
    currency: "TRY",
    externalBook: {
      title: "Eser " + sourceId + " " + i,
      authorName: i % 2 ? null : "Yazar",
      publisherName: "Yayıncı",
      isbn13: null,
      isbn10: null,
      productUrl: "https://example.com/book/" + i,
      imageUrl: null,
      masterBookId: "master-" + sourceId + "-" + i,
    },
  });
  const rows = [
    { code: "one", sourceCode: "bookshop-one", active: true, status: "active",
      runs: [
        { startedAt: new Date("2026-10-21T12:00:00Z"), status: "success",
          observations: Array.from({ length: 120 }, (_, i) => book(i, "one")) },
        { startedAt: new Date("2026-10-20T12:00:00Z"), status: "success",
          observations: Array.from({ length: 4 }, (_, i) => book(i, "old")) },
      ],
    },
    { code: "two", sourceCode: "bookshop-one", active: true, status: "active",
      runs: [{ startedAt: new Date("2026-10-22T12:00:00Z"), status: "no_change",
        observations: Array.from({ length: 2 }, (_, i) => book(i, "two")) }] },
    { code: "inactive", sourceCode: "bookshop-one", active: false, status: "active",
      runs: [{ startedAt: new Date("2026-10-22T12:00:00Z"), status: "success", observations: [book(0, "inactive")] }] },
    { code: "blocked", sourceCode: "bookshop-two", active: true, status: "blocked",
      runs: [{ startedAt: new Date("2026-10-22T12:00:00Z"), status: "success", observations: [book(0, "blocked")] }] },
    { code: "paused", sourceCode: "bookshop-three", active: true, status: "paused",
      runs: [{ startedAt: new Date("2026-10-22T12:00:00Z"), status: "success", observations: [book(0, "paused")] }] },
    { code: "no-success", sourceCode: "bookshop-four", active: true, status: "active",
      runs: [{ startedAt: new Date("2026-10-22T12:00:00Z"), status: "failed", observations: [book(0, "failed")] }] },
  ];
  let singleListQueries = 0;
  let latestRunQueries = 0;
  let batchCalls = 0;
  const runs = row => row.runs
    .filter(x => x.status === "success" || x.status === "no_change")
    .sort((a, b) => b.startedAt - a.startedAt);

  const prisma = {
    bookIndexList: {
      findFirst: async ({ where }) => {
        singleListQueries++;
        const match = rows.find(x => x.code === where.code && x.sourceCode === where.source.code);
        return match ? { id: match.code, active: match.active, source: { status: match.status } } : null;
      },
      findMany: async ({ where, select }) => {
        batchCalls++;
        assert.ok(select.fetchRuns && select.fetchRuns.take === 1, "latest successful run is bounded");
        assert.equal(select.fetchRuns.observations, undefined);
        assert.equal(select.fetchRuns.select.observations.take <= 100, true, "per-run item limit remains capped");
        return rows.filter(x => where.code.in.includes(x.code)).map(x => ({
          code: x.code, active: x.active,
          source: { code: x.sourceCode, status: x.status },
          fetchRuns: runs(x).slice(0, select.fetchRuns.take).map(run => ({
            startedAt: run.startedAt,
            observations: run.observations
              .slice().sort((a, b) => a.rank - b.rank)
              .slice(0, select.fetchRuns.select.observations.take),
          })),
        }));
      },
    },
    bookIndexFetchRun: {
      findFirst: async ({ where, select }) => {
        latestRunQueries++;
        const row = rows.find(x => x.code === where.listId);
        const run = row && runs(row)[0];
        return run ? {
          startedAt: run.startedAt,
          observations: run.observations
            .slice().sort((a, b) => a.rank - b.rank)
            .slice(0, select.observations.take),
        } : null;
      },
    },
  };

  const module = { exports: {} };
  const deps = {
    "server-only": {},
    "@/lib/prisma": { prisma },
    "./lists": {
      BOOK_INDEX_LISTS: definitions,
      getBookIndexList: code => definitionByCode.get(code) ?? null,
    },
    "./performance-trace": { timeBookIndexOperation: async (_, fn) => fn() },
    "./source-rank-table": { getTurkeySourceRankRows: async () => [] },
    "./sources": {
      BOOK_INDEX_SOURCES: sources,
      getBookIndexSource: code => sourceByCode.get(code) ?? null,
    },
  };
  const evaluate = new Function("require", "module", "exports", compiled);
  evaluate(name => {
    assert.ok(Object.hasOwn(deps, name), "unknown source dependency: " + name);
    return deps[name];
  }, module, module.exports);

  const { getBookIndexPublicReadModel, getBookIndexSourceListSnapshot } = module.exports;
  for (const limit of [1, 100, 1200]) {
    const prior = await Promise.all(definitions.map(x => getBookIndexSourceListSnapshot(x.code, limit)));
    const before = { singleListQueries, latestRunQueries, batchCalls };
    const current = (await getBookIndexPublicReadModel(limit)).sourceLists;
    assert.deepEqual(current, prior, "snapshot outputs must be exactly equivalent for limit " + limit);
    assert.equal(batchCalls - before.batchCalls, 1, "one bounded batched source-list read");
    assert.equal(singleListQueries, before.singleListQueries, "new page reader must not invoke per-list lookups");
    assert.equal(latestRunQueries, before.latestRunQueries, "new page reader must not invoke per-list latest-run lookups");
    assert.ok(current[0].items.length <= 100, "public snapshot item count is capped at 100");
    assert.equal(current[0].items[0].priceAmount, "123", "BigInt price serialization preserved");
    assert.equal(current[3].availability, "blocked");
    assert.equal(current[4].availability, "paused");
    assert.equal(current[5].availability, "researching");
    assert.equal(current[6].availability, "no_snapshot");
  }
});
