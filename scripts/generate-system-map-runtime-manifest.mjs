import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const ENV_EXAMPLE = path.join(ROOT, ".env.example");
const NEXT_CONFIG = path.join(ROOT, "next.config.ts");
const PRISMA_SCHEMA = path.join(ROOT, "prisma", "schema.prisma");
const MIGRATIONS_ROOT = path.join(ROOT, "prisma", "migrations");
const OUTPUT = path.join(ROOT, "src", "features", "system-map", "runtime-manifest.generated.ts");

const sourceExtensionPattern = /\.(?:ts|tsx|js|jsx)$/u;
const sourceRouteFilePattern = /\/(page|route)\.(?:ts|tsx|js|jsx)$/u;
const internalLiteralPattern = /(["'`])(\/(?!\/)[^"'`\r\n]{0,240})\1/gu;
const ignoredReferencePattern = /\.(?:css|gif|ico|jpe?g|json|map|pdf|png|svg|webp|woff2?)(?:\?|#|$)/iu;
const importPattern = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/gu;
const actionFunctionPattern = /export\s+async\s+function\s+([A-Za-z_$][\w$]*)/gu;
const actionConstPattern = /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*async\b/gu;
const prismaModelPattern = /\bprisma\.([A-Za-z_$][\w$]*)\s*\./gu;
const httpMethodPattern = /export\s+(?:async\s+function|const)\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/gu;
const envDotPattern = /\bprocess\.env\.([A-Z][A-Z0-9_]*)/gu;
const envBracketPattern = /\bprocess\.env\[["']([A-Z][A-Z0-9_]*)["']\]/gu;
const envDocumentPattern = /^([A-Z][A-Z0-9_]*)\s*=/gmu;
const notificationPattern = /\bnotification\.(?:create|createMany)\s*\(/u;
const emailCallPattern = /\b(?:sendEmail|send[A-Za-z0-9_$]*Email)\s*\(/u;
const emailImportPattern = /from\s+["']@\/lib\/email\//u;
const templatePattern = /\btemplate\s*:\s*["']([^"']+)["']/gu;
const entityTypePattern = /\brelatedEntityType\s*:\s*["']([^"']+)["']/gu;
const staticUrlPattern = /https?:\/\/([^/\s"'`)}]+)[^\s"'`]*/gu;
const internalDomainPattern = /^(?:localhost(?::\d+)?|127\.0\.0\.1(?::\d+)?|(?:www\.)?ilkoku\.com)$/iu;
const documentationDomainPattern = /^(?:schema\.org|www\.w3\.org)$/iu;
const guardMarkers = [
  ["getCurrentUser", "getCurrentUser"],
  ["requireAdmin", "requireAdmin"],
  ["requireApprovedRole", "requireApprovedRole"],
  ["requirePublisher", "requirePublisher"],
  ["getPublisherWorkspaceContext", "publisher workspace context"],
  ["getCmsAccess", "CMS access"],
  ["isSameOriginRequest", "same-origin check"],
  ["timingSafeEqual", "timing-safe secret check"],
  ["auth(", "auth()"],
  ["session", "session check"],
];

function unique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "tr"));
}

function repoPath(absolute) {
  return path.relative(ROOT, absolute).replaceAll("\\", "/");
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "generated") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolute)));
      continue;
    }
    if (entry.isFile() && sourceExtensionPattern.test(entry.name) && absolute !== OUTPUT) files.push(absolute);
  }
  return files;
}

async function readSourceFiles() {
  const files = await walk(SRC);
  return Promise.all(files.map(async (file) => ({ file: repoPath(file), text: await readFile(file, "utf8") })));
}

function matchesToList(text, pattern) {
  const values = [];
  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(text))) {
    if (match[1]) values.push(match[1]);
  }
  return unique(values);
}

function cleanRouteSegments(segments) {
  return segments.filter((segment) => segment && !/^\(.*\)$/u.test(segment) && !segment.startsWith("@"));
}

