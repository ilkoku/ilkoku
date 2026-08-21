import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type IdRow = { id: string };

export type ContractNotificationScope =
  | "default"
  | "editor"
  | "publisher"
  | "admin";

export async function resolveContractNotificationHrefs(input: {
  contractIds: string[];
  scope: ContractNotificationScope;
  userId: string;
}) {
  const hrefByContractId = new Map<string, string>();
  const contractIds = Array.from(new Set(input.contractIds)).slice(0, 100);

  if (!contractIds.length) return hrefByContractId;

  const ownedContracts = await prisma.$queryRaw<IdRow[]>(
    Prisma.sql`
      SELECT id
      FROM UserContract
      WHERE recipientUserId = ${input.userId}
        AND id IN (${Prisma.join(contractIds)})
    `,
  );

  for (const contract of ownedContracts) {
    hrefByContractId.set(
      contract.id,
      `/sozlesmelerim/${encodeURIComponent(contract.id)}`,
    );
  }

  if (input.scope !== "admin") return hrefByContractId;

  const adminRows = await prisma.$queryRaw<IdRow[]>(
    Prisma.sql`
      SELECT id
      FROM User
      WHERE id = ${input.userId}
        AND role = 'admin'
        AND status = 'active'
        AND isBanned = 0
        AND deletedAt IS NULL
      LIMIT 1
    `,
  );

  if (!adminRows[0]) return hrefByContractId;

  const sentContracts = await prisma.$queryRaw<IdRow[]>(
    Prisma.sql`
      SELECT id
      FROM UserContract
      WHERE sentById = ${input.userId}
        AND id IN (${Prisma.join(contractIds)})
    `,
  );

  for (const contract of sentContracts) {
    hrefByContractId.set(
      contract.id,
      `/sozlesme/${encodeURIComponent(contract.id)}`,
    );
  }

  return hrefByContractId;
}
