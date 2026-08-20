import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = path.join(ROOT, "src", "features", "system-map", "runtime-manifest.generated.ts");

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

const acknowledgedMigrationOnlyTables = new Set([
  "ContractTemplate",
  "UserContract",
  "UserContractEvent",
]);

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
  ["Yazar ve eser yayın akışı", ["/yazar", "/eserlerim", "/eserlerim/[workId]", "/kitap/[slug]"]],
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

function extractJson(text, marker, terminator) {
  const start = text.indexOf(marker);
  assert.notEqual(start, -1, `Manifest marker missing: ${marker}`);
  const contentStart = start + marker.length;
  const end = text.indexOf(terminator, contentStart);
  assert.notEqual(end, -1, `Manifest terminator missing after: ${marker}`);
  return JSON.parse(text.slice(contentStart, end));
}

async function loadManifest() {
  const text = await readFile(MANIFEST, "utf8");
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
  return { runtime, source };
}

function addAliases(routes) {
  const aliases = routes
    .filter((route) => matchesPath(route.route, "/admin"))
    .map((route) => ({
      ...route,
      route: route.route.replace(/^\/admin/u, "/sistem-yonetimi"),
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
        if (routes.some((route) => routeMatches(candidate, route.route))) continue;
        findings.push(finding("BLOCKER", "WORKFLOW_ROUTE", candidate, title, `Kanonik workflow adımı route envanterinde bulunamadı: ${step}`));
      }
    }
  }
  return findings;
}

function collectMenuFindings(routes, references) {
  const menuSources = new Set(["src/content/navigation.ts", "src/lib/admin-navigation.ts"]);
  return references
    .filter((reference) => menuSources.has(reference.origin))
    .filter((reference) => !routes.some((route) => routeMatches(reference.target, route.route)))
    .map((reference) => finding("BLOCKER", "MENU_ROUTE", reference.target, reference.origin, "Menü/navigation kaynak dosyasındaki iç hedef route envanterinde bulunamadı."));
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
    if (access === "public") continue;
    if (guards.length > 0) continue;
    findings.push(finding(access === "admin" ? "BLOCKER" : "WARN", "API_GUARD", route.route, route.sourceFile, `${access} handler için doğrudan guard kanıtı statik manifestte bulunamadı.`));
  }
  return findings;
}

function collectOrphanFindings(routes, references) {
  return routes
    .filter((route) => route.kind === "page")
    .filter((route) => !entryPointRoutes.has(route.route))
    .filter((route) => !references.some((reference) => routeMatches(reference.target, route.route)))
    .map((route) => finding("WARN", "ORPHAN_ROUTE", route.route, route.sourceFile, "Build-time kaynak taramasında bu sayfaya giriş referansı bulunamadı."));
}

function collectActionFindings(modules) {
  return modules
    .filter((sourceModule) => sourceModule.actionNames.length > 0 && sourceModule.consumers.length === 0)
    .map((sourceModule) => finding("WARN", "UNREFERENCED_ACTION_MODULE", null, sourceModule.file, `Consumer bulunamayan exported server action: ${sourceModule.actionNames.join(", ")}`));
}

function collectInfrastructureFindings(runtime, routes) {
  const findings = [];
  for (const env of runtime.envUsage.filter((item) => !item.documented)) {
    findings.push(finding("WARN", "UNDOCUMENTED_ENV", env.key, env.usedBy.join(", "), "Kaynak kodda kullanılan ENV anahtarı .env.example içinde belgelenmemiş."));
  }
  for (const rule of runtime.routeRules) {
    if (!rule.destination.startsWith("/")) continue;
    const normalized = normalizeRulePath(rule.destination);
    if (routes.some((route) => routeMatches(normalized, route.route))) continue;
    findings.push(finding("BLOCKER", "BROKEN_ROUTE_RULE", rule.destination, "next.config.ts", `${rule.kind} hedefi route envanterinde bulunamadı: ${rule.source}`));
  }
  const unexpected = runtime.schema.migrationOnlyTables.filter((table) => !acknowledgedMigrationOnlyTables.has(table));
  if (unexpected.length > 0) {
    findings.push(finding("WARN", "UNEXPECTED_MIGRATION_ONLY", unexpected.join(", "), "prisma/migrations", "Migration ile yönetilen tablo Prisma schema veya bilinçli raw-SQL istisna listesinde yok."));
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
  const { runtime, source } = await loadManifest();
  assert.equal(source.version, 1, "System map source manifest version must remain supported");
  assert.ok(source.sourceFileCount > 0, "System map source manifest must not be empty");

  const routes = addAliases(source.routes);
  const findings = [
    ...collectMenuFindings(routes, source.references),
    ...collectWorkflowFindings(routes),
    ...collectApiFindings(routes, source.modules),
    ...collectOrphanFindings(routes, source.references),
    ...collectActionFindings(source.modules),
    ...collectInfrastructureFindings(runtime, routes),
  ];

  printReport(findings, source, runtime);
  const blockers = findings.filter((item) => item.status === "BLOCKER");
  assert.deepEqual(blockers, [], `System map diagnostic found ${blockers.length} blocker(s)`);
});
