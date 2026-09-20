import "server-only";

import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

export const AUTHOR_PUBLICATION_ACCESS_CONTRACT_CODE =
  "ILKOKU_AUTHOR_PUBLICATION_ACCESS";

type RawAuthorPublicationAgreement = {
  active: number | boolean;
  activatedAt: Date | null;
  body: string;
  code: string;
  id: string;
  lifecycleStatus: string;
  targetRole: string;
  title: string;
  version: number;
};

function hashDocument(body: string) {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

function isActiveAgreement(row: RawAuthorPublicationAgreement | undefined) {
  return Boolean(
    row &&
      (row.active === true || row.active === 1) &&
      row.lifecycleStatus === "active" &&
      row.targetRole === "writer" &&
      row.code === AUTHOR_PUBLICATION_ACCESS_CONTRACT_CODE,
  );
}

export async function getActiveAuthorPublicationAgreement() {
  const rows = await prisma.$queryRaw<RawAuthorPublicationAgreement[]>`
    SELECT id, code, title, body, version, active, lifecycleStatus, targetRole, activatedAt
    FROM ContractTemplate
    WHERE code = ${AUTHOR_PUBLICATION_ACCESS_CONTRACT_CODE}
      AND active = true
      AND lifecycleStatus = 'active'
      AND targetRole = 'writer'
    LIMIT 1
  `;

  const row = rows[0];
  if (!isActiveAgreement(row)) return null;

  return {
    activatedAt: row.activatedAt,
    body: row.body,
    code: row.code,
    documentHash: hashDocument(row.body),
    id: row.id,
    title: row.title,
    version: String(Number(row.version)),
  };
}

export async function getAuthorAgreementAcceptance(
  authorId: string,
  agreement: { documentHash: string; version: string },
) {
  return prisma.authorAgreement.findFirst({
    where: {
      authorId,
      agreementType: "author_publication_access",
      agreementVersion: agreement.version,
      documentHash: agreement.documentHash,
      status: "accepted",
    },
    orderBy: { acceptedAt: "desc" },
  });
}

export async function getAuthorPublicationAgreementStatus() {
  const rows = await prisma.$queryRaw<RawAuthorPublicationAgreement[]>`
    SELECT id, code, title, body, version, active, lifecycleStatus, targetRole, activatedAt
    FROM ContractTemplate
    WHERE code = ${AUTHOR_PUBLICATION_ACCESS_CONTRACT_CODE}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    active: row.active === true || row.active === 1,
    lifecycleStatus: row.lifecycleStatus,
    title: row.title,
    version: String(Number(row.version)),
  };
}
