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
    { name: "writer-baseline", run: () => prisma.user.count({ where: { role: "writer" } }) },
    { name: "writer-one-contains", run: () => prisma.user.count({ where: { role: "writer", fullName: { contains: q } } }) },
    { name: "writer-or-contains", run: () => prisma.user.count({ where: { role: "writer", OR: [
      { fullName: { contains: q } }, { displayName: { contains: q } },
      { email: { contains: q } }, { username: { contains: q } },
    ] } }) },
    { name: "order-baseline", run: () => prisma.order.count({ where: { status: "paid" } }) },
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

  const results: { name: string; ok: boolean; errorClass?: string; errorCode?: string; causeCode?: string; driverCode?: string; driverMessage?: string }[] = [];
  for (const probe of probes) {
    try {
      await probe.run();
      results.push({ name: probe.name, ok: true });
    } catch (error) {
      const err = error as { name?: string; code?: string; message?: string; meta?: { code?: string } };
      const message = typeof err.message === "string" ? err.message : "";
      const driverError = message.match(/Database error\. Code: ([A-Za-z0-9_-]+)\. Message: ([^\n]+)/u);
      // Return only a driver code and a short redacted server diagnostic to the
      // already-authenticated administrator; never expose SQL or connection values.
      const safeMessage = driverError?.[2]
        ?.replace(/(?:mysql|mariadb):\/\/\S+/giu, "[redacted-url]")
        .replace(/(?:password|passwd|pwd)\s*[=:]\s*\S+/giu, "password=[redacted]")
        .slice(0, 250);
      results.push({
        name: probe.name,
        ok: false,
        errorClass: (err.name ?? "unknown").slice(0, 100),
        errorCode: typeof err.code === "string" ? err.code.slice(0, 30) : undefined,
        causeCode: typeof err.meta?.code === "string" ? err.meta.code.slice(0, 30) : undefined,
        driverCode: driverError?.[1],
        driverMessage: safeMessage,
      });
    }
  }

  return Response.json({ issue: 1961, results }, { headers: HEADERS });
}
