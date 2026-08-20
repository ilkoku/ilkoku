import "server-only";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { SystemMapRouteRecord, SystemMapSnapshot } from "./types";

export type InfrastructureStatus = "pass" | "warn" | "blocker" | "unknown";

export interface InfrastructureEnvKey {
  configured: boolean;
  documented: boolean;
  key: string;
  public: boolean;
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
  latestMigration: string | null;
  migrationCount: number;
  migrationOnlyTables: string[];
  modelCount: number;
  models: InfrastructureModelNode[];
  relationCount: number;
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
    undocumentedEnv: number;
    warnings: number;
  };
  warnings: string[];
}

type SourceFile = {
  file: string;
  text: string;
};

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const ENV_EXAMPLE = path.join(ROOT, ".env.example");
const NEXT_CONFIG = path.join(ROOT, "next.config.ts");
const PRISMA_SCHEMA = path.join(ROOT, "prisma", "schema.prisma");
const MIGRATIONS_ROOT = path.join(ROOT, "prisma", "migrations");
const sourceExtensionPattern = /\.(?:ts|tsx|js|jsx)$/u;
const envDotPattern = /\bprocess\.env\.([A-Z][A-Z0-9_]*)/gu;
const envBracketPattern = /\bprocess\.env\[["']([A-Z][A-Z0-9_]*)["']\]/gu;
const envDocumentPattern = /^([A-Z][A-Z0-9_]*)\s*=/gmu;
const notificationPattern = /\bnotification\.(?:create|createMany)\s*\(/u;
const emailCallPattern = /\b(?:sendEmail|send[A-Za-z0-9_$]*Email)\s*\(/u;
const emailImportPattern = /from\s+["']@\/lib\/email\//u;
const templatePattern = /\btemplate\s*:\s*["']([^"']+)["']/gu;
const entityTypePattern = /\brelatedEntityType\s*:\s*["']([^"']+)["']/gu;
const staticUrlPattern = /https?:\/\/([^/\s"'`)}]+)[^\s"'`]*/gu;
const secretNamePattern = /(?:SECRET|PASSWORD|TOKEN|PRIVATE|CREDENTIAL|DATABASE_URL)/u;
const internalDomainPattern = /^(?:localhost(?::\d+)?|127\.0\.0\.1(?::\d+)?|(?:www\.)?ilkoku\.com)$/iu;
const documentationDomainPattern = /^(?:schema\.org|www\.w3\.org)$/iu;

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      files.push(...(await walk(absolute)));
      continue;
    }
    if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function repoPath(absolute: string) {
  return path.relative(ROOT, absolute).replaceAll("\\", "/");
}

function unique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "tr"));
}

async function readSourceFiles(): Promise<SourceFile[]> {
  const files = (await walk(SRC)).filter((file) => sourceExtensionPattern.test(file));
  const result: SourceFile[] = [];
  for (const file of files) {
    try {
      result.push({ file: repoPath(file), text: await readFile(file, "utf8") });
    } catch {
      // Okunamayan tek dosya kalan taramayı durdurmaz.
    }
  }
  return result;
}

function matchesToList(text: string, pattern: RegExp) {
  const values: string[] = [];
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match[1]) values.push(match[1]);
  }
  return unique(values);
}

function collectEnvUsage(files: SourceFile[], documented: Set<string>): InfrastructureEnvKey[] {
  const usage = new Map<string, Set<string>>();
  for (const source of files) {
    for (const pattern of [envDotPattern, envBracketPattern]) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(source.text))) {
        const key = match[1];
        if (!key) continue;
        const consumers = usage.get(key) ?? new Set<string>();
        consumers.add(source.file);
        usage.set(key, consumers);
      }
    }
  }

  return [...usage.entries()]
    .map(([key, consumers]) => {
      const isDocumented = documented.has(key);
      const configured = typeof process.env[key] === "string" && Boolean(process.env[key]?.trim());
      return {
        configured,
        documented: isDocumented,
        key,
        public: key.startsWith("NEXT_PUBLIC_"),
        secretLike: secretNamePattern.test(key),
        status: !isDocumented ? "warn" as const : configured ? "pass" as const : "unknown" as const,
        usedBy: unique([...consumers]),
      };
    })
    .sort((left, right) => left.key.localeCompare(right.key));
}

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

