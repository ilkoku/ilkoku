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

test("auto-open continue-writing refresh never paints the management scaffold before the editor", () => {
  const page = source("src/app/yazmaya-devam/page.tsx");
  const guard = source(
    "src/features/writer/components/WriterAutoOpenRefreshGuard.tsx",
  );
  const css = source("src/app/yazmaya-devam/auto-open-refresh-guard.css");

  includes(page, "WriterAutoOpenRefreshGuard", "auto-open refresh guard mount");
  includes(page, "continue-writing--auto-open", "auto-open route marker");
  includes(page, "autoOpen", "auto-open editor contract");
  includes(guard, 'flowOpenClass = "writer-flow-open"', "editor-open body marker");
  includes(guard, 'hydratedClass = "writer-auto-open-hydrated"', "hydration completion marker");
  includes(guard, "MutationObserver", "editor-open observation");
  includes(
    css,
    "body:has(.continue-writing--auto-open):not(.writer-auto-open-hydrated)",
    "pre-hydration scaffold suppression",
  );
  includes(
    css,
    "body.writer-flow-open:has(.continue-writing--auto-open)",
    "open-editor scaffold suppression",
  );
  includes(css, "visibility: hidden", "scaffold visibility suppression");
});
