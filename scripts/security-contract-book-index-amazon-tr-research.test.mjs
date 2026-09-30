import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);

test("Amazon Türkiye verified Top 30 lists are public and non-composite", () => {
  const adapter = source("src/lib/book-index/sources/amazon-tr.ts");
  const collector = source("src/lib/book-index/collector.ts");
  const sources = source("src/lib/book-index/sources.ts");
  const lists = source("src/lib/book-index/lists.ts");

  contains(adapter, 'const BESTSELLER_PATH = "/gp/bestsellers/books"', "bestseller path");
  contains(adapter, 'const NEW_RELEASES_PATH = "/gp/new-releases/books"', "new-release path");
  contains(adapter, "BOOK_INDEX_AMAZON_TR_TOP30_MISMATCH", "exact Top 30 guard");
  contains(adapter, "zg-bdg-text", "native rank parser");
  contains(collector, "amazonTrBookIndexAdapter", "collector registration");
  contains(
    sources,
    'baseUrl: "https://www.amazon.com.tr",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "ready"',
    "Amazon Türkiye source ready",
  );

  for (const code of ["amazon-tr-live", "amazon-tr-new-releases-research"]) {
    const start = lists.indexOf(`code: "${code}"`);
    assert.ok(start >= 0, `missing Amazon Türkiye list: ${code}`);
    const block = lists.slice(start, start + 850);
    contains(block, "maxRank: 30", `${code} Top 30 bound`);
    contains(block, "includeInComposite: false", `${code} remains non-composite`);
    contains(block, "collectionEveryMinutes: 360", `${code} scheduled`);
    contains(block, "publiclyVisible: true", `${code} public`);
    contains(block, "enabled: true", `${code} enabled`);
  }
});
