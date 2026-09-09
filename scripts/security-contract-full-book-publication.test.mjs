import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");

function includes(text, fragment, label) {
  assert.ok(
    text.includes(fragment),
    `${label} must contain ${JSON.stringify(fragment)}`,
  );
}

function excludes(text, fragment, label) {
  assert.equal(
    text.includes(fragment),
    false,
    `${label} must not contain ${JSON.stringify(fragment)}`,
  );
}

test("canonical publish creates one immutable full-book publication truth", () => {
  const contract = source("src/features/works/book-publication.ts");
  const action = source("src/features/works/actions.ts");
  const publication = source("src/features/works/publish-full-book-event.ts");

  includes(contract, "PublishedBookSnapshot", "immutable full-book snapshot type");
  includes(contract, "items: PublishedBookItem[]", "ordered book items");
  includes(contract, "totalPages", "physical total page count");
  includes(action, "parseBookPublicationLayoutSubmission", "full-book submission validation");
  includes(action, "prepareBookForPublication", "server-side structure preparation");
  includes(action, "publishFullBook(", "canonical full-book publication service");
  excludes(action, "await publishWork(", "legacy chapter-only publication bypass");

  includes(publication, "prisma.$transaction", "single atomic publication transaction");
  includes(publication, "FROM BookStructureItem", "complete Writer book structure read");
  includes(publication, "FOR UPDATE", "publication locking");
  includes(publication, "for (const item of publishedItems)", "all published book items traversal");
  includes(publication, "transaction.workVersion.create", "immutable chapter publication versions");
  includes(publication, "transaction.auditLog.create", "real publication audit event");
  includes(publication, "bookPublication,", "full-book snapshot stored in audit metadata");
  includes(publication, 'action: "work_published"', "canonical publication event");
  includes(publication, 'visibility: "public"', "published work public lifecycle");
});

test("Writer measures every book item and preserves intentional blank pages", () => {
  const measurement = source(
    "src/features/writer/book-publication-measurement.ts",
  );
  const layout = source("src/features/works/publication-layout.ts");
  const enhancer = source(
    "src/features/writer/components/WriterFullBookPublicationEnhancer.tsx",
  );

  includes(measurement, "for (const item of [...items]", "ordered whole-book measurement");
  includes(measurement, "currentChapterId", "current unsaved chapter identity");
  includes(measurement, "currentContent", "current unsaved chapter text");
  includes(measurement, "currentTitle", "current unsaved chapter title");
  includes(measurement, "layouts.push({ id: item.id, layout })", "layout for every structure item");
  excludes(
    measurement,
    "if (item.chapterId !== null) continue",
    "special-page-only measurement shortcut",
  );
  includes(layout, "if (content.length === 0)", "intentional blank publication page validation");
  includes(layout, "pageEnds[0] !== 0", "blank page represented as one physical page");
  includes(enhancer, "BOOK_PUBLICATION_LAYOUT_INPUT_NAME", "full-book layout form binding");
  includes(enhancer, "prepareBookForPublicationAction", "Writer structure preparation before publish");
  includes(enhancer, "measureBookPublicationLayouts", "Writer physical book measurement");
});

test("Reader consumes full-book snapshot and navigates special pages plus chapters in author order", () => {
  const snapshots = source("src/features/works/publication-snapshots.ts");
  const queries = source("src/features/works/member-public-queries.ts");
  const chapterReader = source(
    "src/features/reading/components/FocusedReadingExperience.tsx",
  );
  const specialReader = source(
    "src/features/reading/components/PublishedBookSpecialPageExperience.tsx",
  );
  const specialRoute = source("src/app/oku/[slug]/sayfa/[itemId]/page.tsx");
  const renderer = source(
    "src/features/reading/components/PublishedManuscriptViewport.tsx",
  );

  includes(snapshots, "getLatestPublishedBookSnapshot", "full-book snapshot reader");
  includes(snapshots, "parsePublishedBookFromAuditMetadata", "audit-backed publication truth");
  includes(queries, "publicationBook", "public work full-book binding");
  includes(queries, "bookChapter?.layout", "chapter physical layout from book snapshot");
  includes(chapterReader, "publishedBookItemHref", "chapter-to-book-item navigation");
  includes(chapterReader, "previousBookItem", "previous authored book item");
  includes(chapterReader, "nextBookItem", "next authored book item");
  includes(specialReader, "PublishedManuscriptViewport", "same physical Reader renderer for special pages");
  includes(specialReader, "previousItem", "special-page previous book item");
  includes(specialReader, "nextItem", "special-page next book item");
  includes(specialRoute, 'candidate.type === "special"', "special page immutable item boundary");
  includes(renderer, "splitPublishedPages", "Reader uses author pageEnds instead of reflow");
  includes(renderer, "const activePage = pages[pageIndex]", "only one active publication page rendered");
});
