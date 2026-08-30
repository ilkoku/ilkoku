import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function assertContains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

function assertNotContains(text, fragment, label) {
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);
}

test("reader discovery keeps search, sorting and pagination inside bounded database queries", () => {
  const text = source("src/app/kesfet/page.tsx");
  const standard = source("src/features/reader/discovery-standard.tsx");
  const listStandard = source("src/lib/discovery-list-standard.ts");

  assertContains(listStandard, "DISCOVERY_PAGE_SIZE = 24", "global discovery standard");
  assertContains(standard, "READER_LIST_PAGE_SIZE = DISCOVERY_PAGE_SIZE", "reader discovery standard");
  assertContains(text, "await prisma.work.count({ where })", "reader discovery");
  assertContains(text, "{ title: { contains: filters.search } }", "reader discovery");
  assertContains(text, 'filters.sort === "updated"', "reader discovery");
  assertContains(
    text,
    "skip: (currentPage - 1) * READER_LIST_PAGE_SIZE",
    "reader discovery",
  );
  assertContains(text, "take: READER_LIST_PAGE_SIZE", "reader discovery");
  assertContains(text, "ReaderPagination", "reader discovery");
  assertContains(text, 'sayfa?: string;', "reader discovery");
  assertNotContains(text, "take: search ? undefined", "reader discovery");
  assertNotContains(text, "filteredWorks", "reader discovery");
  assertNotContains(text, "reader-discovery-presets", "reader discovery");
  assertNotContains(text, 'name="dil"', "reader discovery");
  assertNotContains(text, 'name="okuma"', "reader discovery");
  assertNotContains(text, 'name="favori"', "reader discovery");
});

test("one canonical work pool and one author pool back role discovery", () => {
  const workPool = source("src/features/discovery/common-work-scope.ts");
  const authorPool = source("src/features/discovery/common-author-scope.ts");
  const readerWorks = source("src/app/kesfet/page.tsx");
  const readerAuthors = source("src/app/yazar-kesfet/page.tsx");
  const editorWorks = source("src/features/editor-workspace/common-discovery-query.ts");
  const editorAuthors = source("src/app/editor/yazarlar/page.tsx");
  const publisherWorks = source("src/features/publisher-discovery/work-query.ts");
  const publisherAuthors = source("src/features/publisher-discovery/author-query.ts");

  assertContains(workPool, "commonDiscoveryWorkWhereFor", "work pool");
  assertContains(workPool, 'status: "published"', "work pool");
  assertContains(workPool, 'visibility: "public"', "work pool");
  assertContains(workPool, 'role: "writer"', "work pool author boundary");
  assertContains(workPool, "adultContentWorkVisibility", "work pool adult gate");
  assertContains(authorPool, "commonDiscoveryAuthorWhereFor", "author pool");
  assertContains(authorPool, "discoveryAuthorWhereFromWorkPool", "author pool override");
  assertContains(authorPool, 'role: "writer"', "author pool role");
  assertContains(authorPool, "works:", "author pool work backing");

  assertContains(readerWorks, "commonDiscoveryWorkWhereFor", "reader work pool");
  assertContains(readerAuthors, "discoveryAuthorWhereFromWorkPool", "reader author pool");
  assertContains(editorWorks, "commonDiscoveryWorkWhereFor", "editor work pool");
  assertContains(editorAuthors, "commonDiscoveryAuthorWhereFor", "editor author pool");
  assertContains(publisherWorks, "commonDiscoveryWorkWhereFor", "publisher work pool");
  assertContains(publisherAuthors, "commonDiscoveryWorkWhereFor", "publisher author work backing");
});

