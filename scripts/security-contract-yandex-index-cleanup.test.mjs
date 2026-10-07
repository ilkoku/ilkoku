import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  YANDEX_CLEANUP_URLS,
  YANDEX_DELETED_URLS,
  YANDEX_NOINDEX_URLS,
  YANDEX_REFRESH_URLS,
} from "./yandex-index-cleanup.mjs";

test("Yandex cleanup targets only verified stale or refresh URLs", () => {
  assert.deepEqual(YANDEX_DELETED_URLS, [
    "https://ilkoku.com/puan-durumu",
    "https://ilkoku.com/namaz-vakitleri",
    "https://ilkoku.com/page",
  ]);

  assert.deepEqual(YANDEX_NOINDEX_URLS, [
    "https://ilkoku.com/editorler",
    "https://ilkoku.com/en-cok-satanlar/turkiye/karsilastirma",
    "https://ilkoku.com/yardim",
  ]);

  assert.deepEqual(YANDEX_REFRESH_URLS, [
    "https://ilkoku.com/hakkimizda",
  ]);

  assert.equal(YANDEX_CLEANUP_URLS.length, 7);
  assert.equal(new Set(YANDEX_CLEANUP_URLS).size, 7);
  assert.ok(
    YANDEX_CLEANUP_URLS.every((url) => url.startsWith("https://ilkoku.com/")),
  );
});

test("Yandex cleanup remains a narrow IndexNow notification workflow", () => {
  const script = fs.readFileSync("scripts/yandex-index-cleanup.mjs", "utf8");
  const workflow = fs.readFileSync(".github/workflows/yandex-index-cleanup.yml", "utf8");

  assert.match(script, /https:\/\/yandex\.com\/indexnow/u);
  assert.match(script, /\[404, 410\]/u);
  assert.match(script, /hasRobotsNoindex/u);
  assert.match(script, /canonical mismatch/u);
  assert.doesNotMatch(script, /robots\.txt.*Disallow/u);
  assert.doesNotMatch(script, /301|308/u);

  assert.match(workflow, /workflow_dispatch:/u);
  assert.match(workflow, /push:/u);
  for (const path of [
    "src/lib/soft-launch-search-policy.ts",
    "src/lib/public-page-metadata.ts",
    "src/app/robots.ts",
    "src/app/editorler/**",
    "src/app/en-cok-satanlar/turkiye/karsilastirma/**",
    "src/app/yardim/**",
    "next.config.ts",
  ]) {
    assert.ok(workflow.includes(`- "${path}"`), `${path} must retrigger Yandex cleanup validation`);
  }
  assert.doesNotMatch(workflow, /schedule:/u);
  assert.doesNotMatch(workflow, /GSC_OAUTH/u);
});
