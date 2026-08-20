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
  contains(collector, "process.env[key]", "runtime configured boolean observation");
  contains(collector, "configured:", "configured state projection");
  contains(collector, "secretLike", "secret classification");
  notContains(collector, 'from "@/lib/prisma"', "runtime collector must not connect to DB");
  notContains(collector, "prisma.$transaction", "runtime collector must not write DB");
  notContains(collector, "value: process.env", "ENV value must not enter report");
  notContains(collector, "envValue", "ENV value field must not exist");
  notContains(panel, "process.env", "panel must never read ENV values");
  contains(panel, "ENV değerleri, parolalar, tokenlar ve bağlantı dizeleri render edilmez", "ENV value privacy notice");
});

test("ENV contract is derived from source usage and .env.example documentation", () => {
  const collector = source("src/features/system-map/runtime-infrastructure.ts");

  contains(collector, 'path.join(ROOT, ".env.example")', "env example source");
  contains(collector, "envDotPattern", "dot ENV usage scan");
  contains(collector, "envBracketPattern", "bracket ENV usage scan");
  contains(collector, "envDocumentPattern", "documented ENV scan");
  contains(collector, 'title: "Belgelenmemiş ENV anahtarı"', "undocumented ENV warning");
});

test("redirect and rewrite rules are checked against canonical route inventory", () => {
  const collector = source("src/features/system-map/runtime-infrastructure.ts");

  contains(collector, 'path.join(ROOT, "next.config.ts")', "next config source");
  contains(collector, "parseRouteRules", "route rule parser");
  contains(collector, 'kind: "redirect"', "redirect inventory");
  contains(collector, 'kind: "rewrite"', "rewrite inventory");
  contains(collector, "ruleMatchesRoute", "rule to route cross-check");
  contains(collector, 'title: "Kural hedefi bulunamadı"', "broken rule blocker");
});

test("notification and email producer inventory is source-derived without sending anything", () => {
  const collector = source("src/features/system-map/runtime-infrastructure.ts");
  const panel = source("src/features/system-map/RuntimeInfrastructurePanel.tsx");

  contains(collector, "notificationPattern", "notification producer scan");
  contains(collector, "emailCallPattern", "email producer scan");
  contains(collector, "templatePattern", "email template scan");
  contains(collector, "entityTypePattern", "notification relation scan");
  contains(panel, "Bildirim ve e-posta üreticileri", "event producer UI");
  notContains(collector, "sendMail({", "collector must not send mail");
  notContains(collector, "notification.create({", "collector must not create notification");
});

test("Prisma relation graph and migration-only tables are parsed from version-controlled schema", () => {
  const collector = source("src/features/system-map/runtime-infrastructure.ts");

  contains(collector, 'path.join(ROOT, "prisma", "schema.prisma")', "Prisma schema source");
  contains(collector, 'path.join(ROOT, "prisma", "migrations")', "migration source");
  contains(collector, "parseSchema", "schema relation parser");
  contains(collector, "migrationInventory", "migration table parser");
  contains(collector, "migrationOnlyTables", "migration-only table inventory");
  contains(collector, 'title: "Migration-only tablo yüzeyi"', "migration-only visibility");
});

test("runtime infrastructure UI is server-rendered and integrated into harita", () => {
  const page = source("src/app/harita/page.tsx");
  const panel = source("src/features/system-map/RuntimeInfrastructurePanel.tsx");
  const layout = source("src/app/harita/layout.tsx");

  contains(page, "getRuntimeInfrastructureReport(snapshot)", "runtime report generation");
  contains(page, "RuntimeInfrastructurePanel", "runtime panel render");
  contains(page, "Promise.all", "parallel read-only map collectors");
  contains(panel, "Runtime / altyapı kontrol masası", "runtime workbench heading");
  contains(panel, "Redirect / rewrite zinciri", "route rule UI");
  contains(panel, "Prisma modelleri ve migration yüzeyi", "data relation UI");
  contains(panel, "Statik dış domain referansları", "external reference UI");
  contains(layout, 'import "./runtime-infrastructure.css"', "runtime styles");
  notContains(panel, '"use client"', "runtime panel server rendering");
  notContains(panel, "fetch(", "runtime panel must not create browser data source");
});
