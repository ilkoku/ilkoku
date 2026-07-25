export const GENRES = [
  { slug: "roman", label: "Roman" },
  { slug: "oyku", label: "Öykü" },
  { slug: "fantastik", label: "Fantastik" },
  { slug: "bilim-kurgu", label: "Bilim Kurgu" },
  { slug: "polisiye", label: "Polisiye" },
] as const;

export type GenreSlug = (typeof GENRES)[number]["slug"];
export type GenreLabel = (typeof GENRES)[number]["label"];

export const GENRE_LABELS = GENRES.map((genre) => genre.label);

export function getGenreBySlug(slug: string) {
  return GENRES.find((genre) => genre.slug === slug);
}