test("filter-desk discovery pages share one result and numbered pagination chrome", () => {
  const chrome = source("src/components/discovery/DiscoveryListChrome.tsx");
  const editor = source("src/app/editor/kesfet/page.tsx");
  const editorAuthors = source("src/app/editor/yazarlar/page.tsx");
  const publisherWorks = source("src/app/yayinevi/kesfet/eserler/page.tsx");
  const publisherAuthors = source("src/app/yayinevi/kesfet/yazarlar/page.tsx");
  const readerStandard = source("src/features/reader/discovery-standard.tsx");

  assertContains(chrome, "DiscoveryResultSummary", "discovery chrome");
  assertContains(chrome, "DiscoveryPagination", "discovery chrome");
  assertContains(chrome, "role-filter-result", "discovery chrome");
  assertContains(chrome, "role-filter-pagination__page", "discovery chrome");
  assertContains(readerStandard, "DiscoveryResultSummary", "reader standard");
  assertContains(readerStandard, "DiscoveryPagination as ReaderPagination", "reader standard");

  for (const [text, label] of [
    [editor, "editor discovery"],
    [editorAuthors, "editor author discovery"],
    [publisherWorks, "publisher work discovery"],
    [publisherAuthors, "publisher author discovery"],
  ]) {
    assertContains(text, "DiscoveryResultSummary", `${label} result`);
    assertContains(text, "DiscoveryPagination", `${label} pagination`);
  }
});

test("reader home follows the shared member-aware pool and exposes age, passport and work-level cleanup", () => {
  const readerHome = source("src/app/okuyucu/page.tsx");
  const shelfTabs = source("src/app/okuyucu/ReaderShelfTabs.tsx");

  assertContains(readerHome, "getAdultContentAccess(profile.id)", "reader home adult access");
  assertContains(readerHome, "commonDiscoveryWorkWhereFor(", "reader home discovery scope");
  assertContains(readerHome, "contentRating: true", "reader home audience age data");
  assertContains(readerHome, "workContentRatingDetails[", "reader home audience age display");
  assertContains(shelfTabs, "Eser Pasaportu", "reader shelf passport access");
  assertContains(shelfTabs, "Hitap {work.ratingLabel}", "reader shelf age chip");
  assertContains(shelfTabs, "Gizlenen Eserler", "reader hidden work drawer");
  assertContains(shelfTabs, "eserini ana sayfadan gizle", "reader work cleanup control");
  assertContains(shelfTabs, "function hideWork(id: string)", "reader work cleanup action");
  assertContains(shelfTabs, "const hiddenWorks = allWorks.filter", "reader hidden work list");
  assertContains(shelfTabs, "window.localStorage", "reader hidden work persistence");
  assertContains(readerHome, "reader-hidden-works:v2", "reader work cleanup storage key");
  assertNotContains(shelfTabs, "function hideSection", "reader section cleanup removal");
  assertContains(readerHome, "Okuma masan", "reader home workdesk");
  assertContains(readerHome, "getContinueReadingForMember", "reader home continue source");
});

test("continue reading supports the complete workdesk while dashboard callers remain bounded", () => {
  const fallback = source("src/features/reading/continue-reading.ts");
  const continuePage = source("src/app/okumaya-devam/page.tsx");

  assertContains(fallback, "commonDiscoveryWorkWhereFor", "continue reading shared scope");
  assertContains(fallback, "getAdultContentAccess", "continue reading adult access");
  assertContains(fallback, "prisma.readingAccess.findMany", "reading access fallback");
  assertContains(fallback, "readingProgress:", "reading access progress exclusion");
  assertContains(fallback, "none: { userId }", "completed and tracked work exclusion");
  assertContains(fallback, "progressPercent: 0", "access-only start state");
  assertContains(fallback, "take: number | null = 6", "dashboard default bound");
  assertContains(fallback, "boundedTake === null", "complete workdesk mode");
  assertContains(
    continuePage,
    "getContinueReadingForMember(profile.id, null)",
    "continue reading complete workdesk",
  );
  assertContains(continuePage, "ReaderPagination", "continue reading pagination");
});

