import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  PRIORITY_QUERY_GROUPS,
  expectedLandingPages,
  queryExpressions,
} from "./seo-priority-query-cohort.mjs";

test("priority cross-engine query cohort has unique complete groups", () => {
  assert.equal(PRIORITY_QUERY_GROUPS.length, 7);
  assert.equal(new Set(PRIORITY_QUERY_GROUPS.map((group) => group.id)).size, 7);

  for (const group of PRIORITY_QUERY_GROUPS) {
    assert.ok(group.label.trim().length > 0);
    assert.ok(group.entries.length > 0);
    assert.ok(queryExpressions(group).every((query) => query.trim().length > 0));
    assert.ok(expectedLandingPages(group).every((path) => path.startsWith("/")));
  }
});

test("priority query cohort covers the focused role and education landing pages", () => {
  const pages = new Set(PRIORITY_QUERY_GROUPS.flatMap((group) => expectedLandingPages(group)));

  for (const path of [
    "/",
    "/nasil-calisir",
    "/hakkimizda",
    "/yazarlar-icin",
    "/okurlar-icin",
    "/editorler-icin",
    "/yayinevleri-icin",
    "/editoryal-standartlar",
    "/yazarlar-icin/kurgu/roman",
    "/okurlar-icin/okumaya-baslama",
    "/editorler-icin/egitim/editorluge-baslama",
    "/editorler-icin/egitim/dil-ve-anlatim-editorlugu",
    "/editorler-icin/egitim/metin-degerlendirme",
  ]) {
    assert.equal(pages.has(path), true, `${path} must be monitored by at least one query group`);
  }
});

test("Google performance workflow mirrors Yandex-style groups with read-only Search Analytics filters", () => {
  const script = fs.readFileSync("scripts/gsc-priority-search-performance.mjs", "utf8");
  const workflow = fs.readFileSync(".github/workflows/gsc-priority-search-performance.yml", "utf8");

  assert.match(script, /operator: "includingRegex"/u);
  assert.match(script, /\["query", "page"\]/u);
  assert.match(script, /unexpectedLandingRows/u);
  assert.match(script, /Yandex-ready queries/u);
  assert.match(workflow, /GSC_OAUTH_REFRESH_TOKEN/u);
  assert.doesNotMatch(workflow, /GSC_OAUTH_WRITE_REFRESH_TOKEN/u);
  assert.match(workflow, /cron: "20 6 \* \* \*"/u);
  assert.match(workflow, /workflow_dispatch:/u);
});
