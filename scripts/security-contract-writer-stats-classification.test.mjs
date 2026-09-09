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

test("writer direct save and publish preserve existing classification when editor form omits it", () => {
  const actions = source("src/features/works/actions.ts");
  const mutations = source("src/features/works/mutations.ts");
  const validators = source("src/features/works/validators.ts");

  includes(actions, "function hasWorkClassification(formData: FormData)", "classification presence guard");
  includes(actions, "writerMetadataSchema.safeParse", "writer metadata-only validation");
  includes(actions, "await updateWriterMetadata(authorId, parsed.data)", "classification-preserving metadata path");
  includes(mutations, "export async function updateWriterMetadata", "writer metadata mutation");
  includes(mutations, "description: input.summary", "writer summary update");
  includes(mutations, "genre: input.genre", "writer genre update");
  includes(mutations, "title: input.title", "writer title update");
  assert.equal(
    mutations.slice(
      mutations.indexOf("export async function updateWriterMetadata"),
      mutations.indexOf("export async function saveChapterDraft"),
    ).includes("contentRating:"),
    false,
    "writer metadata-only mutation must not overwrite content rating",
  );
  includes(validators, "export const writerMetadataSchema", "writer metadata schema");
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
