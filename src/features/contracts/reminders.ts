import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { UserRole } from "@/features/auth/types";
import { sendUserContractReminderEmail } from "@/lib/email/contract-emails";
import { prisma } from "@/lib/prisma";
import { MANDATORY_REGISTRATION_CONTRACT_CODE } from "./registration-agreement";
import type { UserContractStatus } from "./types";

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

type LockedReminderContract = {
  activeKey: string | null;
  id: string;
  recipientUserId: string;
  status: UserContractStatus;
  templateCode: string;
  titleSnapshot: string;
};

function toBoolean(value: number | boolean) {
  return value === true || value === 1;
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

async function lockReminderContract(
  transaction: Prisma.TransactionClient,
  contractId: string,
) {
  const rows = await transaction.$queryRaw<LockedReminderContract[]>`
    SELECT
      contract.id,
      contract.recipientUserId,
      contract.status,
      contract.activeKey,
      contract.titleSnapshot,
      template.code AS templateCode
    FROM UserContract contract
    INNER JOIN ContractTemplate template ON template.id = contract.templateId
    WHERE contract.id = ${contractId}
    LIMIT 1
    FOR UPDATE
  `;

  return rows[0] ?? null;
}

function istanbulDayWindow(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Istanbul",
    year: "numeric",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const dateKey = `${value("year")}-${value("month")}-${value("day")}`;
  // Türkiye kalıcı UTC+03:00 kullanır; gün penceresi ürünün Europe/Istanbul zamanına göre sabitlenir.
  const start = new Date(`${dateKey}T00:00:00+03:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { dateKey, end, start };
}

async function appendTransportEvent(input: {
  actorId: string;
  contractId: string;
  delivery: string;
  deliveryId: string | null;
  eventType: "reminder_email_sent" | "reminder_email_failed";
}) {
  try {
    await prisma.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM UserContract
        WHERE id = ${input.contractId}
        LIMIT 1
        FOR UPDATE
      `;
      if (!rows[0]) return;

      await transaction.$executeRaw`
        INSERT INTO UserContractEvent (id, contractId, actorId, eventType, metadata, createdAt)
        VALUES (
          ${randomUUID()}, ${input.contractId}, ${input.actorId}, ${input.eventType},
          ${auditMetadata({
            delivery: input.delivery,
            deliveryId: input.deliveryId,
            source: "manual_admin",
          })},
          ${new Date()}
        )
      `;
    });
  } catch (error) {
    console.error("USER_CONTRACT_REMINDER_AUDIT_FAILED", {
      contractId: input.contractId,
      eventType: input.eventType,
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    });
  }
}

export async function sendAdminContractReminder(input: {
  actorId: string;
  contractId: string;
}) {
  const seedRows = await prisma.$queryRaw<Array<{ recipientUserId: string }>>`
    SELECT recipientUserId
    FROM UserContract
    WHERE id = ${input.contractId}
    LIMIT 1
  `;
  const recipientUserId = seedRows[0]?.recipientUserId;
  if (!recipientUserId) return { status: "not_found" as const };

  const now = new Date();
  const day = istanbulDayWindow(now);
  const prepared = await prisma.$transaction(async (transaction) => {
    const actor = await lockAdmin(transaction, input.actorId);
    if (!actor) return { status: "forbidden" as const };

    // Recipient is locked before the contract to preserve the canonical user-contract lock order.
    const recipient = await lockRecipient(transaction, recipientUserId);
    if (!recipient) return { status: "invalid_recipient" as const };

    const contract = await lockReminderContract(transaction, input.contractId);
    if (!contract || contract.recipientUserId !== recipient.id) {
      return { status: "not_found" as const };
    }
    if (
      (contract.status !== "sent" && contract.status !== "viewed") ||
      !contract.activeKey ||
      contract.templateCode === MANDATORY_REGISTRATION_CONTRACT_CODE
    ) {
      return { status: "not_remindable" as const };
    }

    const existing = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM UserContractEvent
      WHERE contractId = ${contract.id}
        AND eventType = 'reminder_requested'
        AND createdAt >= ${day.start}
        AND createdAt < ${day.end}
      LIMIT 1
      FOR UPDATE
    `;
    if (existing[0]) {
      return { status: "already_reminded" as const };
    }

    await transaction.$executeRaw`
      INSERT INTO UserContractEvent (id, contractId, actorId, eventType, metadata, createdAt)
      VALUES (
        ${randomUUID()}, ${contract.id}, ${actor.id}, 'reminder_requested',
        ${auditMetadata({
          dateKey: day.dateKey,
          source: "manual_admin",
        })},
        ${now}
      )
    `;

    await transaction.notification.create({
      data: {
        message: `${contract.titleSnapshot} sözleşmesi yanıtınızı bekliyor.`,
        relatedEntityId: contract.id,
        relatedEntityType: "user_contract",
        title: "Sözleşme hatırlatması",
        type: "system",
        userId: recipient.id,
      },
    });

    return {
      contractId: contract.id,
      dateKey: day.dateKey,
      recipientEmail: recipient.email,
      recipientName: recipient.displayName || recipient.fullName,
      status: "prepared" as const,
      title: contract.titleSnapshot,
    };
  });

  if (prepared.status !== "prepared") return prepared;

  try {
    const delivery = await sendUserContractReminderEmail({
      contractId: prepared.contractId,
      dateKey: prepared.dateKey,
      email: prepared.recipientEmail,
      fullName: prepared.recipientName,
      title: prepared.title,
    });

    await appendTransportEvent({
      actorId: input.actorId,
      contractId: prepared.contractId,
      delivery: delivery.delivery,
      deliveryId: delivery.deliveryId ?? null,
      eventType: "reminder_email_sent",
    });

    return {
      delivery: delivery.delivery,
      status: "reminder_sent" as const,
    };
  } catch (error) {
    await appendTransportEvent({
      actorId: input.actorId,
      contractId: prepared.contractId,
      delivery: "failed",
      deliveryId: null,
      eventType: "reminder_email_failed",
    });

    console.error("USER_CONTRACT_REMINDER_EMAIL_FAILED", {
      contractId: prepared.contractId,
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    });

    return { status: "reminder_partial" as const };
  }
}
