import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

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
  const coverStyles = source("src/app/oku/[slug]/kapak/live-book-cover.css");
  const contentsPage = source("src/app/oku/[slug]/icindekiler/page.tsx");
  const chapterReader = source(
    "src/features/reading/components/FocusedReadingExperience.tsx",
  );
  const legacyReader = source("src/features/reading/components/PagedReadingViewport.tsx");
  const legacyReaderStyles = source("src/features/reading/components/PagedReadingViewport.module.css");
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
  const readerReflow = source("src/features/reading/reader-a5-reflow.ts");

  includes(snapshots, "getLatestPublishedBookSnapshot", "full-book snapshot reader");
  includes(snapshots, "parsePublishedBookFromAuditMetadata", "audit-backed publication truth");
  includes(queries, "publicationBook", "public work full-book binding");
  includes(queries, "bookChapter?.layout", "chapter physical layout from book snapshot");
  includes(showcase, "firstPublishedBookItem", "book discovers the first authored publication item");
  includes(showcase, "/kapak?from=", "new Reader enters the live book through its front cover");
  includes(coverPage, "publishedBookItemHref", "front cover opens the first authored publication item");
  includes(coverPage, 'data-book-surface="front-cover"', "front cover stays outside numbered body pages");
  includes(coverStyles, "aspect-ratio: 148 / 210;", "actual author cover is fitted into the A5 paper ratio");
  includes(coverStyles, "object-fit: contain;", "author cover image is not cropped");
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
  includes(renderer, "splitPublishedPages", "Reader retains immutable author pageEnds as source truth");
  // Browser-measured reading pages do not change the signed publication
  // snapshot, protected chapter access, or canonical personal annotations.
  includes(readerReflow, "measureReaderA5PageEnds", "A5 reader-only content pagination");
  includes(readerReflow, "probe.scrollHeight <= permittedHeight", "real measured text fitting instead of word-count estimates");
  includes(readerReflow, "return start === content.length ? ends : null", "never publish a partial or truncated page layout");
  includes(readerReflow, "probe.remove()", "temporary text measurement leaves no DOM copy");
  includes(readerReflow, "sourceOffsetForPagePoint", "stored pins resolve to original source offsets");
  includes(renderer, "const savedPages = useMemo(() => splitPublishedPages(content, layout)", "original publication pages remain intact");
  includes(renderer, "const itemPages = current ? pages : sourcePages", "only authorized active book item can reflow");
  includes(renderer, "if (!readerModesEnabled || !content || isContentsItem) return;", "writer publication previews never reflow");
  includes(renderer, 'item.type === "special" && item.kind === "toc"', "table of contents links retain published positions");
  includes(renderer, "destination.publishedGlobalNumber", "cross-section deep links preserve original page numbers");
  includes(renderer, "sourceOffsetForPagePoint(savedPages", "existing page-point coordinates remain mapped");
  includes(continuityTools, "annotationId: annotation.id", "personal pin navigation retains the saved point identity");
  includes(renderer, "originalPoint.pageIndex, originalPoint.y", "point-list navigation uses original source-page y offset");
  includes(renderer, "findReaderPageForOffset(savedPages, sourceOffset)", "new personal pins persist against published pages");
  includes(renderer, 'data-reader-reflow={usesReaderReflow ? "true" : "false"}', "reader reflow status available for browser QA");
  includes(renderer, "fontFamily,", "original font family remains unmodified");
  includes(renderer, "READER_BODY_FONT_SIZE_PX", "reader remains 11pt");
  includes(renderer, "READER_BODY_LINE_HEIGHT_PX", "reader remains Word-like 1.15 spacing");
  includes(renderer, "visiblePages.map((page, slot) => paper(page, slot))", "one/two page reader rendering");
  includes(renderer, 'aria-pressed={spreadMode} disabled={isNarrow}', "narrow reader cannot claim facing pages while showing one A5 page");
  includes(renderer, 'aria-pressed={!spreadMode}', "the active single-page mode is accurately selected on phones");
  includes(renderer, 'const spreadMode = readerModesEnabled && displayMode === "book" && !isNarrow;', "tablet/phone effective display mode is derived consistently");
  includes(legacyReader, 'aria-pressed={bookMode}', "legacy reader also reports its effective rather than saved facing mode");
  includes(legacyReader, 'data-legacy-book-layout={bookMode ? "book" : "single"}', "legacy books can switch display layouts");
  includes(legacyReader, 'BOOK_MODE_STORAGE_KEY', "legacy books share the published-book preference");
  includes(legacyReader, 'pendingBookmarkRef', "legacy page point anchors stay in original coordinates");
  includes(legacyReader, 'if (!bookMode || (!pointMode && !drawingMode)) return;', "annotation drawing remains anchored safely");
  includes(legacyReader, 'window.requestAnimationFrame(() => chooseMode("single"))', "legacy point-tool fallback avoids render time state updates");
  includes(legacyReader, 'workSlug', "legacy reader keeps cover and contents navigation");
  includes(legacyReaderStyles, 'column-fill: auto;', "legacy book flows as facing columns without content mutation");

  // Uniform physical book surfaces preserve the underlying immutable snapshots.
  includes(legacyReaderStyles, 'width: min(100%, 35rem);', "legacy single A5 width");
  includes(legacyReaderStyles, 'width: min(100%, 70rem);', "legacy facing A5 width");
  includes(legacyReaderStyles, 'aspect-ratio: 296 / 210;', "legacy facing A5 aspect ratio");
  includes(legacyReaderStyles, 'aspect-ratio: 148 / 210;', "legacy single A5 aspect ratio");
  includes(legacyReaderStyles, 'font-size: 14.67px !important;', "legacy body uses 11pt");
  includes(legacyReaderStyles, 'line-height: 1.15 !important;', "legacy body uses Word line spacing");
  includes(legacyReader, 'className={styles.legacyChapterTitle}', "legacy chapter title is on paper");
  includes(chapterReader, 'chapterTitle={chapter.title}', "authored chapter headings reach old A5 pages");
  includes(renderer, 'const A5_PAGE_WIDTH_PX = 559.37;', "published page standard is A5 width");
  includes(renderer, 'const A5_PAGE_HEIGHT_PX = 793.7;', "published page standard is A5 height");
  includes(renderer, 'const READER_BODY_FONT_SIZE_PX = 14.67;', "published page uses 11pt");
  includes(renderer, 'READER_BODY_FONT_SIZE_PX * 1.15', "published page uses Word spacing");
  includes(renderer, 'canonicalBodyBox(', "old authored text boxes scale to the common paper");
  includes(renderer, 'splitPublishedPages(content, layout)', "authored page boundaries remain unchanged");
  includes(renderer, 'fontFamily,', "original author-selected font family stays intact");
  includes(renderer, "const naturalWidth = spreadMode ? referenceWidth * 2 : referenceWidth", "facing pages meet at one book spine");
  includes(renderer, "lastVisiblePageNumber", "reader computes final visible page instead of only active page");
  includes(renderer, "disabled={atLastVisiblePage}", "last facing spread does not offer a dead next-page button");
  includes(renderer, "className={styles.pageTurnRail}", "published book has unobtrusive page-edge turning controls");
  includes(renderer, 'event.key === "ArrowRight"', "keyboard can turn published book pages");
  includes(renderer, "if (event.defaultPrevented || event.altKey", "book turning does not steal modified keyboard actions");
  includes(renderer, 'data-page-spread={spreadMode ? "facing" : "single"}', "reader exposes the physical book layout state");

  excludes(renderer, "{page.subtitle ? <p>{page.subtitle}</p> : null}", "published Reader must not print platform editor helper text");
  includes(renderer, "headerShowsWorkTitle", "published page heading adapts to available space");
  includes(renderer, "titleFontSize", "published page heading avoids clipping on short header boxes");
  includes(renderer, 'isChapter: item.type === "chapter"', "published chapter heading is styled independently of manuscript text");
  includes(renderer, "isBookSectionHeading", "book chapter and contents use intentional editorial typography");
  includes(renderer, "styles.bookSectionHeader", "reader applies centered literary heading style");

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
  includes(contents, 'isContents: item.type === "special" && item.kind === "toc"', "contents entry is identified before filtering");
  includes(contents, ".filter((item) => !item.isContents)", "separate contents index does not list itself");
  includes(contents, "isRepeatedBookLabel(item.label, item.title)", "only distinct contents labels are displayed");
  includes(contents, 'normalizedTitle === `bölüm ${chapterLabel[1]}`', "generic chapter numbering is not duplicated");
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


