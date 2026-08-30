import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function contains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

test("filtering center mutations are admin-only and persistent", () => {
  const actions = source("src/app/icerik/filtreleme-merkezi/actions.ts");
  const config = source("src/lib/discovery-filter-config.ts");
  const page = source("src/app/icerik/filtreleme-merkezi/page.tsx");
  const migration = source("prisma/migrations/20260830193000_discovery_filter_controls/migration.sql");

  contains(actions, "requireCmsAdmin", "filter actions");
  contains(actions, "addDiscoveryFilterAction", "filter actions");
  contains(actions, "removeDiscoveryFilterAction", "filter actions");
  contains(actions, "revalidatePath", "filter actions");
  contains(config, "DiscoveryFilterOverride", "filter config storage");
  contains(config, "surface.availableFilters.includes", "supported-filter boundary");
  contains(config, "new Set<DiscoveryFilterId>(surface.filters)", "default-active filter boundary");
  contains(config, "surface.availableFilters.map", "optional filter catalog");
  contains(config, "DiscoveryFilterConfig", "filter audit trail");
  contains(migration, "CREATE TABLE `DiscoveryFilterOverride`", "filter migration");
  contains(page, "+ Ekle", "filter center add control");
  contains(page, "removeDiscoveryFilterAction", "filter center remove control");
  contains(page, "canConfigure", "filter center permission state");
});

test("expanded catalog preserves existing active defaults", () => {
  const registry = source("src/lib/discovery-filter-registry.ts");

  contains(registry, "filters: readerWorkFilters", "reader work defaults");
  contains(registry, "filters: readerAuthorFilters", "reader author defaults");
  contains(registry, "filters: editorWorkFilters", "editor work defaults");
  contains(
    registry,
    'filters: ["search", "genre", "contentRating", "language", "reviewStatus", "sort"]',
    "publisher work defaults",
  );
  contains(registry, "availableFilters: readerWorkAvailableFilters", "reader optional catalog");
  contains(registry, "availableFilters: authorAvailableFilters", "author optional catalog");
  contains(registry, "authorPublicWorkCount", "author metric filters");
  contains(registry, "readingProgress", "reader relationship filters");
  contains(registry, "hasPassport", "work passport filter");
  contains(registry, "versionCount", "work version filter");
});

test("registered role filter desks read the managed filter configuration", () => {
  const paths = [
    "src/features/reader/discovery-standard.tsx",
    "src/features/publisher-discovery/components/PublisherCollectionFilterDesk.tsx",
    "src/app/editor/kesfet/page.tsx",
    "src/app/editor/yazarlar/page.tsx",
    "src/app/editor/favoriler/page.tsx",
    "src/app/editor/seckiler/page.tsx",
    "src/app/yayinevi/kesfet/eserler/page.tsx",
    "src/app/yayinevi/kesfet/yazarlar/page.tsx",
    "src/app/yayinevi/paylasilanlar/page.tsx",
  ];

  for (const path of paths) {
    contains(source(path), "getDiscoverySurfaceFilterIds", path);
  }
});

test("optional filters have real parsing and matching infrastructure", () => {
  const fields = source("src/components/discovery/AdvancedDiscoveryFilterFields.tsx");
  const advanced = source("src/lib/discovery-advanced-filters.ts");
  const reader = source("src/features/reader/discovery-standard.tsx");
  const publisherWork = source("src/features/publisher-discovery/work-query.ts");
  const publisherAuthor = source("src/features/publisher-discovery/author-query.ts");

  contains(fields, "Eser Pasaportu", "advanced filter fields");
  contains(fields, "Yazar toplam okur sayısı", "advanced author filter fields");
  contains(advanced, "matchesDiscoveryAdvancedWorkFilters", "advanced work matcher");
  contains(advanced, "matchesDiscoveryAdvancedAuthorFilters", "advanced author matcher");
  contains(reader, "sanitizeDiscoveryAdvancedFilters", "reader optional filters");
  contains(publisherWork, "matchesDiscoveryAdvancedWorkFilters", "publisher work optional filters");
  contains(publisherAuthor, "matchesDiscoveryAdvancedAuthorFilters", "publisher author optional filters");
});
