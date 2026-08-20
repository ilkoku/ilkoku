import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function contains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

function notContains(text, fragment, label) {
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);
}

test("runtime infrastructure collector is server-only, read-only and never exposes ENV values", () => {
  const collector = source("src/features/system-map/runtime-infrastructure.ts");
  const panel = source("src/features/system-map/RuntimeInfrastructurePanel.tsx");

  contains(collector, 'import "server-only"', "runtime infrastructure server boundary");
  contains(collector, 'from "./runtime-manifest.generated"', "build-time manifest input");
  contains(collector, 'import runtimeContracts from "./runtime-contracts.json"', "central runtime contract input");
  contains(collector, "process.env[item.key]", "runtime configured boolean observation");
  contains(collector, "configured:", "configured state projection");
  contains(collector, "secretLike", "secret classification");
  notContains(collector, 'from "@/lib/prisma"', "runtime collector must not connect to DB");
  notContains(collector, "prisma.$transaction", "runtime collector must not write DB");
  notContains(collector, "value: process.env", "ENV value must not enter report");
  notContains(collector, "envValue", "ENV value field must not exist");
  notContains(panel, "process.env", "panel must never read ENV values");
  contains(panel, "ENV değerleri, parolalar, tokenlar ve bağlantı dizeleri render edilmez", "ENV value privacy notice");
});

test("production runtime collector performs no source-tree filesystem traversal", () => {
  const collector = source("src/features/system-map/runtime-infrastructure.ts");
  const generator = source("scripts/generate-system-map-runtime-manifest.mjs");

  notContains(collector, "node:fs", "runtime collector fs dependency");
  notContains(collector, "node:path", "runtime collector path dependency");
  notContains(collector, "process.cwd()", "runtime collector cwd dependency");
  notContains(collector, "readdir(", "runtime collector directory traversal");
  notContains(collector, "readFile(", "runtime collector source read");
  contains(generator, 'import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"', "build-time filesystem ownership");
  contains(generator, 'const SRC = path.join(ROOT, "src")', "source scan build boundary");
  contains(generator, 'const NEXT_CONFIG = path.join(ROOT, "next.config.ts")', "next config build boundary");
  contains(generator, 'const PRISMA_SCHEMA = path.join(ROOT, "prisma", "schema.prisma")', "Prisma build boundary");
});

test("ENV contract is generated from source usage and .env.example without copying values", () => {
  const generator = source("scripts/generate-system-map-runtime-manifest.mjs");
  const collector = source("src/features/system-map/runtime-infrastructure.ts");
  const contracts = JSON.parse(source("src/features/system-map/runtime-contracts.json"));

  contains(generator, 'const ENV_EXAMPLE = path.join(ROOT, ".env.example")', "env example source");
  contains(generator, "envDotPattern", "dot ENV usage scan");
  contains(generator, "envBracketPattern", "bracket ENV usage scan");
  contains(generator, "envDocumentPattern", "documented ENV scan");
  contains(generator, "collectEnvUsage(files, envExample)", "ENV manifest projection");
  notContains(generator, "process.env[", "generator must not serialize runtime ENV values");
  notContains(generator, "process.env.", "generator must not serialize dotted ENV values");
  contains(collector, "runtimeManagedEnvKeys", "runtime-managed ENV classification");
  assert.ok(contracts.runtimeManagedEnvKeys.includes("NODE_ENV"), "NODE_ENV must remain explicitly runtime-managed");
  contains(collector, 'title: "Belgelenmemiş ENV anahtarı"', "undocumented ENV warning");
});

test("redirect and rewrite source parsing occurs at build time and runtime only validates targets", () => {
  const generator = source("scripts/generate-system-map-runtime-manifest.mjs");
  const collector = source("src/features/system-map/runtime-infrastructure.ts");

  contains(generator, "collectRouteRules(nextConfig)", "build-time route rule extraction");
  contains(generator, 'parseRuleObjects(redirectsBlock, "redirect")', "redirect inventory");
  contains(generator, 'parseRuleObjects(rewritesBlock, "rewrite")', "rewrite inventory");
  contains(collector, "runtimeInfrastructureManifest.routeRules.map", "manifest route rules");
  contains(collector, "ruleMatchesRoute", "rule to live route cross-check");
  contains(collector, 'title: "Kural hedefi bulunamadı"', "broken rule blocker");
});