function parseRuleObjects(block: string, kind: InfrastructureRouteRule["kind"], routes: SystemMapRouteRecord[]) {
  const objectPattern = /\{\s*source:\s*["']([^"']+)["']\s*,\s*destination:\s*["']([^"']+)["']\s*,?\s*(?:permanent:\s*(true|false)\s*,?)?\s*\}/gu;
  const result: InfrastructureRouteRule[] = [];
  objectPattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = objectPattern.exec(block))) {
    const source = match[1];
    const destination = match[2];
    if (!source || !destination) continue;
    const target = destination.startsWith("/")
      ? routes.find((route) => ruleMatchesRoute(destination, route)) ?? null
      : null;
    result.push({
      destination,
      kind,
      permanent: kind === "redirect" ? match[3] === "true" : null,
      source,
      status: destination.startsWith("/") && !target ? "blocker" : "pass",
      targetRoute: target?.route ?? null,
    });
  }
  return result;
}

function parseRouteRules(text: string, routes: SystemMapRouteRecord[]) {
  const redirectsStart = text.indexOf("async redirects()");
  const rewritesStart = text.indexOf("async rewrites()");
  const redirectsBlock = redirectsStart >= 0
    ? text.slice(redirectsStart, rewritesStart > redirectsStart ? rewritesStart : undefined)
    : "";
  const rewritesBlock = rewritesStart >= 0 ? text.slice(rewritesStart) : "";
  return [
    ...parseRuleObjects(redirectsBlock, "redirect", routes),
    ...parseRuleObjects(rewritesBlock, "rewrite", routes),
  ];
}

function collectEventProducers(files: SourceFile[]): InfrastructureEventProducer[] {
  return files
    .filter((source) => {
      const notification = notificationPattern.test(source.text);
      const email = emailCallPattern.test(source.text) || emailImportPattern.test(source.text);
      return notification || email;
    })
    .map((source) => ({
      email: emailCallPattern.test(source.text) || emailImportPattern.test(source.text),
      notification: notificationPattern.test(source.text),
      relatedEntityTypes: matchesToList(source.text, entityTypePattern),
      sourceFile: source.file,
      templates: matchesToList(source.text, templatePattern),
    }))
    .sort((left, right) => left.sourceFile.localeCompare(right.sourceFile));
}

function parseSchema(text: string) {
  const modelPattern = /model\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)\n\}/gu;
  const blocks: Array<{ body: string; model: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = modelPattern.exec(text))) {
    if (match[1] && match[2]) blocks.push({ body: match[2], model: match[1] });
  }
  const modelNames = new Set(blocks.map((block) => block.model));
  const relations = new Map<string, Set<string>>();
  for (const model of modelNames) relations.set(model, new Set());

  for (const block of blocks) {
    for (const rawLine of block.body.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//") || line.startsWith("@@")) continue;
      const tokens = line.split(/\s+/u);
      if (tokens.length < 2) continue;
      const type = tokens[1]?.replace(/[?\[\]]/gu, "");
      if (!type || !modelNames.has(type) || type === block.model) continue;
      relations.get(block.model)?.add(type);
      relations.get(type)?.add(block.model);
    }
  }

  const models: InfrastructureModelNode[] = [...modelNames]
    .map((model) => {
      const linked = unique([...(relations.get(model) ?? [])]);
      return { degree: linked.length, model, relations: linked };
    })
    .sort((left, right) => right.degree - left.degree || left.model.localeCompare(right.model));
  const relationCount = Math.round(models.reduce((total, model) => total + model.degree, 0) / 2);
  return { modelNames, models, relationCount };
}

async function migrationInventory(schemaModels: Set<string>) {
  const migrations = await readdir(MIGRATIONS_ROOT, { withFileTypes: true });
  const names = migrations.filter((item) => item.isDirectory()).map((item) => item.name).sort();
  const tables = new Set<string>();
  const createTablePattern = /CREATE\s+TABLE\s+`?([A-Za-z0-9_]+)`?/giu;
  for (const migration of names) {
    try {
      const sql = await readFile(path.join(MIGRATIONS_ROOT, migration, "migration.sql"), "utf8");
      createTablePattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = createTablePattern.exec(sql))) {
        if (match[1]) tables.add(match[1]);
      }
    } catch {
      // Eksik migration dosyası envanterin kalanını durdurmaz.
    }
  }
  return {
    latestMigration: names.at(-1) ?? null,
    migrationCount: names.length,
    migrationOnlyTables: unique([...tables].filter((table) => !schemaModels.has(table))),
  };
}

