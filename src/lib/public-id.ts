import type { Prisma } from "@/generated/prisma/client";

const identityPrefixes = {
  comment: "C",
  publisher: "P",
  user: "U",
  work: "W",
} as const;

export type PublicIdentityType =
  keyof typeof identityPrefixes;

export async function allocatePublicId(
  transaction: Prisma.TransactionClient,
  type: PublicIdentityType,
  createdAt: Date = new Date(),
): Promise<string> {
  const year = createdAt.getUTCFullYear();

  if (year < 2000 || year > 9999) {
    throw new Error("INVALID_PUBLIC_ID_YEAR");
  }

  const sequence =
    await transaction.identitySequence.upsert({
      where: {
        type_year: {
          type,
          year,
        },
      },
      create: {
        lastNumber: 1,
        type,
        year,
      },
      update: {
        lastNumber: {
          increment: 1,
        },
      },
      select: {
        lastNumber: true,
      },
    });

  const number = String(
    sequence.lastNumber,
  ).padStart(6, "0");

  return [
    "IKO",
    identityPrefixes[type],
    year,
    number,
  ].join("-");
}
