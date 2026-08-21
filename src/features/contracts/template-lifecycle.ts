import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  ContractTargetRole,
  ContractTemplateLifecycleStatus,
} from "./types";

const lifecycleStatuses = new Set<ContractTemplateLifecycleStatus>([
  "soft",
  "draft",
  "review",
  "approved",
  "active",
]);

const targetRoles = new Set<ContractTargetRole>([
  "any",
  "reader",
  "writer",
  "editor_pending",
  "editor",
  "publisher",
  "admin",
]);

type LockedAdmin = {
  deletedAt: Date | null;
  id: string;
  isBanned: number | boolean;
  role: string;
  status: string;
};

type LockedManagedTemplate = {
  active: number | boolean;
  body: string;
  code: string;
  description: string | null;
  id: string;
  lifecycleStatus: string;
  sourceTemplateId: string | null;
  targetRole: string;
  title: string;
  version: number;
};

type RawWorkbenchTemplate = LockedManagedTemplate & {
  activatedAt: Date | null;
  approvedAt: Date | null;
  approvedById: string | null;
  createdAt: Date;
  sourceTemplateCode: string | null;
  sourceTemplateTitle: string | null;
  updatedAt: Date;
};

export interface ContractTemplateWorkbenchRecord {
  active: boolean;
  activatedAt: Date | null;
  approvedAt: Date | null;
  approvedById: string | null;
  body: string;
  code: string;
  createdAt: Date;
  description: string | null;
  id: string;
  lifecycleStatus: ContractTemplateLifecycleStatus;
  sourceTemplateCode: string | null;
  sourceTemplateId: string | null;
  sourceTemplateTitle: string | null;
  targetRole: ContractTargetRole;
  title: string;
  updatedAt: Date;
  version: number;
}

function bool(value: number | boolean) {
  return value === true || value === 1;
}

function lifecycle(value: string): ContractTemplateLifecycleStatus {
  return lifecycleStatuses.has(value as ContractTemplateLifecycleStatus)
    ? (value as ContractTemplateLifecycleStatus)
    : "draft";
}

function role(value: string): ContractTargetRole {
  return targetRoles.has(value as ContractTargetRole)
    ? (value as ContractTargetRole)
    : "any";
}

