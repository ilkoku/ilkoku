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

function patched(version) {
  const parsed = parseVersion(version);
  if (!parsed) return false;
  if (parsed[0] === 1) return compare(parsed, [1, 1, 18]) >= 0;
  if (parsed[0] === 2) return compare(parsed, [2, 1, 4]) >= 0;
  if (parsed[0] === 3) return compare(parsed, [3, 0, 6]) >= 0;
  if (parsed[0] === 4) return false;
  return parsed[0] >= 5 && compare(parsed, [5, 0, 9]) >= 0;
}

test("current lockfile contains no brace-expansion instance below the maintained patched lines", () => {
  const lock = JSON.parse(source("package-lock.json"));
  const instances = Object.entries(lock.packages ?? {})
    .filter(([packagePath]) => packagePath === "node_modules/brace-expansion" || packagePath.endsWith("/node_modules/brace-expansion"))
    .map(([packagePath, metadata]) => ({ packagePath, version: metadata.version, dev: metadata.dev === true }));

  assert.ok(instances.length > 0, "brace-expansion instances must remain visible in lockfile security coverage");
  for (const instance of instances) {
    assert.ok(patched(instance.version), `${instance.packagePath} must stay on a patched brace-expansion line, found ${instance.version}`);
  }

  const v1 = instances.find((instance) => instance.version === "1.1.18");
  assert.ok(v1?.dev, "brace-expansion@1.1.18 must remain development-only while this ESLint chain exists");
});

test("supply-chain audit is fail-closed, version-line aware and generates the map report", () => {
  const audit = source("scripts/audit-lockfile-supply-chain.mjs");
  for (const threshold of ["1.1.18", "2.1.4", "3.0.6", "5.0.9"]) contains(audit, threshold, `patched threshold ${threshold}`);
  contains(audit, "CVE-2026-14257", "first advisory coverage");
  contains(audit, "CVE-2026-69152", "follow-up advisory coverage");
  contains(audit, "process.exit(1)", "fail-closed audit exit");
  contains(audit, "supply-chain.generated.ts", "generated system-map report");
  contains(audit, 'metadata.dev === true ? "development" : "runtime"', "runtime vs development classification");
});

test("CI and system-map generation both execute the lockfile supply-chain gate", () => {
  const pkg = JSON.parse(source("package.json"));
  const ci = source(".github/workflows/ci.yml");
  const gitignore = source(".gitignore");

  assert.equal(pkg.scripts["audit:supply-chain"], "node scripts/audit-lockfile-supply-chain.mjs");
  assert.ok(pkg.scripts["system-map:generate"].startsWith("npm run audit:supply-chain &&"), "system map generation must fail closed through supply-chain audit");
  contains(ci, "Audit lockfile supply-chain policy", "dedicated CI gate");
  contains(ci, "npm run audit:supply-chain", "CI supply-chain command");
  contains(gitignore, "/src/features/system-map/supply-chain.generated.ts", "generated report ignore rule");
});

test("system map exposes supply-chain security as a first-class workspace", () => {
  const navigation = source("src/features/system-map/navigation.ts");
  const page = source("src/app/harita/tedarik-zinciri/page.tsx");

  contains(navigation, 'key: "supplyChain"', "supply-chain navigation key");
  contains(navigation, 'href: "/harita/tedarik-zinciri"', "supply-chain route");
  contains(page, "supplyChainSecurityReport", "generated report consumption");
  contains(page, "Tedarik Zinciri Güvenliği", "workspace title");
  contains(page, "Hostinger sinyali neden kırmızı?", "scanner discrepancy visibility");
});
