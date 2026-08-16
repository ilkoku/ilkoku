import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const ROOT = process.cwd();
const BASELINE_SCHEMA = path.join(ROOT, "prisma/recovery/baseline.schema.prisma");
const MANIFEST_PATH = path.join(ROOT, "prisma/recovery/baseline-manifest.json");
const MIGRATIONS_DIR = path.join(ROOT, "prisma/migrations");
const CONFIRMATION = "YES";

function fail(message) {
  throw new Error(`[fresh-db-recovery] ${message}`);
}

function prisma(args) {
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  execFileSync(executable, ["prisma", ...args], {
    cwd: ROOT,
    env: process.env,
    stdio: "inherit",
  });
}

function mysqlConfig(databaseUrl, multipleStatements = false) {
  const url = new URL(databaseUrl);
  if (url.protocol !== "mysql:") {
    fail(`DATABASE_URL must use mysql://, received ${url.protocol}`);
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database) fail("DATABASE_URL must include a database name");

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    multipleStatements,
  };
}

function gitBlobSha(content) {
  const body = Buffer.from(content, "utf8");
  return createHash("sha1")
    .update(Buffer.from(`blob ${body.length}\0`, "utf8"))
    .update(body)
    .digest("hex");
}

async function readManifest() {
  const raw = await readFile(MANIFEST_PATH, "utf8");
  const manifest = JSON.parse(raw);
  if (manifest.version !== 1) fail(`unsupported manifest version ${manifest.version}`);
  return manifest;
}

async function validateBaselineFiles(manifest) {
  const schema = await readFile(BASELINE_SCHEMA, "utf8");
  const actualBlobSha = gitBlobSha(schema);
  if (actualBlobSha !== manifest.baselineSchemaGitBlobSha) {
    fail(
      `frozen baseline schema changed: expected ${manifest.baselineSchemaGitBlobSha}, got ${actualBlobSha}`,
    );
  }

  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const migrationNames = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const baseline = [...manifest.baselineMigrations].sort();
  const historical = migrationNames
    .filter((name) => name <= manifest.baselineMigrationCutoff)
    .sort();

  if (baseline.length !== new Set(baseline).size) {
    fail("baselineMigrations contains duplicate names");
  }

  if (JSON.stringify(historical) !== JSON.stringify(baseline)) {
    fail(
      `historical migration set drifted before cutoff ${manifest.baselineMigrationCutoff}; update recovery artifacts deliberately`,
    );
  }

  for (const name of manifest.replayAfterSchemaPush) {
    if (!baseline.includes(name)) fail(`raw replay migration is outside baseline: ${name}`);
    await readFile(path.join(MIGRATIONS_DIR, name, "migration.sql"), "utf8");
  }
}

async function assertDatabaseIsEmpty(databaseUrl) {
  const connection = await mysql.createConnection(mysqlConfig(databaseUrl));
  try {
    const [rows] = await connection.query(
      "SELECT COUNT(*) AS tableCount FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'",
    );
    const count = Number(rows[0]?.tableCount ?? -1);
    if (count !== 0) {
      fail(`target database is not empty (${count} base tables found); refusing destructive baseline recovery`);
    }
  } finally {
    await connection.end();
  }
}

async function replayRawBaselineMigrations(databaseUrl, manifest) {
  if (manifest.replayAfterSchemaPush.length === 0) return;

  const connection = await mysql.createConnection(mysqlConfig(databaseUrl, true));
  try {
    for (const migrationName of manifest.replayAfterSchemaPush) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, migrationName, "migration.sql"), "utf8");
      process.stdout.write(`[fresh-db-recovery] replay raw baseline ${migrationName}\n`);
      await connection.query(sql);
    }
  } finally {
    await connection.end();
  }
}

async function verifyRecoveredDatabase(databaseUrl, manifest) {
  const connection = await mysql.createConnection(mysqlConfig(databaseUrl));
  try {
    const [tables] = await connection.query(
      "SELECT table_name AS tableName FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'",
    );
    const tableNames = new Set(tables.map((row) => String(row.tableName)));
    const missingTables = manifest.requiredTables.filter((name) => !tableNames.has(name));
    if (missingTables.length > 0) {
      fail(`recovery is missing required tables: ${missingTables.join(", ")}`);
    }

    const [migrationRows] = await connection.query(
      "SELECT migration_name AS migrationName, finished_at AS finishedAt, rolled_back_at AS rolledBackAt FROM _prisma_migrations",
    );
    const successful = new Set(
      migrationRows
        .filter((row) => row.finishedAt && !row.rolledBackAt)
        .map((row) => String(row.migrationName)),
    );
    const missingBaselineRows = manifest.baselineMigrations.filter((name) => !successful.has(name));
    if (missingBaselineRows.length > 0) {
      fail(`Prisma migration ledger is missing baseline rows: ${missingBaselineRows.join(", ")}`);
    }
  } finally {
    await connection.end();
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) fail("DATABASE_URL is required");
  if (process.env.RECOVERY_CONFIRM_EMPTY_DATABASE !== CONFIRMATION) {
    fail(`set RECOVERY_CONFIRM_EMPTY_DATABASE=${CONFIRMATION} to confirm this is an intentionally empty recovery target`);
  }

  const manifest = await readManifest();
  await validateBaselineFiles(manifest);
  await assertDatabaseIsEmpty(databaseUrl);

  process.stdout.write("[fresh-db-recovery] create frozen Prisma baseline\n");
  prisma(["db", "push", "--schema", "prisma/recovery/baseline.schema.prisma", "--skip-generate"]);

  await replayRawBaselineMigrations(databaseUrl, manifest);

  for (const migrationName of manifest.baselineMigrations) {
    process.stdout.write(`[fresh-db-recovery] resolve baseline ${migrationName}\n`);
    prisma(["migrate", "resolve", "--applied", migrationName]);
  }

  process.stdout.write("[fresh-db-recovery] apply migrations newer than frozen baseline\n");
  prisma(["migrate", "deploy"]);
  prisma(["migrate", "status"]);

  await verifyRecoveredDatabase(databaseUrl, manifest);
  process.stdout.write("[fresh-db-recovery] PASS: empty database reconstructed from version-controlled baseline\n");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