function collectExternalDomains(files: SourceFile[]): InfrastructureExternalDomain[] {
  const domains = new Map<string, Set<string>>();
  for (const source of files) {
    staticUrlPattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = staticUrlPattern.exec(source.text))) {
      const domain = match[1]?.toLowerCase();
      if (!domain || internalDomainPattern.test(domain) || documentationDomainPattern.test(domain)) continue;
      const consumers = domains.get(domain) ?? new Set<string>();
      consumers.add(source.file);
      domains.set(domain, consumers);
    }
  }
  return [...domains.entries()]
    .map(([domain, consumers]) => ({ domain, sourceFiles: unique([...consumers]) }))
    .sort((left, right) => left.domain.localeCompare(right.domain));
}

function buildGaps(input: {
  env: InfrastructureEnvKey[];
  routeRules: InfrastructureRouteRule[];
  schema: InfrastructureSchemaReport;
}) {
  const gaps: InfrastructureGap[] = [];
  for (const env of input.env.filter((item) => !item.documented)) {
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
  if (input.schema.migrationOnlyTables.length > 0) {
    gaps.push({
      detail: `${input.schema.migrationOnlyTables.length} tablo migration ile yönetiliyor ancak Prisma schema model listesinde yok. Bu bilinçli raw SQL mimarisi olabilir; veri haritasında ayrı izlenir.`,
      id: "migration-only-tables",
      scope: "Veri Şeması",
      status: "warn",
      title: "Migration-only tablo yüzeyi",
    });
  }
  return gaps;
}

export const getRuntimeInfrastructureReport = cache(async (snapshot: SystemMapSnapshot): Promise<RuntimeInfrastructureReport> => {
  const warnings: string[] = [];
  let files: SourceFile[] = [];
  let envExample = "";
  let nextConfig = "";
  let schemaText = "";

  try {
    files = await readSourceFiles();
  } catch (error) {
    warnings.push(`Runtime kaynak taraması kullanılamadı: ${error instanceof Error ? error.message : "bilinmeyen hata"}`);
  }
  try { envExample = await readFile(ENV_EXAMPLE, "utf8"); } catch { warnings.push(".env.example okunamadı; ENV dokümantasyon karşılaştırması sınırlı."); }
  try { nextConfig = await readFile(NEXT_CONFIG, "utf8"); } catch { warnings.push("next.config.ts okunamadı; redirect/rewrite envanteri sınırlı."); }
  try { schemaText = await readFile(PRISMA_SCHEMA, "utf8"); } catch { warnings.push("prisma/schema.prisma okunamadı; veri ilişki haritası sınırlı."); }

  const documentedEnv = new Set(matchesToList(envExample, envDocumentPattern));
  const env = collectEnvUsage(files, documentedEnv);
  const routeRules = parseRouteRules(nextConfig, snapshot.routes);
  const eventProducers = collectEventProducers(files);
  const parsedSchema = parseSchema(schemaText);
  let migrationData = { latestMigration: null as string | null, migrationCount: 0, migrationOnlyTables: [] as string[] };
  try {
    migrationData = await migrationInventory(parsedSchema.modelNames);
  } catch (error) {
    warnings.push(`Migration envanteri kullanılamadı: ${error instanceof Error ? error.message : "bilinmeyen hata"}`);
  }
  const schema: InfrastructureSchemaReport = {
    latestMigration: migrationData.latestMigration,
    migrationCount: migrationData.migrationCount,
    migrationOnlyTables: migrationData.migrationOnlyTables,
    modelCount: parsedSchema.models.length,
    models: parsedSchema.models,
    relationCount: parsedSchema.relationCount,
  };
  const externalDomains = collectExternalDomains(files);
  const gaps = buildGaps({ env, routeRules, schema });

  return {
    env,
    eventProducers,
    externalDomains,
    gaps,
    generatedAt: new Date().toISOString(),
    routeRules,
    schema,
    summary: {
      blockers: gaps.filter((gap) => gap.status === "blocker").length,
      documentedEnv: env.filter((item) => item.documented).length,
      emailProducers: eventProducers.filter((item) => item.email).length,
      envKeys: env.length,
      externalDomains: externalDomains.length,
      migrationOnlyTables: schema.migrationOnlyTables.length,
      notificationProducers: eventProducers.filter((item) => item.notification).length,
      routeRules: routeRules.length,
      routeRulesBroken: routeRules.filter((item) => item.status === "blocker").length,
      runtimeConfiguredEnv: env.filter((item) => item.configured).length,
      schemaModels: schema.modelCount,
      schemaRelations: schema.relationCount,
      undocumentedEnv: env.filter((item) => !item.documented).length,
      warnings: gaps.filter((gap) => gap.status === "warn").length,
    },
    warnings,
  };
});
