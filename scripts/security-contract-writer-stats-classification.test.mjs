import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");

function includes(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

test("content classification lives in writer statistics without duplicating form fields", () => {
  const enhancer = source(
    "src/features/writer/components/WriterClassificationStatsEnhancer.tsx",
  );
  const css = source("src/features/writer/writer-classification-stats.css");

  includes(enhancer, ".writer-editor-layout > .writer-footer", "statistics portal target");
  includes(enhancer, ".writer-chapters > .writer-classification-panel", "canonical classification source");
  includes(enhancer, "writer-classification-panel--statistics", "statistics classification panel");
  includes(enhancer, "setNativeSelectValue", "rating synchronization");
  includes(enhancer, "setNativeCheckboxValue", "checkbox synchronization");
  includes(css, "writer-classification-in-stats", "sidebar classification hide guard");
  includes(css, "grid-column: 1 / -1", "responsive full-width statistics card");
});

test("writer trash is portaled to the sidebar itself so it stays after book items", () => {
  const trash = source(
    "src/features/writer/components/WriterBookTrashEnhancer.tsx",
  );
  const css = source("src/features/writer/writer-classification-stats.css");

  includes(trash, "sidebar: HTMLElement", "sidebar portal target type");
  includes(trash, "target.sidebar", "trash portal destination");
  includes(css, ".writer-chapters > .writer-book-trash", "trash bottom layout hook");
  includes(css, "margin-top: auto", "trash bottom placement");
});

for (const path of [
  "src/app/yazar/layout.tsx",
  "src/app/eserlerim/layout.tsx",
  "src/app/yazmaya-devam/layout.tsx",
]) {
  test(`${path} mounts classification stats enhancer`, () => {
    const layout = source(path);
    includes(layout, "WriterClassificationStatsEnhancer", "classification enhancer mount");
    includes(layout, "writer-classification-stats.css", "classification stats CSS");
  });
}
