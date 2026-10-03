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
    console.warn(`- ${item.packageName}: ${item.severity}`);
  }
}

if (blocked.length > 0) {
  console.error("High/critical dependency vulnerabilities detected:");
  for (const item of blocked) {
    console.error(`- ${item.packageName}: ${item.severity}`);
  }
  process.exit(1);
}

console.log("Dependency audit gate passed: no unwaived high/critical vulnerabilities.");
