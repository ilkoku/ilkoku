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
  const service = source("src/features/works/full-book-publication.ts");
  const publication = source("src/features/works/publish-full-book-event.ts");

  includes(contract, "PublishedBookSnapshot", "immutable full-book snapshot type");
  includes(contract, "items: PublishedBookItem[]", "ordered book items");
  includes(contract, "totalPages", "physical total page count");
  includes(action, "parseBookPublicationLayoutSubmission", "full-book submission validation");
  includes(action, "prepareBookForPublication", "server-side structure preparation");
  includes(action, "publishFullBook(", "canonical full-book publication service");
  excludes(action, "await publishWork(", "legacy chapter-only publication bypass");
  includes(service, "prepareBookForPublication(authorId, input.workId", "final TOC preparation from publish payload");
  includes(service, "chapterId: input.chapterId", "current unsaved chapter identity in TOC");
  includes(service, "title: input.title", "current unsaved chapter title in TOC");

  includes(publication, "prisma.$transaction", "single atomic publication transaction");
  includes(publication, "FROM BookStructureItem", "complete Writer book structure read");
  includes(publication, "FOR UPDATE", "publication locking");
  includes(publication, "for (const item of publishedItems)", "all published book items traversal");
  includes(publication, "transaction.workVersion.create", "immutable chapter publication versions");
  includes(publication, "transaction.auditLog.create", "real publication audit event");
  includes(publication, "bookPublication,", "full-book snapshot stored in audit metadata");
  includes(publication, 'action: "work_published"', "canonical publication event");
  includes(publication, 'visibility: "public"', "published work public lifecycle");
  includes(publication, "writerContent.editor.subtitle", "Writer chapter header metadata");
});

