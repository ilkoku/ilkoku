import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  memberStoredWorkContentRatings,
  publicStoredWorkContentRatings,
  type MemberStoredWorkContentRating,
} from "@/lib/work-content-classification";

const AGE_VERIFICATION_ENTITY = "AgeVerification";
const ADULT_CONSENT_ENTITY = "AdultContentConsent";

export type AdultContentAccess = {
  adultEligibleAt: Date | null;
  birthYear: number | null;
  canAccessAdultContent: boolean;
  consentedAt: Date | null;
  isAdult: boolean;
  needsBirthDate: boolean;
};

type AgeVerificationMetadata = {
  adultEligibleAt?: unknown;
  birthYear?: unknown;
};

type AdultConsentMetadata = {
  consented?: unknown;
};

function parseMetadata<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function parseBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function isPlausibleBirthDate(birthDate: Date, now = new Date()) {
  if (Number.isNaN(birthDate.getTime())) return false;

  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const candidate = Date.UTC(
    birthDate.getUTCFullYear(),
    birthDate.getUTCMonth(),
    birthDate.getUTCDate(),
  );
  if (candidate > today) return false;

  const oldest = new Date(now);
  oldest.setUTCFullYear(oldest.getUTCFullYear() - 120);
  return candidate >= Date.UTC(
    oldest.getUTCFullYear(),
    oldest.getUTCMonth(),
    oldest.getUTCDate(),
  );
}

export function adultEligibilityDate(birthDate: Date) {
  return new Date(Date.UTC(
    birthDate.getUTCFullYear() + 18,
    birthDate.getUTCMonth(),
    birthDate.getUTCDate(),
  ));
}

export async function getAdultContentAccess(
  userId: string,
  now = new Date(),
): Promise<AdultContentAccess> {
  const [profile, ageEvent, consentEvent] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: { birthYear: true },
    }),
    prisma.auditLog.findFirst({
      where: {
        action: "profile_updated",
        actorId: userId,
        entityId: userId,
        entityType: AGE_VERIFICATION_ENTITY,
      },
      orderBy: { createdAt: "desc" },
      select: { metadata: true },
    }),
    prisma.auditLog.findFirst({
      where: {
        action: "profile_updated",
        actorId: userId,
        entityId: userId,
        entityType: ADULT_CONSENT_ENTITY,
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, metadata: true },
    }),
  ]);

  const ageMetadata = parseMetadata<AgeVerificationMetadata>(ageEvent?.metadata ?? null);
  const eligibleValue = ageMetadata?.adultEligibleAt;
  const adultEligibleAt =
    typeof eligibleValue === "string" && !Number.isNaN(Date.parse(eligibleValue))
      ? new Date(eligibleValue)
      : null;
  const verifiedBirthYear =
    typeof ageMetadata?.birthYear === "number"
      ? ageMetadata.birthYear
      : profile?.birthYear ?? null;
  const consentMetadata = parseMetadata<AdultConsentMetadata>(
    consentEvent?.metadata ?? null,
  );
  const consented = consentMetadata?.consented === true;
  const isAdult = Boolean(adultEligibleAt && adultEligibleAt.getTime() <= now.getTime());
  const consentedAt = consented ? consentEvent?.createdAt ?? null : null;

  return {
    adultEligibleAt,
    birthYear: verifiedBirthYear,
    canAccessAdultContent: isAdult && Boolean(consentedAt),
    consentedAt,
    isAdult,
    needsBirthDate: adultEligibleAt === null,
  };
}

export async function saveVerifiedBirthDate(userId: string, birthDate: Date) {
  const adultEligibleAt = adultEligibilityDate(birthDate);
  const birthYear = birthDate.getUTCFullYear();

  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.auditLog.findFirst({
      where: {
        action: "profile_updated",
        actorId: userId,
        entityId: userId,
        entityType: AGE_VERIFICATION_ENTITY,
      },
      select: { id: true },
    });

    if (existing) return { alreadyVerified: true, adultEligibleAt, birthYear };

    await transaction.profile.upsert({
      where: { userId },
      create: { birthYear, userId },
      update: { birthYear },
    });

    await transaction.auditLog.create({
      data: {
        action: "profile_updated",
        actorId: userId,
        entityId: userId,
        entityType: AGE_VERIFICATION_ENTITY,
        metadata: JSON.stringify({
          adultEligibleAt: adultEligibleAt.toISOString(),
          birthYear,
          source: "self_declared_birth_date",
        }),
      },
    });

    return { alreadyVerified: false, adultEligibleAt, birthYear };
  });
}

export async function saveAdultContentConsent(
  userId: string,
  consented: boolean,
) {
  return prisma.auditLog.create({
    data: {
      action: "profile_updated",
      actorId: userId,
      entityId: userId,
      entityType: ADULT_CONSENT_ENTITY,
      metadata: JSON.stringify({ consented }),
    },
  });
}

export function adultContentWorkVisibility(
  canAccessAdultContent: boolean,
): Prisma.WorkWhereInput {
  return canAccessAdultContent
    ? {}
    : {
        contentRating: {
          not: "adult_18",
        },
      };
}

export function visibleMemberContentRatings(
  canAccessAdultContent: boolean,
): readonly MemberStoredWorkContentRating[] {
  return canAccessAdultContent
    ? memberStoredWorkContentRatings
    : publicStoredWorkContentRatings;
}

export function safeAdultGateReturnPath(
  value: string | null | undefined,
  fallback = "/kesfet",
) {
  if (
    !value ||
    value.length > 1500 ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return fallback;
  }

  return value;
}
