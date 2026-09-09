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

test("writer manuscript pagination is based on physical overflow, not a fixed word quota", () => {
  const editor = source(
    "src/features/writer/components/PagedManuscriptEditor.tsx",
  );

  includes(editor, "probe.scrollHeight <= probe.clientHeight + 1", "physical overflow measurement");
  includes(editor, "findPageEnd", "page capacity search");
  includes(editor, "paginateContent", "pagination engine");
  includes(editor, "preferNaturalBreak", "natural page boundary handling");
  includes(editor, "writer-manuscript-page__number", "visible page numbering");
  includes(editor, "writer-manuscript-pages", "visible page wrapper");
  includes(editor, "Backspace", "cross-page backspace behavior");
  includes(editor, "ArrowRight", "cross-page caret behavior");
  assert.equal(
    editor.includes("WORDS_PER_PAGE"),
    false,
    "pagination must not use a fixed words-per-page quota",
  );
});

test("paged manuscript mirrors canonical writer form controls without changing the save contract", () => {
  const enhancer = source(
    "src/features/writer/components/WriterPagedManuscriptEnhancer.tsx",
  );
  const css = source("src/features/writer/writer-paged-manuscript.css");

  includes(enhancer, ':scope > .writer-textarea', "canonical chapter textarea lookup");
  includes(enhancer, "setNativeValue", "canonical form synchronization");
  includes(enhancer, 'new Event("input", { bubbles: true })', "React input synchronization");
  includes(enhancer, "createPortal", "paged surface portal");
  includes(css, ":has(> .writer-paged-manuscript)", "paged surface activation without DOM mutation");
});

test("writer routes load physical pages with scroll or page-turn movement", () => {
  for (const path of [
    "src/app/yazar/layout.tsx",
    "src/app/eserlerim/layout.tsx",
    "src/app/yazmaya-devam/layout.tsx",
  ]) {
    const layout = source(path);

    includes(layout, "WriterPagedManuscriptEnhancer", `${path} paged enhancer`);
    includes(layout, "writer-paged-manuscript.css", `${path} paged CSS`);
  }

  const editor = source(
    "src/features/writer/components/PagedManuscriptEditor.tsx",
  );
  const css = source("src/features/writer/writer-paged-manuscript.css");

  includes(css, "aspect-ratio", "book page ratio");
  includes(css, "overflow: hidden !important", "page overflow containment");
  includes(css, "--writer-manuscript-width", "writer page width preference integration");
  includes(css, "zoom: var(--writer-page-zoom, 1)", "visual page zoom");
  includes(css, 'data-writer-page-flow="pageTurn"', "page-turn flow hook");
  includes(css, '.writer-manuscript-page[data-active="false"]', "single active page visibility");
  includes(editor, "writer-page-turn-controls", "page-turn navigation controls");
  includes(editor, "Önceki sayfa", "previous page navigation");
  includes(editor, "Sonraki sayfa", "next page navigation");
  includes(editor, "activePageIndex", "active page state");
  includes(css, ".writer-page-probes", "unzoomed measurement probes");
  includes(css, ".writer-screen.writer-screen--focus", "focus-mode paged manuscript contract");
});

test("author master becomes an immutable publication snapshot for Reader", () => {
  const enhancer = source(
    "src/features/writer/components/WriterPagedManuscriptEnhancer.tsx",
  );
  const layout = source("src/features/works/publication-layout.ts");
  const actions = source("src/features/works/actions.ts");
  const mutations = source("src/features/works/mutations.ts");
  const publication = source("src/features/works/publish-work-event.ts");
  const snapshots = source("src/features/works/publication-snapshots.ts");
  const queries = source("src/features/works/queries.ts");
  const reading = source(
    "src/features/reading/components/FocusedReadingExperience.tsx",
  );
  const renderer = source(
    "src/features/reading/components/PublishedManuscriptViewport.tsx",
  );
  const rendererCss = source(
    "src/features/reading/components/PublishedManuscriptViewport.module.css",
  );

  includes(enhancer, ".writer-manuscript-pages .writer-page-textarea", "actual writer page capture");
  includes(enhancer, "pageEnds", "exact writer page boundaries");
  includes(enhancer, "publicationLayout", "publish form layout field");
  includes(enhancer, "WRITER_PREFERENCES_CHANGED_EVENT", "layout preference recapture");

  includes(layout, 'PUBLICATION_LAYOUT_INPUT_NAME = "publicationLayout"', "layout form contract");
  includes(layout, "contentLength", "layout-content integrity binding");
  includes(layout, "splitPublishedPages", "saved page split helper");

  includes(actions, "parsePublicationLayout", "server layout validation");
  includes(actions, "publicationLayout", "validated publish layout");
  includes(mutations, "keepsLivePublication", "draft does not unpublish live chapter");
  includes(publication, "transaction.workVersion.create", "atomic publication version snapshot");
  includes(publication, "encodePublicationVersionDescription", "signed publication layout metadata");
  includes(publication, "pageCount", "publication page count audit evidence");

  includes(snapshots, "PUBLICATION_VERSION_DESCRIPTION_PREFIX", "publication-only snapshot lookup");
  includes(queries, "getLatestPublicationSnapshot", "Reader publication snapshot query");
  includes(reading, "PublishedManuscriptViewport", "fixed publication renderer selection");
  includes(renderer, "splitPublishedPages", "Reader uses author page boundaries");
  includes(renderer, "transform: `scale(${scale})`", "device scaling without reflow");
  includes(renderer, "Yazarın yayın sayfası", "author-owned page status");
  includes(rendererCss, "overflow: hidden", "fixed published page containment");
  includes(rendererCss, "white-space: pre-wrap", "author line-break preservation");
  assert.equal(
    rendererCss.includes("overflow-y: auto"),
    false,
    "published author pages must never become an internal vertical scroller",
  );
});

test("auto-open continue-writing route never exposes a transition management screen", () => {
  const page = source("src/app/yazmaya-devam/page.tsx");
  const guard = source(
    "src/features/writer/components/WriterAutoOpenRefreshGuard.tsx",
  );
  const css = source("src/app/yazmaya-devam/auto-open-refresh-guard.css");

  includes(page, "WriterAutoOpenRefreshGuard", "auto-open route guard mount");
  includes(page, "continue-writing--auto-open", "auto-open route marker");
  includes(page, "autoOpen", "auto-open editor contract");
  assert.equal(page.includes("eserine dönülüyor"), false, "transition heading must be removed");
  assert.equal(page.includes("ChapterManagementPanel"), false, "transition management panel must be removed");
  includes(guard, 'flowOpenClass = "writer-flow-open"', "editor-open body marker");
  includes(guard, "router.replace(returnHref)", "editor exit returns directly to work list");
  includes(guard, "MutationObserver", "editor close observation");
  includes(
    css,
    "body:has(.continue-writing--auto-open)",
    "auto-open launcher shell suppression",
  );
  includes(css, "visibility: hidden", "launcher shell visibility suppression");
});
