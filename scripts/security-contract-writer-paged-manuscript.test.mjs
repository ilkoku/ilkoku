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

test("writer routes load physical pages with vertical or paired page movement", () => {
  for (const path of [
    "src/app/yazar/layout.tsx",
    "src/app/eserlerim/layout.tsx",
    "src/app/yazmaya-devam/layout.tsx",
  ]) {
    const layout = source(path);

    includes(layout, "WriterPagedManuscriptEnhancer", `${path} paged enhancer`);
    includes(layout, "writer-paged-manuscript.css", `${path} paged CSS`);
  }

  const css = source("src/features/writer/writer-paged-manuscript.css");
  includes(css, "aspect-ratio", "book page ratio");
  includes(css, "overflow: hidden !important", "page overflow containment");
  includes(css, "--writer-manuscript-width", "writer page width preference integration");
  includes(css, "zoom: var(--writer-page-zoom, 1)", "visual page zoom");
  includes(css, 'data-writer-page-flow="sideBySide"', "paired page flow hook");
  includes(css, "grid-template-columns: repeat(2, var(--writer-manuscript-width))", "two-page pairing");
  includes(css, ".writer-page-probes", "unzoomed measurement probes");
  includes(css, ".writer-screen.writer-screen--focus", "focus-mode paged manuscript contract");
});
