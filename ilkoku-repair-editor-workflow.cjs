require("dotenv").config();
const mysql = require("mysql2/promise");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(".env içinde DATABASE_URL bulunamadı.");
  }

  const db = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const [[current]] = await db.query("SELECT DATABASE() AS db");
    const database = current.db;

    if (!database) {
      throw new Error("Bağlı veritabanı adı belirlenemedi.");
    }

    console.log("Veritabanı bağlantısı doğrulandı.");

    await db.query(`
      ALTER TABLE \`Work\`
      MODIFY \`editorReviewStatus\` ENUM(
        'not_requested',
        'requested',
        'in_progress',
        'awaiting_second_editor',
        'second_in_progress',
        'completed'
      ) NOT NULL DEFAULT 'not_requested'
    `);

    const [[assignmentTable]] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'EditorReviewAssignment'
      `,
      [database],
    );

    if (Number(assignmentTable.count) === 0) {
      console.log("EditorReviewAssignment tablosu oluşturuluyor...");

      await db.query(`
        CREATE TABLE \`EditorReviewAssignment\` (
          \`id\` CHAR(36) NOT NULL,
          \`workId\` CHAR(36) NOT NULL,
          \`editorId\` CHAR(36) NULL,
          \`stage\` ENUM('first', 'second') NOT NULL,
          \`source\` ENUM(
            'pool',
            'specific_editor',
            'external_invite'
          ) NOT NULL,
          \`status\` ENUM(
            'waiting',
            'assigned',
            'in_progress',
            'completed',
            'cancelled',
            'expired'
          ) NOT NULL DEFAULT 'waiting',
          \`invitedEmail\` VARCHAR(320) NULL,
          \`assignedAt\` DATETIME(3) NULL,
          \`startedAt\` DATETIME(3) NULL,
          \`completedAt\` DATETIME(3) NULL,
          \`createdAt\` DATETIME(3)
            NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL,
          UNIQUE INDEX
            \`EditorReviewAssignment_workId_stage_key\`
            (\`workId\`, \`stage\`),
          INDEX
            \`EditorReviewAssignment_editorId_status_idx\`
            (\`editorId\`, \`status\`),
          INDEX
            \`EditorReviewAssignment_stage_status_createdAt_idx\`
            (\`stage\`, \`status\`, \`createdAt\`),
          INDEX
            \`EditorReviewAssignment_invitedEmail_status_idx\`
            (\`invitedEmail\`, \`status\`),
          PRIMARY KEY (\`id\`),
          CONSTRAINT \`EditorReviewAssignment_workId_fkey\`
            FOREIGN KEY (\`workId\`)
            REFERENCES \`Work\`(\`id\`)
            ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT \`EditorReviewAssignment_editorId_fkey\`
            FOREIGN KEY (\`editorId\`)
            REFERENCES \`User\`(\`id\`)
            ON DELETE SET NULL ON UPDATE CASCADE
        )
        DEFAULT CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
      `);
    } else {
      console.log("EditorReviewAssignment tablosu zaten mevcut.");
    }

    const [[assignmentColumn]] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'EditorFeedback'
        AND COLUMN_NAME = 'assignmentId'
      `,
      [database],
    );

    if (Number(assignmentColumn.count) === 0) {
      console.log("EditorFeedback.assignmentId ekleniyor...");

      await db.query(`
        ALTER TABLE \`EditorFeedback\`
        ADD COLUMN \`assignmentId\` CHAR(36) NULL
      `);
    } else {
      console.log("EditorFeedback.assignmentId zaten mevcut.");
    }

    const [[assignmentIndex]] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'EditorFeedback'
        AND INDEX_NAME = 'EditorFeedback_assignmentId_idx'
      `,
      [database],
    );

    if (Number(assignmentIndex.count) === 0) {
      console.log("assignmentId index'i ekleniyor...");

      await db.query(`
        ALTER TABLE \`EditorFeedback\`
        ADD INDEX \`EditorFeedback_assignmentId_idx\`
        (\`assignmentId\`)
      `);
    }

    const [[assignmentForeignKey]] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = ?
        AND TABLE_NAME = 'EditorFeedback'
        AND CONSTRAINT_NAME =
          'EditorFeedback_assignmentId_fkey'
      `,
      [database],
    );

    if (Number(assignmentForeignKey.count) === 0) {
      console.log("assignmentId foreign key'i ekleniyor...");

      await db.query(`
        ALTER TABLE \`EditorFeedback\`
        ADD CONSTRAINT \`EditorFeedback_assignmentId_fkey\`
        FOREIGN KEY (\`assignmentId\`)
        REFERENCES \`EditorReviewAssignment\`(\`id\`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
      `);
    }

    const [[finalCheck]] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'EditorFeedback'
        AND COLUMN_NAME = 'assignmentId'
      `,
      [database],
    );

    if (Number(finalCheck.count) !== 1) {
      throw new Error("assignmentId doğrulanamadı.");
    }

    console.log("PASS: Veritabanı düzeltmesi tamamlandı.");
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("FAIL:", error.message);
  process.exit(1);
});