test("18+ discovery requires both verified age and explicit consent without creating a second pool", () => {
  const policy = source("src/lib/adult-content-access.ts");
  const shell = source("src/components/layout/AppShell.tsx");
  const reader = source("src/app/kesfet/page.tsx");
  const editor = source("src/app/editor/kesfet/page.tsx");
  const publisher = source("src/app/yayinevi/kesfet/eserler/page.tsx");
  const publication = source("src/features/works/publish-work-event.ts");

  assertContains(policy, "adultEligibleAt", "adult access policy");
  assertContains(
    policy,
    "canAccessAdultContent: isAdult && Boolean(consentedAt)",
    "adult access policy",
  );
  assertContains(policy, 'entityType: AGE_VERIFICATION_ENTITY', "age verification audit");
  assertContains(policy, 'entityType: ADULT_CONSENT_ENTITY', "adult consent audit");
  assertContains(shell, 'redirect(\n        `/yas-dogrulama', "member age gate");
  assertContains(reader, "visibleMemberContentRatings", "reader adult filter");
  assertContains(editor, "visibleMemberContentRatings", "editor adult filter");
  assertContains(publisher, "visibleMemberContentRatings", "publisher adult filter");
  assertNotContains(
    publication,
    'locked[0].contentRating === "adult_18"',
    "adult publication",
  );
});

test("direct adult work, reading and passport routes enforce the same two-step gate", () => {
  const gate = source("src/features/adult-content/work-gate.ts");
  const workPage = source("src/app/kitap/[slug]/page.tsx");
  const readingPage = source("src/app/oku/[slug]/[chapterSlug]/page.tsx");
  const passportPage = source("src/app/kitap/[slug]/pasaport/page.tsx");

  assertContains(gate, 'work.contentRating !== "adult_18"', "adult work gate");
  assertContains(gate, "access.needsBirthDate", "adult work gate");
  assertContains(gate, "!access.isAdult", "adult work gate");
  assertContains(gate, "!access.canAccessAdultContent", "adult work gate");
  assertContains(workPage, "enforceAdultWorkGate", "work detail gate");
  assertContains(readingPage, "enforceAdultWorkGate", "reading gate");
  assertContains(passportPage, "enforceAdultWorkGate", "passport gate");
});

test("adult content cannot leak through favorites, progress, sharing or publication notifications", () => {
  const favorites = source("src/features/reader/favorites.ts");
  const progress = source("src/features/reading/progress.ts");
  const sharing = source("src/features/publisher-discovery/sharing-actions.ts");
  const notifications = source("src/features/works/publication-notifications.ts");

  assertContains(favorites, "adultContentWorkVisibility", "reader favorites");
  assertContains(progress, "adultContentWorkVisibility", "reading progress");
  assertContains(
    sharing,
    'work?.contentRating === "adult_18"',
    "publisher sharing",
  );
  assertContains(
    notifications,
    'work.contentRating === "adult_18"',
    "adult publication notifications",
  );
});

test("publisher work discovery remains bounded and server-filtered", () => {
  const text = source("src/features/publisher-discovery/work-query.ts");

  assertContains(text, "PUBLISHER_WORK_PAGE_SIZE", "publisher discovery page size");
  assertContains(text, "await prisma.work.count({ where })", "publisher discovery");
  assertContains(text, "skip:", "publisher discovery");
  assertContains(text, "contains: filters.query", "publisher discovery");
});

