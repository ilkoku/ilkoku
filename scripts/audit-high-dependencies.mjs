import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const HIGH_SEVERITIES = new Set(["high", "critical"]);

const TEMPORARY_DEV_ONLY_WAIVER = {
  advisoryIds: new Set(["CVE-2026-93687", "GHSA-vfj7-8cjw-p6xm"]),
  packages: new Set([
    "@next/eslint-plugin-next",
    "eslint-config-next",
    "fast-glob",
    "micromatch",
    "braces",
  ]),
  versions: new Map([
    ["@next/eslint-plugin-next", "16.3.8"],
    ["eslint-config-next", "16.3.8"],
    ["fast-glob", "3.3.1"],
    ["micromatch", "4.0.8"],
    ["braces", "3.0.3"],
  ]),
};

const lockfile = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));

const result = spawnSync("npm", ["audit", "--json"], {
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});

if (result.error) {
  console.error("npm audit could not be executed:", result.error.message);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout || "{}");
} catch {
  console.error("npm audit did not return valid JSON.");
  if (result.stderr) console.error(result.stderr.trim());
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities ?? {};
const blocked = [];
const waived = [];

function referencesTemporaryAdvisory(packageName, seen = new Set()) {
  if (seen.has(packageName)) return false;
  seen.add(packageName);

  const vulnerability = vulnerabilities[packageName];
  if (!vulnerability) return false;

  for (const via of vulnerability.via ?? []) {
    if (typeof via === "string") {
      if (referencesTemporaryAdvisory(via, seen)) return true;
      continue;
    }

    const evidence = [
      via?.url,
      via?.title,
      via?.name,
      via?.source,
    ]
      .filter(Boolean)
      .join(" ");

    if ([...TEMPORARY_DEV_ONLY_WAIVER.advisoryIds].some((id) => evidence.includes(id))) {
      return true;
    }
  }

  return false;
}

function isDevOnlyVulnerability(packageName, vulnerability) {
  if (!TEMPORARY_DEV_ONLY_WAIVER.packages.has(packageName)) return false;
  if (!referencesTemporaryAdvisory(packageName)) return false;

  const expectedVersion = TEMPORARY_DEV_ONLY_WAIVER.versions.get(packageName);
  const installedVersion = lockfile.packages?.[`node_modules/${packageName}`]?.version;
  if (!expectedVersion || installedVersion !== expectedVersion) return false;

  const nodes = vulnerability?.nodes ?? [];
  if (nodes.length === 0) return false;

  return nodes.every((nodePath) => lockfile.packages?.[nodePath]?.dev === true);
}

for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
  if (!HIGH_SEVERITIES.has(vulnerability?.severity)) continue;

  if (isDevOnlyVulnerability(packageName, vulnerability)) {
    waived.push({ packageName, severity: vulnerability?.severity ?? "unknown" });
    continue;
  }

  blocked.push({ packageName, severity: vulnerability?.severity ?? "unknown" });
}

if (waived.length > 0) {
  console.warn(
    "Temporary dev-only waiver applied for CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm (no patched braces release is currently available):",
  );
  for (const item of waived) {
    const version = lockfile.packages?.[`node_modules/${item.packageName}`]?.version ?? "unknown";
    console.warn(`- ${item.packageName}@${version}: ${item.severity}`);
  }
}

// Preserve the strict high/critical gate while making failures actionable:
// print the upstream advisory identifiers, the vulnerable lockfile nodes and
// npm's reported fix availability, not just the names of dependent packages.
function collectRootAdvisories(packageName, seen = new Set()) {
  if (seen.has(packageName)) return [];
  seen.add(packageName);
  const vulnerability = vulnerabilities[packageName];
  if (!vulnerability) return [];

  const records = [];
  for (const via of vulnerability.via ?? []) {
    if (typeof via === "string") {
      records.push(...collectRootAdvisories(via, seen));
    } else if (via && typeof via === "object") {
      records.push({
        title: String(via.title ?? "unknown advisory"),
        url: String(via.url ?? "unknown URL"),
        range: String(via.range ?? "unknown range"),
      });
    }
  }
  return records;
}

function describeBlockedVulnerability(item) {
  const vulnerability = vulnerabilities[item.packageName];
  const nodes = vulnerability?.nodes ?? [];
  const advisories = collectRootAdvisories(item.packageName);
  const seen = new Set();
  for (const entry of advisories) {
    const key = `${entry.url}|${entry.range}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.error(`    advisory: ${entry.title} | ${entry.url} | affected ${entry.range}`);
  }
  if (seen.size === 0) console.error("    advisory: unresolved; inspect npm audit --json");
  for (const nodePath of nodes.slice(0, 20)) {
    const node = lockfile.packages?.[nodePath];
    console.error(`    installed: ${nodePath}@${node?.version ?? "unknown"} | dev=${node?.dev === true}`);
  }
  if (nodes.length > 20) console.error(`    additional lockfile nodes: ${nodes.length - 20}`);
  const fix = vulnerability?.fixAvailable;
  console.error(`    npm fix available: ${typeof fix === "boolean" ? fix : JSON.stringify(fix ?? null)}`);
}

if (blocked.length > 0) {
  console.error("High/critical dependency vulnerabilities detected:");
  for (const item of blocked) {
    console.error(`- ${item.packageName}: ${item.severity}`);
    describeBlockedVulnerability(item);
  }
  process.exit(1);
}

console.log("Dependency audit gate passed: no unwaived high/critical vulnerabilities.");
