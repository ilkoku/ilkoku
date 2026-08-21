import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/features/auth/types";

export const MANDATORY_REGISTRATION_CONTRACT_CODE =
  "PLATFORM_MEMBERSHIP_CONFIDENTIALITY_V1";

export type RegistrationAgreement = {
  body: string;
  code: string;
  id: string;
  title: string;
  version: number;
  activatedAt: Date | null;
};

type RawRegistrationAgreement = RegistrationAgreement & {
  active: number | boolean;
  lifecycleStatus: string;
  targetRole: string;
};

function isActiveAgreement(
  row: RawRegistrationAgreement | undefined,
): row is RawRegistrationAgreement {
  return Boolean(
    row &&
      (row.active === true || row.active === 1) &&
      row.lifecycleStatus === "active" &&
      row.targetRole === "any" &&
      row.code === MANDATORY_REGISTRATION_CONTRACT_CODE,
  );
}

export async function getActiveRegistrationAgreement() {
  const rows = await prisma.$queryRaw<RawRegistrationAgreement[]>`
    SELECT id, code, title, body, version, active, lifecycleStatus, targetRole, activatedAt
    FROM ContractTemplate
    WHERE code = ${MANDATORY_REGISTRATION_CONTRACT_CODE}
      AND active = true
      AND lifecycleStatus = 'active'
      AND targetRole = 'any'
    LIMIT 1
  `;
  const row = rows[0];
  if (!isActiveAgreement(row)) return null;
  return {
    activatedAt: row.activatedAt,
    body: row.body,
    code: row.code,
    id: row.id,
    title: row.title,
    version: Number(row.version),
  } satisfies RegistrationAgreement;
}

export async function lockActiveRegistrationAgreement(
  transaction: Prisma.TransactionClient,
) {
  const rows = await transaction.$queryRaw<RawRegistrationAgreement[]>`
    SELECT id, code, title, body, version, active, lifecycleStatus, targetRole, activatedAt
    FROM ContractTemplate
    WHERE code = ${MANDATORY_REGISTRATION_CONTRACT_CODE}
    LIMIT 1
    FOR UPDATE
  `;
  const row = rows[0];
  if (!isActiveAgreement(row)) return null;
  return {
    activatedAt: row.activatedAt,
    body: row.body,
    code: row.code,
    id: row.id,
    title: row.title,
    version: Number(row.version),
  } satisfies RegistrationAgreement;
}

export async function recordRegistrationAgreementAcceptance(
  transaction: Prisma.TransactionClient,
  input: {
    acceptedAt: Date;
    agreement: RegistrationAgreement;
    recipientRole: UserRole;
    userId: string;
  },
) {
  const contractId = randomUUID();
  const eventId = randomUUID();
  const metadata = JSON.stringify({
    source: "registration",
    templateCode: input.agreement.code,
    templateVersion: input.agreement.version,
  });

  await transaction.$executeRaw`
    INSERT INTO UserContract (
      id, templateId, templateVersion, recipientUserId, recipientRole,
      status, titleSnapshot, bodySnapshot, adminNote, responseNote,
      relatedWorkId, sentById, activeKey, sentAt, viewedAt, respondedAt,
      acceptedAt, rejectedAt, cancelledAt, createdAt, updatedAt
    ) VALUES (
      ${contractId}, ${input.agreement.id}, ${input.agreement.version}, ${input.userId}, ${input.recipientRole},
      'accepted', ${input.agreement.title}, ${input.agreement.body}, NULL, NULL,
      NULL, NULL, NULL, NULL, NULL, ${input.acceptedAt},
      ${input.acceptedAt}, NULL, NULL, ${input.acceptedAt}, ${input.acceptedAt}
    )
  `;

  await transaction.$executeRaw`
    INSERT INTO UserContractEvent (
      id, contractId, actorId, eventType, metadata, createdAt
    ) VALUES (
      ${eventId}, ${contractId}, ${input.userId}, 'accepted', ${metadata}, ${input.acceptedAt}
    )
  `;

  return contractId;
}
