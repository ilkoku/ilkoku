import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const lifecycle = readFileSync("src/instrumentation.ts", "utf8");
const route = readFileSync("src/app/api/internal/runtime-origin-health/route.ts", "utf8");
const workflow = readFileSync(".github/workflows/runtime-origin-health.yml", "utf8");

test("Lifecycle hook is passive and retains default crash/shutdown semantics", () => {
  assert.match(lifecycle, /NEXT_RUNTIME !== "nodejs"/u);
  assert.match(lifecycle, /ILKOKU_RUNTIME_LIFECYCLE/u);
  assert.match(lifecycle, /process\.once\("exit"/u);
  assert.match(lifecycle, /uncaughtExceptionMonitor/u);
  assert.doesNotMatch(lifecycle, /process\.on\("SIGTERM"|process\.on\("uncaughtException"|process\.on\("unhandledRejection"/u);
});

test("Health endpoint requires exact GitHub OIDC authorization before PID disclosure", () => {
  assert.match(route, /createRemoteJWKSet/u);
  assert.match(route, /jwtVerify/u);
  assert.match(route, /payload\.repository_id === repositoryId/u);
  assert.match(route, /payload\.workflow_ref === workflowRef/u);
  assert.match(route, /audience/u);
  assert.match(route, /status: 401/u);
  assert.match(route, /no-store, max-age=0/u);
  assert.match(route, /noindex, nofollow, noarchive/u);
  assert.match(route, /process\.uptime\(\)/u);
  assert.doesNotMatch(route, /prisma|DATABASE_URL|fs\.write/u);
});

test("Monitoring is hourly, read-only, and fail closed", () => {
  assert.match(workflow, /cron: "58 \* \* \* \*"/u);
  assert.match(workflow, /contents: read/u);
  assert.match(workflow, /id-token: write/u);
  assert.match(workflow, /X-IlkOku-GitHub-OIDC/u);
  assert.match(workflow, /PROCESS_SNAPSHOT/u);
  assert.match(workflow, /\/iletisim \/sitemap\.xml/u);
  assert.match(workflow, /Circuit breaker/u);
  assert.doesNotMatch(workflow, /npm run|k6 |prisma|git push|workflow_run:/u);
});
