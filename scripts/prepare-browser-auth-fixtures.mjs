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
const userIds = {};

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
    userIds[role] = userId;
  }

  const cmsManagerId = randomUUID();
  const cmsManagerToken = randomBytes(32).toString("base64url");
  const cmsManagerTokenHash = hashToken(cmsManagerToken);

  await client.execute(
    `INSERT INTO \`User\`
      (id, publicId, email, passwordHash, fullName, role, status,
       emailVerified, termsAcceptedAt, lastLoginAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 'reader', 'active', ?, ?, ?, ?, ?)`,
    [
      cmsManagerId,
      "CI26CMSMGR01",
      "ci-browser-cms-manager@example.invalid",
      "ci-browser-session-only",
      "CI CMS Manager",
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
    [randomUUID(), cmsManagerTokenHash, cmsManagerId, expiresAt, now],
  );

  await client.execute(
    `INSERT INTO \`ContentManagerAccess\`
      (id, userId, active, canPublish, grantedAt, createdAt, updatedAt)
     VALUES (?, ?, true, false, ?, ?, ?)`,
    [randomUUID(), cmsManagerId, now, now, now],
  );

  sessions.cmsManager = cmsManagerToken;
  userIds.cmsManager = cmsManagerId;

  await client.execute(
    `INSERT INTO \`Profile\`
      (id, userId, birthYear, createdAt, updatedAt)
     VALUES (?, ?, 1990, ?, ?)`,
    [randomUUID(), userIds.reader, now, now],
  );
  await client.execute(
    `INSERT INTO \`AuditLog\`
      (id, actorId, action, entityType, entityId, metadata, createdAt)
     VALUES (?, ?, 'profile_updated', 'AgeVerification', ?, ?, ?)`,
    [
      randomUUID(),
      userIds.reader,
      userIds.reader,
      JSON.stringify({
        adultEligibleAt: "2008-01-01T00:00:00.000Z",
        birthYear: 1990,
        source: "ci_browser_fixture",
      }),
      now,
    ],
  );

  const contractTemplateId = randomUUID();
  await client.execute(
    `INSERT INTO \`ContractTemplate\`
      (id, code, title, description, targetRole, body, version, active,
       lifecycleStatus, sourceTemplateId, approvedById, approvedAt, activatedAt,
       createdById, updatedById, createdAt, updatedAt)
     VALUES (?, 'CI_BROWSER_READER_CONTRACT', 'CI Browser Reader Contract',
       'Ephemeral active contract template for browser mutation QA.',
       'reader',
       'Taraf: {{ad_soyad}}\\nE-posta: {{eposta}}\\nRol: {{rol}}\\nTarih: {{tarih}}\\n\\nCI browser mutation acceptance fixture.',
       1, true, 'active', NULL, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contractTemplateId,
      userIds.admin,
      now,
      now,
      userIds.admin,
      userIds.admin,
      now,
      now,
    ],
  );
  await client.execute(
    `INSERT INTO \`ContractTemplateReviewEvidence\`
      (id, templateId, templateVersion, evidenceType, reviewerLabel, note, recordedById, createdAt)
     VALUES (?, ?, 1, 'admin_approval', 'CI Browser Admin',
       'Ephemeral CI-only admin approval evidence for browser mutation QA.', ?, ?)`,
    [randomUUID(), contractTemplateId, userIds.admin, now],
  );

  for (const role of ["editor", "publisher"]) {
    await client.execute(
      `INSERT INTO \`RoleRequest\`
        (id, userId, requestedRole, status, reviewedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, 'approved', ?, ?, ?)`,
      [randomUUID(), userIds[role], role, now, now, now],
    );
  }

  const publisherId = randomUUID();
  await client.execute(
    `INSERT INTO \`Publisher\`
      (id, publicId, companyName, slug, verified, active, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, true, true, ?, ?)`,
    [
      publisherId,
      "CI26PUBLISHER01",
      "CI Browser Publisher",
      "ci-browser-publisher",
      now,
      now,
    ],
  );
  await client.execute(
    `INSERT INTO \`PublisherMembership\`
      (id, publisherId, userId, role, active, createdAt, updatedAt)
     VALUES (?, ?, ?, 'owner', true, ?, ?)`,
    [randomUUID(), publisherId, userIds.publisher, now, now],
  );

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

console.log(`Prepared ${roles.length + 1} ephemeral authenticated browser identities.`);
