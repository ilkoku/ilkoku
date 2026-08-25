export const workContentRatings = [
  "all_ages",
  "teen_13",
  "young_adult_16",
  "adult_18",
] as const;

export const storedWorkContentRatings = [
  "unrated",
  ...workContentRatings,
] as const;

export type WorkContentRating =
  (typeof workContentRatings)[number];

export type StoredWorkContentRating =
  (typeof storedWorkContentRatings)[number];

export const workContentWarnings = [
  "violence",
  "strong_language",
  "sexual_themes",
  "self_harm_or_abuse",
  "alcohol_or_substances",
  "horror_or_disturbing",
] as const;

export type WorkContentWarning =
  (typeof workContentWarnings)[number];

export const workContentRatingDetails: Record<
  StoredWorkContentRating,
  { label: string; shortLabel: string }
> = {
  unrated: {
    label: "Henüz sınıflandırılmadı",
    shortLabel: "Sınıflandırılmadı",
  },
  all_ages: {
    label: "Tüm yaşlar",
    shortLabel: "Tüm yaşlar",
  },
  teen_13: {
    label: "13 yaş ve üzeri",
    shortLabel: "13+",
  },
  young_adult_16: {
    label: "16 yaş ve üzeri",
    shortLabel: "16+",
  },
  adult_18: {
    label: "18 yaş ve üzeri",
    shortLabel: "18+",
  },
};

export const workContentWarningDetails: Record<
  WorkContentWarning,
  { label: string; description: string }
> = {
  violence: {
    label: "Şiddet",
    description: "Fiziksel şiddet, yaralanma veya tehdit anlatımı",
  },
  strong_language: {
    label: "Ağır dil",
    description: "Yoğun küfür, hakaret veya sert dil",
  },
  sexual_themes: {
    label: "Cinsel temalar",
    description: "Cinsellik, çıplaklık veya yetişkin ilişki temaları",
  },
  self_harm_or_abuse: {
    label: "Kendine zarar veya istismar",
    description: "Kendine zarar, intihar, istismar veya travma temaları",
  },
  alcohol_or_substances: {
    label: "Alkol veya madde",
    description: "Alkol, tütün ya da madde kullanımı",
  },
  horror_or_disturbing: {
    label: "Korku veya rahatsız edici içerik",
    description: "Yoğun korku, dehşet veya sarsıcı sahneler",
  },
};

const knownWarnings = new Set<string>(workContentWarnings);

export function parseWorkContentWarnings(
  value: string | null | undefined,
): WorkContentWarning[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return [...new Set(
      parsed.filter(
        (item): item is WorkContentWarning =>
          typeof item === "string" && knownWarnings.has(item),
      ),
    )];
  } catch {
    return [];
  }
}

export function serializeWorkContentWarnings(
  warnings: readonly WorkContentWarning[],
) {
  return JSON.stringify(
    workContentWarnings.filter((warning) => warnings.includes(warning)),
  );
}
