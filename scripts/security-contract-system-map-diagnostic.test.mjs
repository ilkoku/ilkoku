import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = path.join(ROOT, "src", "features", "system-map", "runtime-manifest.generated.ts");
const RUNTIME_CONTRACTS = path.join(ROOT, "src", "features", "system-map", "runtime-contracts.json");
const ADMIN_NAVIGATION = path.join(ROOT, "src", "lib", "admin-navigation.ts");
const SYSTEM_MANAGEMENT_PATH = "/sistem-yonetimi";

const publicApiPrefixes = [
  "/api/content-faq",
  "/api/media",
  "/api/public-announcements",
  "/api/site-contact",
  "/api/site-content",
];

const cmsApiPrefixes = [
  "/api/cms-access-manage",
  "/api/cms-history",
  "/api/cms-media-upload",
  "/api/cms-seo-audit",
  "/api/cms-settings",
  "/api/content-notices",
  "/api/site-contact-manage",
];

const entryPointRoutes = new Set([
  "/",
  "/giris",
  "/kayit",
  "/sifre-yenile",
  "/erisim-reddedildi",
  "/editor-daveti",
  "/robots.txt",
  "/sitemap.xml",
  "/harita",
  "/sozlesme",
]);

const workflows = [
  ["Kayıt ve rol yolculuğu", ["/kayit", "/rol-secimi", "/okuyucu | /yazar | /editor | /yayinevi"]],
  ["Okuyucu yolculuğu", ["/okuyucu", "/kesfet", "/kitap/[slug]", "/oku/[slug]/...", "/tamamlanan-eserler"]],
  ["Yazar ve eser yayın akışı", ["/yazar", "/eserlerim", "/eserlerim · NewWorkFlow bölüm/yayın çalışma alanı", "/kitap/[slug]"]],
  ["Editör inceleme akışı", ["/editor/talepler", "/editor/incelemeler?asama=birinci", "/editor/incelemeler?asama=ikinci", "/editor/incelemeler?durum=tamamlanan"]],
  ["Yayınevi keşif ve operasyon akışı", ["/yayinevi", "/yayinevi/kesfet/eserler", "/yayinevi/basvurular/[submissionId]", "/yayinevi/editor-talepleri", "/yayinevi/dosyalar"]],
  ["İçerik yayın akışı", ["/icerik", "/icerik/ana-sayfa | /icerik/rol-kartlari | /icerik/menuler | /icerik/seo", "/"]],
  ["Merkezi sözleşme akışı", ["/sozlesme", "/sozlesme/sablonlar/yeni | /sozlesme/sablonlar/[templateId]", "/sozlesmelerim", "/sozlesmelerim/[contractId]", "/sozlesme"]],
  ["Sistem yönetimi ve mimari izleme", ["/sistem-yonetimi", "/harita", "/sozlesme"]],
];

function matchesPath(value, prefix) {
  return value === prefix || value.startsWith(`${prefix}/`);
}

function canonicalShape(value) {
  return value
    .split(/[?#]/u)[0]
    .replace(/\[\[\.\.\.[^\]]+\]\]/gu, "[*]")
    .replace(/\[\.\.\.[^\]]+\]/gu, "[*]")
    .replace(/\[[^\]]+\]/gu, "[]")
    .replace(/\[param\]/gu, "[]")
    .replace(/\.\.\.$/u, "[*]")
    .replace(/\/$/u, "") || "/";
}

function routeMatches(reference, route) {
  const referenceShape = canonicalShape(reference);
  const routeShape = canonicalShape(route);
  if (referenceShape === routeShape) return true;
  const routeSegments = routeShape.split("/").filter(Boolean);
  const referenceSegments = referenceShape.split("/").filter(Boolean);
  for (let index = 0; index < routeSegments.length; index += 1) {
    const expected = routeSegments[index];
    const actual = referenceSegments[index];
    if (expected === "[*]") return referenceSegments.length >= index;
    if (expected === "[]") {
      if (!actual) return false;
      continue;
    }
    if (expected !== actual) return false;
  }
  return referenceSegments.length === routeSegments.length;
}