test("notification and email producer inventory is generated without sending anything", () => {
  const generator = source("scripts/generate-system-map-runtime-manifest.mjs");
  const collector = source("src/features/system-map/runtime-infrastructure.ts");
  const panel = source("src/features/system-map/RuntimeInfrastructurePanel.tsx");

  contains(generator, "notificationPattern", "notification producer scan");
  contains(generator, "emailCallPattern", "email producer scan");
  contains(generator, "templatePattern", "email template scan");
  contains(generator, "entityTypePattern", "notification relation scan");
  contains(collector, "runtimeInfrastructureManifest.eventProducers", "event producer manifest use");
  contains(panel, "Bildirim ve e-posta üreticileri", "event producer UI");
  notContains(generator, "sendMail({", "generator must not send mail");
  notContains(generator, "notification.create({", "generator must not create notification");
});

test("Prisma relation graph keeps intentional raw-SQL tables visible but warns only on unexpected drift", () => {
  const generator = source("scripts/generate-system-map-runtime-manifest.mjs");
  const collector = source("src/features/system-map/runtime-infrastructure.ts");
  const panel = source("src/features/system-map/RuntimeInfrastructurePanel.tsx");
  const contracts = JSON.parse(source("src/features/system-map/runtime-contracts.json"));

  contains(generator, 'const PRISMA_SCHEMA = path.join(ROOT, "prisma", "schema.prisma")', "Prisma schema source");
  contains(generator, 'const MIGRATIONS_ROOT = path.join(ROOT, "prisma", "migrations")', "migration source");
  contains(generator, "parseSchema(schemaText)", "schema relation parser");
  contains(generator, "collectMigrationInventory", "migration table parser");
  contains(generator, "migrationOnlyTables", "migration-only table inventory");
  contains(collector, "runtimeContracts.acknowledgedMigrationOnlyTables", "central acknowledged migration contract");
  for (const table of ["ContractTemplate", "UserContract", "UserContractEvent", "ContentPage", "NotificationPreference", "EmailDeliveryDedupe"]) {
    assert.ok(contracts.acknowledgedMigrationOnlyTables.includes(table), `${table} must remain acknowledged by the central runtime contract`);
  }
  contains(collector, "unexpectedMigrationOnlyTables", "unexpected schema drift split");
  contains(collector, 'title: "Beklenmedik migration-only tablo yüzeyi"', "unexpected migration warning");
  contains(panel, "Bilinçli raw-SQL / migration-only sınırı · ACKNOWLEDGED", "acknowledged migration visibility");
  contains(panel, "İnceleme gerekli · beklenmedik migration-only tablolar", "unexpected migration visibility");
});

test("manifest generation is mandatory before lint development and production builds", () => {
  const pkg = JSON.parse(source("package.json"));
  const gitignore = source(".gitignore");

  assert.equal(pkg.scripts["system-map:generate"], "node scripts/generate-system-map-runtime-manifest.mjs");
  for (const script of ["dev", "lint", "build", "build:ci"]) {
    assert.ok(pkg.scripts[script].startsWith("npm run system-map:generate &&"), `${script} must generate the manifest first`);
  }
  contains(gitignore, "/src/features/system-map/runtime-manifest.generated.ts", "generated manifest ignore rule");
});

test("runtime infrastructure UI stays server-rendered while specialist pages share the canonical loader", () => {
  const loader = source("src/features/system-map/workspace-data.ts");
  const workspace = source("src/features/system-map/SystemMapWorkspacePage.tsx");
  const panel = source("src/features/system-map/RuntimeInfrastructurePanel.tsx");
  const envPage = source("src/app/harita/env/page.tsx");
  const schemaPage = source("src/app/harita/veri/page.tsx");
  const layout = source("src/app/harita/layout.tsx");

  contains(loader, "getRuntimeInfrastructureReport(snapshot)", "runtime report generation");
  contains(loader, "Promise.all", "parallel read-only map collectors");
  contains(workspace, '<RuntimeInfrastructurePanel report={infrastructure} view="env" />', "ENV specialist render");
  contains(workspace, '<RuntimeInfrastructurePanel report={infrastructure} view="schema" />', "schema specialist render");
  contains(envPage, 'workspace="env"', "ENV specialist route");
  contains(schemaPage, 'workspace="schema"', "schema specialist route");
  contains(panel, "Runtime / altyapı kontrol masası", "runtime workbench heading");
  contains(panel, "Redirect / rewrite zinciri", "route rule UI");
  contains(panel, "Prisma modelleri ve migration yüzeyi", "data relation UI");
  contains(panel, "Statik dış domain referansları", "external reference UI");
  contains(layout, 'import "./runtime-infrastructure.css"', "runtime styles");
  notContains(panel, '"use client"', "runtime panel server rendering");
  notContains(panel, "fetch(", "runtime panel must not create browser data source");
});
