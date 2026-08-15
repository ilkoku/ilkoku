const blockedPublicWorkSlugs = new Set([
  "test0408-2959175c",
]);

export function isBlockedPublicWorkSlug(slug: string) {
  return blockedPublicWorkSlugs.has(slug.trim().toLowerCase());
}
