import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import test from "node:test";

const lifecycle = readFileSync("src/instrumentation.ts", "utf8");
const route = readFileSync("src/app/api/internal/runtime-origin-health/route.ts", "utf8");
const workflow = readFileSync(".github/workflows/runtime-origin-health.yml", "utf8");

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

test("Lifecycle hook is passive and retains default crash/shutdown semantics", () => {
  assert.match(lifecycle, /NEXT_RUNTIME !== "nodejs"/u);
  assert.match(lifecycle, /ILKOKU_RUNTIME_LIFECYCLE/u);
  assert.match(lifecycle, /process\.once\("exit"/u);
  assert.match(lifecycle, /uncaughtExceptionMonitor/u);
  assert.doesNotMatch(lifecycle, /process\.on\("SIGTERM"|process\.on\("uncaughtException"|process\.on\("unhandledRejection"/u);
});

test("Lifecycle severity sends ordinary start/exit to stdout and failures to stderr", async () => {
  const js = ts.transpileModule(lifecycle, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const stdout = [];
  const stderr = [];
  const handlers = new Map();
  const stub = {
    env: { NEXT_RUNTIME: "nodejs" },
    pid: 314443,
    uptime: () => 6,
    stdout: { write: (line) => stdout.push(JSON.parse(line)) },
    stderr: { write: (line) => stderr.push(JSON.parse(line)) },
    once: (event, fn) => handlers.set(event, fn),
    on: (event, fn) => handlers.set(event, fn),
  };
  const sandbox = { process: stub, exports: {}, Date, Error };
  runInNewContext(js, sandbox);
  await sandbox.exports.register();
  assert.equal(stdout.length, 1);
  assert.equal(stdout[0].phase, "STARTED");
  assert.equal(stderr.length, 0);
  assert.ok(handlers.has("exit"));
  assert.ok(handlers.has("uncaughtExceptionMonitor"));

  handlers.get("exit")(143);
  assert.equal(stdout.length, 2);
  assert.equal(stdout[1].phase, "EXIT");
  assert.equal(stdout[1].exitCode, 143);
  assert.equal(stderr.length, 0, "Deployment SIGTERM-style exit must not become a false error");

  handlers.get("uncaughtExceptionMonitor")(new Error("test"), "uncaughtException");
  assert.equal(stderr.length, 1);
  assert.equal(stderr[0].phase, "UNCAUGHT_EXCEPTION_MONITOR");
  assert.equal(stderr[0].errorName, "Error");

  handlers.get("exit")(1);
  assert.equal(stderr.length, 2);
  assert.equal(stderr[1].exitCode, 1, "Unexpected exit must still be visible as an error");
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

test("Origin trap never treats an invalid 200 build identity as a healthy deploy", () => {
  const trap = readFileSync("scripts/origin-incident-trap.sh", "utf8");
  const parsing = trap.indexOf("served_commit=\"\$(node - \"$body\"");
  const guard = trap.indexOf('if [[ "$served_commit" == \'unknown\' ]]; then');
  const success = trap.indexOf('if [[ -n "$EXPECTED_COMMIT_SHA" && "$served_commit" == "$EXPECTED_COMMIT_SHA" ]]');
  assert.ok(parsing >= 0 && guard > parsing && success > guard, "Check invalid body immediately after parsing before declaring cutover");
  assert.match(trap.slice(guard,success), /INCIDENT=true/u);
  assert.match(trap.slice(guard,success), /Build-info returned HTTP 200 without a valid 40-character commit SHA/u);
  assert.ok(trap.includes("^[0-9a-f]{40}$"), "Commit SHA validation must require exactly 40 hex characters");
  assert.match(trap, /TRAP_RESULT INCIDENT/u);
  execFileSync("bash", ["-n", "scripts/origin-incident-trap.sh"]);
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


test("Scheduled origin coverage reports gaps, unknown data, and failure fallback without site requests", () => {
  const source = readFileSync("scripts/origin-schedule-coverage.py", "utf8");
  const trapWorkflow = readFileSync(".github/workflows/origin-incident-trap.yml", "utf8");
  const current = { id: 200, event: "schedule", created_at: "2026-10-26T04:52:32Z" };
  const previous = { id: 100, event: "schedule", created_at: "2026-10-26T00:13:57Z" };
  const run = (runs) => execFileSync("python3", ["scripts/origin-schedule-coverage.py"], {
    input: JSON.stringify({ workflow_runs: runs }),
    encoding: "utf8",
    env: { CURRENT_RUN_ID: "200", GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "" },
  });
  assert.match(run([current, previous]), /SCHEDULE_COVERAGE status=GAP gap_minutes=279/u);
  assert.match(run([current, { ...previous, created_at: "2026-10-26T04:44:32Z" }]),
    /SCHEDULE_COVERAGE status=OK gap_minutes=8/u);
  assert.match(run([current, { ...previous, created_at: "2026-10-26T04:32:32Z" }]),
    /SCHEDULE_COVERAGE status=OK gap_minutes=20/u);
  assert.match(run([previous]), /SCHEDULE_COVERAGE status=UNKNOWN/u);
  const malformed = execFileSync("python3", ["scripts/origin-schedule-coverage.py"], {
    input: "{invalid-json",
    encoding: "utf8",
    env: { CURRENT_RUN_ID: "200", GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "" },
  });
  assert.match(malformed, /SCHEDULE_COVERAGE status=UNKNOWN/u);
  assert.match(source, /THRESHOLD_MINUTES = 20/u);
  assert.doesNotMatch(source, /(?:^|\n)\s*(?:import|from)\s+(?:urllib|requests|socket|subprocess|http)\b|requests\.(?:get|post|request|Session)\s*\(|\bcurl\s+https?:/mu);
  assert.match(trapWorkflow, /Check GitHub scheduled probe coverage/u);
  assert.match(trapWorkflow, /event=schedule&per_page=25/u);
  assert.match(trapWorkflow, /python3 scripts\/origin-schedule-coverage\.py/u);
  assert.match(trapWorkflow, /RUNNER_TEMP/u);
  assert.match(trapWorkflow, /steps\.coverage\.outcome == 'failure'/u);
  assert.match(trapWorkflow, /steps\.coverage\.outputs\.coverage_gap == 'true'/u);
  assert.match(trapWorkflow, /github\.event_name == 'schedule'/u);
  assert.doesNotMatch(trapWorkflow, /node scripts\/origin-schedule-coverage\.mjs/u);
  assert.match(trapWorkflow, /SAMPLE_COUNT:.*'push'.*'50'/u);
  assert.match(trapWorkflow, /SAMPLE_INTERVAL:.*'push'.*'6'/u);
  assert.match(trapWorkflow, /cron: "\*\/5 \* \* \* \*"/u);
});

test("Cloudflare secret-file probe WAF candidate is narrow and inert", () => {
  const expression = readFileSync("docs/security/cloudflare-secret-probe-waf.expr", "utf8").trim();
  const known = [
    ...["/.env", "/.docker/", "/.git/", "/.aws/"].map((value) => 'lower(http.request.uri.path) contains "' + value + '"'),
    ...["/.boto", "/server.key", "/privatekey.key", "/key.pem", "/id_ed25519", "/secrets.json", "/appsettings.development.json"].map((value) => 'lower(http.request.uri.path) eq "' + value + '"'),
    'ends_with(lower(http.request.uri.path), ".auto.tfvars")',
  ];
  assert.equal(expression.replace(/\s+/gu, " "), "( " + known.join(" or ") + " )");

  const matched = [
    "/.env", "/.ENV", "/.env.local", "/app/.env", "/data/.env",
    "/@fs/.env", "/@fs/../.env", "/@fs/app/.env", "/assets../.env",
    "/.env.swp", "/packages/.env", "/pkg/.env", "/lib/.env",
    "/.docker/config.json", "/.git/config", "/.aws/credentials",
    "/.boto", "/server.key", "/privatekey.key", "/key.pem",
    "/id_ed25519", "/secrets.json", "/appsettings.Development.json",
    "/production.auto.tfvars", "/@fs/secrets.auto.tfvars",
  ];
  const spared = [
    "/", "/kesfet", "/kitap/yeni-test209-30820c6a", "/satinal/yeni-test209-30820c6a",
    "/hakkimizda", "/sitemap.xml", "/robots.txt", "/api/build-info",
    "/api/internal/runtime-origin-health", "/api-keys", "/admin",
    "/admin/users", "/builds", "/org/settings", "/settings/tokens",
    "/api/auth/session", "/@fs/proc/self/environ", "/__vite_rsc_findSourceMapURL",
    "/iletisim", "/yazarlar-icin", "/.well-known/security.txt",
    "/docs/environment", "/assets/key.pem.txt", "/index.json",
  ];
  const matches = (path) => {
    const value = path.toLowerCase();
    return known.some((predicate) => {
      const contains = predicate.match(/^lower\(http\.request\.uri\.path\) contains "([^"]+)"$/u);
      if (contains) return value.includes(contains[1]);
      const equal = predicate.match(/^lower\(http\.request\.uri\.path\) eq "([^"]+)"$/u);
      if (equal) return value === equal[1];
      const suffix = predicate.match(/^ends_with\(lower\(http\.request\.uri\.path\), "([^"]+)"\)$/u);
      if (suffix) return value.endsWith(suffix[1]);
      throw new Error("Unsupported WAF clause: " + predicate);
    });
  };
  for (const path of matched) assert.equal(matches(path), true, "Expected scanner match: " + path);
  for (const path of spared) assert.equal(matches(path), false, "Potential false positive: " + path);
  assert.doesNotMatch(expression, /ip\.src|ip\.geoip|asn|http\.host|\/api\/|\/admin|\/builds|\/org\/settings/iu);
});