test("editor and publisher saved collections remain pool-backed and use shared chrome", () => {
  const editorFavorites = source("src/app/editor/favoriler/page.tsx");
  const editorSelections = source("src/app/editor/seckiler/page.tsx");
  const editorCollection = source("src/features/editor-workspace/collection-query.ts");
  const publisherLikes = source("src/app/yayinevi/begenilerim/page.tsx");
  const publisherFavorites = source("src/app/yayinevi/favorilerim/page.tsx");
  const publisherFollowing = source("src/app/yayinevi/takip-ettiklerim/page.tsx");
  const publisherShared = source("src/app/yayinevi/paylasilanlar/page.tsx");
  const publisherLikedQuery = source("src/features/publisher-discovery/favorites-query.ts");
  const publisherFavoriteQuery = source("src/features/publisher-discovery/work-favorites-query.ts");
  const publisherFollowingQuery = source("src/features/publisher-discovery/following-query.ts");
  const publisherSharedQuery = source("src/features/publisher-discovery/sharing-list-query.ts");

  assertContains(editorCollection, "commonDiscoveryWorkWhereFor", "editor saved pool");
  assertContains(publisherLikedQuery, "commonDiscoveryWorkWhereFor", "publisher liked pool");
  assertContains(publisherFavoriteQuery, "commonDiscoveryWorkWhereFor", "publisher favorite pool");
  assertContains(publisherFollowingQuery, "commonDiscoveryAuthorWhereFor", "publisher followed author pool");
  assertContains(publisherSharedQuery, "commonDiscoveryWorkWhereFor", "publisher shared work pool");
  assertContains(publisherSharedQuery, "commonDiscoveryAuthorWhereFor", "publisher shared author pool");

  for (const [text, label] of [
    [editorFavorites, "editor favorites"],
    [editorSelections, "editor selections"],
    [publisherLikes, "publisher likes"],
    [publisherFavorites, "publisher favorites"],
    [publisherFollowing, "publisher following"],
    [publisherShared, "publisher shared"],
  ]) {
    assertContains(text, "DiscoveryResultSummary", `${label} result`);
    assertContains(text, "DiscoveryPagination", `${label} pagination`);
    assertContains(text, "Filtre masası", `${label} filter desk`);
  }
});

test("CMS filtering center audits pool-backed surfaces without mutating discovery security", () => {
  const modules = source("src/lib/cms-modules.ts");
  const registry = source("src/lib/discovery-filter-registry.ts");
  const center = source("src/app/icerik/filtreleme-merkezi/page.tsx");

  assertContains(modules, 'href: "/icerik/filtreleme-merkezi"', "filter center CMS module");
  assertContains(modules, 'label: "Filtreleme Merkezi"', "filter center CMS label");
  assertContains(modules, 'mode: "read-only-audit"', "filter center CMS mode");

  assertContains(registry, "DISCOVERY_PAGE_SIZE", "filter registry page standard");
  assertContains(registry, "discoverySurfaces", "filter registry surfaces");
  assertContains(registry, 'route: "/kesfet"', "reader work surface");
  assertContains(registry, 'route: "/yazar-kesfet"', "reader author surface");
  assertContains(registry, 'route: "/okumaya-devam"', "reader continue surface");
  assertContains(registry, 'route: "/tamamlanan-eserler"', "reader completed surface");
  assertContains(registry, 'route: "/editor/kesfet"', "editor work surface");
  assertContains(registry, 'route: "/editor/yazarlar"', "editor author surface");
  assertContains(registry, 'route: "/yayinevi/kesfet/eserler"', "publisher work surface");
  assertContains(registry, 'route: "/yayinevi/kesfet/yazarlar"', "publisher author surface");
  assertContains(registry, "discoverySecurityLocks", "filter security locks");

  assertContains(center, 'requireCmsManager("/icerik/filtreleme-merkezi")', "filter center access");
  assertContains(center, "commonDiscoveryWorkWhereFor", "filter center work pool metric");
  assertContains(center, "commonDiscoveryAuthorWhereFor", "filter center author pool metric");
  assertContains(center, "Filtreleme Merkezi", "filter center title");
  assertContains(center, "Filtre Masası", "filter center filter language");
  assertContains(center, "Masadaki sonuç", "filter center result language");
  assertNotContains(center, "prisma.work.update", "filter center work mutation");
  assertNotContains(center, "prisma.user.update", "filter center user mutation");
  assertNotContains(center, '"use server"', "filter center server action");
});
