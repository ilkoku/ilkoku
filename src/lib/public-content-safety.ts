export const BLOCKED_PUBLIC_WORK_SLUGS = [
  "test0408-2959175c",
] as const;

export const SEARCH_INDEX_EXCLUDED_PUBLIC_WORK_SLUGS = [
  "yeni-test209-30820c6a",
  "test2-7b0fbe47",
] as const;

export const SEARCH_INDEX_EXCLUDED_PUBLIC_WORK_SLUG_PREFIXES = [
  "demo-",
] as const;

const blockedPublicWorkSlugs = new Set<string>(
  BLOCKED_PUBLIC_WORK_SLUGS,
);

const searchIndexExcludedPublicWorkSlugs = new Set<string>(
  SEARCH_INDEX_EXCLUDED_PUBLIC_WORK_SLUGS,
);

export function isBlockedPublicWorkSlug(slug: string) {
  return blockedPublicWorkSlugs.has(slug.trim().toLowerCase());
}

export function isSearchIndexExcludedPublicWorkSlug(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();

  return (
    blockedPublicWorkSlugs.has(normalizedSlug) ||
    searchIndexExcludedPublicWorkSlugs.has(normalizedSlug) ||
    SEARCH_INDEX_EXCLUDED_PUBLIC_WORK_SLUG_PREFIXES.some((prefix) =>
      normalizedSlug.startsWith(prefix),
    )
  );
}
