import {
  GENRE_CATEGORIES,
  GENRES,
  type GenreCategory,
} from "@/content/genres-complete";

export const writingGenreGroups = GENRE_CATEGORIES.map((category) => ({
  id: categorySlug(category),
  label: category,
  options: GENRES.filter((genre) => genre.category === category).map(
    (genre) => genre.label,
  ),
}));

export const writingGenreOptions = GENRES.map((genre) => genre.label);

function categorySlug(category: GenreCategory): string {
  return category
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseWritingGenres(
  value: string | null | undefined,
): string[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is string =>
        typeof item === "string" &&
        writingGenreOptions.includes(item as (typeof writingGenreOptions)[number]),
    );
  } catch {
    return [];
  }
}
