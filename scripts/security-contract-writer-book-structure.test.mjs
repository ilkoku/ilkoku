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
  includes(
    enhancer,
    "const originalAddButton = getWriterTarget()?.originalAddButton;",
    "live canonical chapter add target",
  );
  includes(enhancer, "originalAddButton.click()", "canonical chapter add behavior");
  includes(enhancer, "originalButton.click()", "canonical chapter selection behavior");
  includes(enhancer, "PagedManuscriptEditor", "special-page physical pagination");
  includes(enhancer, "prepareBookForPublicationAction", "publish-time contents generation");
  includes(enhancer, 'publishButton.addEventListener("click", handlePublish, true)', "publish interception");

  includes(css, ":has(> .writer-book-structure__header)", "header progressive enhancement");
  includes(css, ":has(> .writer-book-structure__list)", "list progressive enhancement");
  includes(css, ".writer-book-structure__item[data-dragging=\"true\"]", "drag visual state");
  includes(css, ".writer-canvas:has(> .writer-special-page-editor)", "special editor canvas takeover");
});

test("writer book structure has recoverable trash and permanent empty action", () => {
  const migration = source(
    "prisma/migrations/20260908091500_writer_book_trash/migration.sql",
  );
  const repository = source("src/features/works/book-trash-repository.ts");
  const actions = source("src/features/works/book-trash-actions.ts");
  const enhancer = source(
    "src/features/writer/components/WriterBookTrashEnhancer.tsx",
  );
  const boundary = source(
    "src/features/writer/components/WriterBookStructureRefreshBoundary.tsx",
  );
  const events = source("src/features/writer/writer-book-structure-events.ts");
  const css = source("src/features/writer/writer-book-trash.css");

  includes(migration, "CREATE TABLE `BookTrashItem`", "persistent trash table");
  includes(migration, "`structureItemId` CHAR(36) NOT NULL", "restore identity");
  includes(migration, "`originalPosition` INTEGER NOT NULL", "restore position memory");
  includes(repository, "moveBookStructureItemToTrash", "soft delete repository action");
  includes(repository, 'status: "archived"', "chapter trash archive state");
  includes(repository, "restoreBookTrashItem", "trash restore repository action");
  includes(repository, "emptyBookTrash", "permanent trash empty repository action");
  includes(repository, "Eserde en az bir ana bölüm kalmalıdır.", "last chapter safety guard");
  includes(actions, 'user?.role === "writer"', "trash writer authorization");
  includes(actions, "trashBookStructureItemAction", "trash server action");
  includes(actions, "restoreBookTrashItemAction", "restore server action");
  includes(actions, "emptyBookTrashAction", "empty trash server action");
  includes(enhancer, "Seçili öğeyi sil", "selected item delete affordance");
  includes(enhancer, "Çöp Kutusu", "trash drawer");
  includes(enhancer, "Geri Yükle", "restore affordance");
  includes(enhancer, "Çöp Kutusunu Boşalt", "permanent empty affordance");
  includes(enhancer, "Bu işlem geri alınamaz", "destructive confirmation");
  includes(enhancer, "router.refresh()", "soft route refresh after trash mutation");
  includes(enhancer, "WRITER_BOOK_STRUCTURE_CHANGED_EVENT", "structure refresh event dispatch");
  assert.ok(
    !enhancer.includes("window.location.reload"),
    "trash mutations must not hard-reload the writer page",
  );
  includes(boundary, "key={revision}", "structure enhancer remount boundary");
  includes(boundary, "WRITER_BOOK_STRUCTURE_CHANGED_EVENT", "structure refresh event listener");
  includes(events, "ilkoku:writer-book-structure-changed", "stable structure refresh event name");
  includes(css, ".writer-book-trash__drawer", "trash drawer styling");
});

test("special book pages are seeded from editable ready templates", () => {
  const templates = source("src/features/works/book-section-templates.ts");
  const actions = source("src/features/works/book-structure-actions.ts");

  includes(templates, "buildBookSectionTemplate", "template builder");
  includes(templates, "ISBN: [Yayınevi tarafından eklenecek]", "copyright template placeholder");
  includes(templates, "Bu kitabı yazma nedenim", "preface guided template");
  includes(templates, "Kısa yazar biyografisi", "author biography template");
  includes(actions, "getBookTemplateContext", "work and author template context");
  includes(actions, "hasTrashedBookSectionKind", "trashed duplicate guard");
  includes(actions, "buildBookSectionTemplate", "template application");
  includes(actions, 'kind !== "toc"', "automatic contents exclusion from editable templates");
});

test("writer book structure enhancement is mounted on every writing route", () => {
  for (const path of [
    "src/app/yazar/layout.tsx",
    "src/app/eserlerim/layout.tsx",
    "src/app/yazmaya-devam/layout.tsx",
  ]) {
    const layout = source(path);

    includes(layout, "WriterBookStructureRefreshBoundary", `${path} structure boundary mount`);
    includes(layout, "writer-book-structure.css", `${path} structure CSS`);
    includes(layout, "WriterBookTrashEnhancer", `${path} trash enhancer mount`);
    includes(layout, "writer-book-trash.css", `${path} trash CSS`);
  }
});
