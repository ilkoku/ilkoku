import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Only an explicitly approved CURRENT seller with a verified legal identity
 * and a verified, non-expired work-specific rights authorization can acquire
 * digital work access. NEVER derive the seller from Work.authorId.
 *
 * currentKey must match the work id. This is the at-most-one-current row
 * invariant established by WorkSellerAssignment.currentKey @unique.
 */
export async function getVerifiedWorkSeller(
  workId: string,
  db: Prisma.TransactionClient = prisma,
  now: Date = new Date(),
) {
  const assignment = await db.workSellerAssignment.findFirst({
    where: {
      workId,
      currentKey: workId,
      status: "approved",
      revokedAt: null,
      approvedById: { not: null },
      approvedAt: { not: null },
    },
    select: {
      id: true,
      mode: true,
      legalPartyId: true,
      authorizationId: true,
      work: { select: { authorId: true } },
      legalParty: {
        select: {
          id: true,
          kind: true,
          ownerUserId: true,
          legalName: true,
          taxIdentifier: true,
          legalAddress: true,
          contactEmail: true,
          contactPhone: true,
          verificationStatus: true,
          verifiedAt: true,
          verifiedById: true,
        },
      },
      authorization: {
        select: {
          id: true,
          workId: true,
          legalPartyId: true,
          status: true,
          validFrom: true,
          validUntil: true,
          verifiedAt: true,
          verifiedById: true,
          revokedAt: true,
          documentHash: true,
          rightsScope: true,
        },
      },
    },
  });
  if (!assignment) return null;
  const party = assignment.legalParty;
  const rights = assignment.authorization;
  if (
    party.id !== assignment.legalPartyId ||
    party.verificationStatus !== "verified" ||
    !party.verifiedById ||
    !party.verifiedAt ||
    !party.legalName?.trim() ||
    !party.taxIdentifier?.trim() ||
    !party.legalAddress?.trim() ||
    !party.contactEmail?.trim() ||
    (assignment.mode === "platform_direct" && party.kind !== "platform") ||
    (assignment.mode === "third_party" &&
      (party.kind === "platform" || party.ownerUserId !== assignment.work.authorId)) ||
    !rights ||
    rights.id !== assignment.authorizationId ||
    rights.workId !== workId ||
    rights.legalPartyId !== party.id ||
    rights.status !== "verified" ||
    !rights.verifiedById ||
    !rights.verifiedAt ||
    rights.revokedAt ||
    (rights.validFrom && rights.validFrom > now) ||
    (rights.validUntil && rights.validUntil <= now) ||
    !rights.rightsScope ||
    !rights.documentHash ||
    !/^[a-f0-9]{64}$/iu.test(rights.documentHash)
  ) {
    return null;
  }
  return { assignmentId: assignment.id, mode: assignment.mode, party, rights };
}