function routeFromSourceFile(file) {
  const normalized = file.replaceAll("\\", "/");
  if (!normalized.startsWith("src/app/") || !sourceRouteFilePattern.test(`/${normalized}`)) return null;
  const segments = normalized.slice("src/app/".length).split("/");
  segments.pop();
  const cleaned = cleanRouteSegments(segments);
  return cleaned.length > 0 ? `/${cleaned.join("/")}` : "/";
}

function collectRoutes(files) {
  return files
    .filter((source) => source.file.startsWith("src/app/") && sourceRouteFilePattern.test(`/${source.file}`))
    .map((source) => ({
      kind: /\/route\.(?:ts|tsx|js|jsx)$/u.test(`/${source.file}`) ? "handler" : "page",
      route: routeFromSourceFile(source.file) ?? "/",
      sourceFile: source.file,
    }))
    .sort((left, right) => left.route.localeCompare(right.route, "tr") || left.kind.localeCompare(right.kind));
}

function normalizeInternalReference(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/_next") || ignoredReferencePattern.test(trimmed)) return null;
  return trimmed
    .replace(/\$\{[^}]+\}/gu, "[param]")
    .replace(/\s+/gu, "")
    .slice(0, 240);
}

function collectReferences(files) {
  const references = [];
  for (const source of files) {
    internalLiteralPattern.lastIndex = 0;
    let match;
    while ((match = internalLiteralPattern.exec(source.text))) {
      const target = normalizeInternalReference(match[2] ?? "");
      if (!target) continue;
      references.push({
        origin: source.file,
        originRoute: routeFromSourceFile(source.file),
        target,
      });
    }
  }
  const seen = new Set();
  return references.filter((item) => {
    const key = `${item.origin}|${item.originRoute ?? ""}|${item.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resolveImport(sourceFile, specifier, fileSet) {
  if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return null;
  const base = specifier.startsWith("@/")
    ? `src/${specifier.slice(2)}`
    : path.posix.normalize(path.posix.join(path.posix.dirname(sourceFile), specifier));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.jsx`,
  ];
  return candidates.find((candidate) => fileSet.has(candidate)) ?? null;
}

function extractActionNames(text) {
  if (!/^\s*["']use server["'];?/u.test(text)) return [];
  const names = [];
  for (const pattern of [actionFunctionPattern, actionConstPattern]) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text))) {
      if (match[1]) names.push(match[1]);
    }
  }
  return unique(names);
}

function extractModels(text) {
  const models = [];
  prismaModelPattern.lastIndex = 0;
  let match;
  while ((match = prismaModelPattern.exec(text))) {
    if (match[1] && !match[1].startsWith("$")) models.push(match[1]);
  }
  return unique(models);
}

function extractMethods(text) {
  const methods = [];
  httpMethodPattern.lastIndex = 0;
  let match;
  while ((match = httpMethodPattern.exec(text))) {
    if (match[1]) methods.push(match[1]);
  }
  return unique(methods);
}

function extractGuardEvidence(text) {
  return guardMarkers.filter(([needle]) => text.includes(needle)).map(([, label]) => label);
}

function collectModules(files) {
  const fileSet = new Set(files.map((source) => source.file));
  const preliminary = files.map((source) => {
    const imports = [];
    importPattern.lastIndex = 0;
    let match;
    while ((match = importPattern.exec(source.text))) {
      const specifier = match[1];
      if (!specifier) continue;
      const resolved = resolveImport(source.file, specifier, fileSet);
      if (resolved) imports.push(resolved);
    }
    return {
      actionNames: extractActionNames(source.text),
      consumers: [],
      dataModels: extractModels(source.text),
      file: source.file,
      guardEvidence: extractGuardEvidence(source.text),
      imports: unique(imports),
      methods: extractMethods(source.text),
      rawSql: source.text.includes("$queryRaw") || source.text.includes("$executeRaw"),
    };
  });

  const textByFile = new Map(files.map((source) => [source.file, source.text]));
  for (const sourceModule of preliminary) {
    if (sourceModule.actionNames.length === 0) continue;
    const consumers = new Set();
    for (const actionName of sourceModule.actionNames) {
      const escaped = actionName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
      const matcher = new RegExp(`\\b${escaped}\\b`, "u");
      for (const [file, text] of textByFile) {
        if (file !== sourceModule.file && matcher.test(text)) consumers.add(file);
      }
    }
    sourceModule.consumers = unique([...consumers]).slice(0, 50);
  }
  return preliminary;
}

