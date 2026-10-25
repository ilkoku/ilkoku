import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

test("writing category hubs publish CollectionPage and focused ItemList structured data", () => {
  const page = source("src/components/content/WritingCategoryLandingPage.tsx");

  assert.ok(page.includes('"@type": "CollectionPage"'));
  assert.ok(page.includes('"@type": "ItemList"'));
  assert.ok(page.includes('"@type": "BreadcrumbList"'));
  assert.ok(page.includes("priorityGenres.map"));
  assert.ok(page.includes("https://ilkoku.com"));
  assert.ok(page.includes('type="application/ld+json"'));
});

test("reader hub keeps full visible catalog while structured data follows the focused cohort", () => {
  const page = source("src/app/okurlar-icin/page.tsx");

  assert.ok(page.includes("READER_EDUCATION_CATEGORIES.map"));
  assert.ok(page.includes("priorityReaderCategories"));
  assert.ok(page.includes("isSoftLaunchSearchExcludedPath"));
  assert.ok(page.includes('"@type": "CollectionPage"'));
  assert.ok(page.includes('"@type": "ItemList"'));
  assert.ok(page.includes("priorityReaderCategories.map"));
});
