import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import worker, { callEmailOperations } from "../workers/ilkoku-email-ops-cron/index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = (path) => readFileSync(join(root, path), "utf8");
const SECRET = "ci-only-synthetic-test-secret-not-real-123456789";

test("independent Cron Trigger is hourly, isolated and preserves the GitHub backup", () => {
  const config = file("workers/ilkoku-email-ops-cron/wrangler.toml");
  const github = file(".github/workflows/email-operations.yml");
  const route = file("src/app/api/internal/email-operations/route.ts");
  const docs = file("workers/ilkoku-email-ops-cron/README.md");
  assert.match(config, /name = "ilkoku-email-ops-cron"/);
  assert.match(config, /workers_dev = false/);
  assert.match(config, /crons = \["12 \* \* \* \*"\]/);
  assert.doesNotMatch(config, /(?:^|\n)routes\s*=/);
  assert.match(github, /cron: "35 \* \* \* \*"/);
  assert.match(github, /workflow_dispatch:/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /EMAIL_OPERATIONS_SECRET/);
  assert.match(docs, /two|iki|consecutive/i);
  assert.equal(typeof worker.scheduled, "function");
  assert.equal(Object.hasOwn(worker, "fetch"), false);
});

test("Cron Worker refuses missing secrets without attempting network", async () => {
  let calls = 0;
  const fakeFetch = async () => { calls += 1; throw new Error("unexpected network"); };
  await assert.rejects(callEmailOperations({}, fakeFetch), /SECRET_MISSING/);
  await assert.rejects(callEmailOperations({ EMAIL_OPERATIONS_SECRET: "short" }, fakeFetch), /SECRET_MISSING/);
  assert.equal(calls, 0);
});

test("Cron Worker calls only existing protected API, validates result, and logs no secret", async () => {
  const oldLog = console.log;
  const logs = [];
  let calls = 0;
  console.log = (...args) => logs.push(args.join(" "));
  try {
    const result = await callEmailOperations({ EMAIL_OPERATIONS_SECRET: SECRET }, async (url, options) => {
      calls += 1;
      assert.equal(url, "https://ilkoku.com/api/internal/email-operations");
      assert.equal(options.method, "POST");
      assert.equal(options.headers.Authorization, `Bearer ${SECRET}`);
      assert.equal(options.headers["Cache-Control"], "no-store");
      assert.equal(options.headers["X-IlkOku-Scheduler"], "cloudflare");
      assert.equal(options.redirect, "error");
      assert.equal(options.cache, "no-store");
      return new Response(JSON.stringify({
        ok: true, checkedAt: "2026-10-21T08:12:00.000Z",
        failedLastHour: 0, pendingCount: 0, staleMarked: 0, unresolvedFailed: 12,
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    assert.equal(result.ok, true);
    assert.equal(calls, 1);
    assert.ok(logs.some(x => x.includes("EMAIL_OPERATIONS_CRON_OK")));
    assert.ok(logs.every(x => !x.includes(SECRET)));
  } finally {
    console.log = oldLog;
  }
});

test("Cron Worker fails closed on HTTP errors and bad API payloads", async () => {
  const config = { EMAIL_OPERATIONS_SECRET: SECRET };
  await assert.rejects(
    callEmailOperations(config, async () => new Response('{"error":"UNAUTHORIZED"}', { status: 401 })),
    /HTTP_401/,
  );
  await assert.rejects(
    callEmailOperations(config, async () => new Response("internal-error", { status: 200 })),
    /INVALID_JSON/,
  );
  await assert.rejects(
    callEmailOperations(config, async () => new Response('{"ok":true}', { status: 200 })),
    /INVALID_RESULT/,
  );
  await assert.rejects(
    callEmailOperations(config, async () => new Response(" ".repeat(8193), { status: 200 })),
    /RESPONSE_TOO_LARGE/,
  );
});

test("scheduled handler waits for the asynchronous job and cannot expose HTTP fetch", async () => {
  const ctx = { promise: undefined, waitUntil(promise) { this.promise = promise; } };
  worker.scheduled({ scheduledTime: 0, cron: "12 * * * *" }, {}, ctx);
  assert.ok(ctx.promise instanceof Promise);
  await assert.rejects(ctx.promise, /SECRET_MISSING/);
  assert.equal(Object.hasOwn(worker, "fetch"), false);
});