function collectEnvUsage(files, envExample) {
  const usage = new Map();
  for (const source of files) {
    for (const pattern of [envDotPattern, envBracketPattern]) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(source.text))) {
        const key = match[1];
        if (!key) continue;
        const consumers = usage.get(key) ?? new Set();
        consumers.add(source.file);
        usage.set(key, consumers);
      }
    }
  }
  const documented = new Set(matchesToList(envExample, envDocumentPattern));
  return [...usage.entries()]
    .map(([key, consumers]) => ({ documented: documented.has(key), key, usedBy: unique([...consumers]) }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function parseRuleObjects(block, kind) {
  const objectPattern = /\{\s*source:\s*["']([^"']+)["']\s*,\s*destination:\s*["']([^"']+)["']\s*,?\s*(?:permanent:\s*(true|false)\s*,?)?\s*\}/gu;
  const result = [];
  objectPattern.lastIndex = 0;
  let match;
  while ((match = objectPattern.exec(block))) {
    const source = match[1];
    const destination = match[2];
    if (!source || !destination) continue;
    result.push({ destination, kind, permanent: kind === "redirect" ? match[3] === "true" : null, source });
  }
  return result;
}

function collectRouteRules(nextConfig) {
  const redirectsStart = nextConfig.indexOf("async redirects()");
  const rewritesStart = nextConfig.indexOf("async rewrites()");
  const redirectsBlock = redirectsStart >= 0
    ? nextConfig.slice(redirectsStart, rewritesStart > redirectsStart ? rewritesStart : undefined)
    : "";
  const rewritesBlock = rewritesStart >= 0 ? nextConfig.slice(rewritesStart) : "";
  return [...parseRuleObjects(redirectsBlock, "redirect"), ...parseRuleObjects(rewritesBlock, "rewrite")];
}

function collectEventProducers(files) {
  return files
    .filter((source) => notificationPattern.test(source.text) || emailCallPattern.test(source.text) || emailImportPattern.test(source.text))
    .map((source) => ({
      email: emailCallPattern.test(source.text) || emailImportPattern.test(source.text),
      notification: notificationPattern.test(source.text),
      relatedEntityTypes: matchesToList(source.text, entityTypePattern),
      sourceFile: source.file,
      templates: matchesToList(source.text, templatePattern),
    }))
    .sort((left, right) => left.sourceFile.localeCompare(right.sourceFile));
}

function parseSchema(schemaText) {
  const modelPattern = /model\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)\n\}/gu;
  const blocks = [];
  let match;
  while ((match = modelPattern.exec(schemaText))) {
    if (match[1] && match[2]) blocks.push({ body: match[2], model: match[1] });
  }
  const modelNames = new Set(blocks.map((block) => block.model));
  const relations = new Map();
  for (const model of modelNames) relations.set(model, new Set());
  for (const block of blocks) {
    for (const rawLine of block.body.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//") || line.startsWith("@@")) continue;
      const tokens = line.split(/\s+/u);
      const type = tokens[1]?.replace(/[?\[\]]/gu, "");
      if (!type || !modelNames.has(type) || type === block.model) continue;
      relations.get(block.model)?.add(type);
      relations.get(type)?.add(block.model);
    }
  }
  const models = [...modelNames]
    .map((model) => {
      const linked = unique([...(relations.get(model) ?? [])]);
      return { degree: linked.length, model, relations: linked };
    })
    .sort((left, right) => right.degree - left.degree || left.model.localeCompare(right.model));
  return {
    modelNames,
    models,
    relationCount: Math.round(models.reduce((total, model) => total + model.degree, 0) / 2),
  };
}

