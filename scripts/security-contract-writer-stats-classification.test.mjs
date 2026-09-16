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

function excludes(text, fragment, label) {
  assert.equal(
    text.includes(fragment),
    false,
    `${label} must not contain ${JSON.stringify(fragment)}`,
  );
}

test("content classification becomes a compact publication readiness card without duplicating form fields", () => {
  const enhancer = source(
    "src/features/writer/components/WriterClassificationStatsEnhancer.tsx",
  );
  const css = source("src/features/writer/writer-classification-stats.css");

  includes(enhancer, ".writer-editor-layout > .writer-footer", "statistics portal target");
  includes(enhancer, ".writer-chapters > .writer-classification-panel", "canonical classification source");
  includes(enhancer, "writer-classification-panel--statistics", "statistics classification panel");
  includes(enhancer, "Yayın Durumu", "publication readiness heading");
  includes(enhancer, 'ready ? "Hazır ✓" : "Eksik"', "ready or missing status");
  includes(enhancer, 'ready ? "Düzenle" : "Tamamla"', "compact completion action");
  includes(enhancer, "setNativeSelectValue", "rating synchronization");
  includes(enhancer, "setNativeCheckboxValue", "checkbox synchronization");
  includes(css, "writer-classification-in-stats", "sidebar classification hide guard");
  includes(css, "writer-publication-readiness__summary", "compact readiness summary styling");
  includes(css, "grid-column: 1 / -1", "responsive full-width statistics card");
});

test("Writer publish reports exact missing requirements and opens the first missing control", () => {
  const readiness = source(
    "src/features/writer/writer-publication-readiness.ts",
  );
  const enhancer = source(
    "src/features/writer/components/WriterClassificationStatsEnhancer.tsx",
  );
  const publishGate = source(
    "src/features/writer/components/WriterFullBookPublicationEnhancer.tsx",
  );

  includes(readiness, 'label: "Yaş sınıfı"', "missing age rating label");
  includes(readiness, 'label: "İçerik uyarısı"', "conditional warning label");
  includes(
    readiness,
    'label: "İçerik sınıflandırması onayı"',
    "classification confirmation label",
  );
  includes(readiness, 'rating !== "all_ages" && state.warnings.length === 0', "warning requirement follows rating");
  includes(readiness, "publicationReadinessMessage", "shared exact missing message");
  includes(readiness, "WRITER_PUBLICATION_READINESS_EVENT", "shared missing-field attention event");
  includes(readiness, "scrollIntoView", "non-classification missing field navigation");
  includes(readiness, ".focus({ preventScroll: true })", "non-classification missing field focus");

  includes(enhancer, "getMissingPublicationRequirements", "same shared readiness rule in publish guard");
  includes(enhancer, "useInsertionEffect", "readiness gate registers before passive publish flow");
  includes(enhancer, "event.stopImmediatePropagation()", "invalid publish never reaches publication engine");
  includes(enhancer, "publicationReadinessMessage(missing)", "exact missing alert");
  includes(enhancer, "setExpanded(true)", "classification card auto-opens");
  includes(enhancer, "data-publication-readiness-key", "missing control targeting");
  includes(enhancer, "scrollIntoView", "classification missing control navigation");
  includes(enhancer, ".focus({ preventScroll: true })", "classification missing control focus");

  includes(publishGate, "measureBookPublicationLayouts", "single full-book publication engine remains intact");
  includes(publishGate, "routePublishThroughFinalReview", "mandatory final review remains intact");
  excludes(
    publishGate,
    "Yayın öncesi gerekli eser bilgilerini tamamla.",
    "generic missing-information message must not remain in publish flow",
  );
  excludes(readiness, "TEST2", "readiness rule must never special-case one work");
  excludes(readiness, "TEST0408", "readiness rule must never special-case one work");
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
  "src/app/kitap/[slug]/duzenle/layout.tsx",
]) {
  test(`${path} mounts classification stats enhancer`, () => {
    const layout = source(path);
    includes(layout, "WriterClassificationStatsEnhancer", "classification enhancer mount");
    includes(layout, "writer-classification-stats.css", "classification stats CSS");
  });
}
