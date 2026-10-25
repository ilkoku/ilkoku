import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const service = readFileSync(
  new URL("../src/features/writer-daily-summary/service.ts", import.meta.url),
  "utf8",
);

test("daily writer highlights never use reserved MariaDB READS as a SQL alias", () => {
  // MariaDB reserves READS. An unquoted alias causes ER_PARSE_ERROR (1064).
  assert.doesNotMatch(service, /\bAS\s+reads\b/iu);
  assert.doesNotMatch(service, /\bORDER\s+BY\s+reads\b/iu);

  // Both independent highlight queries must use a nonreserved alias.
  assert.equal(
    [...service.matchAll(/COALESCE\(SUM\(ra\.viewCount\), 0\) AS readCount/gu)].length,
    2,
  );
  assert.equal([...service.matchAll(/ORDER BY readCount DESC/gu)].length, 2);

  // Public email payload stays compatible: { reads, title }.
  assert.match(service, /type HighlightRow = \{\s*readCount:/u);
  assert.equal(
    [...service.matchAll(/\{ reads: toNumber\(row\.readCount\), title: row\.title \}/gu)].length,
    2,
  );
});
