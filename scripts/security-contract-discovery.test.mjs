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

  assertContains(standard, "READER_LIST_PAGE_SIZE = 24", "reader discovery standard");
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

test("reader, editor and publisher discovery use the same member-aware public work pool", () => {
  const reader = source("src/app/kesfet/page.tsx");
  const editorPage = source("src/app/editor/kesfet/page.tsx");
  const editorQuery = source("src/features/editor-workspace/common-discovery-query.ts");
  const publisher = source("src/features/publisher-discovery/work-query.ts");
  const commonScope = source("src/features/discovery/common-work-scope.ts");

  assertContains(commonScope, "commonDiscoveryWorkWhereFor", "common discovery scope");
  assertContains(commonScope, 'status: "published"', "common discovery scope");
  assertContains(commonScope, 'visibility: "public"', "common discovery scope");
  assertContains(commonScope, "publishedAt:", "common discovery scope");
  assertContains(commonScope, "adultContentWorkVisibility", "common discovery scope");
  assertContains(reader, "...commonDiscoveryWorkWhereFor", "reader discovery");
  assertContains(editorQuery, "...commonDiscoveryWorkWhereFor", "editor discovery");
  assertContains(publisher, "...commonDiscoveryWorkWhereFor", "publisher discovery");
  assertContains(editorPage, "getCommonEditorDiscovery", "editor discovery page");
  assertNotContains(reader, "readingProgress: {\n      none:", "reader discovery");
});

test("filter-desk discovery pages share one result and numbered pagination chrome", () => {
  const chrome = source("src/components/discovery/DiscoveryListChrome.tsx");
  const editor = source("src/app/editor/kesfet/page.tsx");
  const publisherWorks = source("src/app/yayinevi/kesfet/eserler/page.tsx");
  const publisherAuthors = source("src/app/yayinevi/kesfet/yazarlar/page.tsx");
  const readerStandard = source("src/features/reader/discovery-standard.tsx");
  const publisherAuthorQuery = source("src/features/publisher-discovery/author-query.ts");

  assertContains(chrome, "DiscoveryResultSummary", "discovery chrome");
  assertContains(chrome, "DiscoveryPagination", "discovery chrome");
  assertContains(chrome, "role-filter-result", "discovery chrome");
  assertContains(chrome, "role-filter-pagination__page", "discovery chrome");
  assertContains(readerStandard, "DiscoveryResultSummary", "reader standard");
  assertContains(readerStandard, "DiscoveryPagination as ReaderPagination", "reader standard");
  assertContains(editor, "DiscoveryResultSummary", "editor discovery");
  assertContains(editor, "DiscoveryPagination", "editor discovery");
  assertContains(publisherWorks, "DiscoveryResultSummary", "publisher work discovery");
  assertContains(publisherWorks, "DiscoveryPagination", "publisher work discovery");
  assertContains(publisherAuthors, "DiscoveryResultSummary", "publisher author discovery");
  assertContains(publisherAuthors, "DiscoveryPagination", "publisher author discovery");
  assertContains(publisherAuthorQuery, "PUBLISHER_AUTHOR_PAGE_SIZE = 24", "publisher author page size");
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

  assertContains(text, "PUBLISHER_WORK_PAGE_SIZE = 24", "publisher discovery");
  assertContains(text, "await prisma.work.count({ where })", "publisher discovery");
  assertContains(text, "skip:", "publisher discovery");
  assertContains(text, "PUBLISHER_WORK_PAGE_SIZE", "publisher discovery");
  assertContains(text, "contains: filters.query", "publisher discovery");
});