function normalizeRulePath(value) {
  return value
    .split(/[?#]/u)[0]
    .replace(/:path\+/gu, "[...path]")
    .replace(/:path\*/gu, "[[...path]]")
    .replace(/:([A-Za-z0-9_]+)/gu, "[$1]")
    .replace(/\/$/u, "") || "/";
}

function ruleShape(value) {
  return normalizeRulePath(value)
    .replace(/\[\[\.\.\.[^\]]+\]\]/gu, "[*]")
    .replace(/\[\.\.\.[^\]]+\]/gu, "[*]")
    .replace(/\[[^\]]+\]/gu, "[]");
}

function ruleMatchesRoute(destination, route) {
  const expected = ruleShape(destination).split("/").filter(Boolean);
  const actual = ruleShape(route).split("/").filter(Boolean);
  if (expected.length === 0) return actual.length === 0;
  for (let index = 0; index < expected.length; index += 1) {
    const part = expected[index];
    if (part === "[*]") return actual.length >= index;
    if (part === "[]") {
      if (!actual[index]) return false;
      continue;
    }
    if (part !== actual[index]) return false;
  }
  return expected.length === actual.length;
}

function equivalentRoutePaths(route) {
  if (route === "/admin") return [route, SYSTEM_MANAGEMENT_PATH];
  if (route.startsWith("/admin/")) return [route, `${SYSTEM_MANAGEMENT_PATH}${route.slice("/admin".length)}`];
  if (route === SYSTEM_MANAGEMENT_PATH) return [route, "/admin"];
  if (route.startsWith(`${SYSTEM_MANAGEMENT_PATH}/`)) return [route, `/admin${route.slice(SYSTEM_MANAGEMENT_PATH.length)}`];
  return [route];
}

function extractJson(text, marker, terminator) {
  const start = text.indexOf(marker);
  assert.notEqual(start, -1, `Manifest marker missing: ${marker}`);
  const contentStart = start + marker.length;
  const end = text.indexOf(terminator, contentStart);
  assert.notEqual(end, -1, `Manifest terminator missing after: ${marker}`);
  return JSON.parse(text.slice(contentStart, end));
}

async function loadInputs() {
  const [text, runtimeContractsText, adminNavigationText] = await Promise.all([
    readFile(MANIFEST, "utf8"),
    readFile(RUNTIME_CONTRACTS, "utf8"),
    readFile(ADMIN_NAVIGATION, "utf8"),
  ]);
  const source = extractJson(
    text,
    "export const systemMapSourceManifest: SystemMapSourceManifestData = ",
    ";\n\nexport const runtimeInfrastructureManifest",
  );
  const runtime = extractJson(
    text,
    "export const runtimeInfrastructureManifest: RuntimeInfrastructureManifestData = ",
    ";\n",
  );
  return {
    adminMenuTargets: parseAdminMenuTargets(adminNavigationText),
    runtime,
    runtimeContracts: JSON.parse(runtimeContractsText),
    source,
  };
}

function parseAdminMenuTargets(text) {
  const targets = new Set();
  const systemPathPattern = /href:\s*systemPath\((?:"([^"]*)")?\)/gu;
  const directHrefPattern = /href:\s*"(\/(?!\/)[^"]+)"/gu;
  let match;
  while ((match = systemPathPattern.exec(text))) {
    targets.add(`${SYSTEM_MANAGEMENT_PATH}${match[1] ?? ""}`);
  }
  while ((match = directHrefPattern.exec(text))) {
    if (match[1]) targets.add(match[1]);
  }
  return targets;
}