async function collectMigrationInventory(schemaModels) {
  const migrations = await readdir(MIGRATIONS_ROOT, { withFileTypes: true });
  const names = migrations.filter((item) => item.isDirectory()).map((item) => item.name).sort();
  const tables = new Set();
  const createTablePattern = /CREATE\s+TABLE\s+`?([A-Za-z0-9_]+)`?/giu;
  for (const migration of names) {
    const sql = await readFile(path.join(MIGRATIONS_ROOT, migration, "migration.sql"), "utf8");
    createTablePattern.lastIndex = 0;
    let match;
    while ((match = createTablePattern.exec(sql))) {
      if (match[1]) tables.add(match[1]);
    }
  }
  return {
    latestMigration: names.at(-1) ?? null,
    migrationCount: names.length,
    migrationOnlyTables: unique([...tables].filter((table) => !schemaModels.has(table))),
  };
}

function collectExternalDomains(files) {
  const domains = new Map();
  for (const source of files) {
    staticUrlPattern.lastIndex = 0;
    let match;
    while ((match = staticUrlPattern.exec(source.text))) {
      const domain = match[1]?.toLowerCase();
      if (!domain || internalDomainPattern.test(domain) || documentationDomainPattern.test(domain)) continue;
      const consumers = domains.get(domain) ?? new Set();
      consumers.add(source.file);
      domains.set(domain, consumers);
    }
  }
  return [...domains.entries()]
    .map(([domain, consumers]) => ({ domain, sourceFiles: unique([...consumers]) }))
    .sort((left, right) => left.domain.localeCompare(right.domain));
}

async function main() {
  const [files, envExample, nextConfig, schemaText] = await Promise.all([
    readSourceFiles(),
    readFile(ENV_EXAMPLE, "utf8"),
    readFile(NEXT_CONFIG, "utf8"),
    readFile(PRISMA_SCHEMA, "utf8"),
  ]);
  const parsedSchema = parseSchema(schemaText);
  const migrations = await collectMigrationInventory(parsedSchema.modelNames);
  const sourceManifest = {
    modules: collectModules(files),
    references: collectReferences(files),
    routes: collectRoutes(files),
    sourceFileCount: files.length,
    version: 1,
  };
  const runtimeManifest = {
    eventProducers: collectEventProducers(files),
    externalDomains: collectExternalDomains(files),
    envUsage: collectEnvUsage(files, envExample),
    routeRules: collectRouteRules(nextConfig),
    schema: {
      latestMigration: migrations.latestMigration,
      migrationCount: migrations.migrationCount,
      migrationOnlyTables: migrations.migrationOnlyTables,
      modelCount: parsedSchema.models.length,
      models: parsedSchema.models,
      relationCount: parsedSchema.relationCount,
    },
    sourceFileCount: files.length,
    version: 1,
  };

  const content = [
    "// AUTO-GENERATED by scripts/generate-system-map-runtime-manifest.mjs",
    "// Do not edit. Regenerated before lint/dev/build; contains structural metadata only, never ENV values.",
    'import type { RuntimeInfrastructureManifestData, SystemMapSourceManifestData } from "./build-manifest-types";',
    "",
    `export const systemMapSourceManifest: SystemMapSourceManifestData = ${JSON.stringify(sourceManifest, null, 2)};`,
    "",
    `export const runtimeInfrastructureManifest: RuntimeInfrastructureManifestData = ${JSON.stringify(runtimeManifest, null, 2)};`,
    "",
  ].join("\n");
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, content, "utf8");
  console.log(
    `System map build manifest generated: ${sourceManifest.routes.length} routes, ${sourceManifest.references.length} references, ${sourceManifest.modules.length} modules, ${runtimeManifest.envUsage.length} ENV keys, ${runtimeManifest.routeRules.length} route rules.`,
  );
}

main().catch((error) => {
  console.error("System map build manifest generation failed:", error);
  process.exitCode = 1;
});
