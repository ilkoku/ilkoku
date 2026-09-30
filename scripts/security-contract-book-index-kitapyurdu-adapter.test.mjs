import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

test("Kitapyurdu is excluded from Book Index collection", () => {
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const newReleaseRegistry = source("src/lib/book-index/new-release-sources.ts");

  assert.equal(existsSync(join(ROOT, "src/lib/book-index/sources/kitapyurdu.ts")), false);
  assert.equal(sources.includes('code: "kitapyurdu"'), false);
  assert.equal(lists.includes('sourceCode: "kitapyurdu"'), false);
  assert.equal(collector.includes("kitapyurduBookIndexAdapter"), false);
  assert.equal(newReleaseRegistry.includes('sourceCode: "kitapyurdu"'), false);
});
