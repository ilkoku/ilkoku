import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  memberStoredWorkContentRatings,
  publicStoredWorkContentRatings,
  type MemberStoredWorkContentRating,
} from "@/lib/work-content-classification";

export type AdultContentAccess = {
  birthDate: Date | null;
  canAccessAdultContent: boolean;
  consentedAt: Date | null;
  isAdult: boolean;
  needsBirthDate: boolean;
};

export function isAtLeast18(birthDate: Date, now = new Date()) {
  const todayYear = now.getUTCFullYear();
  const todayMonth = now.getUTCMonth();
  const todayDay = now.getUTCDate();
  const birthYear = birthDate.getUTCFullYear();
  const birthMonth = birthDate.getUTCMonth();
  const birthDay = birthDate.getUTCDate();

  let age = todayYear - birthYear;
  if (
    todayMonth < birthMonth ||
    (todayMonth === birthMonth && todayDay < birthDay)
  ) {
    age -= 1;
  }

  return age >= 18;
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

export async function getAdultContentAccess(
  userId: string,
): Promise<AdultContentAccess> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: {
      adultContentConsentAt: true,
      birthDate: true,
    },
  });

  const birthDate = profile?.birthDate ?? null;
  const isAdult = birthDate ? isAtLeast18(birthDate) : false;
  const consentedAt = profile?.adultContentConsentAt ?? null;

  return {
    birthDate,
    canAccessAdultContent: isAdult && Boolean(consentedAt),
    consentedAt,
    isAdult,
    needsBirthDate: birthDate === null,
  };
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
