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

test("writer book structure has persistent logical pages and automatic contents", () => {
  const model = source("src/features/works/book-structure.ts");
  const repository = source("src/features/works/book-structure-repository.ts");
  const actions = source("src/features/works/book-structure-actions.ts");
  const migration = source(
    "prisma/migrations/20260907224500_writer_book_structure/migration.sql",
  );

  includes(migration, "CREATE TABLE `BookStructureItem`", "book structure table");
  includes(migration, "`chapterId` CHAR(36) NULL", "chapter mapping");
  includes(migration, "`kind` VARCHAR(32) NOT NULL", "logical page kind");
  includes(migration, "UNIQUE INDEX `BookStructureItem_workId_position_key`", "stable book order");
  includes(migration, "FROM `Chapter` AS chapter", "existing chapter backfill");

  for (const label of [
    "İç Kapak",
    "Künye",
    "İthaf",
    "Epigraf",
    "İçindekiler",
    "Önsöz",
    "Prolog",
    "Epilog",
    "Teşekkür",
    "Yazar Hakkında",
  ]) {
    includes(model, label, `${label} logical book page`);
  }
  includes(model, "tableOfContentsIncludedKinds", "contents inclusion policy");

  includes(repository, "FOR UPDATE", "structure mutation locking");
  includes(repository, "authorId = ${authorId}", "author ownership boundary");
  includes(repository, "duplicate", "special-page duplicate guard");
  includes(repository, "SET position = ${-(index + 1)}", "collision-safe reorder phase");
  includes(repository, "prepareBookForPublication", "publish preparation");
  includes(repository, "ensureAutomaticTableOfContents", "automatic contents creation");
  includes(repository, 'kind === "toc"', "contents kind handling");
  includes(repository, 'tocLines.join("\\n\\n")', "ordered contents generation");

  includes(actions, 'user.role !== "writer"', "writer authentication boundary");
  includes(actions, "reorderSchema", "reorder validation");
  includes(actions, "prepareBookForPublicationAction", "publish-time contents action");
});

test("writer sidebar behaves like a reorderable slide pane", () => {
  const enhancer = source(
    "src/features/writer/components/WriterBookStructureEnhancer.tsx",
  );
  const css = source("src/features/writer/writer-book-structure.css");

  includes(enhancer, "Kitap Yapısı", "book structure sidebar label");
  includes(enhancer, "Ek sayfalar", "special-page add menu");
  includes(enhancer, "specialBookSectionKinds.map", "special-page choices");
  includes(enhancer, "draggable={!isStructureBusy}", "drag affordance");
  includes(enhancer, "onDragStart", "drag start behavior");
  includes(enhancer, "onDrop", "drop behavior");
  includes(enhancer, "reorderBookStructureAction", "persistent reorder action");
  includes(enhancer, "target.originalAddButton.click()", "canonical chapter add behavior");
  includes(enhancer, "originalButton.click()", "canonical chapter selection behavior");
  includes(enhancer, "PagedManuscriptEditor", "special-page physical pagination");
  includes(enhancer, "prepareBookForPublicationAction", "publish-time contents generation");
  includes(enhancer, 'publishButton.addEventListener("click", handlePublish, true)', "publish interception");

  includes(css, ":has(> .writer-book-structure__header)", "header progressive enhancement");
  includes(css, ":has(> .writer-book-structure__list)", "list progressive enhancement");
  includes(css, ".writer-book-structure__item[data-dragging=\"true\"]", "drag visual state");
  includes(css, ".writer-canvas:has(> .writer-special-page-editor)", "special editor canvas takeover");
});

test("writer book structure enhancement is mounted on every writing route", () => {
  for (const path of [
    "src/app/yazar/layout.tsx",
    "src/app/eserlerim/layout.tsx",
    "src/app/yazmaya-devam/layout.tsx",
  ]) {
    const layout = source(path);

    includes(layout, "WriterBookStructureEnhancer", `${path} enhancer mount`);
    includes(layout, "writer-book-structure.css", `${path} structure CSS`);
  }
});