test("Writer measures every book item and preserves intentional blank pages", () => {
  const measurement = source(
    "src/features/writer/book-publication-measurement.ts",
  );
  const layout = source("src/features/works/publication-layout.ts");
  const enhancer = source(
    "src/features/writer/components/WriterFullBookPublicationEnhancer.tsx",
  );
  const prepareAction = source(
    "src/features/works/prepare-full-book-publication-action.ts",
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
  includes(enhancer, "prepareFullBookPublicationAction", "Writer current-state full-book preparation");
  includes(enhancer, "chapterTitle", "Writer unsaved chapter title forwarded before measurement");
  includes(enhancer, "measureBookPublicationLayouts", "Writer physical book measurement");
  includes(prepareAction, "prepareBookForPublication", "server TOC preparation bridge");
  includes(prepareAction, "chapterId: parsed.data.chapterId", "validated current chapter TOC override");
  includes(prepareAction, "title: parsed.data.chapterTitle", "validated current chapter title TOC override");
});

test("Reader consumes full-book snapshot and navigates special pages plus chapters in author order", () => {
  const snapshots = source("src/features/works/publication-snapshots.ts");
  const queries = source("src/features/works/member-public-queries.ts");
  const showcase = source("src/features/showcase/components/BookShowcase.tsx");
  const coverPage = source("src/app/oku/[slug]/kapak/page.tsx");
  const contentsPage = source("src/app/oku/[slug]/icindekiler/page.tsx");
  const chapterReader = source(
    "src/features/reading/components/FocusedReadingExperience.tsx",
  );
  const specialReader = source(
    "src/features/reading/components/PublishedBookSpecialPageExperience.tsx",
  );
  const selector = source(
    "src/features/reading/components/PublishedBookSelector.tsx",
  );
  const continuityTools = source(
    "src/features/reading/components/PublishedBookToolsContinuity.tsx",
  );
  const specialRoute = source("src/app/oku/[slug]/sayfa/[itemId]/page.tsx");
  const renderer = source(
    "src/features/reading/components/PublishedManuscriptViewport.tsx",
  );

  includes(snapshots, "getLatestPublishedBookSnapshot", "full-book snapshot reader");
  includes(snapshots, "parsePublishedBookFromAuditMetadata", "audit-backed publication truth");
  includes(queries, "publicationBook", "public work full-book binding");
  includes(queries, "bookChapter?.layout", "chapter physical layout from book snapshot");
  includes(showcase, "firstPublishedBookItem", "book discovers the first authored publication item");
  includes(showcase, "/kapak?from=", "new Reader enters the live book through its front cover");
  includes(coverPage, "publishedBookItemHref", "front cover opens the first authored publication item");
  includes(coverPage, 'data-book-surface="front-cover"', "front cover stays outside numbered body pages");
  includes(coverPage, "href={bookInfoHref}", "cover returns to the actual work page");
  includes(contentsPage, "href={bookInfoHref}", "contents returns to the actual work page");
  includes(showcase, "publicationBook?.totalPages", "exact physical published page count");
  includes(chapterReader, "publishedBookItemHref", "chapter-to-book-item navigation");
  includes(chapterReader, "previousBookItem", "previous authored book item");
  includes(chapterReader, "nextBookItem", "next authored book item");
  includes(chapterReader, "subtitle={activeBookItem?.subtitle}", "chapter Writer subtitle parity");
  includes(chapterReader, "PublishedBookSelector", "chapter uses unified full-book Reader selector");
  includes(specialReader, "PublishedManuscriptViewport", "same physical Reader renderer for special pages");
  includes(specialReader, "previousItem", "special-page previous book item");
  includes(specialReader, "nextItem", "special-page next book item");
  includes(specialReader, "subtitle={item.subtitle}", "special-page Writer subtitle parity");
  includes(specialReader, "PublishedBookSelector", "special page uses the same full-book Reader selector");
  includes(specialReader, "PublishedBookToolsContinuity", "special page keeps the Reader tool shell visible");
  includes(selector, "publishedBookItemHref", "selector routes every published book item through canonical Reader URLs");
  includes(selector, "items.map", "selector exposes the complete author book order");
  includes(continuityTools, "Kişisel okuma araçları", "special pages keep the personal tools shell position");
  includes(continuityTools, 'title: "Metni seç. Vurgu', "special page highlight icon keeps the canonical tool selector contract");
  includes(continuityTools, 'title: "Metni seç. Alt çizgi', "special page underline icon keeps the canonical tool selector contract");
  includes(continuityTools, 'title: "Kitap sayfasında', "special page pin icon keeps the canonical tool selector contract");
  includes(continuityTools, 'title: "Kaldığın noktaya', "special page reading-position icon keeps the canonical tool selector contract");
  includes(continuityTools, 'title: "Not bağlamak', "special page note icon keeps the canonical tool selector contract");
  includes(continuityTools, 'title: "Kişisel işaretlere', "special page eraser icon keeps the canonical tool selector contract");
  includes(continuityTools, "aria-expanded={isListOpen}", "special page annotations-list icon uses canonical selector contract");
  includes(specialRoute, 'candidate.type === "special"', "special page immutable item boundary");
  includes(renderer, "splitPublishedPages", "Reader uses author pageEnds instead of reflow");
  includes(renderer, "visiblePages.map((page, slot) => paper(page, slot))", "one/two page reader rendering");
  includes(renderer, "const naturalWidth = spreadMode ? referenceWidth * 2 : referenceWidth", "facing pages meet at one book spine");
  includes(renderer, "lastVisiblePageNumber", "reader computes final visible page instead of only active page");
  includes(renderer, "disabled={atLastVisiblePage}", "last facing spread does not offer a dead next-page button");
  includes(renderer, 'data-page-spread={spreadMode ? "facing" : "single"}', "reader exposes the physical book layout state");

  excludes(renderer, "{page.subtitle ? <p>{page.subtitle}</p> : null}", "published Reader must not print platform editor helper text");
  includes(renderer, "headerShowsWorkTitle", "published page heading adapts to available space");
  includes(renderer, "titleFontSize", "published page heading avoids clipping on short header boxes");
  includes(renderer, "isContentsPage: item.type === \"special\" && item.kind === \"toc\"", "automatic physical contents page identified from book snapshot");
  includes(renderer, "contentsText(segment.text)", "contents lines retain original text while linking to book items");
  includes(renderer, "if (activeTool) event.preventDefault()", "personal annotation tools do not trigger contents navigation");
});

test("published special pages persist private marks against immutable publication items", () => {
  const migration = source(
    "prisma/migrations/20260910002500_personal_book_annotations/migration.sql",
  );
  const actions = source("src/features/reading/personal-book-annotations.ts");
  const annotationQueries = source(
    "src/features/reading/personal-book-annotation-queries.ts",
  );
  const route = source("src/app/oku/[slug]/sayfa/[itemId]/page.tsx");
  const tools = source(
    "src/features/reading/components/PublishedBookToolsContinuity.tsx",
  );
  const renderer = source(
    "src/features/reading/components/PublishedManuscriptViewport.tsx",
  );
  const runtimeContracts = source("src/features/system-map/runtime-contracts.json");

  includes(migration, "CREATE TABLE `PersonalBookAnnotation`", "dedicated publication-item annotation table");
  includes(migration, "`publicationItemId` CHAR(36) NOT NULL", "immutable publication item identity");
  excludes(migration, "BookStructureItem_publicationItemId_fkey", "draft structure must not cascade-delete live marks");
  includes(actions, "getLatestPublishedBookSnapshot", "annotation validation reads immutable publication truth");
  includes(actions, "candidate.structureItemId === publicationItemId", "annotation target must exist in current publication snapshot");
  includes(actions, "content: item.content", "text anchors validate against published content");
  includes(actions, "DELETE FROM PersonalBookAnnotation", "eraser and reading-position replacement persistence");
  includes(annotationQueries, "publicationItemId", "special route restores personal marks per published item");
  includes(route, "getPersonalBookAnnotations", "special Reader route hydrates private marks");
  includes(tools, "createPersonalBookAnnotationAction", "special tools persist real marks");
  includes(tools, "clearPersonalBookAnnotationsAction", "special tools clear only current publication item marks");
  includes(renderer, "handleTextSelectionEnd", "published text supports exact-offset selection");
  includes(renderer, "handlePagePoint", "published pages support pin and reading-position anchors");
  includes(renderer, "annotationHighlight", "published renderer paints private highlights without reflow");
  includes(runtimeContracts, '"PersonalBookAnnotation"', "migration-only annotation table is acknowledged");
});

test("reader-wide cover, contents, published sections and dual page modes preserve immutable access", () => {
  const renderer = source("src/features/reading/components/PublishedManuscriptViewport.tsx");
  const selector = source("src/features/reading/components/PublishedBookSelector.tsx");
  const contents = source("src/app/oku/[slug]/icindekiler/page.tsx");
  const contentsCss = source("src/app/oku/[slug]/icindekiler/book-contents.css");
  const cover = source("src/app/oku/[slug]/kapak/page.tsx");
  const chapterRoute = source("src/app/oku/[slug]/[chapterSlug]/page.tsx");
  const specialRoute = source("src/app/oku/[slug]/sayfa/[itemId]/page.tsx");
  const chapterView = source("src/features/reading/components/FocusedReadingExperience.tsx");
  const specialView = source("src/features/reading/components/PublishedBookSpecialPageExperience.tsx");
  const tools = source("src/features/reading/components/PublishedBookToolsContinuity.tsx");
  const outline = source("src/features/reading/reader-book-outline.ts");

  includes(renderer, "BOOK_MODE_STORAGE_KEY", "reader mode is a display preference, not a publication mutation");
  includes(renderer, "readerModesEnabled = false", "writer preview remains unchanged by reader-only modes");
  includes(renderer, "readerModesEnabled ? (spreadMode ? 1.55 : 1.8) : 1", "author preview scale is unchanged");
  includes(outline, "item.structureItemId === activeItemId", "only active item may supply complete content");
  includes(outline, '{ ...item, content: "" }', "all other chapter content is removed before client serialization");
  includes(outline, "preceding.content.slice(start, end)", "at most preceding facing page excerpt");
  includes(outline, "following.content.slice(0, following.layout.pageEnds[0])", "at most following facing page excerpt");
  includes(renderer, 'data-book-display-mode={spreadMode ? "book" : "single"}', "two selectable views");
  includes(renderer, "visiblePages.map((page, slot) => paper(page, slot))", "bounded visible physical pages");
  includes(renderer, "? [leftNumber, leftNumber + 1]", "two-page spreads follow global book parity");
  includes(renderer, "splitPublishedPages(item.content, item.layout)", "author snapshot page boundaries never reflow");
  includes(renderer, "const locked = !visibleText && page.pageEnd > page.pageStart;", "redacted locked text stays unreadable");
  includes(renderer, "inCurrentItem ? annotations : []", "marks cannot leak between publication items");
  includes(renderer, "const nextScale = Math.min(", "scale is calculated from real reader viewport");
  includes(renderer, "page.itemId !== currentItemId", "notes and page anchors are owned by active item");
  includes(renderer, "publishedBookItemHref(workSlug, item)", "cross-section page activation routes securely");
  includes(renderer, "const activeChapterProgress", "reading progress derived from bounded visible pages");
  includes(selector, "numberedItems", "whole book physical page positions");
  includes(selector, "contentsHref", "table of contents is available from every chapter");
  includes(cover, "contentsHref", "front cover links to complete book index");
  includes(contents, "getCurrentSessionContext()", "table of contents requires a reader session");
  includes(contents, "enforceAdultWorkGate", "adult work restriction is kept");
  includes(contents, "getMemberPublicWorkBySlug", "TOC uses commerce-aware published snapshot");
  includes(contents, "work.publicationBook.items.map", "special pages and chapters retain authored order");
  includes(contents, "chapterAccess[item.chapterId]", "locked chapters are labeled without content exposure");
  includes(contentsCss, ".reader-book-contents__paper", "large readable contents design");
  includes(chapterRoute, "getPersonalBookAnnotations", "published chapters use canonical private book notes");
  includes(chapterRoute, "PublishedBookToolsContinuity", "published chapter tool provider matches special pages");
  includes(specialRoute, "getPersonalBookAnnotations", "special page notes remain scoped");
  includes(chapterView, "bookItems={bookDisplay.outline}", "chapter passes only the safe publication outline");
  includes(specialView, "bookItems={bookDisplay.outline}", "special pages pass only the safe publication outline");
  includes(chapterView, "facingPreviews={bookDisplay.facingPreviews}", "chapter provides only adjacent page excerpts");
  includes(specialView, "facingPreviews={bookDisplay.facingPreviews}", "special pages provide only adjacent page excerpts");
  includes(tools, "useState(true)", "book tools start minimized");
});
