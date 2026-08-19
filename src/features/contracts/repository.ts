import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { UserRole } from "@/features/auth/types";
import { prisma } from "@/lib/prisma";
import type {
  ContractRecipientRecord,
  ContractTargetRole,
  ContractTemplateRecord,
  ContractWorkRecord,
  LegacyPublisherContractRecord,
  UserContractEventRecord,
  UserContractListRecord,
  UserContractStatus,
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

type LockedTemplate = {
  active: number | boolean;
  body: string;
  code: string;
  id: string;
  targetRole: ContractTargetRole;
  title: string;
  version: number;
};

type LockedContract = {
  activeKey: string | null;
  id: string;
  recipientUserId: string;
  sentById: string | null;
  status: UserContractStatus;
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

function normalizeTargetRole(value: string): ContractTargetRole | null {
  return validTargetRoles.has(value as ContractTargetRole)
    ? (value as ContractTargetRole)
    : null;
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

async function lockTemplate(
  transaction: Prisma.TransactionClient,
  templateId: string,
) {
  const rows = await transaction.$queryRaw<LockedTemplate[]>`
    SELECT id, code, title, targetRole, body, version, active
    FROM ContractTemplate
    WHERE id = ${templateId}
    LIMIT 1
    FOR UPDATE
  `;

  return rows[0] ?? null;
}

async function lockContract(
  transaction: Prisma.TransactionClient,
  contractId: string,
) {
  const rows = await transaction.$queryRaw<LockedContract[]>`
    SELECT id, recipientUserId, sentById, status, activeKey
    FROM UserContract
    WHERE id = ${contractId}
    LIMIT 1
    FOR UPDATE
  `;

  return rows[0] ?? null;
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

export async function listContractTemplates(options: { includeInactive?: boolean } = {}) {
  const rows = await prisma.$queryRaw<Array<ContractTemplateRecord & { active: number | boolean }>>`
    SELECT id, code, title, description, targetRole, body, version, active, createdAt, updatedAt
    FROM ContractTemplate
    ${options.includeInactive ? Prisma.empty : Prisma.sql`WHERE active = 1`}
    ORDER BY active DESC, targetRole ASC, title ASC
  `;

  return rows.map((row) => ({
    ...row,
    active: toBoolean(row.active),
    targetRole: normalizeTargetRole(String(row.targetRole)) ?? "any",
  }));
}

export async function getContractTemplate(templateId: string) {
  const rows = await prisma.$queryRaw<Array<ContractTemplateRecord & { active: number | boolean }>>`
    SELECT id, code, title, description, targetRole, body, version, active, createdAt, updatedAt
    FROM ContractTemplate
    WHERE id = ${templateId}
    LIMIT 1
  `;
  const row = rows[0];

  return row
    ? {
        ...row,
        active: toBoolean(row.active),
        targetRole: normalizeTargetRole(String(row.targetRole)) ?? "any",
      }
    : null;
}

export async function listContractRecipients() {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      isBanned: false,
      status: "active",
    },
    orderBy: [
      { role: "asc" },
      { fullName: "asc" },
    ],
    select: {
      displayName: true,
      email: true,
      fullName: true,
      id: true,
      role: true,
    },
    take: 500,
  });

  return users as ContractRecipientRecord[];
}

export async function listContractWorks() {
  const works = await prisma.work.findMany({
    where: { archivedAt: null },
    orderBy: { updatedAt: "desc" },
    select: {
      authorId: true,
      id: true,
      title: true,
    },
    take: 300,
  });

  return works as ContractWorkRecord[];
}

export async function listAdminUserContracts(limit = 150) {
  return prisma.$queryRaw<UserContractListRecord[]>`
    SELECT
      contract.id,
      contract.templateId,
      template.code AS templateCode,
      contract.templateVersion,
      contract.recipientRole,
      contract.status,
      contract.titleSnapshot,
      contract.bodySnapshot,
      contract.adminNote,
      contract.responseNote,
      contract.relatedWorkId,
      work.title AS relatedWorkTitle,
      contract.sentAt,
      contract.viewedAt,
      contract.respondedAt,
      contract.createdAt,
      contract.updatedAt,
      recipient.fullName AS recipientFullName,
      recipient.email AS recipientEmail,
      sender.email AS sentByEmail
    FROM UserContract contract
    INNER JOIN ContractTemplate template ON template.id = contract.templateId
    INNER JOIN User recipient ON recipient.id = contract.recipientUserId
    LEFT JOIN Work work ON work.id = contract.relatedWorkId
    LEFT JOIN User sender ON sender.id = contract.sentById
    ORDER BY contract.updatedAt DESC
    LIMIT ${limit}
  `;
}

export async function listUserContracts(recipientUserId: string) {
  return prisma.$queryRaw<UserContractListRecord[]>`
    SELECT
      contract.id,
      contract.templateId,
      template.code AS templateCode,
      contract.templateVersion,
      contract.recipientRole,
      contract.status,
      contract.titleSnapshot,
      contract.bodySnapshot,
      contract.adminNote,
      contract.responseNote,
      contract.relatedWorkId,
      work.title AS relatedWorkTitle,
      contract.sentAt,
      contract.viewedAt,
      contract.respondedAt,
      contract.createdAt,
      contract.updatedAt,
      recipient.fullName AS recipientFullName,
      recipient.email AS recipientEmail,
      sender.email AS sentByEmail
    FROM UserContract contract
    INNER JOIN ContractTemplate template ON template.id = contract.templateId
    INNER JOIN User recipient ON recipient.id = contract.recipientUserId
    LEFT JOIN Work work ON work.id = contract.relatedWorkId
    LEFT JOIN User sender ON sender.id = contract.sentById
    WHERE contract.recipientUserId = ${recipientUserId}
      AND contract.status <> 'draft'
    ORDER BY contract.updatedAt DESC
  `;
}

export async function getAdminContract(contractId: string) {
  const rows = await prisma.$queryRaw<UserContractListRecord[]>`
    SELECT
      contract.id,
      contract.templateId,
      template.code AS templateCode,
      contract.templateVersion,
      contract.recipientRole,
      contract.status,
      contract.titleSnapshot,
      contract.bodySnapshot,
      contract.adminNote,
      contract.responseNote,
      contract.relatedWorkId,
      work.title AS relatedWorkTitle,
      contract.sentAt,
      contract.viewedAt,
      contract.respondedAt,
      contract.createdAt,
      contract.updatedAt,
      recipient.fullName AS recipientFullName,
      recipient.email AS recipientEmail,
      sender.email AS sentByEmail
    FROM UserContract contract
    INNER JOIN ContractTemplate template ON template.id = contract.templateId
    INNER JOIN User recipient ON recipient.id = contract.recipientUserId
    LEFT JOIN Work work ON work.id = contract.relatedWorkId
    LEFT JOIN User sender ON sender.id = contract.sentById
    WHERE contract.id = ${contractId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getUserContract(contractId: string, recipientUserId: string) {
  const rows = await prisma.$queryRaw<UserContractListRecord[]>`
    SELECT
      contract.id,
      contract.templateId,
      template.code AS templateCode,
      contract.templateVersion,
      contract.recipientRole,
      contract.status,
      contract.titleSnapshot,
      contract.bodySnapshot,
      contract.adminNote,
      contract.responseNote,
      contract.relatedWorkId,
      work.title AS relatedWorkTitle,
      contract.sentAt,
      contract.viewedAt,
      contract.respondedAt,
      contract.createdAt,
      contract.updatedAt,
      recipient.fullName AS recipientFullName,
      recipient.email AS recipientEmail,
      sender.email AS sentByEmail
    FROM UserContract contract
    INNER JOIN ContractTemplate template ON template.id = contract.templateId
    INNER JOIN User recipient ON recipient.id = contract.recipientUserId
    LEFT JOIN Work work ON work.id = contract.relatedWorkId
    LEFT JOIN User sender ON sender.id = contract.sentById
    WHERE contract.id = ${contractId}
      AND contract.recipientUserId = ${recipientUserId}
      AND contract.status <> 'draft'
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function listContractEvents(contractId: string) {
  return prisma.$queryRaw<UserContractEventRecord[]>`
    SELECT
      event.id,
      event.eventType,
      event.metadata,
      event.createdAt,
      actor.fullName AS actorName,
      actor.email AS actorEmail
    FROM UserContractEvent event
    LEFT JOIN User actor ON actor.id = event.actorId
    WHERE event.contractId = ${contractId}
    ORDER BY event.createdAt DESC
  `;
}

export async function listLegacyPublisherContracts(limit = 100): Promise<LegacyPublisherContractRecord[]> {
  const rows = await prisma.publishingContract.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      submission: {
        select: {
          author: { select: { email: true, fullName: true } },
          publisher: { select: { companyName: true } },
          work: { select: { title: true } },
        },
      },
    },
    take: limit,
  });

  return rows.map((row) => ({
    authorEmail: row.submission.author.email,
    authorName: row.submission.author.fullName,
    createdAt: row.createdAt,
    id: row.id,
    publisherName: row.submission.publisher.companyName,
    status: row.status,
    updatedAt: row.updatedAt,
    version: row.version,
    workTitle: row.submission.work.title,
  }));
}

