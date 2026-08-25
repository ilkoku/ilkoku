import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCKFILE = path.join(ROOT, "package-lock.json");
const POLICY_FILE = path.join(ROOT, "scripts", "supply-chain-policy.json");
const OUTPUT = path.join(ROOT, "src", "features", "system-map", "supply-chain.generated.ts");

function unique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

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

function packageScope(metadata) {
  return metadata?.dev === true ? "development" : "runtime";
}

function evaluateRule(rule, version) {
  const parsed = parseVersion(version);
  if (!parsed) return { patched: false, reason: "invalid-version", threshold: null };
  const [major] = parsed;
  const threshold = rule.fixedByMajor?.[String(major)] ?? null;
  if (!threshold) return { patched: false, reason: "unrecognized-major", threshold: null };
  const thresholdVersion = parseVersion(threshold);
  if (!thresholdVersion) return { patched: false, reason: "invalid-policy-threshold", threshold };
  const patched = compare(parsed, thresholdVersion) >= 0;
  return { patched, reason: patched ? "patched" : "below-patched-threshold", threshold };
}

function directParents(packages, dependencyName) {
  return Object.entries(packages)
    .filter(([, metadata]) => metadata?.dependencies?.[dependencyName])
    .map(([packagePath, metadata]) => ({
      package: packagePath ? packageNameFromPath(packagePath) : "<root>",
      packagePath: packagePath || "<root>",
      version: metadata.version ?? null,
      requestedRange: metadata.dependencies[dependencyName],
      scope: packageScope(metadata),
    }))
    .sort((left, right) => left.packagePath.localeCompare(right.packagePath));
}

function buildDeploymentContract(rootMetadata, contractPolicy) {
  const dependencies = rootMetadata.dependencies ?? {};
  const requiredDependencies = (contractPolicy.requiredRootDependencies ?? []).map((dependency) => ({
    package: dependency,
    requestedRange: dependencies[dependency] ?? null,
    status: dependencies[dependency] ? "pass" : "blocker",
  }));
  const missingDependencies = requiredDependencies.filter((dependency) => dependency.status === "blocker");
  return {
    platform: contractPolicy.platform ?? "unknown",
    installMode: contractPolicy.installMode ?? "unknown",
    buildCommand: contractPolicy.buildCommand ?? "unknown",
    note: contractPolicy.note ?? "",
    status: missingDependencies.length > 0 ? "blocker" : "pass",
    requiredDependencies,
    missingDependencies,
  };
}

function buildManifestWarnings(rootMetadata, hygienePolicy, deploymentRequiredDependencies) {
  const dependencies = Object.keys(rootMetadata.dependencies ?? {});
  const exact = new Set(hygienePolicy.buildOnlyRootDependencies ?? []);
  const prefixes = hygienePolicy.buildOnlyRootPrefixes ?? [];
  const deploymentRequired = new Set(deploymentRequiredDependencies ?? []);
  return dependencies
    .filter((dependency) => exact.has(dependency) || prefixes.some((prefix) => dependency.startsWith(prefix)))
    .filter((dependency) => !deploymentRequired.has(dependency))
    .map((dependency) => ({
      package: dependency,
      status: "warn",
      detail: `${dependency} root dependencies altında. ${hygienePolicy.note}`,
    }));
}

function collectDuplicateVersions(instances) {
  const versionsByPackage = new Map();
  for (const instance of instances) {
    const versions = versionsByPackage.get(instance.package) ?? new Set();
    versions.add(instance.version);
    versionsByPackage.set(instance.package, versions);
  }
  return [...versionsByPackage.entries()]
    .filter(([, versions]) => versions.size > 1)
    .map(([packageName, versions]) => ({ package: packageName, versions: [...versions].sort() }))
    .sort((left, right) => right.versions.length - left.versions.length || left.package.localeCompare(right.package))
    .slice(0, 60);
}

const [lockText, policyText] = await Promise.all([
  readFile(LOCKFILE, "utf8"),
  readFile(POLICY_FILE, "utf8"),
]);
const lock = JSON.parse(lockText);
const policy = JSON.parse(policyText);

if (policy.schemaVersion !== 1 || !Array.isArray(policy.advisoryRules)) {
  console.error("Supply-chain audit failed: invalid scripts/supply-chain-policy.json schema.");
  process.exit(1);
}

const packages = lock.packages ?? {};
const rootMetadata = packages[""] ?? {};
const allInstances = Object.entries(packages)
  .filter(([packagePath, metadata]) => packagePath && metadata?.version)
  .map(([packagePath, metadata]) => ({
    package: packageNameFromPath(packagePath),
    packagePath,
    version: String(metadata.version),
    scope: packageScope(metadata),
  }))
  .sort((left, right) => left.package.localeCompare(right.package) || left.packagePath.localeCompare(right.packagePath));

