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
    "https://ilkoku.com/editorler-icin/egitim/tur-editorlugu",
    "https://ilkoku.com/editorler-icin/egitim/yazarla-calismak",
    "https://ilkoku.com/en-cok-satanlar/birden-fazla-listede-cok-satanlar",
    "https://ilkoku.com/en-cok-satanlar/cok-satanlara-yeni-girenler",
    "https://ilkoku.com/en-cok-satanlar/cok-satanlarda-yukselenler",
    "https://ilkoku.com/en-cok-satanlar/turkiye",
    "https://ilkoku.com/en-cok-satanlar/turkiye/karsilastirma",
    "https://ilkoku.com/en-cok-satanlar/uzun-suredir-cok-satanlar",
    "https://ilkoku.com/yasal/cerez-politikasi",
    "https://ilkoku.com/yasal/gizlilik-politikasi",
    "https://ilkoku.com/yasal/kullanim-sartlari",
    "https://ilkoku.com/yasal/telif-hakki-politikasi",
    "https://ilkoku.com/yardim",
    "https://ilkoku.com/yazarlar-icin/kurgu/alternatif-tarih",
    "https://ilkoku.com/yazarlar-icin/kurgu/casusluk",
    "https://ilkoku.com/yazarlar-icin/kurgu/dram",
    "https://ilkoku.com/yazarlar-icin/kurgu/gerilim",
    "https://ilkoku.com/yazarlar-icin/kurgu/gotik",
    "https://ilkoku.com/yazarlar-icin/kurgu/hiciv",
    "https://ilkoku.com/yazarlar-icin/kurgu/korku",
    "https://ilkoku.com/yazarlar-icin/kurgu/mitoloji",
    "https://ilkoku.com/yazarlar-icin/kurgu/mizah",
    "https://ilkoku.com/yazarlar-icin/kurgu/paranormal",
    "https://ilkoku.com/yazarlar-icin/kurgu/polisiye",
    "https://ilkoku.com/yazarlar-icin/kurgu/post-apokaliptik",
    "https://ilkoku.com/yazarlar-icin/kurgu/romantik",
    "https://ilkoku.com/yazarlar-icin/senaryo-ve-sahne/tiyatro",
    "https://ilkoku.com/yeni-cikanlar",
  ]);

  assert.deepEqual(YANDEX_REFRESH_URLS, [
    "https://ilkoku.com/hakkimizda",
  ]);

  assert.equal(YANDEX_NOINDEX_URLS.length, 29);
  assert.equal(YANDEX_CLEANUP_URLS.length, 33);
  assert.equal(new Set(YANDEX_CLEANUP_URLS).size, 33);
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
