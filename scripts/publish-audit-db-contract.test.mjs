import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for publication audit DB contract.");
}

const parsed = new URL(databaseUrl);
const connectionOptions = {
  database: parsed.pathname.replace(/^\//u, ""),
  host: parsed.hostname,
  password: decodeURIComponent(parsed.password),
  port: Number(parsed.port || 3306),
  user: decodeURIComponent(parsed.username),
};

async function connection() {
  return mysql.createConnection(connectionOptions);
}

function publicId(prefix, id) {
  return `${prefix}${id.replaceAll("-", "").slice(0, 18)}`.slice(0, 24);
}

test("writer publication commits version, public state and passport-visible work_published audit together", async () => {
  const authorId = randomUUID();
  const workId = randomUUID();
  const chapterId = randomUUID();
  const versionId = randomUUID();
  const auditId = randomUUID();
  const suffix = workId.replaceAll("-", "").slice(0, 12);
  const content = "Yazarın yayınladığı metin birebir korunur.";
  const layout = {
    version: 1,
    contentLength: content.length,
    pageEnds: [content.length],
    page: {
      height: 1000,
      width: 700,
      firstBody: { height: 700, left: 70, top: 140, width: 560 },
      continuationBody: { height: 780, left: 70, top: 90, width: 560 },
    },
    typography: {
      font: "typewriter",
      fontSize: 17,
      letterSpacing: 0,
      lineHeight: 32.3,
    },
  };
  const description = `@ilkoku:publication-layout:v1:${JSON.stringify(layout)}`;
  const contentHash = createHash("sha256").update(content).digest("hex");
  const client = await connection();

  try {
    await client.execute(
      `INSERT INTO User
       (id, publicId, email, passwordHash, fullName, role, status, createdAt, updatedAt)
       VALUES (?, ?, ?, 'test-hash', 'Publish Audit Test Writer', 'writer', 'active', NOW(3), NOW(3))`,
      [authorId, publicId("USR", authorId), `publish-audit-${suffix}@example.test`],
    );

    await client.execute(
      `INSERT INTO Work
       (id, publicId, authorId, title, slug, language, contentRating,
        contentRatingConfirmedAt, status, visibility, createdAt, updatedAt)
       VALUES (?, ?, ?, 'Publish Audit Contract', ?, 'tr', 'all_ages',
               NOW(3), 'draft', 'private', NOW(3), NOW(3))`,
      [workId, publicId("WRK", workId), authorId, `publish-audit-${suffix}`],
    );

    await client.execute(
      `INSERT INTO Chapter
       (id, workId, authorId, title, content, position, status, createdAt, updatedAt)
       VALUES (?, ?, ?, 'Bölüm 1', '', 1, 'draft', NOW(3), NOW(3))`,
      [chapterId, workId, authorId],
    );

    await client.beginTransaction();

    const [locked] = await client.execute(
      `SELECT id, contentRating, contentRatingConfirmedAt
       FROM Work
       WHERE id = ? AND authorId = ?
       LIMIT 1
       FOR UPDATE`,
      [workId, authorId],
    );

    assert.equal(locked.length, 1);
    assert.equal(locked[0].contentRating, "all_ages");
    assert.ok(locked[0].contentRatingConfirmedAt);

    await client.execute(
      `INSERT INTO WorkVersion
       (id, workId, chapterId, versionNumber, title, description, content, contentHash, createdAt)
       VALUES (?, ?, ?, 1, 'Bölüm 1', ?, ?, ?, NOW(3))`,
      [versionId, workId, chapterId, description, content, contentHash],
    );

    await client.execute(
      `UPDATE Chapter
       SET archivedAt = NULL,
           content = ?,
           publishedAt = NOW(3),
           status = 'published',
           title = 'Bölüm 1',
           updatedAt = NOW(3)
       WHERE id = ?`,
      [content, chapterId],
    );

    await client.execute(
      `UPDATE Work
       SET archivedAt = NULL,
           publishedAt = NOW(3),
           status = 'published',
           visibility = 'public',
           updatedAt = NOW(3)
       WHERE id = ?`,
      [workId],
    );

    await client.execute(
      `INSERT INTO AuditLog
       (id, actorId, action, entityType, entityId, metadata, createdAt)
       VALUES (?, ?, 'work_published', 'Work', ?, ?, NOW(3))`,
      [
        auditId,
        authorId,
        workId,
        JSON.stringify({
          chapterId,
          pageCount: 1,
          publicationVersion: 1,
          title: "Publish Audit Contract",
        }),
      ],
    );

    await client.commit();

    const [workRows] = await client.execute(
      `SELECT status, visibility, publishedAt FROM Work WHERE id = ?`,
      [workId],
    );
    assert.equal(workRows[0]?.status, "published");
    assert.equal(workRows[0]?.visibility, "public");
    assert.ok(workRows[0]?.publishedAt);

    const [chapterRows] = await client.execute(
      `SELECT status, content, publishedAt FROM Chapter WHERE id = ?`,
      [chapterId],
    );
    assert.equal(chapterRows[0]?.status, "published");
    assert.equal(chapterRows[0]?.content, content);
    assert.ok(chapterRows[0]?.publishedAt);

    const [versionRows] = await client.execute(
      `SELECT versionNumber, contentHash, description
       FROM WorkVersion
       WHERE workId = ? AND chapterId = ?`,
      [workId, chapterId],
    );
    assert.equal(versionRows.length, 1);
    assert.equal(versionRows[0]?.versionNumber, 1);
    assert.equal(versionRows[0]?.contentHash, contentHash);
    assert.equal(versionRows[0]?.description, description);

    const [passportAuditRows] = await client.execute(
      `SELECT action, entityType, entityId
       FROM AuditLog
       WHERE entityId = ? AND entityType = 'Work'
       ORDER BY createdAt ASC`,
      [workId],
    );
    assert.equal(passportAuditRows.length, 1);
    assert.equal(passportAuditRows[0]?.action, "work_published");
    assert.equal(passportAuditRows[0]?.entityType, "Work");
    assert.equal(passportAuditRows[0]?.entityId, workId);
  } catch (error) {
    await client.rollback().catch(() => {});
    throw error;
  } finally {
    await client.execute("DELETE FROM AuditLog WHERE id = ?", [auditId]).catch(() => {});
    await client.execute("DELETE FROM Work WHERE id = ?", [workId]).catch(() => {});
    await client.execute("DELETE FROM User WHERE id = ?", [authorId]).catch(() => {});
    await client.end();
  }
});
