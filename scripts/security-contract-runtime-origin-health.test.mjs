import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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

test("Origin incident trap captures deploy cutover while preserving safe bounded probes", () => {
  const trap = readFileSync("scripts/origin-incident-trap.sh", "utf8");
  const trapWorkflow = readFileSync(".github/workflows/origin-incident-trap.yml", "utf8");

  // Syntax must be valid before triggering any network request in Actions.
  execFileSync("bash", ["-n", "scripts/origin-incident-trap.sh"]);

  assert.doesNotMatch(trapWorkflow, /sleep 75/u);
  assert.match(trapWorkflow, /SAMPLE_COUNT:.*'push'.*'50'/u);
  assert.match(trapWorkflow, /SAMPLE_INTERVAL:.*'push'.*'6'/u);
  assert.match(trapWorkflow, /EXPECTED_COMMIT_SHA:/u);
  assert.match(trapWorkflow, /timeout-minutes: 8/u);
  assert.match(trap, /served_commit_sha/u);
  assert.match(trap, /parsed\.commitSha/u);
  assert.match(trap, /CUTOVER_OBSERVED=true/u);
  assert.match(trap, /cutover_observed=/u);
  assert.match(trap, /TRAP_RESULT MONITOR_BLOCKED/u);
  assert.ok(trap.includes('rm -f "$body"'));
});

test("Origin trap names curl timings as client-to-Cloudflare metrics, not origin TLS", () => {
  const trap = readFileSync("scripts/origin-incident-trap.sh", "utf8");
  const header = trap.split("\n").find((line) => line.startsWith("printf 'observed_utc"));
  assert.ok(header, "TSV schema header must be present");

  for (const field of [
    "client_edge_ip",
    "client_edge_dns_complete_sec",
    "client_edge_tcp_connected_sec",
    "client_edge_tls_complete_sec",
    "client_edge_ttfb_sec",
    "client_edge_total_sec",
    "served_commit_sha",
  ]) {
    assert.ok(header.includes(field), "Missing edge provenance: " + field);
  }

  assert.ok(!header.includes("\\ttls_sec\\t"), "Old ambiguous TLS header must be gone");
  assert.ok(trap.includes("%{remote_ip}"), "Still collect curl remote IP");
  assert.match(trap, /NOT the Cloudflare to Hostinger origin leg/u);
  assert.match(trap, /First-observed served_commit_sha is NOT deploy completion/u);
  assert.ok(trap.includes("--retry 0"), "No implicit retries or extra requests");
  assert.ok(trap.includes("Circuit breaker: HTTP"), "Preserve 403/429 circuit breaker");
});
