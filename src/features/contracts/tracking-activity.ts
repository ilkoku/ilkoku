import "server-only";

import { prisma } from "@/lib/prisma";
import { MANDATORY_REGISTRATION_CONTRACT_CODE } from "./registration-agreement";

type RawReminderActivity = {
  contractId: string;
  lastReminderAt: Date | null;
  reminderCount: bigint | number;
};

export type ContractReminderActivity = {
  contractId: string;
  lastReminderAt: Date | null;
  reminderCount: number;
};

export async function listContractReminderActivity(
  limit = 500,
): Promise<ContractReminderActivity[]> {
  const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));

  const rows = await prisma.$queryRawUnsafe<RawReminderActivity[]>(
    `SELECT
       event.contractId,
       MAX(event.createdAt) AS lastReminderAt,
       COUNT(*) AS reminderCount
     FROM UserContractEvent event
     INNER JOIN UserContract contract ON contract.id = event.contractId
     INNER JOIN ContractTemplate template ON template.id = contract.templateId
     WHERE event.eventType = 'reminder_requested'
       AND template.code <> ?
     GROUP BY event.contractId
     ORDER BY lastReminderAt DESC
     LIMIT ?`,
    MANDATORY_REGISTRATION_CONTRACT_CODE,
    safeLimit,
  );

  return rows.map((row) => ({
    contractId: row.contractId,
    lastReminderAt: row.lastReminderAt,
    reminderCount: Number(row.reminderCount),
  }));
}

/** Read reminders only for the visible contract page; no global 500-record cap. */
export async function listContractReminderActivityForIds(
  contractIds: readonly string[],
): Promise<ContractReminderActivity[]> {
  const ids = [...new Set(contractIds)].slice(0, 100);
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  const rows = await prisma.$queryRawUnsafe<RawReminderActivity[]>(
    `SELECT event.contractId, MAX(event.createdAt) AS lastReminderAt,
            COUNT(*) AS reminderCount
     FROM UserContractEvent event
     WHERE event.eventType = 'reminder_requested'
       AND event.contractId IN (${placeholders})
     GROUP BY event.contractId`,
    ...ids,
  );
  return rows.map((row) => ({
    contractId: row.contractId,
    lastReminderAt: row.lastReminderAt,
    reminderCount: Number(row.reminderCount),
  }));
}
