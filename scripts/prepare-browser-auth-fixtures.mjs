import { createHash, randomBytes, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";

import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
const outputPath = process.env.BROWSER_AUTH_FIXTURE_PATH;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for authenticated browser fixtures.");
}
if (!outputPath) {
  throw new Error("BROWSER_AUTH_FIXTURE_PATH is required for authenticated browser fixtures.");
}

const parsed = new URL(databaseUrl);
const databaseName = parsed.pathname.replace(/^\//u, "");
const client = await mysql.createConnection({
  database: databaseName,
  host: parsed.hostname,
  password: decodeURIComponent(parsed.password),
  port: Number(parsed.port || 3306),
  user: decodeURIComponent(parsed.username),
});

const roles = ["reader", "writer", "editor", "publisher", "admin"];
const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
const now = new Date();
const sessions = {};

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

try {
  await client.beginTransaction();

  await client.execute(
    "DELETE FROM `Session` WHERE userId IN (SELECT id FROM `User` WHERE email LIKE 'ci-browser-%@example.invalid')",
  );
  await client.execute(
    "DELETE FROM `User` WHERE email LIKE 'ci-browser-%@example.invalid'",
  );

  for (const [index, role] of roles.entries()) {
    const userId = randomUUID();
    const sessionId = randomUUID();
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const email = `ci-browser-${role}@example.invalid`;
    const publicId = `CI26BROWSER${String(index + 1).padStart(2, "0")}`;

    await client.execute(
      `INSERT INTO \`User\`
        (id, publicId, email, passwordHash, fullName, role, status,
         emailVerified, termsAcceptedAt, lastLoginAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
      [
        userId,
        publicId,
        email,
        "ci-browser-session-only",
        `CI ${role}`,
        role,
        now,
        now,
        now,
        now,
        now,
      ],
    );

    await client.execute(
      `INSERT INTO \`Session\`
        (id, tokenHash, userId, expiresAt, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, tokenHash, userId, expiresAt, now],
    );

    sessions[role] = token;
  }

  await client.commit();
} catch (error) {
  await client.rollback();
  throw error;
} finally {
  await client.end();
}

await writeFile(
  outputPath,
  JSON.stringify({
    cookieName: "ilkoku_session",
    sessions,
  }),
  { mode: 0o600 },
);

console.log(`Prepared ${roles.length} ephemeral authenticated browser roles.`);
