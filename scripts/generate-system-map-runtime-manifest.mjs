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
    result.push({
      destination,
      kind,
      permanent: kind === "redirect" ? match[3] === "true" : null,
      source,
    });
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
  return [
    ...parseRuleObjects(redirectsBlock, "redirect"),
    ...parseRuleObjects(rewritesBlock, "rewrite"),
  ];
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
      if (tokens.length < 2) continue;
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
  const relationCount = Math.round(models.reduce((total, model) => total + model.degree, 0) / 2);
  return { modelNames, models, relationCount };
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
  const manifest = {
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
    "// Do not edit. The file is intentionally ignored by Git and regenerated before lint/dev/build.",
    `export const runtimeInfrastructureManifest = ${JSON.stringify(manifest, null, 2)} as const;`,
    "",
  ].join("\n");
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, content, "utf8");
  console.log(`System map runtime manifest generated: ${manifest.sourceFileCount} source files, ${manifest.envUsage.length} ENV keys, ${manifest.routeRules.length} route rules.`);
}

main().catch((error) => {
  console.error("System map runtime manifest generation failed:", error);
  process.exitCode = 1;
});
