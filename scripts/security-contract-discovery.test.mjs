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

  assertContains(text, "const PAGE_SIZE = 24", "reader discovery");
  assertContains(text, "await prisma.work.count({ where })", "reader discovery");
  assertContains(text, "{ title: { contains: search } }", "reader discovery");
  assertContains(text, 'sort === "updated"', "reader discovery");
  assertContains(text, "skip: (currentPage - 1) * PAGE_SIZE", "reader discovery");
  assertContains(text, "take: PAGE_SIZE", "reader discovery");
  assertContains(text, "pageHref(filters", "reader discovery");
  assertContains(text, 'sayfa?: string;', "reader discovery");
  assertNotContains(text, "take: search ? undefined", "reader discovery");
  assertNotContains(text, "filteredWorks", "reader discovery");
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

test("reader home follows the shared member-aware pool and exposes age plus passport", () => {
  const readerHome = source("src/app/okuyucu/page.tsx");
  const shelfTabs = source("src/app/okuyucu/ReaderShelfTabs.tsx");

  assertContains(readerHome, "getAdultContentAccess(profile.id)", "reader home adult access");
  assertContains(readerHome, "commonDiscoveryWorkWhereFor(", "reader home discovery scope");
  assertContains(readerHome, "contentRating: true", "reader home audience age data");
  assertContains(readerHome, "workContentRatingDetails[", "reader home audience age display");
  assertContains(readerHome, "Eser Pasaportu", "reader home continue passport access");
  assertContains(shelfTabs, "Eser Pasaportu", "reader shelf passport access");
  assertContains(shelfTabs, "Hitap {work.ratingLabel}", "reader shelf age chip");
  assertContains(shelfTabs, "Gizlenenler", "reader hidden shelf drawer");
  assertContains(shelfTabs, "window.localStorage", "reader hidden shelf persistence");
  assertContains(readerHome, "Okuma masan", "reader home workdesk");
  assertContains(readerHome, "getContinueReadingForMember", "reader home continue source");
});

test("continue reading falls back to bounded member-safe reading access without reviving completed works", () => {
  const fallback = source("src/features/reading/continue-reading.ts");
  const continuePage = source("src/app/okumaya-devam/page.tsx");

  assertContains(fallback, "commonDiscoveryWorkWhereFor", "continue reading shared scope");
  assertContains(fallback, "getAdultContentAccess", "continue reading adult access");
  assertContains(fallback, "prisma.readingAccess.findMany", "reading access fallback");
  assertContains(fallback, "readingProgress:", "reading access progress exclusion");
  assertContains(fallback, "none: { userId }", "completed and tracked work exclusion");
  assertContains(fallback, "progressPercent: 0", "access-only start state");
  assertContains(fallback, "Math.min(100, Math.max(1, take))", "bounded continue query");
  assertContains(continuePage, "getContinueReadingForMember", "continue reading page fallback");
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

  assertContains(text, "const PAGE_SIZE = 24", "publisher discovery");
  assertContains(text, "await prisma.work.count({ where })", "publisher discovery");
  assertContains(text, "skip:", "publisher discovery");
  assertContains(text, "PAGE_SIZE", "publisher discovery");
  assertContains(text, "contains: filters.query", "publisher discovery");
});
