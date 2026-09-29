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

test("Amazon TR and US public states remain market-isolated while Amazon TR is production-ready", () => {
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
    "Amazon TR production-ready state",
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
  const sitemap = source("src/app/sitemap.ts");

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
  contains(normalizedView, "Aynı kitap aynı sıra numarasında birden fazla sitede", "same-rank merge rule");
  contains(normalizedView, "Aynı kitap farklı sıra numaralarındaysa", "different-rank separation rule");
  contains(normalizedView, "işletmeci grubu bazında tekilleştirme korunur", "internal insight operator deduplication");
  notContains(normalizedView, "en az üç bağımsız işletmeci grubunda görünmelidir", "stale public composite threshold copy");
});



test("Turkey public page keeps missing book sites visible without inventing ranks", () => {
  const model = source("src/lib/book-index/public-read-model.ts");
  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");

  contains(
    model,
    'source.market === "TR" && source.includeInTurkeyIndex',
    "all Turkey book-index sources are exposed to the public source catalog",
  );
  contains(
    model,
    "hasRankingData: turkeySourceCodesWithData.has(source.code)",
    "source status is derived from real ranking observations",
  );
  contains(
    view,
    "model.turkey.sources.map",
    "Turkey page renders the complete source catalog",
  );
  contains(
    view,
    "Veri bağlantısı hazırlanıyor",
    "sources without ranking data remain visible with a neutral pending label",
  );
  contains(
    view,
    "Sıralama yayında",
    "sources with observed ranking data are clearly identified",
  );
  notContains(
    view,
    '>blocked<',
    "internal blocked state is not exposed as public-facing copy",
  );
});

test("Bestseller comparison has a dedicated gated SEO route", () => {
  const page = source("src/app/en-cok-satanlar/turkiye/karsilastirma/page.tsx");
  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");
  const comparison = source("src/features/book-index/public/BookIndexSourceComparison.tsx");
  const sitemap = source("src/app/sitemap.ts");

  contains(
    page,
    'canonical = "/en-cok-satanlar/turkiye/karsilastirma"',
    "stable bestseller comparison canonical",
  );
  contains(
    page,
    'title = "En Çok Satanlar Karşılaştırma | İlkOku"',
    "comparison SEO title keeps the approved phrase",
  );
  contains(
    page,
    "noIndex: !context.gate.canPublish",
    "comparison route stays noindex until Book Index publication is approved",
  );
  contains(
    view,
    "<h1>En Çok Satanlar Karşılaştırma</h1>",
    "comparison H1 keeps the approved phrase",
  );
  contains(
    view,
    'href="/en-cok-satanlar/turkiye/karsilastirma"',
    "overview and Turkey list link to the dedicated comparison route",
  );
  notContains(
    comparison,
    "Kaynak seç",
    "public comparison controls avoid technical source wording",
  );
  contains(
    comparison,
    "Site seç",
    "public comparison controls use site wording",
  );
  contains(
    sitemap,
    "/en-cok-satanlar/turkiye/karsilastirma",
    "comparison route joins the already-gated Book Index sitemap set",
  );
});

test("New-release read model stays source-native and private until publication is approved", () => {
  const model = source("src/lib/book-index/new-releases.ts");
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
    "new-release collectors remain private before public approval",
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

test("Yeni Çıkanlar page stays noindex and source-native during soft launch", () => {
  const page = source("src/app/yeni-cikanlar/page.tsx");
  const view = source("src/features/book-index/public/NewReleasePublicView.tsx");
  const overview = source("src/features/book-index/public/BookIndexPublicView.tsx");
  const model = source("src/lib/book-index/new-releases.ts");

  contains(page, 'canonical = "/yeni-cikanlar"', "stable Yeni Çıkanlar canonical");
  contains(page, "noIndex: true", "Yeni Çıkanlar remains noindex during soft launch");
  contains(page, "getTurkeyNewReleaseRows(500)", "Yeni Çıkanlar uses the isolated read model");
  notContains(page, "application/ld+json", "no JSON-LD is published while the page is gated");

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
    "Kayıtlar kitap adına göre alfabetik gösterilir.",
    "Yeni Çıkanlar uses a neutral visible order",
  );
  contains(
    model,
    'a.title.localeCompare(b.title, "tr")',
    "new-release rows use title as the primary cross-source sort",
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



test("bestseller full list and comparison expose distinct view modes", () => {
  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");
  const nav = source("src/features/book-index/public/BookIndexViewModeNav.tsx");
  const styles = source("src/features/book-index/public/BookIndexPublicView.module.css");

  contains(view, '<BookIndexViewModeNav current="list" />', "full list active mode");
  contains(
    view,
    '<BookIndexViewModeNav current="comparison" />',
    "comparison active mode",
  );
  contains(nav, "Tüm Liste", "full-list mode label");
  contains(nav, "Karşılaştırma", "comparison mode label");
  contains(
    nav,
    'href="/en-cok-satanlar/turkiye"',
    "full-list dedicated route",
  );
  contains(
    nav,
    'href="/en-cok-satanlar/turkiye/karsilastirma"',
    "comparison dedicated route",
  );
  contains(nav, 'aria-current={current === "list" ? "page" : undefined}', "list current-page state");
  contains(
    nav,
    'aria-current={current === "comparison" ? "page" : undefined}',
    "comparison current-page state",
  );
  contains(styles, ".viewModeNav", "visible mode navigation styling");
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
