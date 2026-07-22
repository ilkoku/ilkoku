import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

interface MariaDbConfig {
  database: string;
  host: string;
  password: string;
  port: number;
  user: string;
}

function parseDatabaseUrl(value?: string): MariaDbConfig | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "mysql:" && url.protocol !== "mariadb:") return null;

    return {
      database: url.pathname.replace(/^\//, ""),
      host: url.hostname,
      password: decodeURIComponent(url.password),
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username),
    };
  } catch {
    return null;
  }
}

function getEnvMariaDbConfig(): MariaDbConfig | null {
  const { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER } = process.env;
  if (!DB_HOST || !DB_NAME || !DB_USER || DB_PASSWORD === undefined) return null;

  return {
    database: DB_NAME,
    host: DB_HOST,
    password: DB_PASSWORD,
    port: Number(DB_PORT ?? 3306),
    user: DB_USER,
  };
}

function getMariaDbConfig(): MariaDbConfig {
  const envConfig = getEnvMariaDbConfig();
  const urlConfig = parseDatabaseUrl(process.env.DATABASE_URL);

  if (envConfig) return envConfig;
  if (urlConfig) return urlConfig;

  throw new Error("MariaDB runtime configuration is missing. Set DB_HOST/DB_USER/DB_PASSWORD/DB_NAME or DATABASE_URL.");
}

const adapter = new PrismaMariaDb({
  ...getMariaDbConfig(),
  connectionLimit: 5,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