function addAliases(routes) {
  const aliases = routes
    .filter((route) => matchesPath(route.route, "/admin"))
    .map((route) => ({
      ...route,
      route: route.route.replace(/^\/admin/u, SYSTEM_MANAGEMENT_PATH),
      sourceFile: `${route.sourceFile} · next.config.ts rewrite`,
    }));
  const seen = new Set();
  return [...routes, ...aliases].filter((route) => {
    const key = `${route.kind}:${route.route}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function finding(status, category, target, source, detail) {
  return { category, detail, source, status, target };
}

function collectWorkflowFindings(routes) {
  const findings = [];
  for (const [title, steps] of workflows) {
    for (const step of steps) {
      const candidates = step.split("|").map((value) => value.trim()).filter(Boolean);
      for (const candidate of candidates) {
        const routeCandidate = candidate.match(/\/[A-Za-z0-9_\-\[\].?=&/]+/u)?.[0];
        if (!routeCandidate || routes.some((route) => routeMatches(routeCandidate, route.route))) continue;
        findings.push(finding("BLOCKER", "WORKFLOW_ROUTE", routeCandidate, title, `Kanonik workflow adımı route envanterinde bulunamadı: ${step}`));
      }
    }
  }
  return findings;
}

function collectMenuFindings(routes, references, adminMenuTargets) {
  const menuSources = new Set(["src/content/navigation.ts", "src/lib/admin-navigation.ts"]);
  const targets = new Set(
    references
      .filter((reference) => menuSources.has(reference.origin))
      .map((reference) => reference.target),
  );
  for (const target of adminMenuTargets) targets.add(target);
  return [...targets]
    .filter((target) => !routes.some((route) => routeMatches(target, route.route)))
    .map((target) => finding("BLOCKER", "MENU_ROUTE", target, "navigation registry", "Menü/navigation hedefi route envanterinde bulunamadı."));
}

function apiAccess(route) {
  if (publicApiPrefixes.some((prefix) => matchesPath(route, prefix))) return "public";
  if (matchesPath(route, "/api/internal")) return "internal";
  if (cmsApiPrefixes.some((prefix) => matchesPath(route, prefix))) return "cms";
  if (matchesPath(route, "/api/admin")) return "admin";
  return "protected";
}

function collectApiFindings(routes, modules) {
  const byFile = new Map(modules.map((sourceModule) => [sourceModule.file, sourceModule]));
  const findings = [];
  for (const route of routes.filter((item) => item.kind === "handler" && matchesPath(item.route, "/api"))) {
    const sourceModule = byFile.get(route.sourceFile);
    const methods = sourceModule?.methods ?? [];
    const guards = sourceModule?.guardEvidence ?? [];
    const access = apiAccess(route.route);
    if (methods.length === 0) {
      findings.push(finding("WARN", "API_METHOD", route.route, route.sourceFile, "HTTP method export'u statik manifestte bulunamadı."));
      continue;
    }
    if (access === "public" || guards.length > 0) continue;
    findings.push(finding(access === "admin" ? "BLOCKER" : "WARN", "API_GUARD", route.route, route.sourceFile, `${access} handler için doğrudan guard kanıtı statik manifestte bulunamadı.`));
  }
  return findings;
}

function collectOrphanFindings(routes, references, adminMenuTargets) {
  return routes
    .filter((route) => route.kind === "page")
    .filter((route) => {
      const equivalent = equivalentRoutePaths(route.route);
      if (equivalent.some((candidate) => entryPointRoutes.has(candidate))) return false;
      if ([...adminMenuTargets].some((target) => equivalent.some((candidate) => routeMatches(target, candidate)))) return false;
      return !references.some((reference) => equivalent.some((candidate) => routeMatches(reference.target, candidate)));
    })
    .map((route) => finding("WARN", "ORPHAN_ROUTE", route.route, route.sourceFile, "Build-time kaynak ve menü taramasında bu sayfaya giriş referansı bulunamadı."));
}

function collectActionFindings(modules) {
  return modules
    .filter((sourceModule) => sourceModule.actionNames.length > 0 && sourceModule.consumers.length === 0)
    .map((sourceModule) => finding("WARN", "UNREFERENCED_ACTION_MODULE", null, sourceModule.file, `Consumer bulunamayan exported server action: ${sourceModule.actionNames.join(", ")}`));
}

function collectInfrastructureFindings(runtime, routes, runtimeContracts) {
  const findings = [];
  const runtimeManaged = new Set(runtimeContracts.runtimeManagedEnvKeys);
  const acknowledgedMigrationOnly = new Set(runtimeContracts.acknowledgedMigrationOnlyTables);
  for (const env of runtime.envUsage.filter((item) => !item.documented && !runtimeManaged.has(item.key))) {
    findings.push(finding("WARN", "UNDOCUMENTED_ENV", env.key, env.usedBy.join(", "), "Kaynak kodda kullanılan ENV anahtarı .env.example veya runtime-managed sözleşmesinde yok."));
  }
  for (const rule of runtime.routeRules) {
    if (!rule.destination.startsWith("/")) continue;
    if (routes.some((route) => ruleMatchesRoute(rule.destination, route.route))) continue;
    findings.push(finding("BLOCKER", "BROKEN_ROUTE_RULE", rule.destination, "next.config.ts", `${rule.kind} hedefi route envanterinde bulunamadı: ${rule.source}`));
  }
  const unexpected = runtime.schema.migrationOnlyTables.filter((table) => !acknowledgedMigrationOnly.has(table));
  if (unexpected.length > 0) {
    findings.push(finding("WARN", "UNEXPECTED_MIGRATION_ONLY", unexpected.join(", "), "prisma/migrations", "Migration ile yönetilen tablo Prisma schema veya merkezi raw-SQL sözleşmesinde yok."));
  }
  if (runtime.version !== 1 || runtime.sourceFileCount === 0) {
    findings.push(finding("WARN", "RUNTIME_SCANNER", null, "runtime manifest", `Runtime manifest self-check başarısız: version=${runtime.version}, sourceFileCount=${runtime.sourceFileCount}`));
  }
  return findings;
}

function printReport(findings, source, runtime) {
  const blockers = findings.filter((item) => item.status === "BLOCKER");
  const warnings = findings.filter((item) => item.status === "WARN");
  console.log("\n=== SYSTEM MAP DIAGNOSTIC INVENTORY ===");
  console.log(`manifest: ${source.routes.length} source routes · ${source.references.length} references · ${source.modules.length} modules · ${runtime.envUsage.length} ENV`);
  console.log(`findings: ${blockers.length} BLOCKER · ${warnings.length} WARN`);
  for (const item of findings.sort((left, right) => left.status.localeCompare(right.status) || left.category.localeCompare(right.category) || String(left.target).localeCompare(String(right.target)))) {
    console.log(`[${item.status}] ${item.category} | target=${item.target ?? "-"} | source=${item.source} | ${item.detail}`);
  }
  console.log("=== END SYSTEM MAP DIAGNOSTIC ===\n");
}

test("system map diagnostic inventory exposes every statically provable remaining finding", async () => {
  const { adminMenuTargets, runtime, runtimeContracts, source } = await loadInputs();
  assert.equal(source.version, 1, "System map source manifest version must remain supported");
  assert.ok(source.sourceFileCount > 0, "System map source manifest must not be empty");

  const routes = addAliases(source.routes);
  const findings = [
    ...collectMenuFindings(routes, source.references, adminMenuTargets),
    ...collectWorkflowFindings(routes),
    ...collectApiFindings(routes, source.modules),
    ...collectOrphanFindings(routes, source.references, adminMenuTargets),
    ...collectActionFindings(source.modules),
    ...collectInfrastructureFindings(runtime, routes, runtimeContracts),
  ];

  printReport(findings, source, runtime);
  const blockers = findings.filter((item) => item.status === "BLOCKER");
  assert.deepEqual(blockers, [], `System map diagnostic found ${blockers.length} blocker(s)`);
});
