import assert from "node:assert/strict";
import test from "node:test";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for DB security contracts.");
}

const parsed = new URL(databaseUrl);
const databaseName = parsed.pathname.replace(/^\//u, "");
const connectionOptions = {
  database: databaseName,
  host: parsed.hostname,
  password: decodeURIComponent(parsed.password),
  port: Number(parsed.port || 3306),
  user: decodeURIComponent(parsed.username),
};

async function connection() {
  const client = await mysql.createConnection(connectionOptions);
  await client.query("SET SESSION innodb_lock_wait_timeout = 5");
  return client;
}

async function uniqueIndexes(tableName) {
  const client = await connection();
  try {
    const [rows] = await client.execute(
      `SELECT INDEX_NAME AS indexName,
              NON_UNIQUE AS nonUnique,
              GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columnsList
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       GROUP BY INDEX_NAME, NON_UNIQUE`,
      [databaseName, tableName],
    );
    return rows;
  } finally {
    await client.end();
  }
}

function hasUniqueColumn(rows, columnName) {
  return rows.some(
    (row) => Number(row.nonUnique) === 0 && row.columnsList === columnName,
  );
}

async function dropTable(tableName) {
  const client = await connection();
  try {
    await client.query(`DROP TABLE IF EXISTS \`${tableName}\``);
  } finally {
    await client.end();
  }
}

test("fresh migrations preserve critical production uniqueness guarantees", async () => {
  const publisherEditorIndexes = await uniqueIndexes("PublisherEditorRequest");
  const emailDedupeIndexes = await uniqueIndexes("EmailDeliveryDedupe");

  assert.equal(
    hasUniqueColumn(publisherEditorIndexes, "activeKey"),
    true,
    "PublisherEditorRequest.activeKey must remain unique",
  );
  assert.equal(
    hasUniqueColumn(emailDedupeIndexes, "dedupeKey"),
    true,
    "EmailDeliveryDedupe.dedupeKey must remain unique",
  );
});

test("concurrent conditional claim produces exactly one winner", async () => {
  const table = "SecurityProbeClaim";
  await dropTable(table);

  const setup = await connection();
  try {
    await setup.query(
      `CREATE TABLE \`${table}\` (
        id VARCHAR(36) PRIMARY KEY,
        state VARCHAR(32) NOT NULL,
        owner VARCHAR(64) NULL
      ) ENGINE=InnoDB`,
    );
    await setup.execute(
      `INSERT INTO \`${table}\` (id, state, owner)
       VALUES ('request-1', 'waiting', NULL)`,
    );
  } finally {
    await setup.end();
  }

  async function claim(owner) {
    const client = await connection();
    try {
      await client.beginTransaction();
      const [result] = await client.execute(
        `UPDATE \`${table}\`
         SET owner = ?, state = 'in_progress'
         WHERE id = 'request-1'
           AND state = 'waiting'
           AND owner IS NULL`,
        [owner],
      );
      await client.commit();
      return result.affectedRows;
    } catch (error) {
      await client.rollback();
      throw error;
    } finally {
      await client.end();
    }
  }

  try {
    const winners = await Promise.all([claim("editor-a"), claim("editor-b")]);
    assert.deepEqual(
      [...winners].sort((a, b) => a - b),
      [0, 1],
      "exactly one concurrent claim must update the row",
    );
  } finally {
    await dropTable(table);
  }
});

test("FOR UPDATE holds eligibility stable until the owning transaction commits", async () => {
  const table = "SecurityProbeEligibility";
  await dropTable(table);

  const setup = await connection();
  try {
    await setup.query(
      `CREATE TABLE \`${table}\` (
        id VARCHAR(36) PRIMARY KEY,
        state VARCHAR(32) NOT NULL
      ) ENGINE=InnoDB`,
    );
    await setup.execute(
      `INSERT INTO \`${table}\` (id, state)
       VALUES ('submission-1', 'accepted')`,
    );
  } finally {
    await setup.end();
  }

  const locker = await connection();
  const changer = await connection();

  try {
    await locker.beginTransaction();
    const [lockedRows] = await locker.execute(
      `SELECT state FROM \`${table}\`
       WHERE id = 'submission-1'
       FOR UPDATE`,
    );
    assert.equal(lockedRows[0]?.state, "accepted");

    await changer.beginTransaction();
    let changerSettled = false;
    const changePromise = changer
      .execute(
        `UPDATE \`${table}\`
         SET state = 'rejected'
         WHERE id = 'submission-1'`,
      )
      .then(([result]) => {
        changerSettled = true;
        return result.affectedRows;
      });

    await new Promise((resolve) => setTimeout(resolve, 250));
    assert.equal(
      changerSettled,
      false,
      "competing state mutation must wait while FOR UPDATE is held",
    );

    await locker.commit();
    assert.equal(await changePromise, 1);
    await changer.commit();
  } catch (error) {
    await locker.rollback().catch(() => {});
    await changer.rollback().catch(() => {});
    throw error;
  } finally {
    await locker.end();
    await changer.end();
    await dropTable(table);
  }
});

test("unique active key permits only one concurrent insert", async () => {
  const table = "SecurityProbeUniqueActiveKey";
  await dropTable(table);

  const setup = await connection();
  try {
    await setup.query(
      `CREATE TABLE \`${table}\` (
        id VARCHAR(36) PRIMARY KEY,
        activeKey VARCHAR(191) NULL,
        UNIQUE KEY uq_active_key (activeKey)
      ) ENGINE=InnoDB`,
    );
  } finally {
    await setup.end();
  }

  async function insert(id) {
    const client = await connection();
    try {
      await client.beginTransaction();
      await client.execute(
        `INSERT INTO \`${table}\` (id, activeKey)
         VALUES (?, 'publisher-1:work-1')`,
        [id],
      );
      await client.commit();
      return "inserted";
    } catch (error) {
      await client.rollback();
      if (error?.code === "ER_DUP_ENTRY") return "duplicate";
      throw error;
    } finally {
      await client.end();
    }
  }

  try {
    const results = await Promise.all([insert("request-a"), insert("request-b")]);
    assert.deepEqual(
      [...results].sort(),
      ["duplicate", "inserted"],
      "unique active key must reject one duplicate concurrent insert",
    );
  } finally {
    await dropTable(table);
  }
});
