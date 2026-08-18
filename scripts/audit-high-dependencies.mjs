import { spawnSync } from "node:child_process";

const HIGH_SEVERITIES = new Set(["high", "critical"]);

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
const blocked = [];

for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
  if (!HIGH_SEVERITIES.has(vulnerability?.severity)) continue;
  blocked.push({ packageName, severity: vulnerability?.severity ?? "unknown" });
}

if (blocked.length > 0) {
  console.error("High/critical dependency vulnerabilities detected:");
  for (const item of blocked) {
    console.error(`- ${item.packageName}: ${item.severity}`);
  }
  process.exit(1);
}

console.log("Dependency audit gate passed: no high/critical vulnerabilities.");
