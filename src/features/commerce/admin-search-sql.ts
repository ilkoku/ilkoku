import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Admin-only, read-only search IDs. MariaDB 11.8 rejects Prisma's generated
 * "contains" predicate with error 1267: utf8mb4_unicode_ci (column)
 * versus utf8mb4_bin (bound pattern). Explicitly collate both LIKE operands.
 *
 * Only predefined SQL identifiers are embedded. The search term is always
 * a parameter, and LIKE wildcards in the term are treated literally.
 * Consumers continue applying their original Prisma status/source filters,
 * sort order, pagination and field selects.
 */
export type AdminSearchTarget =
  | "orders"
  | "zeroOrders"
  | "payments"
  | "refunds"
  | "entitlements"
  | "writers";

const definitions: Record<AdminSearchTarget, {
  root: string;
  from: string;
  fields: readonly string[];
}> = {
  orders: {
    root: "o",
    from: "`Order` o LEFT JOIN `Work` w ON w.id = o.workId " +
      "LEFT JOIN `User` r ON r.id = o.readerId " +
      "LEFT JOIN `User` a ON a.id = o.authorId",
    fields: ["o.orderNo", "w.title", "r.publicId", "r.fullName",
      "r.displayName", "a.publicId", "a.fullName", "a.displayName"],
  },
  zeroOrders: {
    root: "o",
    from: "`Order` o LEFT JOIN `Work` w ON w.id = o.workId",
    fields: ["o.orderNo", "w.title"],
  },
  payments: {
    root: "p",
    from: "`Payment` p LEFT JOIN `Order` o ON o.id = p.orderId " +
      "LEFT JOIN `Work` w ON w.id = o.workId " +
      "LEFT JOIN `User` r ON r.id = o.readerId",
    fields: ["p.provider", "p.providerTransactionId", "p.failureCode",
      "o.orderNo", "w.title", "r.publicId", "r.fullName", "r.displayName"],
  },
  refunds: {
    root: "x",
    from: "`Refund` x LEFT JOIN `Order` o ON o.id = x.orderId " +
      "LEFT JOIN `Work` w ON w.id = o.workId " +
      "LEFT JOIN `Payment` p ON p.id = x.paymentId",
    fields: ["x.reason", "o.orderNo", "w.title",
      "p.provider", "p.providerTransactionId"],
  },
  entitlements: {
    root: "e",
    from: "`WorkEntitlement` e LEFT JOIN `Order` o ON o.id = e.orderId " +
      "LEFT JOIN `Work` w ON w.id = e.workId " +
      "LEFT JOIN `User` r ON r.id = e.readerId",
    fields: ["w.title", "r.publicId", "r.fullName",
      "r.displayName", "o.orderNo"],
  },
  writers: {
    root: "u",
    from: "`User` u",
    fields: ["u.fullName", "u.displayName", "u.email", "u.username"],
  },
};

export async function getAdminSearchIds(
  target: AdminSearchTarget,
  query: string,
): Promise<string[]> {
  const q = query.trim().slice(0, 120);
  if (!q) return [];

  const definition = definitions[target];
  // '=' is the explicit escape character for %, _ and = in user input.
  const escaped = q.replace(/[=%_]/gu, (part) => "=" + part);
  const predicates = definition.fields.map((field) => Prisma.sql`
    ${Prisma.raw(field)} COLLATE utf8mb4_unicode_ci
    LIKE (CONCAT('%', ${escaped}, '%') COLLATE utf8mb4_unicode_ci)
    ESCAPE '='
  `);
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT DISTINCT ${Prisma.raw(definition.root)}.id AS id
    FROM ${Prisma.raw(definition.from)}
    WHERE (${Prisma.join(predicates, " OR ")})
  `);
  return rows.map((row) => row.id);
}
