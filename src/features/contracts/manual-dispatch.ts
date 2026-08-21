import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { UserRole } from "@/features/auth/types";
import { prisma } from "@/lib/prisma";
import { MANDATORY_REGISTRATION_CONTRACT_CODE } from "./registration-agreement";
import type {
  ContractActiveAssignmentRecord,
  ContractTargetRole,
} from "./types";

type LockedUser = {
  deletedAt: Date | null;
  displayName: string | null;
  email: string;
  fullName: string;
  id: string;
  isBanned: number | boolean;
  role: UserRole;
  status: string;
};

type LockedManualTemplate = {
  active: number | boolean;
  body: string;
  code: string;
  id: string;
  lifecycleStatus: string;
  targetRole: string;
  title: string;
  version: number;
};

const validTargetRoles = new Set<ContractTargetRole>([
  "any",
  "reader",
  "writer",
  "editor_pending",
  "editor",
  "publisher",
  "admin",
]);

function toBoolean(value: number | boolean) {
  return value === true || value === 1;
}

function normalizeTargetRole(value: string): ContractTargetRole {
  return validTargetRoles.has(value as ContractTargetRole)
    ? (value as ContractTargetRole)
    : "any";
}

function auditMetadata(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

async function lockAdmin(
  transaction: Prisma.TransactionClient,
  actorId: string,
) {
  const rows = await transaction.$queryRaw<LockedUser[]>`
    SELECT id, email, fullName, displayName, role, status, isBanned, deletedAt
    FROM User
    WHERE id = ${actorId}
    LIMIT 1
    FOR UPDATE
  `;
  const actor = rows[0];

  return actor &&
    actor.role === "admin" &&
    actor.status === "active" &&
    !toBoolean(actor.isBanned) &&
    actor.deletedAt === null
      ? actor
      : null;
}

async function lockRecipient(
  transaction: Prisma.TransactionClient,
  recipientUserId: string,
) {
  const rows = await transaction.$queryRaw<LockedUser[]>`
    SELECT id, email, fullName, displayName, role, status, isBanned, deletedAt
    FROM User
    WHERE id = ${recipientUserId}
    LIMIT 1
    FOR UPDATE
  `;
  const recipient = rows[0];

  return recipient &&
    recipient.status === "active" &&
    !toBoolean(recipient.isBanned) &&
    recipient.deletedAt === null
      ? recipient
      : null;
}

async function lockManualTemplate(
  transaction: Prisma.TransactionClient,
  templateId: string,
) {
  const rows = await transaction.$queryRaw<LockedManualTemplate[]>`
    SELECT id, code, title, targetRole, body, version, active, lifecycleStatus
    FROM ContractTemplate
    WHERE id = ${templateId}
    LIMIT 1
    FOR UPDATE
  `;
  const template = rows[0];

  if (
    !template ||
    !toBoolean(template.active) ||
    template.lifecycleStatus !== "active" ||
    template.code === MANDATORY_REGISTRATION_CONTRACT_CODE
  ) {
    return null;
  }

  return template;
}

function renderSnapshot(
  body: string,
  input: {
    date: string;
    recipient: LockedUser;
    workTitle: string | null;
  },
) {
  const roleLabels: Record<UserRole, string> = {
    admin: "Admin",
    editor: "Editör",
    editor_pending: "Editör adayı",
    publisher: "Yayınevi",
    reader: "Okuyucu",
    writer: "Yazar",
  };

  const replacements: Record<string, string> = {
    "{{ad_soyad}}": input.recipient.displayName || input.recipient.fullName,
    "{{eposta}}": input.recipient.email,
    "{{rol}}": roleLabels[input.recipient.role],
    "{{tarih}}": input.date,
    "{{eser}}": input.workTitle ?? "—",
  };

  return Object.entries(replacements).reduce(
    (text, [token, replacement]) => text.split(token).join(replacement),
    body,
  );
}

export async function listActiveManualContractAssignments(): Promise<
  ContractActiveAssignmentRecord[]
> {
  return prisma.$queryRaw<ContractActiveAssignmentRecord[]>`
    SELECT
      id AS contractId,
      templateId,
      recipientUserId,
      relatedWorkId
    FROM UserContract
    WHERE status IN ('sent', 'viewed')
      AND activeKey IS NOT NULL
    ORDER BY updatedAt DESC
  `;
}

export async function sendManualAdminContract(input: {
  actorId: string;
  adminNote: string | null;
  recipientUserId: string;
  relatedWorkId: string | null;
  templateId: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const actor = await lockAdmin(transaction, input.actorId);
    if (!actor) return { status: "forbidden" as const };

    const recipient = await lockRecipient(transaction, input.recipientUserId);
    if (!recipient) return { status: "invalid_recipient" as const };

    const template = await lockManualTemplate(transaction, input.templateId);
    if (!template) return { status: "invalid_template" as const };

    const templateRole = normalizeTargetRole(template.targetRole);
    if (templateRole !== "any" && templateRole !== recipient.role) {
      return { status: "role_mismatch" as const };
    }

    let workTitle: string | null = null;
    if (input.relatedWorkId) {
      const work = await transaction.work.findFirst({
        where: {
          archivedAt: null,
          id: input.relatedWorkId,
        },
        select: {
          authorId: true,
          title: true,
        },
      });
      if (!work) return { status: "invalid_work" as const };
      if (recipient.role === "writer" && work.authorId !== recipient.id) {
        return { status: "work_recipient_mismatch" as const };
      }
      workTitle = work.title;
    }

    const activeKey = `${template.id}:${recipient.id}:${input.relatedWorkId ?? "none"}`;
    const existing = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM UserContract
      WHERE activeKey = ${activeKey}
      LIMIT 1
      FOR UPDATE
    `;
    if (existing[0]) {
      return {
        contractId: existing[0].id,
        status: "duplicate_active" as const,
      };
    }

    const id = randomUUID();
    const now = new Date();
    const date = new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "long",
      timeZone: "Europe/Istanbul",
    }).format(now);
    const bodySnapshot = renderSnapshot(template.body, {
      date,
      recipient,
      workTitle,
    });

    await transaction.$executeRaw`
      INSERT INTO UserContract (
        id, templateId, templateVersion, recipientUserId, recipientRole,
        status, titleSnapshot, bodySnapshot, adminNote, relatedWorkId,
        sentById, activeKey, sentAt, createdAt, updatedAt
      ) VALUES (
        ${id}, ${template.id}, ${template.version}, ${recipient.id}, ${recipient.role},
        'sent', ${template.title}, ${bodySnapshot}, ${input.adminNote}, ${input.relatedWorkId},
        ${actor.id}, ${activeKey}, ${now}, ${now}, ${now}
      )
    `;

    await transaction.$executeRaw`
      INSERT INTO UserContractEvent (id, contractId, actorId, eventType, metadata, createdAt)
      VALUES (
        ${randomUUID()}, ${id}, ${actor.id}, 'sent',
        ${auditMetadata({
          relatedWorkId: input.relatedWorkId,
          recipientRole: recipient.role,
          source: "manual_admin",
          templateCode: template.code,
          templateVersion: template.version,
        })},
        ${now}
      )
    `;

    await transaction.notification.create({
      data: {
        message: `${template.title} sözleşmeniz inceleme ve yanıtınız için gönderildi.`,
        relatedEntityId: id,
        relatedEntityType: "user_contract",
        title: "Yeni sözleşme",
        type: "system",
        userId: recipient.id,
      },
    });

    return {
      contractId: id,
      recipientEmail: recipient.email,
      recipientName: recipient.displayName || recipient.fullName,
      status: "sent" as const,
    };
  });
}