const monitoredPackages = policy.advisoryRules.map((rule) => {
  const instances = allInstances
    .filter((instance) => instance.package === rule.package)
    .map((instance) => {
      const evaluation = evaluateRule(rule, instance.version);
      return {
        ...instance,
        ...evaluation,
        status: evaluation.patched ? "pass" : "blocker",
      };
    });
  return {
    package: rule.package,
    severity: rule.severity,
    advisories: rule.advisories ?? [],
    fixedByMajor: rule.fixedByMajor ?? {},
    note: rule.note ?? "",
    status: instances.some((instance) => instance.status === "blocker") ? "blocker" : "pass",
    instances,
    directParents: directParents(packages, rule.package),
  };
});

const advisoryBlockers = monitoredPackages.flatMap((entry) =>
  entry.instances
    .filter((instance) => instance.status === "blocker")
    .map((instance) => ({
      package: entry.package,
      severity: entry.severity,
      advisories: entry.advisories,
      ...instance,
    })),
);
const deploymentBuildContract = buildDeploymentContract(rootMetadata, policy.deploymentBuildContract ?? {});
const deploymentBlockers = deploymentBuildContract.missingDependencies.map((dependency) => ({
  package: dependency.package,
  severity: "deployment",
  advisories: [],
  status: "blocker",
  reason: "missing-root-dependency",
  packagePath: "<root>",
  version: null,
  scope: "deployment-build",
}));
const blockers = [...advisoryBlockers, ...deploymentBlockers];
const manifestWarnings = buildManifestWarnings(
  rootMetadata,
  policy.manifestHygiene ?? {},
  policy.deploymentBuildContract?.requiredRootDependencies ?? [],
);
const duplicateVersionPackages = collectDuplicateVersions(allInstances);
const uniquePackages = unique(allInstances.map((instance) => instance.package));
const runtimeInstances = allInstances.filter((instance) => instance.scope === "runtime");
const developmentInstances = allInstances.filter((instance) => instance.scope === "development");

const report = {
  generatedAt: new Date().toISOString(),
  source: "package-lock.json + scripts/supply-chain-policy.json",
  genericAuditGate: policy.genericAuditGate,
  summary: {
    totalInstances: allInstances.length,
    uniquePackages: uniquePackages.length,
    runtimeInstances: runtimeInstances.length,
    developmentInstances: developmentInstances.length,
    monitoredRules: monitoredPackages.length,
    monitoredInstances: monitoredPackages.reduce((total, item) => total + item.instances.length, 0),
    blockers: blockers.length,
    warnings: manifestWarnings.length,
    duplicateVersionPackages: duplicateVersionPackages.length,
  },
  rootManifest: {
    dependencies: Object.keys(rootMetadata.dependencies ?? {}).sort(),
    devDependencies: Object.keys(rootMetadata.devDependencies ?? {}).sort(),
    hygieneNote: policy.manifestHygiene?.note ?? "",
    warnings: manifestWarnings,
  },
  deploymentBuildContract,
  monitoredPackages,
  blockers,
  duplicateVersionPackages,
  scannerDiscrepancies: policy.scannerDiscrepancies ?? [],
};

await writeFile(
  OUTPUT,
  `// Generated by scripts/audit-lockfile-supply-chain.mjs. Do not edit.\nexport const supplyChainSecurityReport = ${JSON.stringify(report, null, 2)} as const;\n`,
  "utf8",
);

console.log(`Supply-chain inventory: ${report.summary.totalInstances} instance · ${report.summary.uniquePackages} unique package · ${report.summary.runtimeInstances} runtime · ${report.summary.developmentInstances} development.`);
for (const monitored of monitoredPackages) {
  if (monitored.instances.length === 0) {
    console.log(`Supply-chain PASS: ${monitored.package} is not installed.`);
    continue;
  }
  for (const instance of monitored.instances) {
    console.log(`Supply-chain ${instance.status.toUpperCase()}: ${monitored.package}@${instance.version} · ${instance.scope} · ${instance.reason} · ${instance.packagePath}`);
  }
}
for (const warning of manifestWarnings) {
  console.warn(`Supply-chain WARN: ${warning.package} · production manifest hygiene review.`);
}
for (const dependency of deploymentBuildContract.requiredDependencies) {
  console.log(`Deployment build ${dependency.status.toUpperCase()}: ${dependency.package} · ${dependency.requestedRange ?? "missing from root dependencies"}`);
}

if (blockers.length > 0) {
  console.error(`Supply-chain audit blocked: ${blockers.length} advisory or deployment-contract blocker(s) detected.`);
  process.exit(1);
}

console.log(`Supply-chain audit passed: ${monitoredPackages.length} advisory rule(s), ${report.summary.monitoredInstances} monitored instance(s), 0 blockers, ${manifestWarnings.length} manifest hygiene warning(s).`);
