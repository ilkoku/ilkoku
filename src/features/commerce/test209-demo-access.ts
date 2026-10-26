import "server-only";

import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

// An explicitly non-commercial promotional grant for one known QA work.
// It is NOT an Order, Payment, financial ledger entry, seller verification,
// sales authorization, or a substitute for the real 0 TL checkout.
export const TEST209_DEMO_SLUG = "yeni-test209-30820c6a";
const TEST209_DEMO_WORK_ID = "6ebb633f-4356-459c-ac12-4fbd253a49e7";
const TEST209_READER_NAME = "ERSİN OKURTEST";
// Fixed account fingerprint, not a public/mutable profile name alone.
const TEST209_READER_EMAIL_SHA256 = "ce87b63267a6875d790615f5c24e066bc3f963ab95331e89c46f7879dcf1a05a";

export function isTest209DemoReader(input: {
  fullName: string | null | undefined;
  email: string | null | undefined;
  role: string;
}) {
  if (input.role !== "reader" ||
      input.fullName?.trim().normalize("NFC").toLocaleUpperCase("tr-TR") !== TEST209_READER_NAME ||
      !input.email) return false;
  const hash = createHash("sha256")
    .update(input.email.trim().toLowerCase(), "utf8")
    .digest("hex");
  return hash === TEST209_READER_EMAIL_SHA256;
}

export type Test209DemoResult =
  | { ok: true; entitlementId: string }
  | { ok: false; reason: "not_allowed" | "not_ready" | "already_entitled" };

export async function grantTest209DemoAccess(readerId: string): Promise<Test209DemoResult> {
  return prisma.$transaction(async (transaction) => {
    // Serialize repeat requests for this reader before checking access state.
    const rows = await transaction.$queryRaw<Array<{
      id: string;
      role: string;
      fullName: string | null;
      email: string;
      status: string;
      isBanned: boolean | number;
      deletedAt: Date | null;
    }>>`
      SELECT id, role, fullName, email, status, isBanned, deletedAt
      FROM User
      WHERE id = ${readerId}
      FOR UPDATE
    `;
    const reader = rows[0];
    if (!reader || reader.status !== "active" || reader.isBanned ||
      reader.deletedAt !== null || !isTest209DemoReader(reader)) {
      return { ok: false, reason: "not_allowed" } as const;
    }

    const work = await transaction.work.findFirst({
      where: {
        id: TEST209_DEMO_WORK_ID,
        slug: TEST209_DEMO_SLUG,
        archivedAt: null,
        isActive: true,
        publishedAt: { not: null },
        status: "published",
        visibility: "public",
        author: { is: { deletedAt: null, status: "active" } },
      },
      select: {
        id: true,
        saleConfiguration: {
          select: {
            saleModel: true,
            status: true,
            priceAmount: true,
            activatedAt: true,
          },
        },
      },
    });

    if (!work ||
      work.saleConfiguration?.saleModel !== "paid" ||
      work.saleConfiguration?.status !== "ready" ||
      work.saleConfiguration?.priceAmount !== BigInt(0) ||
      work.saleConfiguration?.activatedAt) {
      return { ok: false, reason: "not_ready" } as const;
    }

    const existing = await transaction.workEntitlement.findUnique({
      where: { readerId_workId: { readerId, workId: work.id } },
      select: { id: true, orderId: true, source: true, status: true },
    });
    if (existing) {
      // A reader can repeat this promotional QA after cancelling it.
      // Purchased or admin-granted access is never modified here.
      if (existing.source !== "promotion" || existing.orderId !== null ||
          existing.status !== "revoked") {
        return { ok: false, reason: "already_entitled" } as const;
      }
      const changed = await transaction.workEntitlement.updateMany({
        where: {
          id: existing.id, readerId, workId: work.id,
          source: "promotion", orderId: null, status: "revoked",
        },
        data: { status: "active", revokedAt: null, grantedAt: new Date() },
      });
      if (changed.count !== 1) return { ok: false, reason: "not_ready" } as const;
      return { ok: true, entitlementId: existing.id } as const;
    }

    const entitlement = await transaction.workEntitlement.create({
      data: {
        readerId,
        workId: work.id,
        source: "promotion",
        status: "active",
        grantedAt: new Date(),
      },
      select: { id: true },
    });
    return { ok: true, entitlementId: entitlement.id } as const;
  }, { isolationLevel: "ReadCommitted" });
}


export type Test209DemoCancelResult =
  | { ok: true }
  | { ok: false; reason: "not_allowed" | "not_found" };

/**
 * Cancel only an active TEST209 promotional entitlement owned by the fixed
 * test reader; preserve historical reading records and all financial data.
 */
export async function cancelTest209DemoAccess(
  readerId: string,
  entitlementId: string,
): Promise<Test209DemoCancelResult> {
  return prisma.$transaction(async (transaction) => {
    // The same reader-level lock as the grant path prevents races.
    const rows = await transaction.$queryRaw<Array<{
      id: string; role: string; fullName: string | null; email: string;
      status: string; isBanned: boolean | number; deletedAt: Date | null;
    }>>`
      SELECT id, role, fullName, email, status, isBanned, deletedAt
      FROM User WHERE id = ${readerId} FOR UPDATE
    `;
    const reader = rows[0];
    if (!reader || reader.status !== "active" || reader.isBanned ||
      reader.deletedAt !== null || !isTest209DemoReader(reader)) {
      return { ok: false, reason: "not_allowed" } as const;
    }

    const changed = await transaction.workEntitlement.updateMany({
      where: {
        id: entitlementId,
        readerId,
        workId: TEST209_DEMO_WORK_ID,
        status: "active",
        source: "promotion",
        orderId: null,
        work: { slug: TEST209_DEMO_SLUG },
      },
      data: { status: "revoked", revokedAt: new Date() },
    });
    return changed.count === 1
      ? { ok: true } as const
      : { ok: false, reason: "not_found" } as const;
  }, { isolationLevel: "ReadCommitted" });
}
