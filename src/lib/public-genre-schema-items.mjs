/**
 * Describe only SEO-eligible genre landing pages in the indexable public
 * genre directory. Demo-only genres remain browseable in the UI, but their
 * noindex detail URLs must not be advertised through JSON-LD.
 *
 * @param {Array<{slug: string, label: string}>} genres
 * @param {Set<string>} eligibleGenreSlugs
 * @param {string} baseUrl
 */
export function buildIndexablePublicGenreSchemaItems(
  genres,
  eligibleGenreSlugs,
  baseUrl = "https://ilkoku.com",
) {
  return genres
    .filter((genre) => eligibleGenreSlugs.has(genre.slug))
    .map((genre, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: genre.label,
      url: `${baseUrl}/turler/${genre.slug}`,
    }));
}