export async function sendAdminContract(input: {
  actorId: string;
  adminNote: string | null;
  recipientUserId: string;
  relatedWorkId: string | null;
  templateId: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const actor = await lockAdmin(transaction, input.actorId);
    if (!actor) return { status: "forbidden" as const };

    const [recipient, template] = await Promise.all([
      lockRecipient(transaction, input.recipientUserId),
      lockTemplate(transaction, input.templateId),
    ]);

    if (!recipient) return { status: "invalid_recipient" as const };
    if (!template || !toBoolean(template.active)) return { status: "invalid_template" as const };

    if (
      template.targetRole !== "any" &&
      template.targetRole !== recipient.role
    ) {
      return { status: "role_mismatch" as const };
    }

    let workTitle: string | null = null;
    if (input.relatedWorkId) {
      const work = await transaction.work.findFirst({
        where: {
          archivedAt: null,
          id: input.relatedWorkId,
        },
        select: { title: true },
      });
      if (!work) return { status: "invalid_work" as const };
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
    if (existing[0]) return { status: "duplicate_active" as const, contractId: existing[0].id };

    const id = randomUUID();
    const eventId = randomUUID();
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
        ${eventId}, ${id}, ${actor.id}, 'sent',
        ${auditMetadata({
          relatedWorkId: input.relatedWorkId,
          recipientRole: recipient.role,
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

export async function createContractTemplate(input: {
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
    if (!validTargetRoles.has(input.targetRole)) return { status: "invalid_role" as const };

    const existing = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM ContractTemplate WHERE code = ${input.code} LIMIT 1 FOR UPDATE
    `;
    if (existing[0]) return { status: "duplicate_code" as const };

    const id = randomUUID();
    const now = new Date();
    await transaction.$executeRaw`
      INSERT INTO ContractTemplate (
        id, code, title, description, targetRole, body, version, active,
        createdById, updatedById, createdAt, updatedAt
      ) VALUES (
        ${id}, ${input.code}, ${input.title}, ${input.description}, ${input.targetRole}, ${input.body}, 1, 1,
        ${actor.id}, ${actor.id}, ${now}, ${now}
      )
    `;

    return { id, status: "created" as const };
  });
}

export async function updateContractTemplate(input: {
  active: boolean;
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
    if (!validTargetRoles.has(input.targetRole)) return { status: "invalid_role" as const };

    const template = await lockTemplate(transaction, input.templateId);
    if (!template) return { status: "not_found" as const };

    const changed =
      template.title !== input.title ||
      template.body !== input.body ||
      template.targetRole !== input.targetRole ||
      toBoolean(template.active) !== input.active;

    await transaction.$executeRaw`
      UPDATE ContractTemplate
      SET title = ${input.title},
          description = ${input.description},
          targetRole = ${input.targetRole},
          body = ${input.body},
          active = ${input.active},
          version = version + ${changed ? 1 : 0},
          updatedById = ${actor.id},
          updatedAt = ${new Date()}
      WHERE id = ${template.id}
    `;

    return { changed, status: "updated" as const };
  });
}

export async function cancelAdminContract(input: {
  actorId: string;
  contractId: string;
  reason: string | null;
}) {
  return prisma.$transaction(async (transaction) => {
    const actor = await lockAdmin(transaction, input.actorId);
    if (!actor) return { status: "forbidden" as const };

    const contract = await lockContract(transaction, input.contractId);
    if (!contract) return { status: "not_found" as const };
    if (!["sent", "viewed"].includes(contract.status)) {
      return { status: "terminal" as const, contractStatus: contract.status };
    }

    const now = new Date();
    await transaction.$executeRaw`
      UPDATE UserContract
      SET status = 'cancelled', activeKey = NULL, cancelledAt = ${now}, updatedAt = ${now}
      WHERE id = ${contract.id}
    `;
    await transaction.$executeRaw`
      INSERT INTO UserContractEvent (id, contractId, actorId, eventType, metadata, createdAt)
      VALUES (${randomUUID()}, ${contract.id}, ${actor.id}, 'cancelled', ${auditMetadata({ reason: input.reason })}, ${now})
    `;

    await transaction.notification.create({
      data: {
        message: "Gönderilen sözleşme yönetim merkezi tarafından iptal edildi.",
        relatedEntityId: contract.id,
        relatedEntityType: "user_contract",
        title: "Sözleşme iptal edildi",
        type: "system",
        userId: contract.recipientUserId,
      },
    });

    return { status: "cancelled" as const };
  });
}

export async function markUserContractViewed(input: {
  contractId: string;
  recipientUserId: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const recipient = await lockRecipient(transaction, input.recipientUserId);
    if (!recipient) return { status: "forbidden" as const };

    const contract = await lockContract(transaction, input.contractId);
    if (!contract || contract.recipientUserId !== recipient.id) {
      return { status: "not_found" as const };
    }
    if (contract.status !== "sent") {
      return { status: "unchanged" as const, contractStatus: contract.status };
    }

    const now = new Date();
    await transaction.$executeRaw`
      UPDATE UserContract
      SET status = 'viewed', viewedAt = ${now}, updatedAt = ${now}
      WHERE id = ${contract.id}
    `;
    await transaction.$executeRaw`
      INSERT INTO UserContractEvent (id, contractId, actorId, eventType, metadata, createdAt)
      VALUES (${randomUUID()}, ${contract.id}, ${recipient.id}, 'viewed', NULL, ${now})
    `;

    return { status: "viewed" as const };
  });
}

export async function respondToUserContract(input: {
  contractId: string;
  decision: "accepted" | "rejected";
  recipientUserId: string;
  responseNote: string | null;
}) {
  return prisma.$transaction(async (transaction) => {
    const recipient = await lockRecipient(transaction, input.recipientUserId);
    if (!recipient) return { status: "forbidden" as const };

    const contract = await lockContract(transaction, input.contractId);
    if (!contract || contract.recipientUserId !== recipient.id) {
      return { status: "not_found" as const };
    }
    if (!["sent", "viewed"].includes(contract.status)) {
      return { status: "terminal" as const, contractStatus: contract.status };
    }

    const now = new Date();
    const acceptedAt = input.decision === "accepted" ? now : null;
    const rejectedAt = input.decision === "rejected" ? now : null;

    await transaction.$executeRaw`
      UPDATE UserContract
      SET status = ${input.decision},
          responseNote = ${input.responseNote},
          activeKey = NULL,
          respondedAt = ${now},
          acceptedAt = ${acceptedAt},
          rejectedAt = ${rejectedAt},
          viewedAt = COALESCE(viewedAt, ${now}),
          updatedAt = ${now}
      WHERE id = ${contract.id}
    `;

    await transaction.$executeRaw`
      INSERT INTO UserContractEvent (id, contractId, actorId, eventType, metadata, createdAt)
      VALUES (
        ${randomUUID()}, ${contract.id}, ${recipient.id}, ${input.decision},
        ${auditMetadata({ responseNote: input.responseNote })}, ${now}
      )
    `;

    if (contract.sentById) {
      await transaction.notification.create({
        data: {
          message: `${recipient.displayName || recipient.fullName} sözleşmeye ${input.decision === "accepted" ? "kabul" : "ret"} yanıtı verdi.`,
          relatedEntityId: contract.id,
          relatedEntityType: "user_contract",
          title: "Sözleşme yanıtlandı",
          type: "system",
          userId: contract.sentById,
        },
      });
    }

    return { status: input.decision };
  });
}
