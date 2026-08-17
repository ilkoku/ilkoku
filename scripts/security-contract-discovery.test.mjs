import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function assertContains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

function assertNotContains(text, fragment, label) {
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);
}

test("reader discovery keeps search, sorting and pagination inside bounded database queries", () => {
  const text = source("src/app/kesfet/page.tsx");

  assertContains(text, "const PAGE_SIZE = 24", "reader discovery");
  assertContains(text, "await prisma.work.count({ where })", "reader discovery");
  assertContains(text, "{ title: { contains: search } }", "reader discovery");
  assertContains(text, 'sort === "updated"', "reader discovery");
  assertContains(text, "skip: (currentPage - 1) * PAGE_SIZE", "reader discovery");
  assertContains(text, "take: PAGE_SIZE", "reader discovery");
  assertContains(text, "pageHref(filters", "reader discovery");
  assertContains(text, 'sayfa?: string;', "reader discovery");
  assertNotContains(text, "take: search ? undefined", "reader discovery");
  assertNotContains(text, "filteredWorks", "reader discovery");
});

test("publisher work discovery remains bounded and server-filtered", () => {
  const text = source("src/features/publisher-discovery/work-query.ts");

  assertContains(text, "const PAGE_SIZE = 24", "publisher discovery");
  assertContains(text, "await prisma.work.count({ where })", "publisher discovery");
  assertContains(text, "skip:", "publisher discovery");
  assertContains(text, "PAGE_SIZE", "publisher discovery");
  assertContains(text, "contains: filters.query", "publisher discovery");
});
