import "server-only";

import { cache } from "react";
import runtimeContracts from "./runtime-contracts.json";
import { runtimeInfrastructureManifest } from "./runtime-manifest.generated";
import type { SystemMapRouteRecord, SystemMapSnapshot } from "./types";

export type InfrastructureStatus = "pass" | "warn" | "blocker" | "unknown";

export interface InfrastructureEnvKey {
  configured: boolean;
  documented: boolean;
  key: string;
  public: boolean;
  runtimeManaged: boolean;
  secretLike: boolean;
  status: InfrastructureStatus;
  usedBy: string[];
}

export interface InfrastructureRouteRule {
  destination: string;
  kind: "redirect" | "rewrite";
  permanent: boolean | null;
  source: string;
  status: InfrastructureStatus;
  targetRoute: string | null;
}

export interface InfrastructureEventProducer {
  email: boolean;
  notification: boolean;
  relatedEntityTypes: string[];
  sourceFile: string;
  templates: string[];
}

export interface InfrastructureModelNode {
  degree: number;
  model: string;
  relations: string[];
}

export interface InfrastructureSchemaReport {
  acknowledgedMigrationOnlyTables: string[];
  latestMigration: string | null;
  migrationCount: number;
  migrationOnlyTables: string[];
  modelCount: number;
  models: InfrastructureModelNode[];
  relationCount: number;
  unexpectedMigrationOnlyTables: string[];
}

export interface InfrastructureExternalDomain {
  domain: string;
  sourceFiles: string[];
}

export interface InfrastructureGap {
  detail: string;
  id: string;
  scope: string;
  status: Exclude<InfrastructureStatus, "pass">;
  title: string;
}

export interface RuntimeInfrastructureReport {
  env: InfrastructureEnvKey[];
  eventProducers: InfrastructureEventProducer[];
  externalDomains: InfrastructureExternalDomain[];
  gaps: InfrastructureGap[];
  generatedAt: string;
  routeRules: InfrastructureRouteRule[];
  schema: InfrastructureSchemaReport;
  summary: {
    acknowledgedMigrationOnlyTables: number;
    blockers: number;
    documentedEnv: number;
    emailProducers: number;
    envKeys: number;
    externalDomains: number;
    migrationOnlyTables: number;
    notificationProducers: number;
    routeRules: number;
    routeRulesBroken: number;
    runtimeConfiguredEnv: number;
    schemaModels: number;
    schemaRelations: number;
    sourceFiles: number;
    undocumentedEnv: number;
    unexpectedMigrationOnlyTables: number;
    warnings: number;
  };
  warnings: string[];
}

const secretNamePattern = /(?:SECRET|PASSWORD|TOKEN|PRIVATE|CREDENTIAL|DATABASE_URL)/u;
const acknowledgedMigrationOnlyTableNames = new Set(runtimeContracts.acknowledgedMigrationOnlyTables);
const runtimeManagedEnvKeys = new Set(runtimeContracts.runtimeManagedEnvKeys);

function normalizeRulePath(value: string) {
  return value
    .split(/[?#]/u)[0]
    .replace(/:path\+/gu, "[...path]")
    .replace(/:path\*/gu, "[[...path]]")
    .replace(/:([A-Za-z0-9_]+)/gu, "[$1]")
    .replace(/\/$/u, "") || "/";
}

function routeShape(value: string) {
  return normalizeRulePath(value)
    .replace(/\[\[\.\.\.[^\]]+\]\]/gu, "[*]")
    .replace(/\[\.\.\.[^\]]+\]/gu, "[*]")
    .replace(/\[[^\]]+\]/gu, "[]");
}

