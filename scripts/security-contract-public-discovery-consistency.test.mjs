import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

test("indexable new releases page stays aligned across metadata, XML sitemap and HTML sitemap", () => {
  const page = source("src/app/yeni-cikanlar/page.tsx");
  const sitemap = source("src/app/sitemap.ts");
  const navigation = source("src/lib/cms-header-navigation.ts");

  assert.ok(page.includes("noIndex: false"), "new releases route must remain indexable");
  assert.ok(sitemap.includes("/yeni-cikanlar"), "new releases route must remain in XML sitemap");

  const line = navigation
    .split("\n")
    .find((candidate) => candidate.includes('href: "/yeni-cikanlar"'));

  assert.ok(line, "new releases route must exist in HTML sitemap source");
  assert.equal(
    line.includes("indexable: false"),
    false,
    "indexable new releases route must not be hidden from the HTML sitemap",
  );
});
