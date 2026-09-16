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

test("writer routes load physical pages and the single full-book publication rule", () => {
  for (const path of [
    "src/app/yazar/layout.tsx",
    "src/app/eserlerim/layout.tsx",
    "src/app/yazmaya-devam/layout.tsx",
  ]) {
    const layout = source(path);

    includes(layout, "WriterPagedManuscriptEnhancer", `${path} paged enhancer`);
    includes(
      layout,
      "WriterFullBookPublicationSubmitBridge",
      `${path} single full-book publication bridge`,
    );
    assert.equal(
      layout.includes("WriterPublicationSnapshotGuard"),
      false,
      `${path} must not restore the legacy second publication gate`,
    );
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

test("author master becomes one immutable full-book publication snapshot for Reader", () => {
  const enhancer = source(
    "src/features/writer/components/WriterPagedManuscriptEnhancer.tsx",
  );
  const fullBookGate = source(
    "src/features/writer/components/WriterFullBookPublicationEnhancer.tsx",
  );
  const submitBridge = source(
    "src/features/writer/components/WriterFullBookPublicationSubmitBridge.tsx",
  );
  const layout = source("src/features/works/publication-layout.ts");
  const actions = source("src/features/works/actions.ts");
  const validators = source("src/features/works/validators.ts");
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
  includes(enhancer, "publicationLayout", "legacy-compatible publish form layout field");
  includes(enhancer, "WRITER_PREFERENCES_CHANGED_EVENT", "layout preference recapture");

  includes(fullBookGate, "measureBookPublicationLayouts", "one ordered whole-book measurement");
  includes(fullBookGate, "setWriterBookPublicationPreview", "reviewed full-book snapshot handoff");
  includes(fullBookGate, "BOOK_PUBLICATION_LAYOUT_INPUT_NAME", "canonical full-book layout form field");

  includes(submitBridge, "getWriterBookPublicationPreview", "final submit reads the reviewed full-book snapshot");
  includes(submitBridge, 'item.type === "chapter" && item.chapterId === chapterId', "active chapter is selected inside the reviewed book");
  includes(submitBridge, "setSnapshotContentInput(form, chapter.content)", "final form content comes from the reviewed snapshot");
  includes(submitBridge, 'formDataEvent.formData.set("content", chapter.content)', "serialized final content comes from the reviewed snapshot");
  assert.equal(
    submitBridge.includes("chapter.content !== content"),
    false,
    "final submit must not restore a second DOM-content equality gate",
  );
  includes(submitBridge, "PUBLICATION_LAYOUT_INPUT_NAME", "server compatibility field derives from the same reviewed book");
  includes(submitBridge, "MutationObserver", "preview form is hydrated when it mounts");
  includes(submitBridge, 'document.addEventListener("submit", handleSubmit, true)', "final confirmation is guarded before the server action");
  includes(submitBridge, 'document.addEventListener("formdata", handleFormData, true)', "reviewed layout is bound to serialized final form data");

  includes(layout, 'PUBLICATION_LAYOUT_INPUT_NAME = "publicationLayout"', "layout form contract");
  includes(layout, "contentLength", "layout-content integrity binding");
  includes(layout, "splitPublishedPages", "saved page split helper");
  includes(validators, "normalizeTextareaLineEndings", "textarea line-ending canonicalization helper");
  includes(
    validators,
    ".transform(normalizeTextareaLineEndings)",
    "chapter content is canonicalized before publication layout validation",
  );

  includes(actions, "parsePublicationLayout", "server layout validation");
  includes(actions, "publicationLayout", "validated publish layout");
  includes(actions, 'revalidatePath(`/eserlerim/${workId}/pasaport`)', "ownership passport refresh after work mutations");
  includes(mutations, "keepsLivePublication", "draft does not unpublish live chapter");
  assert.equal(
    mutations.includes("await saveChapterDraft(authorId, input);"),
    false,
    "publish must not perform a separate draft write before the publication transaction",
  );
  includes(publication, "transaction.workVersion.create", "atomic publication version snapshot");
  includes(publication, "content: input.content", "current author text is saved inside publication transaction");
  includes(publication, "title: input.title", "current author chapter title is saved inside publication transaction");
  includes(publication, "transaction.chapter.update", "chapter save is part of publication transaction");
  includes(publication, "encodePublicationVersionDescription", "signed publication layout metadata");
  includes(publication, "pageCount", "publication page count audit evidence");

  includes(snapshots, "PUBLICATION_VERSION_DESCRIPTION_PREFIX", "publication-only snapshot lookup");
  assert.equal(
    snapshots.includes("take: 12"),
    false,
    "published snapshot lookup must never disappear behind a recent-draft window",
  );
  includes(queries, "getLatestPublicationSnapshot", "Reader publication snapshot query");
  includes(reading, "PublishedManuscriptViewport", "fixed publication renderer selection");
  includes(renderer, "splitPublishedPages", "Reader uses author page boundaries");
  includes(renderer, "const activePage = pages[pageIndex]", "Reader renders one active author page at a time");
  assert.equal(
    renderer.includes("pages.map("),
    false,
    "Reader must not stack multiple author pages in the DOM",
  );
  includes(renderer, "transform: `scale(${scale})`", "device scaling without reflow");
  includes(renderer, "data-book-page-number", "whole-book page number contract");
  includes(renderer, "data-book-page-total", "whole-book page total contract");
  includes(renderer, "globalPageNumber", "continuous whole-book page number");
  includes(renderer, "globalPageTotal", "continuous whole-book page total");
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
