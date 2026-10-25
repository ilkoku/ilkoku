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

test("High-risk manual k6 scripts fail closed before issuing any request", () => {
  const scripts = [
    {
      path: "tests/load/hostinger-support-1000.js",
      env: "ILKOKU_STRESS_APPROVAL",
      token: "APPROVE-ILKOKU-1000-VU",
      blocked: "PRODUCTION_STRESS_TEST_BLOCKED",
    },
    {
      path: "tests/load/hostinger-origin-direct.js",
      env: "ILKOKU_ORIGIN_DIRECT_APPROVAL",
      token: "APPROVE-ORIGIN-DIRECT-PROBE",
      blocked: "ORIGIN_DIRECT_BLOCKED",
    },
  ];
  for (const script of scripts) {
    const source = readFileSync(script.path, "utf8");
    const guard = source.indexOf("if ((__ENV." + script.env);
    const request = source.indexOf("http.get(");
    assert.ok(guard >= 0 && guard < request, script.path + " must reject unapproved execution before network requests");
    assert.ok(source.includes(script.token), "Explicit approval marker absent in " + script.path);
    assert.ok(source.includes(script.blocked), "Fail-closed error absent in " + script.path);
    assert.match(source, /throw new Error\(/u);
  }
});

test("Public production load workflow stays manual and explicitly confirmed", () => {
  const flow = readFileSync(".github/workflows/public-load-test.yml", "utf8");
  assert.match(flow, /workflow_dispatch:/u);
  assert.doesNotMatch(flow, /^  (?:push|schedule|pull_request):/mu);
  assert.match(flow, /RUN-PUBLIC-LOAD-TEST/u);
  assert.match(flow, /https:\/\/ilkoku\.com\|https:\/\/www\.ilkoku\.com/u);
  assert.match(flow, /ILKOKU_HIGH_LOAD_APPROVAL/u);
  assert.match(flow, /CONFIRMATION: \$\{\{ inputs\.confirmation \}\}/u);

  const script = readFileSync("tests/load/public-baseline.js", "utf8");
  for (const profile of ["capacity100", "capacity200", "diagnostic150", "distributedprobe100"]) {
    assert.ok(script.includes('"' + profile + '"'), "High-impact profile must be gated: " + profile);
  }
  assert.match(script, /HIGH_IMPACT_PROFILES\.has\(PROFILE\)/u);
  assert.match(script, /ILKOKU_HIGH_LOAD_APPROVAL/u);
  assert.match(script, /HIGH_IMPACT_LOAD_TEST_BLOCKED/u);
});
