import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
};

/**
 * Temporary read-only production compatibility probe for issue #1961.
 * It never returns row values, SQL statements, DB addresses or credentials.
 * Remove this endpoint after the issue is fixed and verified live.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthenticated" }, { status: 401, headers: HEADERS });
  }
  if (user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403, headers: HEADERS });
  }

  const q = "ILK";
  const probes = [
    { name: "driver-like-parameter", run: () => prisma.$queryRaw`SELECT 1 AS ok WHERE ${q} LIKE ${q}` },
    { name: "writer-baseline", run: () => prisma.user.count({ where: { role: "writer" } }) },
    { name: "writer-one-contains", run: () => prisma.user.count({ where: { role: "writer", fullName: { contains: q } } }) },
    { name: "writer-or-contains", run: () => prisma.user.count({ where: { role: "writer", OR: [
      { fullName: { contains: q } }, { displayName: { contains: q } },
      { email: { contains: q } }, { username: { contains: q } },
    ] } }) },
    { name: "order-baseline", run: () => prisma.order.count({ where: { status: "paid" } }) },
    { name: "order-exact", run: () => prisma.order.count({ where: { orderNo: q } }) },
    { name: "order-one-contains", run: () => prisma.order.count({ where: { orderNo: { contains: q } } }) },
    { name: "order-or-relation", run: () => prisma.order.count({ where: { OR: [
      { orderNo: { contains: q } }, { work: { is: { title: { contains: q } } } },
    ] } }) },
    { name: "payment-baseline", run: () => prisma.payment.count() },
    { name: "payment-one-contains", run: () => prisma.payment.count({ where: { provider: { contains: q } } }) },
    { name: "payment-or-relation", run: () => prisma.payment.count({ where: { OR: [
      { provider: { contains: q } },
      { order: { is: { orderNo: { contains: q } } } },
    ] } }) },
    { name: "entitlement-baseline", run: () => prisma.workEntitlement.count() },
    { name: "entitlement-one-contains", run: () => prisma.workEntitlement.count({ where: { OR: [
      { work: { is: { title: { contains: q } } } },
      { order: { is: { orderNo: { contains: q } } } },
    ] } }) },
  ];

  const results: { name: string; ok: boolean; errorClass?: string; errorCode?: string; causeCode?: string; driverCode?: string; driverKind?: string }[] = [];
  for (const probe of probes) {
    try {
      await probe.run();
      results.push({ name: probe.name, ok: true });
    } catch (error) {
      const err = error as { name?: string; code?: string; message?: string; meta?: { code?: string; driverAdapterError?: { cause?: { originalCode?: string | number; originalMessage?: string; kind?: string } } } };
      // Metadata from the Prisma adapter is never returned verbatim.
      // Only a numerical database error code and a fixed driver category
      // are safe to inspect on this temporary admin-only route.
      const driverCause = err.meta?.driverAdapterError?.cause;
      const originalCode = driverCause?.originalCode;
      const safeCode = (typeof originalCode === "number" || typeof originalCode === "string")
        ? String(originalCode).match(/^[0-9]{1,6}$/u)?.[0]
        : undefined;
      results.push({
        name: probe.name,
        ok: false,
        errorClass: (err.name ?? "unknown").slice(0, 100),
        errorCode: typeof err.code === "string" ? err.code.slice(0, 30) : undefined,
        causeCode: typeof err.meta?.code === "string" ? err.meta.code.slice(0, 30) : undefined,
        driverCode: safeCode,
        driverKind: ["mysql", "postgres", "sqlite", "mssql"].includes(driverCause?.kind ?? "") ? driverCause?.kind : undefined,
      });
    }
  }

  // Collation metadata only: no table rows, database name, credentials or SQL exposed.
  let collations: {
    connection?: string;
    database?: string;
    server?: string;
    columns?: { table: string; column: string; collation: string }[];
    readable: boolean;
  } = { readable: false };
  try {
    const sessions = await prisma.$queryRaw<
      { connectionCollation: string; databaseCollation: string; serverCollation: string }[]
    >`SELECT @@collation_connection AS connectionCollation,
          @@collation_database AS databaseCollation,
          @@collation_server AS serverCollation`;
    const columns = await prisma.$queryRaw<
      { TABLE_NAME: string; COLUMN_NAME: string; COLLATION_NAME: string | null }[]
    >`SELECT TABLE_NAME, COLUMN_NAME, COLLATION_NAME
      FROM information_schema.COLUMNS
      WHERE BINARY TABLE_SCHEMA = BINARY DATABASE()
        AND (
          (BINARY TABLE_NAME = BINARY 'User' AND BINARY COLUMN_NAME IN ('fullName', 'displayName', 'username', 'email'))
          OR (BINARY TABLE_NAME = BINARY 'Work' AND BINARY COLUMN_NAME = BINARY 'title')
          OR (BINARY TABLE_NAME = BINARY 'Order' AND BINARY COLUMN_NAME = BINARY 'orderNo')
          OR (BINARY TABLE_NAME = BINARY 'Payment' AND BINARY COLUMN_NAME = BINARY 'provider')
        )
      LIMIT 16`;
    const safeName = (value: string | null | undefined) =>
      typeof value === "string" && /^[A-Za-z0-9_]{1,80}$/u.test(value) ? value : "";
    collations = {
      readable: true,
      connection: safeName(sessions[0]?.connectionCollation),
      database: safeName(sessions[0]?.databaseCollation),
      server: safeName(sessions[0]?.serverCollation),
      columns: columns.map((column) => ({
        table: safeName(column.TABLE_NAME),
        column: safeName(column.COLUMN_NAME),
        collation: safeName(column.COLLATION_NAME),
      })),
    };
  } catch {
    collations = { readable: false };
  }

  // Read-only regression evidence: confirm the default for explicit utf8mb4
  // casts on the same Prisma pool that runs the failing contains queries.
  let effectiveUtf8mb4 = "";
  let castCollation = "";
  try {
    const rows = await prisma.$queryRaw<Array<{
      mapped: string;
      casted: string;
    }>>`SELECT @@character_set_collations AS mapped,
      COLLATION(CAST('ILK' AS CHAR CHARACTER SET utf8mb4)) AS casted`;
    const mapping = rows[0]?.mapped?.split(",").find((item) => item.startsWith("utf8mb4="));
    if (mapping && /^[A-Za-z0-9_]{1,40}=([A-Za-z0-9_]{1,80})$/u.test(mapping)) {
      effectiveUtf8mb4 = mapping;
    }
    if (rows[0]?.casted && /^[A-Za-z0-9_]{1,80}$/u.test(rows[0].casted)) {
      castCollation = rows[0].casted;
    }
  } catch {
    // Keep diagnostic read-only and non-fatal.
  }
  return Response.json({ issue: 1961, results, collations, effectiveUtf8mb4, castCollation }, { headers: HEADERS });
}
