import { spawnSync } from "node:child_process";

const ALLOWED_ADVISORIES = new Map([
  [
    "GHSA-ggr8-5vv4-36mx",
    {
      packageName: "deepmerge-ts",
      expiresAt: "2026-08-25T23:59:59Z",
      reason: "Prisma @prisma/config 7.9.1 exact-pins deepmerge-ts 7.1.5; tracked upstream in prisma/prisma#30052.",
    },
  ],
]);

const HIGH_SEVERITIES = new Set(["high", "critical"]);

function advisoryId(entry) {
  if (!entry || typeof entry !== "object") return null;

  const haystack = [entry.url, entry.title]
    .filter((value) => typeof value === "string")
    .join(" ");
  const match = haystack.match(/GHSA-[0-9a-z-]+/i);
  return match ? match[0].toUpperCase() : null;
}

function terminalAdvisories(packageName, vulnerabilities, seen = new Set()) {
  if (seen.has(packageName)) return { ids: new Set(), unresolved: true };
  seen.add(packageName);

  const vulnerability = vulnerabilities[packageName];
  if (!vulnerability || !Array.isArray(vulnerability.via)) {
    return { ids: new Set(), unresolved: true };
  }

  const ids = new Set();
  let unresolved = false;

  for (const via of vulnerability.via) {
    if (typeof via === "string") {
      const nested = terminalAdvisories(via, vulnerabilities, new Set(seen));
      for (const id of nested.ids) ids.add(id);
      unresolved ||= nested.unresolved;
      continue;
    }

    const id = advisoryId(via);
    if (id) ids.add(id);
    else unresolved = true;
  }

  return { ids, unresolved };
}

function isAllowedChain(packageName, vulnerabilities, now) {
  const terminal = terminalAdvisories(packageName, vulnerabilities);
  if (terminal.unresolved || terminal.ids.size === 0) return false;

  for (const id of terminal.ids) {
    const allowed = ALLOWED_ADVISORIES.get(id);
    if (!allowed) return false;
    if (now > new Date(allowed.expiresAt)) return false;
  }

  return true;
}

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
} catch (error) {
  console.error("npm audit did not return valid JSON.");
  if (result.stderr) console.error(result.stderr.trim());
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities ?? {};
const now = new Date();
const blocked = [];
const temporarilyAllowed = [];

for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
  if (!HIGH_SEVERITIES.has(vulnerability?.severity)) continue;

  if (isAllowedChain(packageName, vulnerabilities, now)) {
    temporarilyAllowed.push(packageName);
  } else {
    blocked.push({ packageName, severity: vulnerability?.severity ?? "unknown" });
  }
}

for (const [id, allowed] of ALLOWED_ADVISORIES) {
  if (now > new Date(allowed.expiresAt)) {
    console.error(
      `Temporary audit allowance ${id} expired at ${allowed.expiresAt}. Remove it or apply the upstream fix.`,
    );
    process.exit(1);
  }
}

if (blocked.length > 0) {
  console.error("Unallowed high/critical dependency vulnerabilities detected:");
  for (const item of blocked) {
    console.error(`- ${item.packageName}: ${item.severity}`);
  }
  process.exit(1);
}

if (temporarilyAllowed.length > 0) {
  console.warn("Temporary dependency-audit allowance active:");
  for (const [id, allowed] of ALLOWED_ADVISORIES) {
    console.warn(`- ${id} / ${allowed.packageName} until ${allowed.expiresAt}`);
    console.warn(`  ${allowed.reason}`);
  }
  console.warn(`Affected audit chain: ${temporarilyAllowed.sort().join(", ")}`);
}

console.log("Dependency audit gate passed: no unallowed high/critical vulnerabilities.");
