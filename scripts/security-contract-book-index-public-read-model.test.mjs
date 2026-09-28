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

test("Amazon TR and US public states fail closed until sanctioned data exists", () => {
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
    'collectionState: "researching"',
    "researching source state",
  );
  contains(
    sources,
    'code: "amazon-us"',
    "Amazon US registry source",
  );
  contains(
    sources,
    'collectionState: "blocked"',
    "blocked source state",
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
  contains(normalizedView, "Aynı kitap aynı sıra numarasında birden fazla kaynakta", "same-rank merge rule");
  contains(normalizedView, "Aynı kitap farklı sıra numaralarındaysa", "different-rank separation rule");
  contains(normalizedView, "işletmeci grubu bazında tekilleştirme korunur", "internal insight operator deduplication");
  notContains(normalizedView, "en az üç bağımsız işletmeci grubunda görünmelidir", "stale public composite threshold copy");
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

  const kitapsepetiMarker = 'code: "kitapsepeti-tr-new-releases"';
  const kitapsepetiStart = lists.indexOf(kitapsepetiMarker);
  assert.ok(kitapsepetiStart >= 0, "missing KitapSepeti new-release list");
  const kitapsepetiEnd = lists.indexOf("\n  },", kitapsepetiStart);
  const kitapsepetiBlock = lists.slice(kitapsepetiStart, kitapsepetiEnd);
  contains(
    kitapsepetiBlock,
    "collectionEveryMinutes: null",
    "unverified KitapSepeti new-release collection is paused",
  );
  contains(
    kitapsepetiBlock,
    "enabled: false",
    "unverified KitapSepeti new-release list is disabled",
  );

  const registryMarker = 'sourceCode: "kitapsepeti"';
  const registryStart = registry.indexOf(registryMarker);
  assert.ok(registryStart >= 0, "missing KitapSepeti new-release source registry");
  const registryEnd = registry.indexOf("\n  },", registryStart);
  const registryBlock = registry.slice(registryStart, registryEnd);
  contains(registryBlock, "sourceUrl: null", "KitapSepeti unverified URL is not trusted");
  contains(registryBlock, "collectionMode: null", "KitapSepeti unverified mode is not trusted");
  contains(registryBlock, 'status: "researching"', "KitapSepeti new releases return to research");
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

