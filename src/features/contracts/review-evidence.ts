import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isReaderPurchaseTermsPlaceholder, READER_DIGITAL_CONTENT_TERMS_CODE } from "@/features/commerce/checkout-terms";

export type ContractTemplateReviewEvidenceType = "legal_review" | "product_owner_decision" | "admin_approval";

export interface ContractTemplateReviewEvidenceRecord {
  id: string;
  templateId: string;
  templateVersion: number;
  evidenceType: ContractTemplateReviewEvidenceType;
  reviewerLabel: string;
  note: string;
  recordedById: string | null;
  createdAt: Date;
}

type LockedAdmin = {
  deletedAt: Date | null;
  id: string;
  isBanned: number | boolean;
  role: string;
  status: string;
};

type LockedTemplate = {
  id: string;
  lifecycleStatus: string;
  version: number;
  code: string;
  body: string;
};

function bool(value: number | boolean) {
  return value === true || value === 1;
}

async function lockAdmin(transaction: Prisma.TransactionClient, actorId: string) {
  const rows = await transaction.$queryRaw<LockedAdmin[]>`
    SELECT id, role, status, isBanned, deletedAt
    FROM User
    WHERE id = ${actorId}
    LIMIT 1
    FOR UPDATE
  `;
  const actor = rows[0];
  return actor &&
    actor.role === "admin" &&
    actor.status === "active" &&
    !bool(actor.isBanned) &&
    actor.deletedAt === null
      ? actor
      : null;
}

export async function listContractTemplateReviewEvidence(templateId: string) {
  const rows = await prisma.$queryRaw<ContractTemplateReviewEvidenceRecord[]>`
    SELECT id, templateId, templateVersion, evidenceType, reviewerLabel, note, recordedById, createdAt
    FROM ContractTemplateReviewEvidence
    WHERE templateId = ${templateId}
    ORDER BY templateVersion DESC, createdAt DESC
  `;
  // Raw SQL drivers may return UNSIGNED INT values with a distinct numeric
  // representation. Normalize before strict UI comparisons to the version.
  return rows.map((row) => ({ ...row, templateVersion: Number(row.templateVersion) }));
}

export async function recordContractTemplateReviewEvidence(input: {
  actorId: string;
  evidenceType: Exclude<ContractTemplateReviewEvidenceType, "legal_review">;
  note: string;
  reviewerLabel: string;
  templateId: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const actor = await lockAdmin(transaction, input.actorId);
    if (!actor) return { status: "forbidden" as const };

    const templates = await transaction.$queryRaw<LockedTemplate[]>`
      SELECT id, version, lifecycleStatus, code, body
      FROM ContractTemplate
      WHERE id = ${input.templateId}
      LIMIT 1
      FOR UPDATE
    `;
    const template = templates[0];
    if (!template) return { status: "not_found" as const };
    if (template.lifecycleStatus !== "review") {
      return { status: "review_state_required" as const };
    }
    // Reject placeholder purchase terms BEFORE writing an approval record.
    // The lifecycle transition independently enforces the same fail-closed gate.
    if (input.evidenceType === "admin_approval" &&
        template.code === READER_DIGITAL_CONTENT_TERMS_CODE &&
        isReaderPurchaseTermsPlaceholder(template.body)) {
      return { status: "purchase_terms_placeholder" as const };
    }

    const existing = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM ContractTemplateReviewEvidence
      WHERE templateId = ${template.id}
        AND templateVersion = ${template.version}
        AND evidenceType = ${input.evidenceType}
      LIMIT 1
      FOR UPDATE
    `;
    if (existing[0]) return { id: existing[0].id, status: "already_recorded" as const };

    const id = randomUUID();
    const now = new Date();
    await transaction.$executeRaw`
      INSERT INTO ContractTemplateReviewEvidence (
        id, templateId, templateVersion, evidenceType, reviewerLabel, note, recordedById, createdAt
      ) VALUES (
        ${id}, ${template.id}, ${template.version}, ${input.evidenceType},
        ${input.reviewerLabel}, ${input.note}, ${actor.id}, ${now}
      )
    `;

    return {
      id,
      templateVersion: Number(template.version),
      status: "recorded" as const,
    };
  });
}
