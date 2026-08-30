import { GENRE_LABELS, type GenreLabel } from "@/lib/genres";

function normalizedGenreKey(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

const genreByNormalizedLabel = new Map(
  GENRE_LABELS.map((label) => [normalizedGenreKey(label), label] as const),
);

export function normalizeGenreLabel(
  value: string | null | undefined,
): GenreLabel | undefined {
  if (!value) return undefined;
  return genreByNormalizedLabel.get(normalizedGenreKey(value));
}

export function availableGenreLabels(
  values: Iterable<string | null | undefined>,
): GenreLabel[] {
  const available = new Set<GenreLabel>();

  for (const value of values) {
    const label = normalizeGenreLabel(value);
    if (label) available.add(label);
  }

  return GENRE_LABELS.filter((label) => available.has(label));
}
