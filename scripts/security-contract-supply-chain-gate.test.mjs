import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");
const contains = (text, fragment, label) => assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);

function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)/u.exec(String(value ?? ""));
  return match ? match.slice(1, 4).map(Number) : null;
}

function compare(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function packageNameFromPath(packagePath) {
  const segments = packagePath.split("/node_modules/");
  return segments.at(-1)?.replace(/^node_modules\//u, "") ?? packagePath;
}

function patchedByRule(version, rule) {
  const parsed = parseVersion(version);
  if (!parsed) return false;
  const threshold = rule.fixedByMajor?.[String(parsed[0])];
  const parsedThreshold = parseVersion(threshold);
  return Boolean(parsedThreshold && compare(parsed, parsedThreshold) >= 0);
}

test("declarative supply-chain policy owns generic audit, advisory backports and manifest hygiene", () => {
  const policy = JSON.parse(source("scripts/supply-chain-policy.json"));

  assert.equal(policy.schemaVersion, 1);
  assert.deepEqual(policy.genericAuditGate.blockedSeverities, ["high", "critical"]);
  assert.equal(policy.genericAuditGate.source, "npm audit");
  assert.ok(policy.advisoryRules.length > 0, "at least one explicit advisory/backport rule must remain configured");
  const brace = policy.advisoryRules.find((rule) => rule.package === "brace-expansion");
  assert.ok(brace, "brace-expansion scanner discrepancy policy must remain explicit");
  assert.deepEqual(brace.advisories, ["CVE-2026-14257", "CVE-2026-69152"]);
  assert.equal(brace.fixedByMajor["1"], "1.1.18");
  assert.equal(brace.fixedByMajor["2"], "2.1.4");
  assert.equal(brace.fixedByMajor["3"], "3.0.6");
  assert.equal(brace.fixedByMajor["5"], "5.0.9");
  assert.ok(policy.manifestHygiene.buildOnlyRootDependencies.includes("prisma"), "Prisma CLI must stay visible as a production-manifest hygiene candidate");
  assert.ok(policy.manifestHygiene.buildOnlyRootPrefixes.includes("@types/"), "type packages must stay visible as production-manifest hygiene candidates");
});

test("every installed package covered by an explicit advisory rule is on a patched line", () => {
  const lock = JSON.parse(source("package-lock.json"));
  const policy = JSON.parse(source("scripts/supply-chain-policy.json"));
  const packages = lock.packages ?? {};

  for (const rule of policy.advisoryRules) {
    const instances = Object.entries(packages)
      .filter(([packagePath, metadata]) => packagePath && metadata?.version && packageNameFromPath(packagePath) === rule.package)
      .map(([packagePath, metadata]) => ({ packagePath, version: metadata.version, dev: metadata.dev === true }));

    for (const instance of instances) {
      assert.ok(patchedByRule(instance.version, rule), `${rule.package} at ${instance.packagePath} must stay on an explicitly patched major line, found ${instance.version}`);
    }
  }

  const braceV1 = Object.entries(packages)
    .filter(([packagePath, metadata]) => packagePath && metadata?.version === "1.1.18" && packageNameFromPath(packagePath) === "brace-expansion")
    .map(([, metadata]) => metadata)
    .at(0);
  assert.equal(braceV1?.dev, true, "brace-expansion@1.1.18 must remain development-only while the ESLint chain exists");
});

test("lockfile audit is generic, fail-closed and produces inventory plus hygiene evidence", () => {
  const audit = source("scripts/audit-lockfile-supply-chain.mjs");

  contains(audit, "scripts/supply-chain-policy.json", "declarative policy input");
  contains(audit, "allInstances", "full lockfile inventory");
  contains(audit, "monitoredPackages", "policy-driven package monitoring");
  contains(audit, "evaluateRule", "generic per-major rule evaluation");
  contains(audit, "unrecognized-major", "unknown advisory major fail-closed reason");
  contains(audit, "buildManifestWarnings", "production manifest hygiene scan");
  contains(audit, "collectDuplicateVersions", "duplicate version inventory");
  contains(audit, "genericAuditGate", "npm audit gate projection");
  contains(audit, "process.exit(1)", "fail-closed audit exit");
  contains(audit, "supply-chain.generated.ts", "generated system-map report");
  contains(audit, 'metadata?.dev === true ? "development" : "runtime"', "runtime vs development classification");
});

test("CI and system-map generation both execute the generic supply-chain gate", () => {
  const pkg = JSON.parse(source("package.json"));
  const ci = source(".github/workflows/ci.yml");
  const gitignore = source(".gitignore");

  assert.equal(pkg.scripts["audit:supply-chain"], "node scripts/audit-lockfile-supply-chain.mjs");
  assert.ok(pkg.scripts["system-map:generate"].startsWith("npm run audit:supply-chain &&"), "system map generation must fail closed through supply-chain audit");
  contains(ci, "Audit high-severity dependencies", "generic npm audit CI gate");
  contains(ci, "Audit lockfile supply-chain policy", "dedicated lockfile CI gate");
  contains(ci, "npm run audit:supply-chain", "CI supply-chain command");
  contains(gitignore, "/src/features/system-map/supply-chain.generated.ts", "generated report ignore rule");
});

test("system map exposes generic package inventory, advisory rules and manifest hygiene", () => {
  const navigation = source("src/features/system-map/navigation.ts");
  const page = source("src/app/harita/tedarik-zinciri/page.tsx");

  contains(navigation, 'key: "supplyChain"', "supply-chain navigation key");
  contains(navigation, 'href: "/harita/tedarik-zinciri"', "supply-chain route");
  contains(page, "supplyChainSecurityReport", "generated report consumption");
  contains(page, "GENEL PAKET ENVANTERİ", "generic lockfile inventory");
  contains(page, "GENEL ADVISORY KAPISI", "registry audit visibility");
  contains(page, "İZLENEN ADVISORY PAKETLERİ", "policy rule visibility");
  contains(page, "PRODUCTION MANIFEST HİJYENİ", "manifest hygiene visibility");
  contains(page, "SÜRÜM ÇOĞALMASI", "duplicate version visibility");
  contains(page, "TARAYICI UYUŞMAZLIKLARI", "external scanner discrepancy visibility");
});