function normalize(row: RawWorkbenchTemplate): ContractTemplateWorkbenchRecord {
  return {
    active: bool(row.active),
    activatedAt: row.activatedAt,
    approvedAt: row.approvedAt,
    approvedById: row.approvedById,
    body: row.body,
    code: row.code,
    createdAt: row.createdAt,
    description: row.description,
    id: row.id,
    lifecycleStatus: lifecycle(row.lifecycleStatus),
    sourceTemplateCode: row.sourceTemplateCode,
    sourceTemplateId: row.sourceTemplateId,
    sourceTemplateTitle: row.sourceTemplateTitle,
    targetRole: role(row.targetRole),
    title: row.title,
    updatedAt: row.updatedAt,
    version: Number(row.version),
  };
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

async function lockTemplate(transaction: Prisma.TransactionClient, templateId: string) {
  const rows = await transaction.$queryRaw<LockedManagedTemplate[]>`
    SELECT id, code, title, description, targetRole, body, version, active,
           lifecycleStatus, sourceTemplateId
    FROM ContractTemplate
    WHERE id = ${templateId}
    LIMIT 1
    FOR UPDATE
  `;
  return rows[0] ?? null;
}

export async function listContractTemplateWorkbenchRecords() {
  const rows = await prisma.$queryRaw<RawWorkbenchTemplate[]>`
    SELECT
      template.id,
      template.code,
      template.title,
      template.description,
      template.targetRole,
      template.body,
      template.version,
      template.active,
      template.lifecycleStatus,
      template.sourceTemplateId,
      template.approvedById,
      template.approvedAt,
      template.activatedAt,
      template.createdAt,
      template.updatedAt,
      source.code AS sourceTemplateCode,
      source.title AS sourceTemplateTitle
    FROM ContractTemplate template
    LEFT JOIN ContractTemplate source ON source.id = template.sourceTemplateId
    ORDER BY
      CASE template.lifecycleStatus
        WHEN 'active' THEN 1
        WHEN 'approved' THEN 2
        WHEN 'review' THEN 3
        WHEN 'draft' THEN 4
        ELSE 5
      END,
      template.targetRole ASC,
      template.updatedAt DESC
  `;
  return rows.map(normalize);
}

export async function getContractTemplateWorkbenchRecord(templateId: string) {
  const rows = await prisma.$queryRaw<RawWorkbenchTemplate[]>`
    SELECT
      template.id,
      template.code,
      template.title,
      template.description,
      template.targetRole,
      template.body,
      template.version,
      template.active,
      template.lifecycleStatus,
      template.sourceTemplateId,
      template.approvedById,
      template.approvedAt,
      template.activatedAt,
      template.createdAt,
      template.updatedAt,
      source.code AS sourceTemplateCode,
      source.title AS sourceTemplateTitle
    FROM ContractTemplate template
    LEFT JOIN ContractTemplate source ON source.id = template.sourceTemplateId
    WHERE template.id = ${templateId}
    LIMIT 1
  `;
  return rows[0] ? normalize(rows[0]) : null;
}

export async function createManagedContractTemplate(input: {
  actorId: string;
  body: string;
  code: string;
  description: string | null;
  targetRole: ContractTargetRole;
  title: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const actor = await lockAdmin(transaction, input.actorId);
    if (!actor) return { status: "forbidden" as const };
    if (!targetRoles.has(input.targetRole)) return { status: "invalid_role" as const };
    if (input.code.startsWith("SOFT_")) return { status: "reserved_code" as const };

    const existing = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM ContractTemplate WHERE code = ${input.code} LIMIT 1 FOR UPDATE
    `;
    if (existing[0]) return { status: "duplicate_code" as const };

    const id = randomUUID();
    const now = new Date();
    await transaction.$executeRaw`
      INSERT INTO ContractTemplate (
        id, code, title, description, targetRole, body, version, active,
        lifecycleStatus, sourceTemplateId, approvedById, approvedAt, activatedAt,
        createdById, updatedById, createdAt, updatedAt
      ) VALUES (
        ${id}, ${input.code}, ${input.title}, ${input.description}, ${input.targetRole}, ${input.body}, 1, false,
        'draft', NULL, NULL, NULL, NULL,
        ${actor.id}, ${actor.id}, ${now}, ${now}
      )
    `;
    return { id, status: "created" as const };
  });
}

export async function updateManagedContractTemplate(input: {
  actorId: string;
  body: string;
  description: string | null;
  targetRole: ContractTargetRole;
  templateId: string;
  title: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const actor = await lockAdmin(transaction, input.actorId);
    if (!actor) return { status: "forbidden" as const };
    if (!targetRoles.has(input.targetRole)) return { status: "invalid_role" as const };

    const template = await lockTemplate(transaction, input.templateId);
    if (!template) return { status: "not_found" as const };

    const changed =
      template.title !== input.title ||
      template.description !== input.description ||
      template.body !== input.body ||
      role(template.targetRole) !== input.targetRole;
    if (!changed) return { changed: false, status: "updated" as const };

    const currentLifecycle = lifecycle(template.lifecycleStatus);
    const nextLifecycle: ContractTemplateLifecycleStatus =
      currentLifecycle === "soft"
        ? "soft"
        : currentLifecycle === "approved" || currentLifecycle === "active"
          ? "review"
          : currentLifecycle;
    const now = new Date();

    await transaction.$executeRaw`
      UPDATE ContractTemplate
      SET title = ${input.title},
          description = ${input.description},
          targetRole = ${input.targetRole},
          body = ${input.body},
          active = false,
          lifecycleStatus = ${nextLifecycle},
          approvedById = ${nextLifecycle === "approved" || nextLifecycle === "active" ? actor.id : null},
          approvedAt = ${nextLifecycle === "approved" || nextLifecycle === "active" ? now : null},
          activatedAt = NULL,
          version = version + 1,
          updatedById = ${actor.id},
          updatedAt = ${now}
      WHERE id = ${template.id}
    `;

    return {
      changed: true,
      lifecycleStatus: nextLifecycle,
      status: "updated" as const,
    };
  });
}

export async function transitionContractTemplateLifecycle(input: {
  actorId: string;
  templateId: string;
  transition: "submit_review" | "approve" | "activate" | "deactivate" | "return_draft";
}) {
  return prisma.$transaction(async (transaction) => {
    const actor = await lockAdmin(transaction, input.actorId);
    if (!actor) return { status: "forbidden" as const };
    const template = await lockTemplate(transaction, input.templateId);
    if (!template) return { status: "not_found" as const };

    const current = lifecycle(template.lifecycleStatus);
    if (current === "soft" || template.code.startsWith("SOFT_")) {
      return { status: "soft_requires_conversion" as const };
    }

    let next: ContractTemplateLifecycleStatus | null = null;
    if (input.transition === "submit_review" && current === "draft") next = "review";
    if (input.transition === "approve" && current === "review") next = "approved";
    if (input.transition === "activate" && current === "approved") next = "active";
    if (input.transition === "deactivate" && current === "active") next = "approved";
    if (input.transition === "return_draft" && (current === "review" || current === "approved")) next = "draft";
    if (!next) return { current, status: "invalid_transition" as const };

    const now = new Date();
    const approved = next === "approved" || next === "active";
    const active = next === "active";
    await transaction.$executeRaw`
      UPDATE ContractTemplate
      SET lifecycleStatus = ${next},
          active = ${active},
          approvedById = ${approved ? actor.id : null},
          approvedAt = ${approved ? now : null},
          activatedAt = ${active ? now : null},
          updatedById = ${actor.id},
          updatedAt = ${now}
      WHERE id = ${template.id}
    `;

    return { lifecycleStatus: next, status: "transitioned" as const };
  });
}

export async function convertSoftDraftToManagedTemplate(input: {
  actorId: string;
  sourceTemplateId: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const actor = await lockAdmin(transaction, input.actorId);
    if (!actor) return { status: "forbidden" as const };
    const source = await lockTemplate(transaction, input.sourceTemplateId);
    if (!source) return { status: "not_found" as const };
    if (!source.code.startsWith("SOFT_") || lifecycle(source.lifecycleStatus) !== "soft") {
      return { status: "not_soft" as const };
    }

    const converted = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM ContractTemplate
      WHERE sourceTemplateId = ${source.id}
      LIMIT 1
      FOR UPDATE
    `;
    if (converted[0]) {
      return { id: converted[0].id, status: "already_converted" as const };
    }

    const code = `LIB_${source.code.slice(5)}`;
    const codeConflict = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM ContractTemplate WHERE code = ${code} LIMIT 1 FOR UPDATE
    `;
    if (codeConflict[0]) return { status: "duplicate_code" as const };

    const id = randomUUID();
    const now = new Date();
    const title = source.title.replace(/\s+Taslağı$/u, "");
    const description = `Soft Taslaklar kaynağındaki ${source.code} üzerinden oluşturulan çalışma şablonu. Hukuki ve ticari inceleme tamamlanmadan aktif edilemez.`;

    await transaction.$executeRaw`
      INSERT INTO ContractTemplate (
        id, code, title, description, targetRole, body, version, active,
        lifecycleStatus, sourceTemplateId, approvedById, approvedAt, activatedAt,
        createdById, updatedById, createdAt, updatedAt
      ) VALUES (
        ${id}, ${code}, ${title}, ${description}, ${role(source.targetRole)}, ${source.body}, 1, false,
        'draft', ${source.id}, NULL, NULL, NULL,
        ${actor.id}, ${actor.id}, ${now}, ${now}
      )
    `;

    return { id, status: "converted" as const };
  });
}