test("A5 reader reflow fills measured sheets without modifying source or original point anchors", () => {
  // Execute the production TypeScript helper with a deterministic fake layout
  // probe; this exercises the algorithm beyond string-based contract checks.
  let removed = false;
  const document = {
    body: { appendChild() {} },
    createElement() {
      return {
        style: {},
        textContent: "",
        get scrollHeight() {
          const charsPerLine = Math.max(6, Math.floor(Number.parseFloat(this.style.width) / 7.6));
          const lines = this.textContent.split("\n").reduce(
            (sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)), 0,
          );
          return Math.ceil(lines * Number.parseFloat(this.style.lineHeight));
        },
        remove() { removed = true; },
      };
    },
  };
  const result = ts.transpileModule(
    source("src/features/reading/reader-a5-reflow.ts"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
  ).outputText;
  const exports = {};
  runInNewContext(result, { exports, document });

  const content = Array.from({ length: 24 }, (_, index) =>
    `Bölümün ${index + 1}. paragrafı. ` +
    "Bu kitap gerçek A5 okuma sayfalarında eksiksiz ve dengeli yer almalıdır. ".repeat(6),
  ).join("\n\n");
  const firstBody = { left: 45, top: 155, width: 385, height: 540 };
  const continuationBody = { left: 45, top: 85, width: 385, height: 620 };
  const ends = exports.measureReaderA5PageEnds({
    content, firstBody, continuationBody,
    fontFamily: '"Courier New", monospace',
    letterSpacing: 0,
  });

  assert.ok(Array.isArray(ends) && ends.length > 1 && ends.length < 17,
    "the same manuscript should occupy fewer genuinely filled 11pt A5 pages than an old 17-page snapshot");
  assert.equal(ends.at(-1), content.length, "every source character must be on a visible page");
  const pages = exports.readerTextPages(ends);
  assert.equal(pages.map((page) => content.slice(page.start, page.end)).join(""), content,
    "reflow preserves exact punctuation and original line breaks");
  assert.ok(pages.every((page, index) =>
    page.end > page.start && (index === 0 || page.start === pages[index - 1].end)),
    "pages are contiguous with no gaps or overlaps");
  assert.equal(removed, true, "temporary measurement DOM is removed");

  const originals = [{ start: 0, end: 250 }, { start: 250, end: 500 }];
  assert.equal(exports.sourceOffsetForPagePoint(originals, 1, 0.4), 350,
    "existing saved point retains its original source offset");
  assert.equal(exports.findReaderPageForOffset([{ start: 0, end: 300 }, { start: 300, end: 500 }], 350), 1,
    "original saved point can navigate to its new reader page");
});
