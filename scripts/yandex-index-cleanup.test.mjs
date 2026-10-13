import assert from "node:assert/strict";
import { test } from "node:test";

import {
  YANDEX_CLEANUP_URLS,
  YANDEX_DELETED_URLS,
  YANDEX_NOINDEX_URLS,
  YANDEX_REFRESH_URLS,
  runYandexCleanup,
} from "./yandex-index-cleanup.mjs";

test("noindex candidates exclude public training, help and legal pages", () => {
  assert.equal(YANDEX_NOINDEX_URLS.length, 9);
  for (const url of YANDEX_NOINDEX_URLS) {
    const path = new URL(url).pathname;
    assert.ok(
      path === "/editorler" ||
      path === "/yeni-cikanlar" ||
      path === "/en-cok-satanlar" ||
      path.startsWith("/en-cok-satanlar/"),
      "Unexpected noindex candidate: " + url,
    );
  }
  assert.equal(new Set(YANDEX_CLEANUP_URLS).size, YANDEX_CLEANUP_URLS.length);
});

test("only live noindex candidates enter the IndexNow payload", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.INDEXNOW_KEY;
  let posted = null;

  globalThis.fetch = async (requestUrl, options = {}) => {
    const url = String(requestUrl);
    if (url === "https://yandex.com/indexnow") {
      posted = JSON.parse(String(options.body));
      return new Response("", { status: 202 });
    }
    if (url === "https://ilkoku.com/test-indexnow-key.txt") {
      return new Response("test-indexnow-key", { status: 200 });
    }
    if (YANDEX_DELETED_URLS.includes(url)) {
      return new Response("", { status: 404 });
    }
    if (YANDEX_REFRESH_URLS.includes(url)) {
      return new Response('<link rel="canonical" href="' + url + '">', { status: 200 });
    }
    if (url.endsWith("/editorler")) {
      return new Response('<meta name="robots" content="index, follow">', { status: 200 });
    }
    if (url.endsWith("/turkiye/karsilastirma")) {
      return new Response("", { status: 404 });
    }
    if (YANDEX_NOINDEX_URLS.includes(url)) {
      return new Response('<meta name="robots" content="noindex, follow">', { status: 200 });
    }
    throw new Error("Unexpected fetch: " + url);
  };
  process.env.INDEXNOW_KEY = "test-indexnow-key";
  try {
    await runYandexCleanup();
    assert.ok(posted);
    assert.ok(!posted.urlList.some((url) => url.endsWith("/editorler")));
    assert.ok(!posted.urlList.some((url) => url.endsWith("/turkiye/karsilastirma")));
    assert.ok(posted.urlList.includes("https://ilkoku.com/en-cok-satanlar"));
    assert.equal(posted.urlList.length, YANDEX_CLEANUP_URLS.length - 2);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.INDEXNOW_KEY;
    else process.env.INDEXNOW_KEY = previousKey;
  }
});


test("retries the standard IndexNow endpoint only after a Yandex network failure", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.INDEXNOW_KEY;
  let accepted = null;
  let primaryCalls = 0;

  globalThis.fetch = async (requestUrl, options = {}) => {
    const url = String(requestUrl);
    if (url === "https://yandex.com/indexnow") {
      primaryCalls += 1;
      throw new Error("fetch failed");
    }
    if (url === "https://api.indexnow.org/indexnow") {
      accepted = JSON.parse(String(options.body));
      return new Response("", { status: 200 });
    }
    if (url === "https://ilkoku.com/test-indexnow-key.txt") {
      return new Response("test-indexnow-key", { status: 200 });
    }
    if (YANDEX_DELETED_URLS.includes(url)) {
      return new Response("", { status: 404 });
    }
    if (YANDEX_REFRESH_URLS.includes(url)) {
      return new Response('<link rel="canonical" href="' + url + '">', { status: 200 });
    }
    if (YANDEX_NOINDEX_URLS.includes(url)) {
      return new Response('<meta name="robots" content="noindex, follow">', { status: 200 });
    }
    throw new Error("Unexpected fetch: " + url);
  };
  process.env.INDEXNOW_KEY = "test-indexnow-key";
  try {
    await runYandexCleanup();
    assert.equal(primaryCalls, 1);
    assert.ok(accepted);
    assert.equal(accepted.urlList.length, YANDEX_CLEANUP_URLS.length);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.INDEXNOW_KEY;
    else process.env.INDEXNOW_KEY = previousKey;
  }
});
