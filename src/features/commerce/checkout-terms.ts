import "server-only";

import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

export const READER_DIGITAL_CONTENT_TERMS_CODE =
  "ILKOKU_READER_DIGITAL_CONTENT_PURCHASE";

/**
 * Fail closed for the unchanged seeded drafting placeholder, even if an
 * administrative lifecycle action accidentally marks it active.
 * This does not assess the legal sufficiency of a new, non-placeholder text.
 */
export function isReaderPurchaseTermsPlaceholder(body: string): boolean {
  const normalized = body.trim().normalize("NFC").toLocaleLowerCase("tr-TR");
  return (
    !normalized ||
    normalized.startsWith("çalışma taslağı") ||
    normalized.includes("nihai hukuki metnin hazırlanacağı çalışma alanıdır")
  );
}

type RawReaderPurchaseTerms = {
  active: number | boolean;
  activatedAt: Date | null;
  body: string;
  code: string;
  id: string;
  lifecycleStatus: string;
  title: string;
  version: number;
};

function hashDocument(body: string) {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

export async function getActiveReaderPurchaseTerms() {
  const rows = await prisma.$queryRaw<RawReaderPurchaseTerms[]>`
    SELECT id, code, title, body, version, active, lifecycleStatus, activatedAt
    FROM ContractTemplate
    WHERE code = ${READER_DIGITAL_CONTENT_TERMS_CODE}
      AND active = true
      AND lifecycleStatus = 'active'
    LIMIT 1
  `;

  const row = rows[0];
  if (
    !row ||
    row.code !== READER_DIGITAL_CONTENT_TERMS_CODE ||
    !(row.active === true || row.active === 1) ||
    row.lifecycleStatus !== "active" ||
    isReaderPurchaseTermsPlaceholder(row.body)
  ) {
    return null;
  }

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


export async function getReaderPurchaseTermsStatus() {
  const rows = await prisma.$queryRaw<RawReaderPurchaseTerms[]>`
    SELECT id, code, title, body, version, active, lifecycleStatus, activatedAt
    FROM ContractTemplate
    WHERE code = ${READER_DIGITAL_CONTENT_TERMS_CODE}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    active: row.active === true || row.active === 1,
    lifecycleStatus: row.lifecycleStatus,
    placeholder: isReaderPurchaseTermsPlaceholder(row.body),
    title: row.title,
    version: String(Number(row.version)),
  };
}
