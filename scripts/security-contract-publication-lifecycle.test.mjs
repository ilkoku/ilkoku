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

test("once published, ordinary writer edits keep the work live", () => {
  const mutations = source("src/features/works/mutations.ts");
  const structure = source("src/features/works/book-structure-repository.ts");

  includes(mutations, "existingWork.status === \"published\"", "existing live status check");
  includes(mutations, "existingWork.visibility === \"public\"", "existing public visibility check");
  includes(mutations, "existingWork.publishedAt !== null", "existing publication timestamp check");
  includes(mutations, "const status = keepsLivePublication", "live publication shields status edits");
  includes(mutations, 'status: "published"', "live status preservation");
  includes(mutations, 'visibility: "public"', "live visibility preservation");

  assert.equal(
    structure.includes("publishedAt: null"),
    false,
    "book page creation/edit/reorder must not clear publication time",
  );
  assert.equal(
    structure.includes('visibility: "private"'),
    false,
    "book page creation/edit/reorder must not make a published work private",
  );
});

test("existing publication history repairs accidental draft/private drift", () => {
  const migration = source(
    "prisma/migrations/20260909215500_restore_published_work_lifecycle/migration.sql",
  );

  includes(migration, "work_published", "publication history source");
  includes(migration, "MAX(`createdAt`) AS lastPublishedAt", "latest real publication timestamp");
  includes(migration, "work.`status` = 'published'", "published state repair");
  includes(migration, "work.`visibility` = 'public'", "visibility repair");
  includes(migration, "work.`archivedAt` IS NULL", "explicit archive boundary");
});

test("Reader still renders the immutable author publication snapshot page by page", () => {
  const queries = source("src/features/works/queries.ts");
  const reader = source(
    "src/features/reading/components/PublishedManuscriptViewport.tsx",
  );

  includes(queries, "getLatestPublicationSnapshot", "published chapter snapshot source");
  includes(queries, "publication?.content ?? chapter.content", "published content precedence");
  includes(queries, "publicationLayout: publication?.layout ?? null", "published layout precedence");
  includes(reader, "splitPublishedPages", "author page split source");
  includes(reader, "const activePage = pages[pageIndex]", "single active publication page");
  includes(reader, "pageIndex + 1} / ${pages.length}", "all author pages remain navigable");
});
