import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) =>
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

test("Kitapyurdu access diagnostic stays transparent, read-only and non-collecting", () => {
  const workflow = source(".github/workflows/book-index-kitapyurdu-access-probe.yml");
  const sources = source("src/lib/book-index/sources.ts");
  const collector = source("src/lib/book-index/collector.ts");

  contains(
    workflow,
    "https://www.kitapyurdu.com/index.php?limit=100&list_id=5&page=1&route=product%2Flist",
    "official monthly bestseller URL",
  );
  contains(
    workflow,
    "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
    "transparent İlkOku user agent",
  );
  contains(workflow, "--max-time 20", "bounded public request");
  contains(workflow, "access_state=blocked", "403/429 diagnostic state");
  contains(workflow, "bestseller_marker", "non-invasive bestseller body marker");
  contains(workflow, "monthly_marker", "non-invasive monthly body marker");

  notContains(workflow, "--proxy", "no proxy bypass");
  notContains(workflow, "--cookie", "no cookie workaround");
  notContains(workflow, "ACTIONS_ID_TOKEN", "no privileged production token");
  notContains(workflow, "/api/internal/", "no İlkOku production mutation endpoint");
  notContains(workflow, "BookIndexFetchRun", "no fetch-run history mutation");
  notContains(workflow, "BookIndexObservation", "no observation history mutation");

  contains(
    sources,
    'code: "kitapyurdu"',
    "Kitapyurdu remains registered",
  );
  contains(
    sources,
    'baseUrl: "https://www.kitapyurdu.com",\n    includeInTurkeyIndex: true,\n    phase: "v1",\n    collectionState: "blocked"',
    "Kitapyurdu remains blocked during diagnostic",
  );
  notContains(
    collector,
    "kitapyurduBookIndexAdapter",
    "diagnostic does not production-register a Kitapyurdu adapter",
  );
});