function ruleMatchesRoute(destination: string, route: SystemMapRouteRecord) {
  const expected = routeShape(destination).split("/").filter(Boolean);
  const actual = routeShape(route.route).split("/").filter(Boolean);
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

function collectEnvUsage(): InfrastructureEnvKey[] {
  return runtimeInfrastructureManifest.envUsage
    .map((item) => {
      const configured = typeof process.env[item.key] === "string" && Boolean(process.env[item.key]?.trim());
      const runtimeManaged = runtimeManagedEnvKeys.has(item.key);
      return {
        configured,
        documented: item.documented,
        key: item.key,
        public: item.key.startsWith("NEXT_PUBLIC_"),
        runtimeManaged,
        secretLike: secretNamePattern.test(item.key),
        status: runtimeManaged
          ? configured ? "pass" as const : "unknown" as const
          : !item.documented
            ? "warn" as const
            : configured ? "pass" as const : "unknown" as const,
        usedBy: [...item.usedBy],
      };
    })
    .sort((left, right) => left.key.localeCompare(right.key));
}

function collectRouteRules(routes: SystemMapRouteRecord[]): InfrastructureRouteRule[] {
  return runtimeInfrastructureManifest.routeRules.map((rule) => {
    const target = rule.destination.startsWith("/")
      ? routes.find((route) => ruleMatchesRoute(rule.destination, route)) ?? null
      : null;
    return {
      destination: rule.destination,
      kind: rule.kind,
      permanent: rule.permanent,
      source: rule.source,
      status: rule.destination.startsWith("/") && !target ? "blocker" : "pass",
      targetRoute: target?.route ?? null,
    };
  });
}

function eventProducers(): InfrastructureEventProducer[] {
  return runtimeInfrastructureManifest.eventProducers.map((item) => ({
    email: item.email,
    notification: item.notification,
    relatedEntityTypes: [...item.relatedEntityTypes],
    sourceFile: item.sourceFile,
    templates: [...item.templates],
  }));
}

function schemaReport(): InfrastructureSchemaReport {
  const migrationOnlyTables = [...runtimeInfrastructureManifest.schema.migrationOnlyTables];
  const acknowledgedMigrationOnlyTables = migrationOnlyTables.filter((table) => acknowledgedMigrationOnlyTableNames.has(table));
  const unexpectedMigrationOnlyTables = migrationOnlyTables.filter((table) => !acknowledgedMigrationOnlyTableNames.has(table));

  return {
    acknowledgedMigrationOnlyTables,
    latestMigration: runtimeInfrastructureManifest.schema.latestMigration,
    migrationCount: runtimeInfrastructureManifest.schema.migrationCount,
    migrationOnlyTables,
    modelCount: runtimeInfrastructureManifest.schema.modelCount,
    models: runtimeInfrastructureManifest.schema.models.map((item) => ({
      degree: item.degree,
      model: item.model,
      relations: [...item.relations],
    })),
    relationCount: runtimeInfrastructureManifest.schema.relationCount,
    unexpectedMigrationOnlyTables,
  };
}

function externalDomains(): InfrastructureExternalDomain[] {
  return runtimeInfrastructureManifest.externalDomains.map((item) => ({
    domain: item.domain,
    sourceFiles: [...item.sourceFiles],
  }));
}

function buildGaps(input: {
  env: InfrastructureEnvKey[];
  routeRules: InfrastructureRouteRule[];
  schema: InfrastructureSchemaReport;
}) {
  const gaps: InfrastructureGap[] = [];
  for (const env of input.env.filter((item) => !item.documented && !item.runtimeManaged)) {
    gaps.push({
      detail: `${env.key} kaynak kodda kullanılıyor ancak .env.example içinde belgelenmemiş. Değer gösterilmez; yalnız anahtar sözleşmesi eksik.`,
      id: `env:${env.key}`,
      scope: "ENV Sözleşmesi",
      status: "warn",
      title: "Belgelenmemiş ENV anahtarı",
    });
  }
  for (const rule of input.routeRules.filter((item) => item.status === "blocker")) {
    gaps.push({
      detail: `${rule.kind} hedefi ${rule.destination} canlı route envanterinde eşleşmedi.`,
      id: `route-rule:${rule.kind}:${rule.source}`,
      scope: "Redirect / Rewrite",
      status: "blocker",
      title: "Kural hedefi bulunamadı",
    });
  }
  if (input.schema.unexpectedMigrationOnlyTables.length > 0) {
    gaps.push({
      detail: `${input.schema.unexpectedMigrationOnlyTables.length} beklenmedik tablo migration ile yönetiliyor ancak Prisma schema model listesinde ve bilinçli raw SQL sözleşmesinde yok: ${input.schema.unexpectedMigrationOnlyTables.join(", ")}.`,
      id: "unexpected-migration-only-tables",
      scope: "Veri Şeması",
      status: "warn",
      title: "Beklenmedik migration-only tablo yüzeyi",
    });
  }
  return gaps;
}

export const getRuntimeInfrastructureReport = cache(async (snapshot: SystemMapSnapshot): Promise<RuntimeInfrastructureReport> => {
  const warnings: string[] = [];
  if (runtimeInfrastructureManifest.version !== 1) {
    warnings.push(`Runtime mimari manifest sürümü desteklenmiyor: ${runtimeInfrastructureManifest.version}`);
  }
  if (runtimeInfrastructureManifest.sourceFileCount === 0) {
    warnings.push("Runtime mimari manifestinde kaynak dosya bulunamadı; altyapı envanteri sınırlı.");
  }

  const env = collectEnvUsage();
  const routeRules = collectRouteRules(snapshot.routes);
  const producerList = eventProducers();
  const schema = schemaReport();
  const domainList = externalDomains();
  const gaps = buildGaps({ env, routeRules, schema });

  return {
    env,
    eventProducers: producerList,
    externalDomains: domainList,
    gaps,
    generatedAt: new Date().toISOString(),
    routeRules,
    schema,
    summary: {
      acknowledgedMigrationOnlyTables: schema.acknowledgedMigrationOnlyTables.length,
      blockers: gaps.filter((gap) => gap.status === "blocker").length,
      documentedEnv: env.filter((item) => item.documented || item.runtimeManaged).length,
      emailProducers: producerList.filter((item) => item.email).length,
      envKeys: env.length,
      externalDomains: domainList.length,
      migrationOnlyTables: schema.migrationOnlyTables.length,
      notificationProducers: producerList.filter((item) => item.notification).length,
      routeRules: routeRules.length,
      routeRulesBroken: routeRules.filter((item) => item.status === "blocker").length,
      runtimeConfiguredEnv: env.filter((item) => item.configured).length,
      schemaModels: schema.modelCount,
      schemaRelations: schema.relationCount,
      sourceFiles: runtimeInfrastructureManifest.sourceFileCount,
      undocumentedEnv: env.filter((item) => !item.documented && !item.runtimeManaged).length,
      unexpectedMigrationOnlyTables: schema.unexpectedMigrationOnlyTables.length,
      warnings: gaps.filter((gap) => gap.status === "warn").length,
    },
    warnings,
  };
});
