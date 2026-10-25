import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import mysql from "mysql2/promise";

// CI creates a disposable MariaDB schema before running test:security:db.
// This test issues only SELECT statements and never modifies any records.
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL_REQUIRED_FOR_WRITER_SUMMARY_SQL");

const parsed = new URL(dbUrl);
const sqlService = readFileSync(
  new URL("../src/features/writer-daily-summary/service.ts", import.meta.url),
  "utf8",
);

const queryMarker = "const rows = await prisma.$queryRaw<HighlightRow[]>";
const fragments = sqlService.split(queryMarker).slice(1);

test("writer top-work and top-chapter queries execute against MariaDB", async () => {
  assert.equal(fragments.length, 2, "expected two highlight queries");

  const client = await mysql.createConnection({
    database: parsed.pathname.replace(/^\//u, ""),
    host: parsed.hostname,
    password: decodeURIComponent(parsed.password),
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
  });
  const values = {
    authorId: "00000000-0000-0000-0000-000000000000",
    start: new Date("2026-10-20T00:00:00.000Z"),
    end: new Date("2026-10-21T00:00:00.000Z"),
  };

  try {
    for (const fragment of fragments) {
      const tick = String.fromCharCode(96);
      const opening = fragment.indexOf(tick);
      const closing = fragment.indexOf(tick + ";", opening + 1);
      assert.ok(opening >= 0 && closing > opening, "Prisma raw SQL template is present");

      const sql = fragment.slice(opening + 1, closing);
      const params = [];
      const prepared = sql.replace(/\$\{(authorId|start|end)\}/gu, (_, name) => {
        params.push(values[name]);
        return "?";
      });
      assert.doesNotMatch(prepared, /\$\{/u, "unexpected template interpolation in SQL");
      assert.equal(params.length, 3, "bind authorId, start and end");

      const [rows, columns] = await client.execute(prepared, params);
      assert.ok(Array.isArray(rows), "SQL executes without ER_PARSE_ERROR 1064");
      assert.ok(columns.some((column) => column.name === "readCount"));
    }
  } finally {
    await client.end();
  }
});
